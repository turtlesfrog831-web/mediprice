# -*- coding: utf-8 -*-
import os
import json
import time
import random
import requests
import sys
import re

# Set output encoding to UTF-8
if sys.platform.startswith("win"):
    import codecs
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())

DATA_FILE = "data.json"
BACKUP_FILE = "data.json.bak"

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
]

def clean_query_name(name):
    # Remove '의원' suffix if present for fallback search
    if name.endswith("의원"):
        return name[:-2]
    return name

def check_query_place(query, original_name, headers):
    url = f"https://search.naver.com/search.naver?query={requests.utils.quote(query)}"
    try:
        res = requests.get(url, headers=headers, timeout=5)
        if res.status_code == 200:
            html = res.text
            
            # If Naver blocks us with a CAPTCHA or returns extremely short page
            if "confirmRules" in html or len(html) < 20000 or "자동등록방지" in html or "자동입력방지" in html:
                return "BLOCKED", None, None
            
            # Check place.naver.com presence
            if "place.naver.com" not in html:
                return "OK", None, None
                
            # Extract actual registered name and category
            # Pattern 1: class="IY7ZX" and class="dtDQt"
            pattern1 = r'class="IY7ZX">([^<]+)</a>.*?class="dtDQt">([^<]+)</a>'
            m1 = re.search(pattern1, html, re.DOTALL)
            
            # Pattern 2: class="IY7ZX" and span class="dtDQt"
            pattern2 = r'class="IY7ZX">([^<]+)</a>.*?<span class="dtDQt">([^<]+)</span>'
            m2 = re.search(pattern2, html, re.DOTALL)
            
            reg_name, category = None, None
            if m1:
                reg_name, category = m1.group(1), m1.group(2)
            elif m2:
                reg_name, category = m2.group(1), m2.group(2)
                
            if not reg_name or not category:
                # If place exists but we couldn't parse category/name (layout changed),
                # we still treat it as verified, but keep original name
                return "OK", original_name, "의원"
                
            return "OK", reg_name, category
        else:
            return f"STATUS_{res.status_code}", None, None
    except Exception as e:
        return f"ERROR_{str(e)}", None, None

def run_verification():
    if not os.path.exists(DATA_FILE):
        print(f"오류: {DATA_FILE} 파일을 찾을 수 없습니다.")
        return

    # Create backup if it doesn't exist
    if not os.path.exists(BACKUP_FILE):
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as src, open(BACKUP_FILE, "w", encoding="utf-8") as dst:
                dst.write(src.read())
            print(f"백업 생성 완료: {BACKUP_FILE}")
        except Exception as e:
            print(f"백업 실패: {e}")
            return

    # Load data
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            clinics = json.load(f)
    except Exception as e:
        print(f"데이터 로딩 실패: {e}")
        return

    total = len(clinics)
    checked_count = sum(1 for c in clinics if c.get("verified_checked") == True)
    print(f"총 {total}개 병원 데이터 중 {checked_count}개는 이미 검증 완료 상태입니다.")

    success_count = 0
    blocked = False

    for idx, clinic in enumerate(clinics):
        # Skip if already verified in this session
        if clinic.get("verified_checked") == True:
            if clinic.get("naver_verified") == True:
                success_count += 1
            continue

        name = clinic.get("name")
        district = clinic.get("district")
        
        # Primary search: name + district
        query1 = f"{name} {district}"
        
        headers = {
            "User-Agent": random.choice(USER_AGENTS),
            "Referer": "https://www.naver.com/"
        }
        
        # Check primary query
        status, reg_name, category = check_query_place(query1, name, headers)
        
        if status == "BLOCKED" or status.startswith("STATUS_429"):
            print(f"\n[차단 감지] 네이버로부터 요청이 차단되었습니다 (상태: {status}). 작업을 중단하고 현재까지의 진행 상황을 저장합니다.")
            blocked = True
            break
            
        if reg_name is None:
            # Fallback search: name without '의원' suffix + district
            name_fallback = clean_query_name(name)
            if name_fallback != name:
                query2 = f"{name_fallback} {district}"
                time.sleep(0.5)
                status_fb, reg_name_fb, category_fb = check_query_place(query2, name, headers)
                if status_fb == "BLOCKED":
                    print(f"\n[차단 감지 - Fallback] 네이버로부터 요청이 차단되었습니다. 작업을 중단합니다.")
                    blocked = True
                    break
                if reg_name_fb:
                    reg_name, category = reg_name_fb, category_fb

        # Evaluate verification and category correctness
        is_verified = False
        mismatch = False
        
        if reg_name and category:
            is_verified = True
            
            # Check for mismatch: e.g. general clinic in DB matched to dental/oriental/animal/pharmacy
            # BUT if the DB name explicitly contains that keyword (e.g. '참치과의원'), we allow it.
            disallowed_keywords = ['치과', '한의원', '한방', '동물', '약국']
            for kw in disallowed_keywords:
                if kw in category:
                    if kw not in name:
                        mismatch = True
                        break
                        
            if mismatch:
                is_verified = False
                status_text = f"미스매치 제외 (DB이름: {name} vs 매칭업종: {category})"
            else:
                # Correct the name to the actual registered name
                clinic["name"] = reg_name
                status_text = f"실재함 (업종: {category} | 실제등록명 교정: {name} -> {reg_name})"
        else:
            status_text = "미확인 (지도비등록)"

        # Save verification state
        clinic["verified_checked"] = True
        clinic["naver_verified"] = is_verified
        
        print(f"[{idx+1}/{total}] {name} ({district}) -> {status_text}")
        
        if is_verified:
            success_count += 1
            
        # Random sleep to prevent rate limiting
        sleep_time = random.uniform(1.2, 2.5)
        time.sleep(sleep_time)

    # Save progress back to file (intermediate or final)
    try:
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(clinics, f, ensure_ascii=False, indent=2)
        print(f"\n진행 상황 저장 완료 (체크된 누적 병원 수: {sum(1 for c in clinics if c.get('verified_checked') == True)})")
    except Exception as e:
        print(f"진행 상황 저장 실패: {e}")
        return

    if blocked:
        print("작업이 일시 중단되었습니다. 잠시 후 스크립트를 다시 실행하여 잔여 병원을 계속 검증해 주세요.")
        return

    # If all clinics are checked successfully
    all_checked = all(c.get("verified_checked") == True for c in clinics)
    if all_checked:
        print("\n" + "="*50)
        print("모든 병원 데이터의 전수 검증 및 교정이 성공적으로 완료되었습니다!")
        
        # Filter only verified clinics
        verified_clinics = [c for c in clinics if c.get("naver_verified") == True]
        
        # Clean up temporary progress fields before final save
        for c in verified_clinics:
            if "verified_checked" in c:
                del c["verified_checked"]
            if "naver_verified" in c:
                del c["naver_verified"]
        
        print(f"실제 지도 등록 확인 및 교정된 병원: {len(verified_clinics)} / {total}")
        print(f"비등록/미스매치 병원 수 (필터링되어 제외됨): {total - len(verified_clinics)}")
        
        try:
            with open(DATA_FILE, "w", encoding="utf-8") as f:
                json.dump(verified_clinics, f, ensure_ascii=False, indent=2)
            print("최종 필터링 및 이름 교정 완료된 data.json 저장 성공!")
        except Exception as e:
            print(f"최종 필터링 저장 실패: {e}")

if __name__ == "__main__":
    run_verification()
