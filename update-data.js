const fs = require('fs');
const path = require('path');

// ==========================================================================
// HIRA API Configurations & Endpoint
// ==========================================================================
const API_KEY = process.env.HIRA_API_KEY;
const API_URL = "http://apis.data.go.kr/B551182/nonPaymentDamtInfoService/getNonPaymentItemHospList2";

const FETCH_TIMEOUT_MS = 60000;   // 한 페이지 요청 타임아웃
const MAX_ATTEMPTS = 4;           // 재시도 포함 총 시도 횟수 (HIRA는 동시 요청 폭주 시 ResourceLimitException을 자주 냅니다)
const RETRY_BASE_MS = 5000;       // 5s, 10s, 20s 백오프

// Mapping standard HIRA item codes (brdId)
const TARGET_ITEMS = [
  { itemCode: "gardasil", brdId: "3Z5201003", displayName: "자궁경부암 예방접종 (가다실 9가)" },
  { itemCode: "shingles", brdId: "3Z5200303", displayName: "대상포진 예방접종 (싱그릭스 1회)" },
  { itemCode: "manual", brdId: "MX1220000", displayName: "도수치료 (1회, 60분)" },
  { itemCode: "skyzoster", brdId: "3Z5200301", displayName: "대상포진 예방접종 (스카이조스터)" }
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// API 응답 헤더의 resultCode가 정상(00)이 아니면 시스템 오류로 보고 재시도 대상으로 판단합니다.
function isRetryableHeader(header) {
  if (!header) return false;
  const code = String(header.resultCode || "");
  return code !== "" && code !== "00";
}

// 한 페이지를 가져옵니다. 네트워크 오류·타임아웃·일시적 API 오류는 백오프 후 재시도합니다.
async function fetchPage(params, label) {
  let lastError = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(`${API_URL}?${params.toString()}`, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
      });

      if (!response.ok) {
        lastError = `HTTP ${response.status}`;
      } else {
        const resJson = await response.json();
        const header = resJson.response?.header;
        const items = resJson.response?.body?.items?.item;

        if (items) {
          return { items: Array.isArray(items) ? items : [items], header };
        }
        if (isRetryableHeader(header)) {
          lastError = `resultCode=${header.resultCode}, resultMsg=${header.resultMsg}`;
        } else {
          // 정상 응답이지만 해당 페이지에 데이터가 없음 (마지막 페이지)
          return { items: [], header };
        }
      }
    } catch (e) {
      lastError = `${e.name === "TimeoutError" ? "timeout" : e.message}`;
    }

    if (attempt < MAX_ATTEMPTS) {
      const waitMs = RETRY_BASE_MS * Math.pow(2, attempt - 1);
      console.log(`   ↻ ${label} 응답 실패(${lastError}) — ${waitMs / 1000}초 후 재시도 (${attempt}/${MAX_ATTEMPTS})`);
      await sleep(waitMs);
    }
  }

  console.log(`   ✖ ${label} 최종 실패: ${lastError}`);
  return { items: null, header: null, error: lastError };
}

