const fs = require('fs');
const path = require('path');

// ==========================================================================
// HIRA API Configurations & Endpoint
// ==========================================================================
const API_KEY = process.env.HIRA_API_KEY;
const API_URL = "http://apis.data.go.kr/B551182/nonPaymentDamtInfoService/getNonPaymentItemHospList2";

// Mapping standard HIRA item codes (brdId)
const TARGET_ITEMS = [
  { itemCode: "gardasil", brdId: "3Z5201003", displayName: "자궁경부암 예방접종 (가다실 9가)" },
  { itemCode: "shingles", brdId: "3Z5200303", displayName: "대상포진 예방접종 (싱그릭스 1회)" },
  { itemCode: "manual", brdId: "MX1220000", displayName: "도수치료 (1회, 60분)" },
  { itemCode: "skyzoster", brdId: "3Z5200301", displayName: "대상포진 예방접종 (스카이조스터)" }
];

async function updateData() {
  console.log("🚀 메디프라이스 HIRA API 데이터 업데이트 프로세스 시작...");

  if (!API_KEY) {
    console.error("❌ 오류: HIRA_API_KEY 환경변수가 설정되지 않았습니다.");
    console.log("ℹ️ GitHub Actions의 Secrets 설정에 HIRA_API_KEY를 등록했는지 확인해 주세요.");
    console.log("ℹ️ 주간 자동 업데이트 파이프라인 구성을 위해 기본 데이터는 유지합니다.");
    process.exit(1);
  }

  const updatedData = [];
  let globalId = 1;
  let lastApiHeader = null;

  for (const target of TARGET_ITEMS) {
    console.log(`📡 HIRA API 호출 중: [${target.displayName}] 코드 = ${target.brdId}`);
    
    let allItems = [];
    let page = 1;
    let hasMore = true;

    // 1. Try querying with itemCd with paging
    while (hasMore) {
      const params = new URLSearchParams({
        serviceKey: API_KEY,
        pageNo: page.toString(),
        numOfRows: "1000",
        _type: "json",
        itemCd: target.brdId
      });

      try {
        let response = await fetch(`${API_URL}?${params.toString()}`);
        if (response.ok) {
          const resJson = await response.json();
            if (resJson.response?.header) lastApiHeader = resJson.response.header;
          if (resJson.response?.header) lastApiHeader = resJson.response.header;
          const items = resJson.response?.body?.items?.item;
          if (items) {
            const itemList = Array.isArray(items) ? items : [items];
            allItems = allItems.concat(itemList);
            console.log(`   페이지 ${page} 완료: ${itemList.length}개 항목 추가됨`);
            if (itemList.length < 1000) {
              hasMore = false;
            } else {
              page++;
            }
          } else {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      } catch (e) {
        console.log(`⚠️ itemCd query page ${page} failed: ${e.message}`);
        hasMore = false;
      }
    }

    // 2. Fallback to npayCd if no items found
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

        try {
          let response = await fetch(`${API_URL}?${params.toString()}`);
          if (response.ok) {
            const resJson = await response.json();
            const items = resJson.response?.body?.items?.item;
            if (items) {
              const itemList = Array.isArray(items) ? items : [items];
              allItems = allItems.concat(itemList);
              console.log(`   [Fallback] 페이지 ${page} 완료: ${itemList.length}개 항목 추가됨`);
              if (itemList.length < 1000) {
                hasMore = false;
              } else {
                page++;
              }
            } else {
              hasMore = false;
            }
          } else {
            hasMore = false;
          }
        } catch (e) {
          console.log(`⚠️ npayCd query fallback page ${page} failed: ${e.message}`);
          hasMore = false;
        }
      }
    }

    if (allItems.length === 0) {
      console.log(`⚠️ 주의: [${target.displayName}]에 해당하는 API 데이터가 없습니다.`);
      // 진단: API가 준 헤더 코드/메시지를 남긴다 (키 오류/코드 변경/데이터 없음 구분)
      if (lastApiHeader) {
        console.log(`   → API 응답 헤더: resultCode=${lastApiHeader.resultCode}, resultMsg=${lastApiHeader.resultMsg}`);
      }
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
      }
    });
  }

  if (updatedData.length > 0) {
    const outputPath = path.join(__dirname, 'data.json');
    let hasChanged = true;

    // 안전장치: 기존 데이터 대비 50% 미만으로 급감하면 덮어쓰지 않고 실패 처리
    // (API 파라미터/코드 변경으로 인한 데이터 유실 방지)
    if (fs.existsSync(outputPath)) {
      try {
        const existingCount = JSON.parse(fs.readFileSync(outputPath, 'utf-8')).length;
        if (existingCount > 0 && updatedData.length < existingCount * 0.5) {
          console.error(`❌ 오류: 가져온 데이터(${updatedData.length}개)가 기존(${existingCount}개)의 50% 미만입니다. 덮어쓰지 않고 중단합니다. HIRA API 코드/파라미터 변경 여부를 확인해 주세요.`);
          process.exit(1);
        }
      } catch (e) {
        // 기존 파일 파싱 실패 시 가드 생략
      }
    }
    
    if (fs.existsSync(outputPath)) {
      try {
        const existingRaw = fs.readFileSync(outputPath, 'utf-8');
        const existingData = JSON.parse(existingRaw);
        if (JSON.stringify(updatedData) === JSON.stringify(existingData)) {
          hasChanged = false;
        }
      } catch (e) {
        // Parsing error, overwrite
      }
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
      
      console.log(`🎉 업데이트 성공! 데이터가 변경되어 총 ${updatedData.length}개의 최신 비급여 병원 데이터와 last-updated.json이 업데이트되었습니다.`);
    } else {
      console.log("ℹ️ HIRA API 데이터가 이전 데이터와 동일합니다. 파일 쓰기를 건너뜁니다.");
      // 데이터 변경이 없는 주에도 커밋이 발생하도록 하트비트 파일을 남깁니다.
      // (60일간 저장소 활동이 없으면 GitHub이 스케줄 워크플로를 자동 비활성화하는 것을 방지)
      const hbNow = new Date();
      const hbKst = new Date(hbNow.getTime() + 9 * 60 * 60 * 1000);
      fs.writeFileSync(path.join(__dirname, '.github', 'last-successful-run.txt'), `Last successful HIRA fetch (no data change): ${hbKst.toISOString().replace('T', ' ').slice(0, 16)} KST\n`, 'utf-8');
      console.log("ℹ️ 하트비트 파일(.github/last-successful-run.txt)을 업데이트했습니다.");
    }
  } else {
    console.error("❌ 오류: 업데이트할 새로운 데이터가 없어 작업을 중단합니다.");
    process.exit(1);
  }
}

updateData();
