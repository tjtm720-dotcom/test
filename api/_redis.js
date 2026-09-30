// Redis 호출 헬퍼
// 1순위: Upstash REST 환경변수 (…KV_REST_API_URL / …KV_REST_API_TOKEN, 접두어가 붙어도 자동 인식)
// 2순위: 일반 Redis 연결 주소 (REDIS_URL / KV_URL 등) — Redis Cloud 등 REST가 없는 저장소용
function findEnv(re, exclude) {
  const k = Object.keys(process.env).find((n) => re.test(n) && !(exclude && exclude.test(n)) && process.env[n]);
  return k ? process.env[k] : "";
}

function config() {
  const restUrl = findEnv(/(KV_REST_API_URL|REDIS_REST_URL)$/);
  const restToken = findEnv(/(KV_REST_API_TOKEN|REDIS_REST_TOKEN)$/, /READ_ONLY/);
  if (restUrl && restToken) return { mode: "rest", restUrl, restToken };
  const tcpUrl = findEnv(/(REDIS_URL|KV_URL)$/);
  if (tcpUrl) return { mode: "tcp", tcpUrl };
  return { mode: "none" };
}

let tcpClient = null;
async function getTcp(url) {
  if (tcpClient && tcpClient.isReady) return tcpClient;
  const { createClient } = require("redis");
  // 연결 실패 시 무한 재시도하지 않도록 (요청이 멈추지 않게) 5초 제한
  const c = createClient({ url, socket: { connectTimeout: 5000, reconnectStrategy: false } });
  c.on("error", (e) => console.error("Redis 오류:", e.message));
  try {
    await c.connect();
  } catch (e) {
    tcpClient = null;
    throw e;
  }
  tcpClient = c;
  return c;
}

async function redis(...command) {
  const c = config();
  if (c.mode === "rest") {
    const r = await fetch(c.restUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${c.restToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(command),
    });
    const j = await r.json();
    if (j.error) throw new Error(j.error);
    return j.result;
  }
  if (c.mode === "tcp") {
    const client = await getTcp(c.tcpUrl);
    return client.sendCommand(command.map(String));
  }
  // 진단용: 값은 숨기고 관련 환경변수 이름만 표시
  const names = Object.keys(process.env).filter((n) => /REDIS|KV|UPSTASH|DATABASE|POSTGRES|^PG/i.test(n));
  throw new Error("저장소 환경변수(Neon DATABASE_URL 또는 Redis)가 설정되지 않았습니다. 감지된 관련 변수: " + (names.length ? names.join(", ") : "없음"));
}

module.exports = { redis, KEY: "sense-test:responses", CTA_KEY: "sense-test:cta" };
