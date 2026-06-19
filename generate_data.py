import os
import json
import random
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# ==========================================================================
# 1. Procedural Korean Region & Hospital Generator Data
# ==========================================================================
REGIONS = {
    "서울특별시": {
        "districts": ["강남구", "서초구", "송파구", "마포구", "종로구", "영등포구", "강동구", "성동구", "용산구", "서대문구", "중구", "노원구", "관악구"],
        "roads": ["테헤란로", "강남대로", "올림픽로", "마포대로", "대학로", "국제금융로", "동남로", "왕십리로", "한강대로", "신촌로", "사직로", "동일로", "남부순환로"]
    },
    "부산광역시": {
        "districts": ["해운대구", "동래구", "연제구", "부산진구", "금정구", "수영구", "사하구", "남구", "북구"],
        "roads": ["해운대해변로", "중앙대로", "충렬대로", "반송로", "가야대로", "수영로", "낙동대로", "수영강변로"]
    },
    "대구광역시": {
        "districts": ["중구", "수성구", "달서구", "북구", "동구", "서구"],
        "roads": ["달구벌대로", "동대구로", "신천동로", "태평로", "국채보상로", "서대구로"]
    },
    "인천광역시": {
        "districts": ["연수구", "남동구", "부평구", "서구", "미추홀구", "계양구"],
        "roads": ["컨벤시아대로", "인하로", "경인로", "송도과학로", "부평대로", "봉오대로", "예술로"]
    },
    "광주광역시": {
        "districts": ["동구", "서구", "남구", "북구", "광산구"],
        "roads": ["무진대로", "상무중앙로", "임방울대로", "필문대로", "대남대로", "제봉로"]
    },
    "대전광역시": {
        "districts": ["서구", "유성구", "중구", "동구", "대덕구"],
        "roads": ["둔산로", "대학로", "한밭대로", "계룡로", "대종로", "동서대로"]
    },
    "울산광역시": {
        "districts": ["남구", "중구", "북구", "동구", "울주군"],
        "roads": ["삼산로", "번영로", "화합로", "산업로", "방어진순환도로", "울밀로"]
    },
    "세종특별자치시": {
        "districts": ["보람동", "한솔동", "도담동", "아름동", "종촌동", "조치원읍"],
        "roads": ["한누리대로", "갈매로", "도담로", "보듬로", "세종로"]
    },
    "경기도": {
        "districts": ["수원시 영통구", "수원시 팔달구", "성남시 분당구", "성남시 수정구", "고양시 일산동구", "용인시 수지구", "안양시 동안구", "부천시", "화성시", "남양주시", "평택시", "의정부시"],
        "roads": ["청명남로", "권광로", "성남대로", "분당로", "정발산로", "포은대로", "시민대로", "경수대로", "부천로", "동탄중앙로", "다산중앙로"]
    },
    "강원특별자치도": {
        "districts": ["춘천시", "원주시", "강릉시", "속초시", "동해시", "삼척시"],
        "roads": ["영서로", "원일로", "경강로", "동해대로", "중앙로", "속초중앙로"]
    },
    "충청북도": {
        "districts": ["청주시 상당구", "청주시 흥덕구", "충주시", "제천시", "음성군", "진천군"],
        "roads": ["상당로", "대성로", "흥덕로", "국원대로", "의림대로", "충청대로"]
    },
    "충청남도": {
        "districts": ["천안시 서북구", "천안시 동남구", "아산시", "서산시", "당진시", "공주시"],
        "roads": ["번영로", "충무로", "온천대로", "중앙로", "서해로", "금강대로"]
    },
    "전북특별자치도": {
        "districts": ["전주시 완산구", "전주시 덕진구", "군산시", "익산시", "정읍시", "남원시"],
        "roads": ["기린대로", "백제대로", "대학로", "무왕로", "충정로", "요천로"]
    },
    "전라남도": {
        "districts": ["목포시", "여수시", "순천시", "나주시", "광양시", "무안군"],
        "roads": ["영산로", "백제대로", "여서로", "중앙로", "빛가람로", "광양항강변로"]
    },
    "경상북도": {
        "districts": ["포항시 남구", "포항시 북구", "경주시", "구미시", "경산시", "안동시"],
        "roads": ["포스코대로", "중앙로", "태종로", "구미대로", "대학로", "퇴계로"]
    },
    "경상남도": {
        "districts": ["창원시 의창구", "창원시 성산구", "김해시", "진주시", "양산시", "거제시"],
        "roads": ["창원대로", "원이대로", "김해대로", "진주대로", "양산대로", "거제대로"]
    },
    "제주특별자치도": {
        "districts": ["제주시", "서귀포시"],
        "roads": ["중앙로", "연북로", "노형로", "일주동로", "일주서로", "태평로"]
    }
}

