const TEST_SLUG = "inarin14311431/tnx-cast-archive-test";
const PROD_SLUG = "inarin14311431/tnx_cast_list";
const DATA_BRANCH_URL = `https://raw.githubusercontent.com/${PROD_SLUG}/dashboard-data/dashboard/data.json`;

const STATUS_LABEL = { reflected: "反映済み", "not-reflected": "未反映", "out-of-scope": "対象外" };
const EVIDENCE_LABEL = { number: "番号明記", "file-match": "ファイル一致", "title-similarity": "タイトル類似", "number-unmerged": "未マージPRのみ言及" };
const TYPE_LABEL = { sync: "同期", feat: "feat", fix: "fix", refactor: "refactor", chore: "chore", docs: "docs", other: "other" };

function fmtDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function daysSince(iso) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}
function prUrl(slug, number) {
  return `https://github.com/${slug}/pull/${number}`;
}
function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "text") node.textContent = v;
    else if (k === "html") node.innerHTML = v;
    else node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) if (c) node.appendChild(c);
  return node;
}

// ---------------- theme ----------------
(function initTheme() {
  const KEY = "tnx-dashboard-theme";
  let stored = null;
  try { stored = localStorage.getItem(KEY); } catch {}
  if (stored) document.documentElement.setAttribute("data-theme", stored);
  document.getElementById("themeToggle").addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme") ||
      (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem(KEY, next); } catch {}
  });
})();

async function main() {
  let data;
  try {
    const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
    const dataUrl = location.protocol === "file:" || localHosts.has(location.hostname)
      ? "data.json"
      : DATA_BRANCH_URL;
    const res = await fetch(dataUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`Dashboard data request failed: ${res.status}`);
    data = await res.json();
  } catch (e) {
    document.getElementById("generatedAt").textContent = "データの読み込みに失敗しました。";
    console.error(e);
    return;
  }
  document.getElementById("generatedAt").textContent = `最終更新: ${new Date(data.meta.generatedAt).toLocaleString("ja-JP")}`;

  renderSummary(data);
  renderUnreflected(data);
  renderStatusTable(data);
  renderTimeline(data);
  renderWeeklyChart(data);
  renderValidationNote(data);
}

function renderSummary(data) {
  const s = data.summary;
  const grid = document.getElementById("summaryGrid");
  const cards = [
    { label: "検証 PR総数", value: s.test.total, breakdown: `マージ済み ${s.test.merged}件` },
    { label: "本番 PR総数", value: s.prod.total, breakdown: `マージ済み ${s.prod.merged}件` },
    { label: "直近7日マージ", value: `${s.test.mergedLast7d + s.prod.mergedLast7d}`, breakdown: `検証 ${s.test.mergedLast7d} / 本番 ${s.prod.mergedLast7d}` },
    { label: "直近30日マージ", value: `${s.test.mergedLast30d + s.prod.mergedLast30d}`, breakdown: `検証 ${s.test.mergedLast30d} / 本番 ${s.prod.mergedLast30d}` },
    { label: "本番未反映(推定)", value: s.notReflectedCount, warn: true, breakdown: "検証済みだが本番に未反映の件数" },
    { label: "反映済み(推定含む)", value: s.reflectedCount, ok: true, breakdown: `対象外 ${s.outOfScopeCount}件を除く` },
  ];
  grid.innerHTML = "";
  for (const c of cards) {
    grid.appendChild(el("div", { class: `card stat-card ${c.warn ? "warn" : ""} ${c.ok ? "ok" : ""}` }, [
      el("div", { class: "label", text: c.label }),
      el("div", { class: "value", text: String(c.value) }),
      el("div", { class: "breakdown", text: c.breakdown }),
    ]));
  }
}

function renderUnreflected(data) {
  const items = data.status
    .filter(s => s.status === "not-reflected")
    .sort((a, b) => new Date(a.merged_at) - new Date(b.merged_at));
  document.getElementById("unreflectedCount").textContent = items.length;
  const list = document.getElementById("unreflectedList");
  list.innerHTML = "";
  if (!items.length) {
    list.appendChild(el("div", { class: "card unreflected-row", text: "未反映の検証PRはありません。" }));
    return;
  }
  for (const item of items) {
    const days = daysSince(item.merged_at);
    const badge = el("span", { class: `days-badge ${days > 30 ? "stale" : ""}`, text: `${days}日経過` });
    const row = el("div", { class: "card unreflected-row" }, [
      el("span", { class: "pr-num", text: `#${item.number}` }),
      el("a", { class: "pr-link pr-title", href: prUrl(TEST_SLUG, item.number), target: "_blank", rel: "noopener", text: item.title }),
      el("span", { class: "sub", text: fmtDate(item.merged_at) }),
      badge,
    ]);
    list.appendChild(row);
  }
}

