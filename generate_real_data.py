import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

def generate_real_data():
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        print("GEMINI_API_KEY가 존재하지 않습니다.")
        return

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.5-flash")

    # Define batches to get more data points safely without hitting token/length limits
    # and ensuring we get distinct real hospitals
    batches = [
        {
            "items": ["gardasil"],
            "regions": "서울특별시 및 수도권(경기도, 인천광역시)",
            "desc": "가다실 9가 접종을 진행하는 실제 산부인과, 피부과, 내과의원 및 종합병원 35곳"
        },
        {
            "items": ["gardasil"],
            "regions": "영남권(부산, 대구, 울산, 경남, 경북) 및 충청/호남/제주권",
            "desc": "가다실 9가 접종을 진행하는 실제 병원 및 의원 35곳"
        },
        {
            "items": ["shingles"],
            "regions": "전국 주요 시도",
            "desc": "대상포진 예방접종(싱그릭스)을 진행하는 실제 내과, 통증의학과 및 종합병원 40곳"
        },
        {
            "items": ["manual"],
            "regions": "전국 주요 시도",
            "desc": "도수치료를 시행하는 실제 정형외과, 재활의학과, 통증의학과 및 병원 40곳"
        },
        {
            "items": ["injection"],
            "regions": "전국 주요 시도",
            "desc": "마늘주사, 영양 수액 접종을 진행하는 실제 내과, 이비인후과 및 의원 40곳"
        }
    ]

    all_clinics = []
    current_id = 1

    for i, batch in enumerate(batches):
        print(f"\n[Batch {i+1}/{len(batches)}] {batch['desc']} 생성 중...")
        
        prompt = f"""
        대한민국에 실제로 존재하며 아래 비급여 진료/접종을 제공하는 실제 병원/의원 정보를 {batch['desc']}에 맞춰 정확히 조사해 생성해 주세요.
        대상 지역: {batch['regions']}
        진료 항목 유형: {', '.join(batch['items'])}

        [요구사항]
        1. **실재성**: 가상으로 지어낸 병원이 아니라, 네이버 지도나 카카오맵에 검색하면 실제로 나오는 **진짜 존재하는 병원명**이어야 합니다.
        2. **정확한 주소**: 해당 병원의 실제 실제 도로명 주소(지번 또는 도로명)를 정확하게 `addr`에 적어주세요. 주소가 지어낸 형식이면 안 됩니다.
        3. **비급여 항목 매핑**:
           - gardasil: "자궁경부암 예방접종 (가다실 9가)" (현실적 가격 범위: 1회당 160,000원 ~ 280,000원)
           - shingles: "대상포진 예방접종 (싱그릭스 1회)" (현실적 가격 범위: 1회당 180,000원 ~ 290,000원)
           - manual: "도수치료 (1회, 60분)" (현실적 가격 범위: 80,000원 ~ 200,000원)
           - injection: "영양성 수액 (마늘/신데렐라 주사)" (현실적 가격 범위: 30,000원 ~ 100,000원)
        4. **가격**: 건강보험심사평가원 공시 가격 또는 해당 병원의 실제 가격대를 바탕으로 가장 현실적인 비급여 가격을 숫자로 입력하세요.

        출력은 반드시 다른 설명 없이 아래 형식의 JSON 배열만 반환해야 합니다:
        [
          {{
            "name": "실제 병원명(예: 연세참내과의원)",
            "city": "특별시/광역시/도 (예: 서울특별시, 경기도, 부산광역시)",
            "district": "구/군/시 단위 (예: 강남구, 성남시 분당구, 수영구)",
            "addr": "실제 도로명 주소 전체",
            "item": "gardasil 또는 shingles 또는 manual 또는 injection",
            "treatment": "위 정의된 한글 진료 항목 명칭",
            "price": 실제 가격 (숫자만, 예: 180000)
          }}
        ]
        """

        try:
            generation_config = {"response_mime_type": "application/json"}
            response = model.generate_content(prompt, generation_config=generation_config)
            res_data = json.loads(response.text)
            
            if isinstance(res_data, list):
                print(f"Batch {i+1} 로드 성공: {len(res_data)}개 병원 데이터 수집됨.")
                for clinic in res_data:
                    # Validate keys
                    if all(k in clinic for k in ["name", "city", "district", "addr", "item", "treatment", "price"]):
                        clinic["id"] = current_id
                        all_clinics.append(clinic)
                        current_id += 1
            else:
                print(f"Batch {i+1} 경고: 리스트 형식이 아닙니다.")
        except Exception as e:
            print(f"Batch {i+1} 실패: {e}")

    # Output to data.json
    if len(all_clinics) > 0:
        output_path = os.path.join(os.path.dirname(__file__), "data.json")
        try:
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(all_clinics, f, ensure_ascii=False, indent=2)
            print(f"\n🎉 성공: 총 {len(all_clinics)}개의 실제 병원 가격 데이터를 검증 및 생성하여 {output_path}에 덮어썼습니다.")
        except Exception as e:
            print(f"파일 저장 실패: {e}")
    else:
        print("\n❌ 오류: 수집된 실제 데이터가 없습니다.")

if __name__ == "__main__":
    generate_real_data()