async function collectItem(target) {
  let allItems = [];
  let page = 1;
  let hasMore = true;
  let lastHeader = null;

  // 1. itemCd 로 페이지를 넘겨가며 수집
  while (hasMore) {
    const params = new URLSearchParams({
      serviceKey: API_KEY,
      pageNo: page.toString(),
      numOfRows: "1000",
      _type: "json",
      itemCd: target.brdId
    });

    const { items, header, error } = await fetchPage(params, `[${target.displayName}] itemCd p${page}`);
    if (items === null) return { data: [], header, error };

    if (header) lastHeader = header;
    if (items.length === 0) {
      hasMore = false;
      break;
    }

    allItems = allItems.concat(items);
    console.log(`   페이지 ${page} 완료: ${items.length}개 항목 추가됨`);
    if (items.length < 1000) {
      hasMore = false;
    } else {
      page++;
    }
  }

  // 2. itemCd 결과가 없으면 npayCd 로 한 번 더 시도
  if (allItems.length === 0) {
    page = 1;
    hasMore = true;
    while (hasMore) {
      const params = new URLSearchParams({
        serviceKey: API_KEY,
        pageNo: page.toString(),
        numOfRows: "1000",
        _type: "json",
        npayCd: target.brdId
      });

      const { items, header, error } = await fetchPage(params, `[${target.displayName}] npayCd p${page}`);
      if (items === null) return { data: [], header, error };

      if (header) lastHeader = header;
      if (items.length === 0) {
        hasMore = false;
        break;
      }

      allItems = allItems.concat(items);
      console.log(`   [Fallback] 페이지 ${page} 완료: ${items.length}개 항목 추가됨`);
      if (items.length < 1000) {
        hasMore = false;
      } else {
        page++;
      }
    }
  }

  return { data: allItems, header: lastHeader };
}

