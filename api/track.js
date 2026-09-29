const { redis, CTA_KEY } = require("./_redis");

// 결과 화면 CTA(크리에이터 지원하기) 클릭 수를 결과 유형별로 집계
module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  try {
    const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const k = String(b.result || "").slice(0, 40);
    if (!/^[a-z0-9_-]+$/i.test(k)) return res.status(400).json({ ok: false });
    await redis("HINCRBY", CTA_KEY, k, 1);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};
