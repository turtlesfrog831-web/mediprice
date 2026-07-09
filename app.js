let clinicData = [];

// 행정구역 데이터 (data.json에서 동적으로 추출하여 채워집니다)
let REGION_DATA = {
  "전체": []
};

const CITY_NAMES = {
  "전체": "시/도 선택",
  "서울": "서울특별시",
  "부산": "부산광역시",
  "대구": "대구광역시",
  "인천": "인천광역시",
  "광주": "광주광역시",
  "대전": "대전광역시",
  "울산": "울산광역시",
  "세종": "세종특별자치시",
  "경기": "경기도",
  "강원": "강원특별자치도",
  "충북": "충청북도",
  "충남": "충청남도",
  "전북": "전북특별자치도",
  "전남": "전라남도",
  "경북": "경상북도",
  "경남": "경상남도",
  "제주": "제주특별자치도"
};

function buildRegionData() {
  REGION_DATA = { "전체": [] };
  
  clinicData.forEach(item => {
    const city = item.city;
    const district = item.district;
    
    if (city) {
      if (!REGION_DATA[city]) {
        REGION_DATA[city] = new Set();
      }
      if (district) {
        REGION_DATA[city].add(district);
      }
    }
  });
  
  // Set을 정렬된 배열로 변환하고 맨 앞에 '전체' 추가
  Object.keys(REGION_DATA).forEach(city => {
    if (city !== "전체") {
      const districtsArr = Array.from(REGION_DATA[city]).sort();
      REGION_DATA[city] = ["전체", ...districtsArr];
    }
  });
}

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
  injectFaqSchema();
  
  // Fetch dynamic data.json
  fetch('data.json')
    .then(res => res.json())
    .then(data => {
      clinicData = data;
      buildRegionData();
      initRegions();
      render();
    })
    .catch(err => {
      console.error("데이터 로딩 실패:", err);
      listContainer.innerHTML = `
        <div class="no-results">
          <i class="fas fa-exclamation-triangle"></i>
          <p>병원 데이터 로딩에 실패했습니다. 새로고침해 주세요.</p>
        </div>
      `;
    });
  
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
  
  const sortedCities = Object.keys(REGION_DATA).sort((a, b) => {
    if (a === "전체") return -1;
    if (b === "전체") return 1;
    
    const nameA = CITY_NAMES[a] || a;
    const nameB = CITY_NAMES[b] || b;
    return nameA.localeCompare(nameB, "ko");
  });
  
  sortedCities.forEach(city => {
    const opt = document.createElement("option");
    opt.value = city;
    opt.textContent = CITY_NAMES[city] || city;
    citySelect.appendChild(opt);
  });
  
  citySelect.value = currentCity;
  updateDistrictOptions(currentCity);
  districtSelect.value = currentDistrict;
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
  let filtered = clinicData.filter(item => item.item === currentItem);
  
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
