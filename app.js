// ==========================================================================
// Mock Public Data - HIRA Non-Reimbursed Medical Prices (비급여 진료비)
// ==========================================================================
const CLINIC_DATA = [
  // 가다실 9가 (자궁경부암 백신)
  { id: 1, name: "강남바른피부과의원", city: "서울특별시", district: "강남구", addr: "서울 강남구 테헤란로 124", item: "gardasil", treatment: "자궁경부암 예방접종 (가다실 9가)", price: 160000 },
  { id: 2, name: "서초미래산부인과의원", city: "서울특별시", district: "서초구", addr: "서울 서초구 강남대로 345", item: "gardasil", treatment: "자궁경부암 예방접종 (가다실 9가)", price: 230000 },
  { id: 3, name: "송파연세가정의학과의원", city: "서울특별시", district: "송파구", addr: "서울 송파구 올림픽로 88", item: "gardasil", treatment: "자궁경부암 예방접종 (가다실 9가)", price: 185000 },
  { id: 4, name: "청담프레스티지의원", city: "서울특별시", district: "강남구", addr: "서울 강남구 압구정로 412", item: "gardasil", treatment: "자궁경부암 예방접종 (가다실 9가)", price: 310000 },
  { id: 5, name: "마포공덕내과의원", city: "서울특별시", district: "마포구", addr: "서울 마포구 마포대로 109", item: "gardasil", treatment: "자궁경부암 예방접종 (가다실 9가)", price: 210000 },
  { id: 6, name: "부산메디컬가정의학과의원", city: "부산광역시", district: "해운대구", addr: "부산 해운대구 해운대해변로 257", item: "gardasil", treatment: "자궁경부암 예방접종 (가다실 9가)", price: 170000 },
  { id: 7, name: "부산센텀여성의원", city: "부산광역시", district: "동래구", addr: "부산 동래구 중앙대로 1300", item: "gardasil", treatment: "자궁경부암 예방접종 (가다실 9가)", price: 290000 },
  { id: 8, name: "대구중앙메디컬의원", city: "대구광역시", district: "중구", addr: "대구 중구 달구벌대로 2100", item: "gardasil", treatment: "자궁경부암 예방접종 (가다실 9가)", price: 195000 },
  
  // 대상포진 예방접종 (싱그릭스)
  { id: 21, name: "연세중앙내과의원", city: "서울특별시", district: "서초구", addr: "서울 서초구 반포대로 88", item: "shingles", treatment: "대상포진 예방접종 (싱그릭스 1회)", price: 180000 },
  { id: 22, name: "삼성웰니스의원", city: "서울특별시", district: "강남구", addr: "서울 강남구 역삼로 204", item: "shingles", treatment: "대상포진 예방접종 (싱그릭스 1회)", price: 260000 },
  { id: 23, name: "명가정의학과의원", city: "서울특별시", district: "종로구", addr: "서울 종로구 대학로 120", item: "shingles", treatment: "대상포진 예방접종 (싱그릭스 1회)", price: 210000 },
  { id: 24, name: "청담드림내과의원", city: "서울특별시", district: "강남구", addr: "서울 강남구 학동로 321", item: "shingles", treatment: "대상포진 예방접종 (싱그릭스 1회)", price: 295000 },
  { id: 25, name: "일산자유내과의원", city: "경기도", district: "고양시 일산동구", addr: "경기 고양시 일산동구 정발산로 24", item: "shingles", treatment: "대상포진 예방접종 (싱그릭스 1회)", price: 190000 },
  { id: 26, name: "수원인계가정의학과의원", city: "경기도", district: "수원시 팔달구", addr: "경기 수원시 팔달구 권광로 181", item: "shingles", treatment: "대상포진 예방접종 (싱그릭스 1회)", price: 240000 },
  { id: 27, name: "부산제일내과의원", city: "부산광역시", district: "연제구", addr: "부산 연제구 중앙대로 1050", item: "shingles", treatment: "대상포진 예방접종 (싱그릭스 1회)", price: 199000 },

  // 도수치료
  { id: 41, name: "강남나눔정형외과의원", city: "서울특별시", district: "강남구", addr: "서울 강남구 도곡로 112", item: "manual", treatment: "도수치료 (1회, 60분)", price: 60000 },
  { id: 42, name: "바로정형외과의원", city: "서울특별시", district: "강남구", addr: "서울 강남구 선릉로 515", item: "manual", treatment: "도수치료 (1회, 60분)", price: 180000 },
  { id: 43, name: "마포탑정형외과의원", city: "서울특별시", district: "마포구", addr: "서울 마포구 독막로 311", item: "manual", treatment: "도수치료 (1회, 60분)", price: 130000 },
  { id: 44, name: "광화문도수치료의원", city: "서울특별시", district: "종로구", addr: "서울 종로구 새문안로 92", item: "manual", treatment: "도수치료 (1회, 60분)", price: 240000 },
  { id: 45, name: "인천연수통증정형외과의원", city: "인천광역시", district: "연수구", addr: "인천 연수구 벚꽃로 130", item: "manual", treatment: "도수치료 (1회, 60분)", price: 90000 },
  { id: 46, name: "수원연세통증의학과의원", city: "경기도", district: "수원시 영통구", addr: "경기 수원시 영통구 봉영로 1612", item: "manual", treatment: "도수치료 (1회, 60분)", price: 150000 },
  { id: 47, name: "대구반월당정형외과의원", city: "대구광역시", district: "중구", addr: "대구 중구 달구벌대로 2100", item: "manual", treatment: "도수치료 (1회, 60분)", price: 80000 },

  // 마늘주사/수액
  { id: 61, name: "강남연세의원", city: "서울특별시", district: "강남구", addr: "서울 강남구 테헤란로 311", item: "injection", treatment: "영양성 수액 (마늘/신데렐라 주사)", price: 20000 },
  { id: 62, name: "역삼가정의학과의원", city: "서울특별시", district: "강남구", addr: "서울 강남구 테헤란로 156", item: "injection", treatment: "영양성 수액 (마늘/신데렐라 주사)", price: 70000 },
  { id: 63, name: "여의도힐링의원", city: "서울특별시", district: "영등포구", addr: "서울 영등포구 여의대방로 383", item: "injection", treatment: "영양성 수액 (마늘/신데렐라 주사)", price: 50000 },
  { id: 64, name: "압구정프리미어의원", city: "서울특별시", district: "강남구", addr: "서울 강남구 압구정로 321", item: "injection", treatment: "영양성 수액 (마늘/신데렐라 주사)", price: 110000 },
  { id: 65, name: "성남모란의원", city: "경기도", district: "성남시 수정구", addr: "경기 성남시 수정구 성남대로 1180", item: "injection", treatment: "영양성 수액 (마늘/신데렐라 주사)", price: 30000 },
  { id: 66, name: "부산서면메디컬의원", city: "부산광역시", district: "부산진구", addr: "부산 부산진구 가야대로 772", item: "injection", treatment: "영양성 수액 (마늘/신데렐라 주사)", price: 40000 },
];

