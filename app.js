let clinicData = [];

// ==========================================================================
// Application State
// ==========================================================================
let currentItem = "gardasil"; // Default: Gardasil
let currentCity = "전체";
let currentDistrict = "전체";
let searchQuery = "";
let currentSort = "priceAsc"; // Price Low to High

// Default recommended sessions for each item
const DEFAULT_SESSIONS = {
  "gardasil": 3,
  "shingles": 2,
  "manual": 10,
  "injection": 5
};

const ITEM_NAMES = {
  "gardasil": "가다실 9가",
  "shingles": "대상포진 (싱그릭스)",
  "manual": "도수치료",
  "injection": "마늘주사/수액"
};

// ==========================================================================
// Elements
// ==========================================================================
const themeToggle = document.getElementById("themeToggle");
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

// Calculator Elements
const calcItemName = document.getElementById("calcItemName");
const calcSessions = document.getElementById("calcSessions");
const btnSessionMinus = document.getElementById("btnSessionMinus");
const btnSessionPlus = document.getElementById("btnSessionPlus");
const calcPricePerSession = document.getElementById("calcPricePerSession");
const calcTotalCost = document.getElementById("calcTotalCost");

// ==========================================================================
// Init & Event Listeners
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  injectFaqSchema();
  
  // Fetch dynamic data.json
  fetch('data.json')
    .then(res => res.json())
    .then(data => {
      clinicData = data;
      initRegions(); // Dynamically generate region dropdown options
      resetCalculator();
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
  
  // Theme Toggle
  themeToggle.addEventListener("click", toggleTheme);

  // Category tabs
  tabButtons.forEach(btn => {
    btn.addEventListener("click", (e) => {
      tabButtons.forEach(b => b.classList.remove("active"));
      const target = e.currentTarget;
      target.classList.add("active");
      currentItem = target.dataset.item;
      
      resetCalculator();
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

  // Calculator sessions change
  calcSessions.addEventListener("input", () => {
    let val = parseInt(calcSessions.value);
    if (isNaN(val) || val < 1) val = 1;
    calcSessions.value = val;
    calculateTotalExpenses();
  });

  btnSessionMinus.addEventListener("click", () => {
    let val = parseInt(calcSessions.value) || 1;
    if (val > 1) {
      calcSessions.value = val - 1;
      calculateTotalExpenses();
    }
  });

  btnSessionPlus.addEventListener("click", () => {
    let val = parseInt(calcSessions.value) || 1;
    if (val < 99) {
      calcSessions.value = val + 1;
      calculateTotalExpenses();
    }
  });
});

// ==========================================================================
// Theme Logic (Dark/Light)
// ==========================================================================
function initTheme() {
  const savedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  
  if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
    document.body.classList.add("dark-theme");
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  } else {
    document.body.classList.remove("dark-theme");
    themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
  }
}

function toggleTheme() {
  const isDark = document.body.classList.toggle("dark-theme");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

// ==========================================================================
// Region Select Initialization (Dynamic from data.json)
// ==========================================================================
function initRegions() {
  // Extract unique cities
  const cities = ["전체", ...new Set(clinicData.map(item => item.city).filter(Boolean))];
  
  // Sort cities (with Seoul first, then alphabetical)
  cities.sort((a, b) => {
    if (a === "전체") return -1;
    if (b === "전체") return 1;
    if (a === "서울특별시") return -1;
    if (b === "서울특별시") return 1;
    return a.localeCompare(b, "ko");
  });

  citySelect.innerHTML = "";
  cities.forEach(city => {
    const opt = document.createElement("option");
    opt.value = city;
    opt.textContent = city === "전체" ? "시/도 전체" : city;
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
  
  // Extract unique districts for the selected city
  const districts = ["전체", ...new Set(
    clinicData
      .filter(item => item.city === city)
      .map(item => item.district)
      .filter(Boolean)
  )];
  
  districts.sort((a, b) => {
    if (a === "전체") return -1;
    if (b === "전체") return 1;
    return a.localeCompare(b, "ko");
  });

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
// Calculator Helpers
// ==========================================================================
function resetCalculator() {
  const defaultSessions = DEFAULT_SESSIONS[currentItem] || 1;
  calcSessions.value = defaultSessions;
  calcItemName.textContent = `${ITEM_NAMES[currentItem]} (${defaultSessions}회 기준)`;
}

function calculateTotalExpenses() {
  // Get currently displayed average price
  const avgText = valAverage.textContent.replace(/[^0-9]/g, "");
  const avgPrice = parseInt(avgText) || 0;
  
  const sessions = parseInt(calcSessions.value) || 1;
  const total = avgPrice * sessions;
  
  calcPricePerSession.textContent = formatNumber(avgPrice);
  calcTotalCost.textContent = formatNumber(total);
  calcItemName.textContent = `${ITEM_NAMES[currentItem]} (${sessions}회 기준)`;
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
  
  // Calculate expenses based on updated filters
  calculateTotalExpenses();

  if (filtered.length === 0) {
    listContainer.innerHTML = `
      <div class="no-results">
        <i class="fas fa-exclamation-triangle"></i>
        <p>조건에 맞는 병원 정보가 없습니다. 다른 지역이나 검색어를 시도해 보세요.</p>
      </div>
    `;
    return;
  }

  // Calculate local bounds for progress bars
  const prices = filtered.map(x => x.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avg = prices.reduce((sum, val) => sum + val, 0) / prices.length;
  
  filtered.forEach(clinic => {
    const card = document.createElement("div");
    card.className = "clinic-card";
    
    // Status Badge Logic
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
    
    // Calculate percentage position for relative price bar (0% is minPrice, 100% is maxPrice)
    const priceSpan = maxPrice - minPrice;
    const pct = priceSpan > 0 ? ((clinic.price - minPrice) / priceSpan) * 100 : 50;
    
    const mapQuery = `${clinic.name} ${clinic.city} ${clinic.district}`;
    const verifiedBadge = clinic.naver_verified 
      ? `<span class="verified-tag" title="네이버 지도 실제 등록 확인됨"><i class="fas fa-check-circle"></i> 지도 등록됨</span>`
      : '';

    card.innerHTML = `
      <div class="clinic-info">
        <a href="https://map.naver.com/v5/search/${encodeURIComponent(mapQuery)}" target="_blank" class="clinic-name-link" title="네이버 지도로 검색">
          <span class="clinic-name">${clinic.name}${verifiedBadge} <i class="fas fa-external-link-alt" style="font-size: 11px; margin-left: 4px; opacity: 0.6;"></i></span>
        </a>
        <a href="https://map.naver.com/v5/search/${encodeURIComponent(clinic.addr)}" target="_blank" class="clinic-addr-link" title="네이버 지도로 주소 검색">
          <span class="clinic-addr"><i class="fas fa-map-marker-alt"></i> ${clinic.addr}</span>
        </a>
        <span class="treatment-name">${clinic.treatment}</span>
      </div>
      <div class="clinic-price-area">
        <span class="price-label">비급여 진료비</span>
        <span class="price-value">${formatNumber(clinic.price)}</span>
        <div class="price-progress-wrapper">
          <div class="price-progress-container">
            <div class="price-progress-bar" style="width: 100%"></div>
            <div class="price-progress-indicator" style="left: ${pct}%" title="최저 ${formatNumber(minPrice)} ~ 최고 ${formatNumber(maxPrice)} 중 현재 가격 위치"></div>
          </div>
        </div>
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