let statusPage = 0;
const PAGE_SIZE = 40;

function renderStatusTable(data) {
  const search = document.getElementById("statusSearch");
  const statusFilter = document.getElementById("statusFilter");
  const evidenceFilter = document.getElementById("evidenceFilter");

  function currentRows() {
    const q = search.value.trim().toLowerCase();
    const sf = statusFilter.value;
    const ef = evidenceFilter.value;
    return data.status
      .filter(s => sf === "all" || s.status === sf)
      .filter(s => ef === "all" || s.evidence === ef)
      .filter(s => !q || String(s.number).includes(q) || (s.title || "").toLowerCase().includes(q))
      .sort((a, b) => new Date(b.merged_at) - new Date(a.merged_at));
  }

  function draw() {
    const rows = currentRows();
    const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    statusPage = Math.min(statusPage, totalPages - 1);
    const pageRows = rows.slice(statusPage * PAGE_SIZE, statusPage * PAGE_SIZE + PAGE_SIZE);

    const tbody = document.getElementById("statusTbody");
    tbody.innerHTML = "";
    for (const r of pageRows) {
      const badge = el("span", { class: `badge ${r.status}`, text: STATUS_LABEL[r.status] });
      let evidenceCell;
      if (r.status === "out-of-scope") {
        evidenceCell = el("span", { class: "evidence-tag", text: "-" });
      } else {
        const parts = [];
        if (r.evidence) {
          const tag = el("span", { class: `evidence-tag ${r.evidence !== "number" ? "guess" : ""}`, text: EVIDENCE_LABEL[r.evidence] || r.evidence });
          parts.push(tag);
        }
        if (r.prodLinks && r.prodLinks.length) {
          for (const link of r.prodLinks) {
            parts.push(el("a", {
              class: "pr-link", href: prUrl(PROD_SLUG, link.number), target: "_blank", rel: "noopener",
              text: ` 本番#${link.number}`,
            }));
          }
        }
        evidenceCell = el("span", {}, parts);
      }
      tbody.appendChild(el("tr", {}, [
        el("td", {}, el("a", { class: "pr-link", href: prUrl(TEST_SLUG, r.number), target: "_blank", rel: "noopener", text: `#${r.number}` })),
        el("td", { class: "title-cell", text: r.title }),
        el("td", { text: fmtDate(r.merged_at) }),
        el("td", {}, badge),
        el("td", {}, evidenceCell),
      ]));
    }
    document.getElementById("pagerInfo").textContent = `${rows.length}件中 ${rows.length ? statusPage * PAGE_SIZE + 1 : 0}-${Math.min(rows.length, (statusPage + 1) * PAGE_SIZE)}件 (${statusPage + 1}/${totalPages}ページ)`;
    document.getElementById("pagerPrev").disabled = statusPage <= 0;
    document.getElementById("pagerNext").disabled = statusPage >= totalPages - 1;
  }

  search.addEventListener("input", () => { statusPage = 0; draw(); });
  statusFilter.addEventListener("change", () => { statusPage = 0; draw(); });
  evidenceFilter.addEventListener("change", () => { statusPage = 0; draw(); });
  document.getElementById("pagerPrev").addEventListener("click", () => { statusPage--; draw(); });
  document.getElementById("pagerNext").addEventListener("click", () => { statusPage++; draw(); });
  draw();
}

function renderTimeline(data) {
  const repoFilter = document.getElementById("timelineRepoFilter");
  const typeFilter = document.getElementById("timelineTypeFilter");
  const list = document.getElementById("timelineList");

  function draw() {
    const rf = repoFilter.value;
    const tf = typeFilter.value;
    const rows = data.timeline
      .filter(t => rf === "all" || t.repo === rf)
      .filter(t => tf === "all" || t.type === tf)
      .slice()
      .reverse();
    list.innerHTML = "";
    const frag = document.createDocumentFragment();
    for (const t of rows.slice(0, 400)) {
      const slug = t.repo === "test" ? TEST_SLUG : PROD_SLUG;
      frag.appendChild(el("div", { class: "timeline-row" }, [
        el("span", { class: "date", text: fmtDate(t.merged_at) }),
        el("span", { class: `dot ${t.repo}` }),
        el("a", { class: "pr-link ttl", href: prUrl(slug, t.number), target: "_blank", rel: "noopener", text: `#${t.number} ${t.title}` }),
        el("span", { class: "type-chip", text: TYPE_LABEL[t.type] || t.type }),
      ]));
    }
    list.appendChild(frag);
  }
  repoFilter.addEventListener("change", draw);
  typeFilter.addEventListener("change", draw);
  draw();
}