// 행정구역 데이터
const REGION_DATA = {
  "전체": [],
  "서울특별시": ["전체", "강남구", "서초구", "송파구", "마포구", "종로구", "영등포구"],
  "부산광역시": ["전체", "해운대구", "동래구", "연제구", "부산진구"],
  "대구광역시": ["전체", "중구"],
  "인천광역시": ["전체", "연수구"],
  "경기도": ["전체", "고양시 일산동구", "수원시 팔달구", "수원시 영통구", "성남시 수정구"]
};

// ==========================================================================
// Application State
// ==========================================================================
let currentItem = "gardasil"; // Default: Gardasil
let currentCity = "전체";
let currentDistrict = "전체";
let searchQuery = "";
let currentSort = "priceAsc"; // Price Low to High

// ==========================================================================
// Elements
// ==========================================================================
const tabButtons = document.querySelectorAll(".tab-btn");
const citySelect = document.getElementById("citySelect");
const districtSelect = document.getElementById("districtSelect");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const resultsCount = document.getElementById("resultsCount");
const listContainer = document.getElementById("listContainer");

const valLowest = document.getElementById("valLowest");
const valAverage = document.getElementById("valAverage");
const valHighest = document.getElementById("valHighest");

// ==========================================================================
// Init & Event Listeners
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  initRegions();
  render();
  injectFaqSchema();
  
  // Category tabs
  tabButtons.forEach(btn => {
    btn.addEventListener("click", (e) => {
      tabButtons.forEach(b => b.classList.remove("active"));
      const target = e.currentTarget;
      target.classList.add("active");
      currentItem = target.dataset.item;
      render();
    });
  });

  // City change
  citySelect.addEventListener("change", (e) => {
    currentCity = e.target.value;
    updateDistrictOptions(currentCity);
    currentDistrict = "전체";
    render();
  });

  // District change
  districtSelect.addEventListener("change", (e) => {
    currentDistrict = e.target.value;
    render();
  });

  // Search input
  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    render();
  });

  // Sorting
  sortSelect.addEventListener("change", (e) => {
    currentSort = e.target.value;
    render();
  });
});

// ==========================================================================
// Helper Functions
// ==========================================================================
function initRegions() {
  citySelect.innerHTML = "";
  Object.keys(REGION_DATA).forEach(city => {
    const opt = document.createElement("option");
    opt.value = city;
    opt.textContent = city;
    citySelect.appendChild(opt);
  });
  updateDistrictOptions("전체");
}

function updateDistrictOptions(city) {
  districtSelect.innerHTML = "";
  if (city === "전체") {
    const opt = document.createElement("option");
    opt.value = "전체";
    opt.textContent = "시/군/구 선택";
    districtSelect.appendChild(opt);
    districtSelect.disabled = true;
    return;
  }
  
  districtSelect.disabled = false;
  const districts = REGION_DATA[city] || [];
  districts.forEach(dist => {
    const opt = document.createElement("option");
    opt.value = dist;
    opt.textContent = dist === "전체" ? "전체 구군" : dist;
    districtSelect.appendChild(opt);
  });
}