HOSPITAL_FIRST_NAMES = [
    "연세", "서울", "성모", "고려", "한양", "중앙", "아산", "경희", "바른", "속편한", 
    "튼튼", "미래", "우리", "제일", "조은", "으뜸", "삼성", "현대", "통합", "바른몸"
]

HOSPITAL_LAST_NAMES = {
    "gardasil": ["피부과의원", "산부인과의원", "여성의원", "가정의학과의원", "내과의원", "의원"],
    "shingles": ["내과의원", "가정의학과의원", "의원", "통증의학과의원", "마취통증의학과의원"],
    "manual": ["정형외과의원", "통증의학과의원", "재활의학과의원", "신경외과의원", "의원"],
    "injection": ["내과의원", "가정의학과의원", "의원", "이비인후과의원", "소아청소년과의원"]
}

TREATMENTS = {
    "gardasil": {
        "treatment": "자궁경부암 예방접종 (가다실 9가)",
        "min_price": 150000,
        "max_price": 310000,
        "step": 5000
    },
    "shingles": {
        "treatment": "대상포진 예방접종 (싱그릭스 1회)",
        "min_price": 170000,
        "max_price": 290000,
        "step": 5000
    },
    "manual": {
        "treatment": "도수치료 (1회, 60분)",
        "min_price": 50000,
        "max_price": 240000,
        "step": 10000
    },
    "injection": {
        "treatment": "영양성 수액 (마늘/신데렐라 주사)",
        "min_price": 20000,
        "max_price": 110000,
        "step": 5000
    }
}

def generate_procedural_data(count=400):
    """Generates realistic Korean hospital price data procedurally."""
    data = []
    current_id = 1
    
    # Pre-populate with unique hospital names per region to avoid duplicate names in same area
    used_names = {}

    for _ in range(count):
        # Choose a random item
        item_key = random.choice(list(TREATMENTS.keys()))
        treatment_info = TREATMENTS[item_key]
        
        # Choose a random region
        city = random.choice(list(REGIONS.keys()))
        region_info = REGIONS[city]
        district = random.choice(region_info["districts"])
        road = random.choice(region_info["roads"])
        building_num = random.randint(1, 350)
        
        # Construct address
        addr = f"{city} {district} {road} {building_num}"
        
        # Generate hospital name
        first_name = random.choice(HOSPITAL_FIRST_NAMES)
        last_name = random.choice(HOSPITAL_LAST_NAMES[item_key])
        
        # Sometime use the district name in the hospital name for realism
        if random.random() < 0.3:
            dist_short = district.split()[-1] # e.g. "영통구" -> "영통" or "일산동구" -> "일산"
            dist_short = dist_short[:-1] if dist_short.endswith(("구", "시", "읍", "동")) else dist_short
            hospital_name = f"{dist_short}{first_name}{last_name}"
        else:
            hospital_name = f"{district.split()[-1]}{first_name}{last_name}" if random.random() < 0.2 else f"{first_name}{district.split()[-1]}{last_name}"
            
        # Clean name if needed (remove duplicates/spaces)
        hospital_name = hospital_name.replace(" ", "")
        
        # Ensure name uniqueness in region
        name_key = f"{city}_{district}_{hospital_name}"
        attempts = 0
        while name_key in used_names and attempts < 10:
            first_name = random.choice(HOSPITAL_FIRST_NAMES)
            hospital_name = f"{district.split()[-1]}{first_name}{last_name}".replace(" ", "")
            name_key = f"{city}_{district}_{hospital_name}"
            attempts += 1
            
        used_names[name_key] = True
        
        # Price randomization with slight geographic adjustments
        # Gangnam/Seocho/Bundang/Songdo might have higher prices
        base_min = treatment_info["min_price"]
        base_max = treatment_info["max_price"]
        
        price_factor = 1.0
        if district in ["강남구", "서초구", "송파구", "성남시 분당구", "수원시 영통구", "해운대구"]:
            price_factor = random.uniform(1.05, 1.25)
        elif city in ["세종특별자치시", "제주특별자치도"]:
            price_factor = random.uniform(0.95, 1.1)
        else:
            price_factor = random.uniform(0.85, 1.05)
            
        price = int((base_min + (base_max - base_min) * random.random()) * price_factor)
        # Snap to step
        price = round(price / treatment_info["step"]) * treatment_info["step"]
        # Limit to min/max
        price = max(base_min, min(base_max, price))
        
        data.append({
            "id": current_id,
            "name": hospital_name,
            "city": city,
            "district": district,
            "addr": addr,
            "item": item_key,
            "treatment": treatment_info["treatment"],
            "price": price
        })
        current_id += 1
        
    return data

