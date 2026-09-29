const { redis, KEY } = require("./_redis");
const { SCORES, score } = require("./_scoring");

const clip = (v, n) => String(v ?? "").slice(0, n);

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  try {
    const b = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const name = clip(b.name, 20).trim();
    const gender = ["여성", "남성", "상관없음"].includes(b.gender) ? b.gender : "";
    const birth = /^\d{4}-\d{2}-\d{2}$/.test(b.birth) ? b.birth : "";
    const answers = Array.isArray(b.answers) ? b.answers.map((n) => +n) : [];
    const validAnswers =
      answers.length === SCORES.length &&
      answers.every((a, i) => Number.isInteger(a) && a >= 0 && a < SCORES[i].length);
    if (!name || !gender || !birth || !validAnswers) return res.status(400).json({ ok: false, error: "invalid" });

    // 점수 계산은 서버에서만. 응답에는 결과 유형 key만 반환 (점수 비공개)
    const r = score(answers);

    try {
      await redis("LPUSH", KEY, JSON.stringify({
        at: new Date().toISOString(), name, gender, birth,
        result: r.result, answers, score: r.score, ref: clip(b.ref, 200),
      }));
    } catch (e) {
      console.error("저장 실패:", e.message); // 저장이 실패해도 참여자에게는 결과 표시
    }
    res.status(200).json({ ok: true, result: r.result });
  } catch (e) {
    res.status(500).json({ ok: false });
  }
};