function formatNumber(num) {
  return new Intl.NumberFormat().format(num) + "원";
}

// ==========================================================================
// Core Render Logic
// ==========================================================================
function render() {
  // 1. Filtering
  let filtered = CLINIC_DATA.filter(item => item.item === currentItem);
  
  if (currentCity !== "전체") {
    filtered = filtered.filter(item => item.city === currentCity);
  }
  
  if (currentDistrict !== "전체") {
    filtered = filtered.filter(item => item.district === currentDistrict);
  }
  
  if (searchQuery) {
    filtered = filtered.filter(item => 
      item.name.toLowerCase().includes(searchQuery) || 
      item.addr.toLowerCase().includes(searchQuery)
    );
  }
  
  // 2. Metrics summary
  calculateSummary(filtered);

  // 3. Sorting
  if (currentSort === "priceAsc") {
    filtered.sort((a, b) => a.price - b.price);
  } else if (currentSort === "priceDesc") {
    filtered.sort((a, b) => b.price - a.price);
  } else if (currentSort === "nameAsc") {
    filtered.sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }

  // 4. Render DOM
  resultsCount.textContent = `검색 결과: ${filtered.length}건`;
  listContainer.innerHTML = "";
  
  if (filtered.length === 0) {
    listContainer.innerHTML = `
      <div class="no-results">
        <i class="fas fa-exclamation-triangle"></i>
        <p>조건에 맞는 병원 정보가 없습니다. 다른 지역이나 검색어를 시도해 보세요.</p>
      </div>
    `;
    return;
  }

  // Calculate local average to determine lowest/highest thresholds
  const prices = filtered.map(x => x.price);
  const avg = prices.reduce((sum, val) => sum + val, 0) / prices.length;
  
  filtered.forEach(clinic => {
    const card = document.createElement("div");
    card.className = "clinic-card";
    
    // Status Badge Logic (For Clickbait)
    let badgeClass = "warn";
    let badgeText = "평균 수준";
    
    // Thresholds
    if (clinic.price <= avg * 0.85) {
      badgeClass = "safe";
      badgeText = "최저가 안심";
    } else if (clinic.price >= avg * 1.15) {
      badgeClass = "danger";
      badgeText = "최고가 주의";
    }
    
    card.innerHTML = `
      <div class="clinic-info">
        <span class="clinic-name">${clinic.name}</span>
        <span class="clinic-addr"><i class="fas fa-map-marker-alt"></i> ${clinic.addr}</span>
        <span class="treatment-name">${clinic.treatment}</span>
      </div>
      <div class="clinic-price-area">
        <span class="price-label">비급여 진료비</span>
        <span class="price-value">${formatNumber(clinic.price)}</span>
      </div>
      <div class="clinic-status-area">
        <span class="price-badge ${badgeClass}">
          <i class="fas ${badgeClass === 'safe' ? 'fa-check-circle' : badgeClass === 'danger' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
          ${badgeText}
        </span>
      </div>
    `;
    listContainer.appendChild(card);
  });
}

function calculateSummary(data) {
  if (data.length === 0) {
    valLowest.textContent = "0원";
    valAverage.textContent = "0원";
    valHighest.textContent = "0원";
    return;
  }
  
  const prices = data.map(x => x.price);
  const lowest = Math.min(...prices);
  const highest = Math.max(...prices);
  const average = Math.round(prices.reduce((sum, val) => sum + val, 0) / prices.length);
  
  valLowest.textContent = formatNumber(lowest);
  valAverage.textContent = formatNumber(average);
  valHighest.textContent = formatNumber(highest);
}

// ==========================================================================
// SEO JSON-LD FAQ Schema Auto-Injection
// ==========================================================================
function injectFaqSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "병원마다 비급여 가다실9가나 예방접종 주사 가격 차이가 왜 이렇게 큰가요?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "가다실 9가, 대상포진 예방접종(싱그릭스), 도수치료 등은 건강보험이 적용되지 않는 '비급여' 진료 항목에 속합니다. 비급여 항목은 보건복지부 규정에 따라 병원의 시설, 전문의 인건비, 서비스 수준에 맞게 병원장이 자율적으로 진료비를 책정할 수 있어 병원별 가격 편차가 최대 2배에서 3배까지 발생할 수 있습니다."
        }
      },
      {
        "@type": "Question",
        "name": "비급여 진료비 바가지를 예방하려면 어떻게 해야 하나요?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "예방접종이나 비급여 치료를 받기 전에 메디프라이스(MediPrice) 및 건강보험심사평가원(심평원)의 공공 데이터를 활용하여 거주하시는 지역의 평균 단가 및 의원별 최고가/최저가 가격을 미리 검색하고 가격 안심 등급을 체크한 뒤 병원에 문의하시는 것이 안전합니다."
        }
      }
    ]
  };

  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.text = JSON.stringify(schema);
  document.head.appendChild(script);
}
