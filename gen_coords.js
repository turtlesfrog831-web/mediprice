// 병원 위치(위경도) 생성: HIRA 병원정보서비스(getHospBasisList)로 병원명 -> 주소/좌표 조회 후 coords.json 저장
const fs = require('fs');
const API_KEY = process.env.HIRA_API_KEY;
const URL_ = 'http://apis.data.go.kr/B551182/hospInfoServicev2/getHospBasisList';
if (!API_KEY) { console.error('HIRA_API_KEY 없음'); process.exit(1); }

const data = JSON.parse(fs.readFileSync('data.json', 'utf-8'));
let coords = {};
try { coords = JSON.parse(fs.readFileSync('coords.json', 'utf-8')); } catch (e) {}

const normCity = s => (s || '').replace(/(특별자치도|특별자치시|특별시|광역시|자치시|자치도|도|시)$/, '').slice(0, 2);
const keyOf = r => `${r.name}|${r.city}|${r.district}`;
const targets = new Map();
for (const r of data) if (!coords[keyOf(r)] && !targets.has(keyOf(r))) targets.set(keyOf(r), r);
console.log(`조회 대상 ${targets.size}곳 (기존 ${Object.keys(coords).length}곳)`);

let apiErr = null, ok = 0, miss = 0, calls = 0;
async function lookup(r) {
  const p = new URLSearchParams({ serviceKey: API_KEY, yadmNm: r.name, pageNo: '1', numOfRows: '30', _type: 'json' });
  let res;
  for (let t = 0; t < 3; t++) {
    try {
      calls++;
      res = await fetch(`${URL_}?${p}`, { signal: AbortSignal.timeout(20000) });
      if (calls <= 12) console.log(`[dbg] ${r.name} -> HTTP ${res.status}`);
      if (res.ok) break;
    } catch (e) { if (calls <= 12) console.log(`[dbg] ${r.name} err ${e.message}`); }
    await new Promise(s => setTimeout(s, 1000 * (t + 1)));
  }
  if (!res || !res.ok) { miss++; return; }
  let j;
  let txt = ''; try { txt = await res.text(); j = JSON.parse(txt); } catch (e) { if (calls <= 12) console.log('[dbg] body: ' + txt.slice(0, 300)); apiErr = apiErr || 'JSON 아님(키/서비스 신청 확인 필요)'; return; }
  const h = j.response && j.response.header;
  if (h && h.resultCode !== '00') { apiErr = `${h.resultCode} ${h.resultMsg}`; return; }
  let items = j.response && j.response.body && j.response.body.items && j.response.body.items.item;
  if (!items) { miss++; return; }
  if (!Array.isArray(items)) items = [items];
  const c = normCity(r.city);
  let m = items.filter(x => x.yadmNm === r.name && normCity(x.sidoCdNm) === c);
  const d = items.filter(x => (x.sgguCdNm || '') === r.district || (x.sgguCdNm || '').replace(/\s/g, '') === r.district.replace(/\s/g, ''));
  const both = m.filter(x => d.includes(x));
  if (both.length) m = both;
  if (!m.length) { miss++; return; }
  const x = m[0];
  const lon = parseFloat(x.XPos), lat = parseFloat(x.YPos);
  if (!isFinite(lat) || !isFinite(lon)) { miss++; return; }
  coords[keyOf(r)] = [Math.round(lat * 1e6) / 1e6, Math.round(lon * 1e6) / 1e6, x.addr || ''];
  ok++;
}

(async () => {
  const list = [...targets.values()];
  let i = 0;
  const t0 = Date.now();
  const worker = async () => { while (i < list.length && !apiErr && Date.now() - t0 < 50 * 60 * 1000) { await lookup(list[i++]); if (i % 25 === 0) console.log(`${i}/${list.length}`); } };
  await Promise.all(Array.from({ length: 4 }, worker));
  console.log(`성공 ${ok}, 미매칭 ${miss}, 호출 ${calls}`);
  if (apiErr) { console.error('API 오류: ' + apiErr + ' (data.go.kr에서 "건강보험심사평가원_병원정보서비스" 활용신청이 필요할 수 있습니다)'); if (!ok && !Object.keys(coords).length) process.exit(1); }
  const sorted = Object.fromEntries(Object.keys(coords).sort().map(k => [k, coords[k]]));
  fs.writeFileSync('coords.json', JSON.stringify(sorted), 'utf-8');
})();
