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
    process.exit(0);
  }

  const updatedData = [];
  let globalId = 1;

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
    fs.writeFileSync(outputPath, JSON.stringify(updatedData, null, 2), 'utf-8');
    console.log(`🎉 업데이트 성공! 총 ${updatedData.length}개의 최신 비급여 병원 데이터가 ${outputPath} 에 저장되었습니다.`);
  } else {
    console.error("❌ 오류: 업데이트할 새로운 데이터가 없어 작업을 중단합니다.");
  }
}

updateData();
