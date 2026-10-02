(function () {
  const D = window.TEST_DATA;
  const $ = (id) => document.getElementById(id);
  const state = { name: "", gender: "", birth: "", answers: [], q: 0, order: [], result: "" };
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // ---------- 화면 전환 ----------
  function show(id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    $(id).classList.add("active");
    window.scrollTo(0, 0);
  }

  // ---------- 인트로 ----------
  // 제목: "발달한 감각" 부분 강조
  $("t-title").innerHTML = esc(D.title).replace("가장 ", "가장<br>").replace("발달한 감각", "<em>발달한 감각</em>");

  // 결과 유형 미리보기
  $("t-types").innerHTML = `<p>당신은 어떤 감각일까요?</p><div>` +
    Object.entries(D.results).map(([k, r]) => `<span class="t-${k}">${esc(r.name)}</span>`).join("") + `</div>`;

  // 부제 4줄을 한 줄씩 순환 표시
  const tickColors = ["var(--c-money)", "var(--c-people)", "var(--c-trend)", "var(--c-creative)"];
  const tk = $("t-ticker");
  tk.innerHTML = D.subtitleLines.map((l, i) => `<span style="--tc:${tickColors[i % tickColors.length]}">${esc(l)}</span>`).join("");
  const spans = tk.querySelectorAll("span");
  let ti = 0;
  spans[0].classList.add("on");
  setInterval(() => {
    const prev = spans[ti];
    prev.classList.remove("on"); prev.classList.add("out");
    setTimeout(() => prev.classList.remove("out"), 500);
    ti = (ti + 1) % spans.length;
    spans[ti].classList.add("on");
  }, 1800);
  $("btn-start").textContent = D.startButton;
  $("p-items").textContent = D.privacy.items;
  $("p-purpose").textContent = D.privacy.purpose;
  $("p-period").textContent = D.privacy.period;
  $("btn-start").onclick = () => show("s-info");

  // ---------- 정보 입력 ----------
  const thisYear = new Date().getFullYear();
  const opt = (v, t) => `<option value="${v}">${t}</option>`;
  let yh = opt("", "년");
  for (let y = thisYear; y >= 1940; y--) yh += opt(y, y + "년");
  $("f-year").innerHTML = yh;
  let mh = opt("", "월");
  for (let m = 1; m <= 12; m++) mh += opt(m, m + "월");
  $("f-month").innerHTML = mh;

  function fillDays() {
    const y = +$("f-year").value || 2000, m = +$("f-month").value || 1;
    const max = new Date(y, m, 0).getDate();
    const cur = $("f-day").value;
    let dh = opt("", "일");
    for (let d = 1; d <= max; d++) dh += opt(d, d + "일");
    $("f-day").innerHTML = dh;
    if (cur && +cur <= max) $("f-day").value = cur;
  }
  fillDays();
  $("f-year").onchange = fillDays;
  $("f-month").onchange = fillDays;

  $("f-gender").querySelectorAll("button").forEach((b) => {
    b.onclick = () => {
      $("f-gender").querySelectorAll("button").forEach((x) => x.classList.remove("on"));
      b.classList.add("on");
      state.gender = b.dataset.v;
    };
  });

  $("info-form").onsubmit = (e) => {
    e.preventDefault();
    const name = $("f-name").value.trim();
    const y = $("f-year").value, m = $("f-month").value, d = $("f-day").value;
    let err = "";
    if (!name) err = "이름을 입력해 주세요.";
    else if (!state.gender) err = "성별을 선택해 주세요.";
    else if (!y || !m || !d) err = "생년월일을 선택해 주세요.";
    else if (!$("f-consent").checked) err = "개인정보 수집·이용에 동의해 주세요.";
    $("f-error").textContent = err;
    if (err) return;
    state.name = name;
    state.birth = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    state.answers = [];
    state.q = 0;
    // 문항별 선택지 순서를 참여자마다 섞음 (저장되는 값은 원래 선택지 번호)
    state.order = D.questions.map((q) => shuffle(q.options.map((_, i) => i)));
    renderQuestion();
    show("s-quiz");
  };

  // ---------- 질문 ----------
  const KEYS = ["A", "B", "C", "D", "E", "F"];
  function renderQuestion(dir) {
    const total = D.questions.length;
    const q = D.questions[state.q];
    $("q-dots").innerHTML = D.questions.map((_, i) => `<i class="${i < state.q ? "done" : i === state.q ? "now" : ""}"></i>`).join("");
    $("q-count").textContent = `${state.q + 1}/${total}`;
    $("q-no").textContent = "Q" + (state.q + 1);
    $("q-text").textContent = q.text;
    $("q-error").textContent = "";
    $("btn-back").disabled = state.q === 0;
    const box = $("q-options");
    box.innerHTML = "";
    state.order[state.q].forEach((i, pos) => {
      const o = q.options[i];
      const b = document.createElement("button");
      b.type = "button";
      b.innerHTML = `<span class="k">${KEYS[pos]}</span><span>${esc(o.text)}</span>`;
      if (state.answers[state.q] === i) b.classList.add("picked");
      b.onclick = () => pick(i, b);
      box.appendChild(b);
    });
    const body = $("q-body");
    body.classList.remove("enter", "enter-back");
    void body.offsetWidth;
    body.classList.add(dir === "back" ? "enter-back" : "enter");
  }

  let locked = false;
  function pick(i, btn) {
    if (locked) return;
    locked = true;
    btn.classList.add("picked");
    state.answers[state.q] = i;
    setTimeout(() => {
      locked = false;
      if (state.q < D.questions.length - 1) {
        state.q++;
        renderQuestion();
      } else {
        finish();
      }
    }, 260);
  }

  $("btn-back").onclick = () => {
    if (state.q > 0) { state.q--; renderQuestion("back"); }
  };

  // ---------- 결과 요청 (점수 계산은 서버에서만) ----------
  async function finish() {
    show("s-loading");
    const msgs = ["감각을 측정하고 있어요", "응답 패턴을 분석하고 있어요", "당신의 감각을 찾았어요"];
    let mi = 0;
    $("load-text").textContent = msgs[0];
    const lt = setInterval(() => { mi = Math.min(mi + 1, msgs.length - 1); $("load-text").textContent = msgs[mi]; }, 800);
    const wait = new Promise((r) => setTimeout(() => { clearInterval(lt); r(); }, 2400));
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: state.name, gender: state.gender, birth: state.birth, answers: state.answers,
          ref: new URLSearchParams(location.search).get("utm_source") || document.referrer || "",
        }),
      });
      const j = await res.json();
      await wait;
      if (!j.ok || !D.results[j.result]) throw new Error();
      renderResult(j.result);
    } catch (e) {
      await wait;
      show("s-quiz");
      $("q-error").textContent = "결과를 불러오지 못했어요. 마지막 선택지를 다시 눌러 주세요.";
    }
  }

  function renderResult(key) {
    const res = D.results[key];
    state.result = key;
    $("s-result").dataset.type = key;
    const [y, m, d] = state.birth.split("-");
    $("r-profile").textContent = `${state.name} · ${state.gender} · ${+y}년 ${+m}월 ${+d}일생`;
    $("r-name").textContent = res.name;
    $("r-tagline").textContent = res.tagline || "";
    $("r-keywords").innerHTML = (res.keywords || []).map((k) => `<span>#${esc(k)}</span>`).join("");
    $("r-desc").innerHTML = esc(res.description).replace(/\n/g, "<br>");
    $("r-sections").innerHTML = (res.sections || []).map((sec) =>
      `<div class="panel"><h3>${esc(sec.title)}</h3><ul>${sec.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul></div>`
    ).join("");
    $("r-strength").innerHTML = res.strength ? `<b>당신의 강점</b>${esc(res.strength)}` : "";
    $("r-cta-text").textContent = res.ctaText || "";
    const cta = $("btn-cta");
    cta.textContent = D.cta.label;
    if (D.cta.url) {
      cta.href = D.cta.url
        .replace(/\{name\}/g, encodeURIComponent(state.name))
        .replace(/\{result\}/g, encodeURIComponent(res.name));
      cta.classList.remove("disabled");
    }
    else { cta.removeAttribute("href"); cta.classList.add("disabled"); }
    $("r-note").textContent = res.note || "";
    $("toast").textContent = "";
    show("s-result");
  }

  $("btn-cta").addEventListener("click", () => {
    const body = JSON.stringify({ result: state.result });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    else fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  });

  // ---------- 공유 / 다시하기 ----------
  $("btn-share").onclick = async () => {
    const url = location.origin + location.pathname;
    const res = D.results[state.result];
    const data = { title: D.title, text: `나에게 가장 발달한 감각은 ${res.name}! 당신의 감각은?`, url };
    try {
      if (navigator.share) { await navigator.share(data); return; }
      await navigator.clipboard.writeText(url);
      $("toast").textContent = "링크가 복사되었어요.";
    } catch (e) { /* 사용자가 공유 취소 */ }
  };
  $("btn-retry").onclick = () => show("s-intro");
})();