# ==========================================================================
# 2. AI Verification & Enhancement Function (Using Gemini)
# ==========================================================================
def enhance_data_with_ai(original_data):
    """Uses Gemini to generate some high-quality, realistic seed data or check quality."""
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        print("GEMINI_API_KEY not configured. Skipping AI enhancement and using procedural generator only.")
        return original_data

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.5-flash")
    
    prompt = """
    We are generating a highly realistic database of non-covered medical pricing (비급여 진료비) in South Korea.
    Please generate 25 realistic, unique clinics in South Korea with pricing for Gardasil 9 (가다실 9가), Shingrix (대상포진 싱그릭스), or Manual therapy (도수치료).
    Make sure to distribute them across various regions (e.g. Gwangju, Daejeon, Sejong, Gangwon, Jeju, Gyeongnam, etc.).
    
    Format the response strictly as a JSON array where each object has these keys:
    - "name": "e.g. 세종연세내과의원"
    - "city": "e.g. 세종특별자치시"
    - "district": "e.g. 보람동"
    - "addr": "e.g. 세종특별자치시 보람로 12"
    - "item": "gardasil" or "shingles" or "manual" or "injection"
    - "treatment": "자궁경부암 예방접종 (가다실 9가)" or "대상포진 예방접종 (싱그릭스 1회)" or "도수치료 (1회, 60분)" or "영양성 수액 (마늘/신데렐라 주사)"
    - "price": integer value matching realistic pricing ranges in Korea (Gardasil: 160000-300000, Shingrix: 180000-280000, Manual: 60000-200000, Injection: 30000-100000)
    
    Do NOT wrap in markdown. Just return the raw JSON array.
    """
    
    try:
        print("Requesting AI to generate realistic seed data...")
        generation_config = {"response_mime_type": "application/json"}
        response = model.generate_content(prompt, generation_config=generation_config)
        ai_clinics = json.loads(response.text)
        
        if isinstance(ai_clinics, list) and len(ai_clinics) > 0:
            print(f"Successfully generated {len(ai_clinics)} premium clinics from Gemini API!")
            
            # Start ID counter
            start_id = len(original_data) + 1
            for clinic in ai_clinics:
                clinic["id"] = start_id
                original_data.append(clinic)
                start_id += 1
                
    except Exception as e:
        print(f"Error during AI data generation: {e}. Proceeding with procedural data only.")
        
    return original_data

# ==========================================================================
# 3. Main execution
# ==========================================================================
def main():
    print("Starting data generation for mediprice.pages.dev...")
    
    # 1. Generate a large set of procedural data (~500 clinics)
    procedural_clinics = generate_procedural_data(count=550)
    print(f"Procedurally generated {len(procedural_clinics)} clinics.")
    
    # 2. Enhance with AI (adds ~25 realistic clinics if key is valid)
    final_clinics = enhance_data_with_ai(procedural_clinics)
    
    # 3. Output to data.json
    output_path = os.path.join(os.path.dirname(__file__), "data.json")
    try:
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(final_clinics, f, ensure_ascii=False, indent=2)
        print(f"Successfully wrote {len(final_clinics)} clinics to {output_path}!")
    except Exception as e:
        print(f"Error writing data.json: {e}")

if __name__ == "__main__":
    main()
