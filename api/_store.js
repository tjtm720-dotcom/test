// 저장소 추상화 — 연결된 저장소를 자동 감지해 사용
//  1) Neon/Postgres : DATABASE_URL / POSTGRES_URL (접두어 붙어도 인식)
//  2) Upstash/Redis : KV_REST_API_URL+TOKEN 또는 REDIS_URL
// 테이블/키는 처음 사용할 때 자동 생성됩니다.
const { redis } = require("./_redis");

const K = { list: "sense-test:responses", cta: "sense-test:cta", fail: "sense-test:fail:" };

function pgUrl() {
  const names = Object.keys(process.env).filter((n) => /(DATABASE_URL|POSTGRES_URL)$/.test(n) && process.env[n]);
  // 풀링 주소 우선 (UNPOOLED/NON_POOLING 제외)
  const k = names.find((n) => !/UNPOOLED|NON_POOLING/.test(n)) || names[0];
  return k ? process.env[k] : "";
}

let pool = null, ready = null;
async function pg() {
  if (!pool) {
    const { Pool } = require("pg");
    const url = pgUrl();
    pool = new Pool({ connectionString: url, max: 3, connectionTimeoutMillis: 5000, ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false } });
  }
  if (!ready) {
    ready = pool.query(`
      CREATE TABLE IF NOT EXISTS sense_responses (id BIGSERIAL PRIMARY KEY, at TIMESTAMPTZ NOT NULL DEFAULT now(), data JSONB NOT NULL);
      CREATE TABLE IF NOT EXISTS sense_cta (result TEXT PRIMARY KEY, n INT NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS sense_fail (k TEXT PRIMARY KEY, n INT NOT NULL, until TIMESTAMPTZ NOT NULL);
    `).catch((e) => { ready = null; throw e; });
  }
  await ready;
  return pool;
}

const usePg = () => !!pgUrl();

module.exports = {
  mode: () => (usePg() ? "postgres" : "redis"),

  async addResponse(row) {
    if (usePg()) return (await pg()).query("INSERT INTO sense_responses (data) VALUES ($1)", [JSON.stringify(row)]);
    return redis("LPUSH", K.list, JSON.stringify(row));
  },

  async listResponses(limit = 20000) {
    if (usePg()) {
      const r = await (await pg()).query("SELECT data FROM sense_responses ORDER BY id DESC LIMIT $1", [limit]);
      return r.rows.map((x) => x.data);
    }
    const rows = (await redis("LRANGE", K.list, 0, limit - 1)) || [];
    return rows.map((s) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
  },

  async incrCta(result) {
    if (usePg()) return (await pg()).query(
      "INSERT INTO sense_cta (result, n) VALUES ($1, 1) ON CONFLICT (result) DO UPDATE SET n = sense_cta.n + 1", [result]);
    return redis("HINCRBY", K.cta, result, 1);
  },

  async getCta() {
    const out = {};
    if (usePg()) {
      const r = await (await pg()).query("SELECT result, n FROM sense_cta");
      r.rows.forEach((x) => (out[x.result] = x.n));
      return out;
    }
    const flat = (await redis("HGETALL", K.cta)) || [];
    for (let i = 0; i < flat.length; i += 2) out[flat[i]] = +flat[i + 1] || 0;
    return out;
  },

  // 로그인 실패 횟수 (10분 창)
  async getFails(k) {
    if (usePg()) {
      const r = await (await pg()).query("SELECT n FROM sense_fail WHERE k = $1 AND until > now()", [k]);
      return r.rows[0] ? r.rows[0].n : 0;
    }
    return +(await redis("GET", K.fail + k)) || 0;
  },
  async addFail(k) {
    if (usePg()) return (await pg()).query(
      `INSERT INTO sense_fail (k, n, until) VALUES ($1, 1, now() + interval '10 minutes')
       ON CONFLICT (k) DO UPDATE SET
         n = CASE WHEN sense_fail.until > now() THEN sense_fail.n + 1 ELSE 1 END,
         until = CASE WHEN sense_fail.until > now() THEN sense_fail.until ELSE now() + interval '10 minutes' END`, [k]);
    await redis("INCR", K.fail + k);
    return redis("EXPIRE", K.fail + k, 600);
  },
  async clearFails(k) {
    if (usePg()) return (await pg()).query("DELETE FROM sense_fail WHERE k = $1", [k]);
    return redis("DEL", K.fail + k);
  },
};