async function updateData() {
  console.log("🚀 메디프라이스 HIRA API 데이터 업데이트 프로세스 시작...");

  if (!API_KEY) {
    console.error("❌ 오류: HIRA_API_KEY 환경변수가 설정되지 않았습니다.");
    console.log("ℹ️ GitHub Actions의 Secrets 설정에 HIRA_API_KEY를 등록했는지 확인해 주세요.");
    console.log("ℹ️ 주간 자동 업데이트 파이프라인 구성을 위해 기본 데이터는 유지합니다.");
    process.exit(1);
  }

  const outputPath = path.join(__dirname, 'data.json');

  // 기존 데이터 (항목별 개수 비교용)
  let existingData = [];
  if (fs.existsSync(outputPath)) {
    try {
      existingData = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
    } catch (e) {
      existingData = [];
    }
  }
  const existingCountByItem = {};
  existingData.forEach((row) => {
    existingCountByItem[row.item] = (existingCountByItem[row.item] || 0) + 1;
  });

  const updatedData = [];
  const countByItem = {};
  let globalId = 1;
  const failedItems = [];

  for (const target of TARGET_ITEMS) {
    console.log(`📡 HIRA API 호출 중: [${target.displayName}] 코드 = ${target.brdId}`);

    const { data: allItems, header, error } = await collectItem(target);

    if (error) {
      console.log(`⚠️ [${target.displayName}] API 호출이 재시도 후에도 실패했습니다: ${error}`);
      failedItems.push(target.displayName);
      continue;
    }

    if (allItems.length === 0) {
      console.log(`⚠️ 주의: [${target.displayName}]에 해당하는 API 데이터가 없습니다.`);
      if (header) {
        console.log(`   → API 응답 헤더: resultCode=${header.resultCode}, resultMsg=${header.resultMsg}`);
      }
      failedItems.push(target.displayName);
      continue;
    }

    console.log(`✅ [${target.displayName}] 파싱 성공: 총 ${allItems.length}개 데이터 확보`);

    allItems.forEach(apiItem => {
      const clinicName = apiItem.yadmNm;
      const district = apiItem.sgguCdNm || "전체";
      let city = apiItem.sidoCdNm;

      // Normalize Gwangju / Jeonnam split
      if (city === "전남광주") {
        if (district.startsWith("광주")) {
          city = "광주";
        } else {
          city = "전남";
        }
      }
      if (city === "세종시") city = "세종";

      const addr = apiItem.addr || `${city} ${district}`;
      const price = parseInt(apiItem.minPrc || apiItem.minDamt || apiItem.maxPrc || apiItem.maxDamt || apiItem.curAmt || 0, 10);

      if (clinicName && city && price > 0) {
        updatedData.push({
          id: globalId++,
          name: clinicName,
          city: city,
          district: district,
          addr: addr,
          item: target.itemCode,
          treatment: target.displayName,
          price: price
        });
        countByItem[target.itemCode] = (countByItem[target.itemCode] || 0) + 1;
      }
    });
  }

  // 한 항목이라도 실패하면 부분 데이터로 덮어쓰지 않습니다.
  // (예전에는 항목 하나가 통째로 빠져도 총량 50%만 넘으면 통과해, 해당 항목이 사이트에서 조용히 사라졌습니다)
  if (failedItems.length > 0) {
    console.error(`❌ 오류: 다음 항목을 가져오지 못했습니다 → ${failedItems.join(', ')}`);
    console.error("❌ 부분 데이터로 기존 data.json을 덮어쓰지 않고 중단합니다. (기존 데이터 유지)");
    process.exit(1);
  }

  // 항목별 급감 가드: 기존 대비 50% 미만이면 실패 처리
  const shrunk = Object.keys(existingCountByItem).filter((item) => {
    const before = existingCountByItem[item] || 0;
    const after = countByItem[item] || 0;
    return before > 0 && after < before * 0.5;
  });
  if (shrunk.length > 0) {
    console.error(`❌ 오류: 항목별 데이터가 절반 미만으로 줄었습니다 → ${shrunk.map(i => `${i}(${existingCountByItem[i]}→${countByItem[i] || 0})`).join(', ')}`);
    console.error("❌ 덮어쓰지 않고 중단합니다. HIRA API 코드/파라미터 변경 여부를 확인해 주세요.");
    process.exit(1);
  }

  // 전체 급감 가드
  if (existingData.length > 0 && updatedData.length < existingData.length * 0.5) {
    console.error(`❌ 오류: 가져온 데이터(${updatedData.length}개)가 기존(${existingData.length}개)의 50% 미만입니다. 덮어쓰지 않고 중단합니다. HIRA API 코드/파라미터 변경 여부를 확인해 주세요.`);
    process.exit(1);
  }

  if (updatedData.length === 0) {
    console.error("❌ 오류: 업데이트할 새로운 데이터가 없어 작업을 중단합니다.");
    process.exit(1);
  }

  let hasChanged = true;
  if (JSON.stringify(updatedData) === JSON.stringify(existingData)) {
    hasChanged = false;
  }

  if (hasChanged) {
    fs.writeFileSync(outputPath, JSON.stringify(updatedData, null, 2), 'utf-8');

    // Write last updated date in KST (UTC+9)
    const dateObj = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstDate = new Date(dateObj.getTime() + kstOffset);
    const dateStr = kstDate.toISOString().split('T')[0];
    const updateInfo = { lastUpdated: dateStr };
    fs.writeFileSync(path.join(__dirname, 'last-updated.json'), JSON.stringify(updateInfo, null, 2), 'utf-8');

    console.log(`🎉 업데이트 성공! 총 ${updatedData.length}개 비급여 병원 데이터와 last-updated.json을 갱신했습니다.`);
    console.log(`   항목별: ${Object.keys(countByItem).map(k => `${k}=${countByItem[k]}`).join(', ')}`);
  } else {
    console.log("ℹ️ HIRA API 데이터가 이전 데이터와 동일합니다. 파일 쓰기를 건너뜁니다.");
    // 데이터 변경이 없는 주에도 커밋이 발생하도록 하트비트 파일을 남깁니다.
    // (60일간 저장소 활동이 없으면 GitHub이 스케줄 워크플로를 자동 비활성화하는 것을 방지)
    const hbNow = new Date();
    const hbKst = new Date(hbNow.getTime() + 9 * 60 * 60 * 1000);
    fs.mkdirSync(path.join(__dirname, '.github'), { recursive: true });
    fs.writeFileSync(path.join(__dirname, '.github', 'last-successful-run.txt'), `Last successful HIRA fetch (no data change): ${hbKst.toISOString().replace('T', ' ').slice(0, 16)} KST\n`, 'utf-8');
    console.log("ℹ️ 하트비트 파일(.github/last-successful-run.txt)을 업데이트했습니다.");
  }
}

updateData();
