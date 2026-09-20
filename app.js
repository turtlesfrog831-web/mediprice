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
  
  // Fetch dynamic data.json
  fetch('data.json')
    .then(res => res.json())
    .then(data => {
      clinicData = dropOutliers(data);
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

  // Fetch last-updated date metadata
  fetch('last-updated.json')
    .then(res => res.json())
    .then(meta => {
      const dateEl = document.getElementById("lastUpdatedDate");
      if (dateEl && meta.lastUpdated) {
        dateEl.textContent = meta.lastUpdated;
      }
    })
    .catch(() => {
      const dateEl = document.getElementById("lastUpdatedDate");
      if (dateEl) {
        // Fallback message if last-updated.json is not found
        dateEl.textContent = "최근 일요일 업데이트 완료";
      }
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

// 항목별 중앙값의 20% 미만은 단위 오류로 보고 제외 (도수치료 2,000원, 스카이조스터 8,314원 등)
function median(arr) {
  const s = [...arr].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function dropOutliers(data) {
  const floor = {};
  const byItem = {};
  data.forEach(x => (byItem[x.item] = byItem[x.item] || []).push(x.price));
  Object.keys(byItem).forEach(k => (floor[k] = median(byItem[k]) * 0.2));
  return data.filter(x => x.price >= floor[x.item]);
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
  moreBtn.hidden = true;

  const spread = document.getElementById("spreadNotice");
  if (filtered.length === 0) {
    if (spread) spread.textContent = "병원마다 비급여 가격 차이가 큽니다";
    listContainer.innerHTML = `
      <div class="no-results">
        <i class="fas fa-exclamation-triangle"></i>
        <p>조건에 맞는 병원 정보가 없습니다. 다른 지역이나 검색어를 시도해 보세요.</p>
      </div>
    `;
    return;
  }

  // 배지 기준: 조회 조건 내 중앙값 (극단값에 덜 흔들림)
  const prices = filtered.map(x => x.price);
  const med = median(prices);
  if (spread) {
    const ratio = Math.max(...prices) / Math.min(...prices);
    spread.textContent = filtered.length > 1
      ? `현재 조회 조건에서 최저가와 최고가는 ${ratio.toFixed(1)}배 차이`
      : "조회 결과가 1건입니다";
  }

  visible = filtered;
  shown = 0;
  showMore(med);
  moreHandler = () => showMore(med);
}

const PAGE_SIZE = 50;
let visible = [];
let shown = 0;
let moreHandler = null;
const moreBtn = document.createElement("button");
moreBtn.className = "more-btn";
moreBtn.hidden = true;
moreBtn.addEventListener("click", () => moreHandler && moreHandler());
listContainer.after(moreBtn);

function showMore(med) {
  visible.slice(shown, shown + PAGE_SIZE).forEach(c => listContainer.appendChild(buildCard(c, med)));
  shown = Math.min(shown + PAGE_SIZE, visible.length);
  moreBtn.hidden = shown >= visible.length;
  moreBtn.textContent = `더 보기 (${shown} / ${visible.length})`;
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function icon(cls) {
  const i = document.createElement("i");
  i.className = cls;
  return i;
}

function buildCard(clinic, med) {
  let badgeClass = "warn";
  let badgeText = "평균 수준";
  let badgeIcon = "fa-info-circle";
  if (clinic.price <= med * 0.85) {
    badgeClass = "safe";
    badgeText = "평균 대비 저렴";
    badgeIcon = "fa-check-circle";
  } else if (clinic.price >= med * 1.15) {
    badgeClass = "danger";
    badgeText = "평균 대비 높음";
    badgeIcon = "fa-exclamation-circle";
  }

  const card = el("div", "clinic-card");

  const info = el("div", "clinic-info");
  info.appendChild(el("span", "clinic-name", clinic.name));
  const addr = el("span", "clinic-addr");
  addr.append(icon("fas fa-map-marker-alt"), " " + clinic.addr);
  info.append(addr, el("span", "treatment-name", clinic.treatment));

  const priceArea = el("div", "clinic-price-area");
  priceArea.append(el("span", "price-label", "비급여 진료비"), el("span", "price-value", formatNumber(clinic.price)));

  const status = el("div", "clinic-status-area");
  const badge = el("span", "price-badge " + badgeClass);
  badge.append(icon("fas " + badgeIcon), " " + badgeText);
  const share = el("button", "share-card-btn");
  share.append(icon("fas fa-share-alt"), " 공유하기");
  share.addEventListener("click", () => shareClinic(clinic.name, clinic.treatment, clinic.price));
  status.append(badge, share);

  card.append(info, priceArea, status);
  return card;
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



function shareClinic(name, treatment, price) {
  const shareText = `[메디프라이스] 비급여 진료비 비교 정보!\n🏥 병원: ${name}\n🩺 항목: ${treatment}\n💵 가격: ${new Intl.NumberFormat().format(price)}원\n\n우리 동네 비급여 최저가 병원 찾기: https://mediprice.pages.dev`;
  
  if (navigator.share) {
    navigator.share({
      title: '메디프라이스 비급여 가격 정보',
      text: shareText,
      url: 'https://mediprice.pages.dev'
    }).catch(err => console.log(err));
  } else {
    // Fallback: Copy to clipboard
    navigator.clipboard.writeText(shareText).then(() => {
      alert("병원 가격 정보가 클립보드에 복사되었습니다! 카카오톡 등 원하는 곳에 붙여넣어 공유해 보세요.");
    }).catch(err => {
      console.error("복사 실패:", err);
    });
  }
}

window.shareClinic = shareClinic;
