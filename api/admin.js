const crypto = require("crypto");
const { redis, KEY, CTA_KEY } = require("./_redis");

function same(a, b) {
  const x = crypto.createHash("sha256").update(String(a)).digest();
  const y = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return res.status(500).json({ ok: false, error: "ADMIN_PASSWORD 환경변수가 없습니다." });

  const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};

  // 로그인 실패 제한: 같은 IP에서 10분 동안 5회 실패 시 잠금
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  const failKey = "sense-test:fail:" + crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);
  try {
    const fails = +(await redis("GET", failKey)) || 0;
    if (fails >= 5) return res.status(429).json({ ok: false, error: "시도 횟수를 초과했습니다. 10분 후 다시 시도해 주세요." });
  } catch (e) { /* Redis 오류 시 잠금 확인 생략 */ }

  if (!same(b.password || "", pw)) {
    try { await redis("INCR", failKey); await redis("EXPIRE", failKey, 600); } catch (e) {}
    await new Promise((r) => setTimeout(r, 800));
    return res.status(401).json({ ok: false, error: "비밀번호가 올바르지 않습니다." });
  }
  try { await redis("DEL", failKey); } catch (e) {}
  try {
    const rows = (await redis("LRANGE", KEY, 0, 19999)) || [];
    const flat = (await redis("HGETALL", CTA_KEY)) || [];
    const cta = {};
    for (let i = 0; i < flat.length; i += 2) cta[flat[i]] = +flat[i + 1] || 0;
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ ok: true, cta, rows: rows.map((s) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};
