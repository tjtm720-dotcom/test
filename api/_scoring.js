// ※ 비공개 점수표 — 서버에서만 사용 (api/ 안의 _ 로 시작하는 파일은 외부에서 접근 불가)
// SCORES[문항][선택지] = 점수가 올라가는 결과 유형 key. data.js의 질문·선택지 순서와 반드시 동일하게 유지.
const TYPES = ["money", "trend", "people", "creative", "opportunity"]; // 결과 유형 (동점 판정용 목록)

const SCORES = [
  ["people", "money", "trend", "creative"], // Q1  A:피플 / B:머니 / C:트렌드 / D:크리에이티브
  ["people", "trend", "creative", "opportunity"], // Q2  A:피플 / B:트렌드 / C:크리에이티브 / D:기회
  ["money", "money", "opportunity", "trend"], // Q3  A:머니 / B:머니 / C:기회 / D:트렌드
  ["people", "money", "trend", "creative"], // Q4  A:피플 / B:머니 / C:트렌드 / D:크리에이티브
  ["people", "money", "trend", "creative"], // Q5  A:피플 / B:머니 / C:트렌드 / D:크리에이티브
  ["people", "trend", "opportunity", "creative"], // Q6  A:피플 / B:트렌드 / C:기회 / D:크리에이티브
  ["money", "people", "trend", "creative"], // Q7  A:머니 / B:피플 / C:트렌드 / D:크리에이티브
  ["people", "trend", "opportunity", "money"], // Q8  A:피플 / B:트렌드 / C:기회 / D:머니
];

// 결과 계산: 합산 점수 최고 유형. 동점이면 동점 유형 중 가장 최근 문항에서 고른 유형.
function score(answers) {
  const sc = Object.fromEntries(TYPES.map((k) => [k, 0]));
  answers.forEach((ai, qi) => { const k = SCORES[qi] && SCORES[qi][ai]; if (k) sc[k] += 1; });
  const max = Math.max(...TYPES.map((k) => sc[k]));
  const tied = TYPES.filter((k) => sc[k] === max);
  let best = tied[0];
  for (let qi = answers.length - 1; qi >= 0 && tied.length > 1; qi--) {
    const k = SCORES[qi] && SCORES[qi][answers[qi]];
    if (tied.includes(k)) { best = k; break; }
  }
  return { result: best, score: sc };
}

module.exports = { SCORES, TYPES, score };
