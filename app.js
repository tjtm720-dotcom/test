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
  $("t-title").textContent = D.title;
  $("t-subtitle").classList.add("lines");
  $("t-subtitle").innerHTML = D.subtitleLines.map(esc).join("<br>");
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
  function renderQuestion() {
    const total = D.questions.length;
    const q = D.questions[state.q];
    $("q-bar").style.width = (state.q / total) * 100 + "%";
    $("q-count").textContent = `${state.q + 1} / ${total}`;
    $("q-text").textContent = q.text;
    $("btn-back").style.visibility = state.q === 0 ? "hidden" : "visible";
    const box = $("q-options");
    box.innerHTML = "";
    state.order[state.q].forEach((i) => {
      const o = q.options[i];
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = o.text;
      if (state.answers[state.q] === i) b.classList.add("picked");
      b.onclick = () => pick(i, b);
      box.appendChild(b);
    });
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
        $("q-bar").style.width = "100%";
        finish();
      }
    }, 220);
  }

  $("btn-back").onclick = () => {
    if (state.q > 0) { state.q--; renderQuestion(); }
  };

  // ---------- 결과 요청 (점수 계산은 서버에서만) ----------
  async function finish() {
    show("s-loading");
    const wait = new Promise((r) => setTimeout(r, 1400));
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
      $("q-count").textContent = "결과를 불러오지 못했어요. 마지막 선택지를 다시 눌러 주세요.";
    }
  }

  function renderResult(key) {
    const res = D.results[key];
    state.result = key;
    const [y, m, d] = state.birth.split("-");
    $("r-profile").textContent = `${state.name} · ${state.gender} · ${+y}년 ${+m}월 ${+d}일생`;
    $("r-name").textContent = res.name;
    $("r-tagline").textContent = res.tagline || "";
    $("r-keywords").innerHTML = (res.keywords || []).map((k) => `<span>#${esc(k)}</span>`).join("");
    $("r-desc").innerHTML = esc(res.description).replace(/\n/g, "<br>");
    $("r-sections").innerHTML = (res.sections || []).map((sec) =>
      `<div class="card"><h3>${esc(sec.title)}</h3><ul>${sec.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul></div>`
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
