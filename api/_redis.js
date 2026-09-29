// Upstash Redis REST 호출 헬퍼 (외부 패키지 없음)
// Vercel Marketplace에서 Upstash Redis 연결 시 자동 주입되는 환경변수를 사용합니다.
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(...command) {
  if (!URL_ || !TOKEN) throw new Error("Redis 환경변수가 설정되지 않았습니다.");
  const r = await fetch(URL_, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

module.exports = { redis, KEY: "sense-test:responses", CTA_KEY: "sense-test:cta" };