function renderWeeklyChart(data) {
  const svg = document.getElementById("weeklyChart");
  const weekly = data.weekly;
  if (!weekly.length) return;

  const W = 900, H = 260, padL = 34, padR = 12, padT = 12, padB = 34;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const maxVal = Math.max(1, ...weekly.map(w => Math.max(w.test, w.prod)));
  const n = weekly.length;
  const barGroupW = innerW / n;
  const barW = Math.max(1.5, barGroupW * 0.34);

  const isDark = () => {
    const t = document.documentElement.getAttribute("data-theme");
    if (t) return t === "dark";
    return matchMedia("(prefers-color-scheme: dark)").matches;
  };
  const axisColor = () => (isDark() ? "#9aa4b2" : "#5b6572");
  const testColor = () => (isDark() ? "#b794f6" : "#7c3aed");
  const prodColor = () => (isDark() ? "#4fd1c5" : "#0f9d8f");

  function draw() {
    const ns = "http://www.w3.org/2000/svg";
    svg.innerHTML = "";
    const g = document.createElementNS(ns, "g");

    // y gridlines (4 steps)
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const v = Math.round((maxVal / steps) * i);
      const y = padT + innerH - (v / maxVal) * innerH;
      const line = document.createElementNS(ns, "line");
      line.setAttribute("x1", padL); line.setAttribute("x2", W - padR);
      line.setAttribute("y1", y); line.setAttribute("y2", y);
      line.setAttribute("stroke", axisColor()); line.setAttribute("stroke-opacity", "0.15");
      g.appendChild(line);
      const label = document.createElementNS(ns, "text");
      label.setAttribute("x", padL - 6); label.setAttribute("y", y + 3);
      label.setAttribute("text-anchor", "end"); label.setAttribute("font-size", "10");
      label.setAttribute("fill", axisColor());
      label.textContent = v;
      g.appendChild(label);
    }

    weekly.forEach((w, i) => {
      const groupX = padL + i * barGroupW;
      const drawBar = (val, offsetX, color) => {
        if (val === 0) return;
        const h = (val / maxVal) * innerH;
        const rect = document.createElementNS(ns, "rect");
        rect.setAttribute("x", groupX + offsetX);
        rect.setAttribute("y", padT + innerH - h);
        rect.setAttribute("width", barW);
        rect.setAttribute("height", h);
        rect.setAttribute("fill", color);
        rect.setAttribute("rx", "1.5");
        const title = document.createElementNS(ns, "title");
        title.textContent = `${w.week}: ${val}`;
        rect.appendChild(title);
        g.appendChild(rect);
      };
      drawBar(w.test, barGroupW * 0.12, testColor());
      drawBar(w.prod, barGroupW * 0.12 + barW + 1.5, prodColor());

      if (n <= 30 || i % Math.ceil(n / 20) === 0) {
        const label = document.createElementNS(ns, "text");
        label.setAttribute("x", groupX + barGroupW / 2);
        label.setAttribute("y", H - padB + 14);
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("font-size", "9");
        label.setAttribute("fill", axisColor());
        label.textContent = w.week.slice(2);
        g.appendChild(label);
      }
    });

    svg.appendChild(g);
  }
  draw();
  document.getElementById("themeToggle").addEventListener("click", () => setTimeout(draw, 0));
  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => setTimeout(draw, 0));
}

function renderValidationNote(data) {
  const v = data.meta.validation;
  if (!v) return;
  const pct = x => (x == null ? "-" : `${Math.round(x * 100)}%`);
  document.getElementById("validationNote").textContent =
    `判定ロジックの自己検証(番号明記済みPR ${v.groundTruthSize}件を正解データとして使用): ` +
    `ファイル一致は ${pct(v.fileMatch.recallRate)} を正しく「反映済み」と判定し、紐付けた本番PR番号の精度は ${pct(v.fileMatch.linkPrecision)}。` +
    `タイトル類似は ${pct(v.titleMatch.recallRate)} を判定し、紐付け精度は ${pct(v.titleMatch.linkPrecision)}。`;
}

main();
