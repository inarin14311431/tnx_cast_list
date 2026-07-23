(() => {
  const GUIDES = {
    skd: {
      title: "SKD TSV形式",
      description: "スタイル技能を1行につき1件取り込みます。指定された12項目をスタイル技能の各入力欄へ反映します。",
      fields: [
        ["名称", "必須", "スタイル技能名"],
        ["種別", "任意", "通常・秘技・奥義・演出。空欄や未認識の値は通常として扱います。"],
        ["レベル", "任意", "技能レベル。空欄の場合は1です。"],
        ["技能", "任意", "判定に使用する技能"],
        ["上限", "任意", "技能レベルの上限"],
        ["タイミング", "任意", "使用タイミング"],
        ["対象", "任意", "効果の対象"],
        ["射程", "任意", "効果の射程"],
        ["目標値", "任意", "判定の目標値"],
        ["対決", "任意", "対決に使用する技能や能力"],
        ["解説", "任意", "技能の効果。セル内改行は \\n と記述します。"],
        ["参照P", "任意", "参照ページ"]
      ],
      sample: [
        "名称\t種別\tレベル\t技能\t上限\tタイミング\t対象\t射程\t目標値\t対決\t解説\t参照P",
        "居合\t通常\t1\t白兵\t4\tメジャー\t単体\t至近\t対決\t回避\tカタナのスタイル技能\t123",
        "元力：光学（正）\t秘技\t2\t自我\t3\tセットアップ\t自身\tなし\t10\tなし\t光学効果を付与\\n詳細はルールブック参照\t234"
      ].join("\n")
    },
    ofc: {
      title: "OFC TSV形式",
      description: "アウトフィットを1行につき1件取り込みます。name以外は省略できます。指定された21項目を読み込みます。",
      fields: [
        ["target", "推奨", "分類。weapons / armours / cyberwares / trons / vehicles / residences / outfits、または対応する日本語名。"],
        ["name", "必須", "アウトフィット名"],
        ["purchase", "任意", "購入値"],
        ["permanent", "任意", "常備化経験点。数値で入力します。"],
        ["concealA", "任意", "隠匿値の前半"],
        ["concealB", "任意", "隠匿値の後半。concealAと「/」で連結します。"],
        ["attack", "任意", "攻撃力"],
        ["defense", "任意", "防御値"],
        ["range", "任意", "射程"],
        ["slot", "任意", "装備スロット"],
        ["control", "任意", "制御値。数値は制御欄へ反映し、元の値も解説へ保持します。"],
        ["electrical_control", "任意", "電制"],
        ["protecS", "任意", "肉体ダメージへの防御値"],
        ["protecP", "任意", "精神ダメージへの防御値"],
        ["protecI", "任意", "社会ダメージへの防御値"],
        ["crew", "任意", "乗員"],
        ["sf", "任意", "SF"],
        ["entry", "任意", "登場"],
        ["part", "任意", "部位・エリア"],
        ["notes", "任意", "解説。セル内改行は \\n と記述します。"],
        ["page", "任意", "参照ページ"]
      ],
      sample: [
        "target\tname\tpurchase\tpermanent\tconcealA\tconcealB\tattack\tdefense\trange\tslot\tcontrol\telectrical_control\tprotecS\tprotecP\tprotecI\tcrew\tsf\tentry\tpart\tnotes\tpage",
        "weapons\tサンプルブレード\t15\t5\t12\t-1\tS+5\t\t至近\t片手持ち\t0\t\t\t\t\t\t\t\t右手\tOFC取込用サンプル\t123",
        "vehicles\tサンプルヴィークル\t20\t10\t\t\tS+3\t3/2/2\t近\t乗物\t-1\t15\t3\t2\t2\t2\t2\t12\t車両\t複数項目を含むサンプル\t234"
      ].join("\n")
    }
  };

  const OUTFIT_TARGETS = {
    weapons: "weapon", weapon: "weapon", 武器: "weapon",
    armours: "armor", armors: "armor", armor: "armor", 防具: "armor",
    cyberwares: "cyberware", cyberware: "cyberware", ianus: "cyberware", サイバーウェア: "cyberware",
    trons: "tron", tron: "tron", トロン: "tron",
    vehicles: "vehicle", vehicle: "vehicle", ヴィークル: "vehicle",
    residences: "residence", residence: "residence", 住居: "residence", 住宅: "residence",
    outfits: "other", outfit: "other", other: "other", 装備: "other", その他: "other"
  };

  let activeMode = "skd";

  const waitFrame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  async function waitFor(getter, attempts = 40) {
    for (let index = 0; index < attempts; index += 1) {
      const value = getter();
      if (value) return value;
      await waitFrame();
    }
    return null;
  }

  function parseTSV(text) {
    const lines = String(text || "").replace(/\r/g, "").trim().split("\n").filter(Boolean).map(line => line.split("\t"));
    if (lines.length < 2) return [];
    const headers = lines.shift().map(value => value.trim());
    return lines.map(columns => Object.fromEntries(headers.map((header, index) => [header, String(columns[index] || "").replace(/\\n/g, "\n")])));
  }

  async function setControl(control, value) {
    if (!control) return false;
    control.value = String(value ?? "");
    control.dispatchEvent(new Event("input", { bubbles: true }));
    control.dispatchEvent(new Event("change", { bubbles: true }));
    await waitFrame();
    return true;
  }

  function styleKind(value) {
    const text = String(value || "");
    if (/演出/.test(text)) return "direction";
    if (/奥義/.test(text)) return "ultimate";
    if (/秘技/.test(text)) return "secret";
    return "normal";
  }

  async function importSKD(rows) {
    const addButton = document.querySelector("#add-style-skill");
    if (!addButton) return;

    for (const data of rows) {
      if (!String(data["名称"] || "").trim()) continue;
      const before = new Set([...document.querySelectorAll('#style-skills tr[data-skill-key]')].map(row => row.dataset.skillKey));
      addButton.click();

      const row = await waitFor(() => [...document.querySelectorAll('#style-skills tr[data-skill-key]')].find(candidate => !before.has(candidate.dataset.skillKey)));
      if (!row) continue;

      await waitFor(() => row.querySelector('[data-style-field="description"]'));
      await setControl(row.querySelector('[data-f="name"]'), data["名称"]);
      await setControl(row.querySelector('[data-f="skill_kind"]'), styleKind(data["種別"]));
      await setControl(row.querySelector('[data-f="level"]'), data["レベル"] || 1);

      const fields = {
        skill: "技能",
        limit: "上限",
        timing: "タイミング",
        target: "対象",
        range: "射程",
        difficulty: "目標値",
        confrontation: "対決",
        description: "解説",
        page: "参照P"
      };

      for (const [field, header] of Object.entries(fields)) {
        await setControl(row.querySelector(`[data-style-field="${field}"]`), data[header] || "");
      }
    }
  }

  function numberValue(value) {
    const match = String(value || "").match(/-?\d+/);
    return match ? Number(match[0]) : 0;
  }

  function buildOFCDescription(data) {
    const lines = [];
    if (data.notes) lines.push(data.notes);
    const extras = [
      ["隠匿A", data.concealA],
      ["隠匿B", data.concealB],
      ["攻撃", data.attack],
      ["防御", data.defense],
      ["射程", data.range],
      ["スロット", data.slot],
      ["制御", data.control],
      ["電制", data.electrical_control],
      ["防御S", data.protecS],
      ["防御P", data.protecP],
      ["防御I", data.protecI],
      ["乗員", data.crew],
      ["SF", data.sf],
      ["登場", data.entry],
      ["部位", data.part],
      ["参照P", data.page]
    ];
    extras.forEach(([label, value]) => {
      if (String(value || "").trim()) lines.push(`${label}：${value}`);
    });
    return lines.join("\n");
  }

  async function importOFC(rows) {
    const addButton = document.querySelector("#add-outfit");
    if (!addButton) return;

    for (const data of rows) {
      if (!String(data.name || "").trim()) continue;
      const before = new Set([...document.querySelectorAll('[data-outfit-key]')].map(card => card.dataset.outfitKey));
      addButton.click();

      let card = await waitFor(() => [...document.querySelectorAll('[data-outfit-key]')].find(candidate => !before.has(candidate.dataset.outfitKey)));
      if (!card) continue;
      const key = card.dataset.outfitKey;
      const target = String(data.target || "").trim();
      const category = OUTFIT_TARGETS[target] || OUTFIT_TARGETS[target.toLowerCase()] || "other";

      await setControl(card.querySelector('[data-o="category"]'), category);
      card = await waitFor(() => document.querySelector(`[data-outfit-key="${CSS.escape(key)}"]`));
      if (!card) continue;

      const concealment = [data.concealA, data.concealB].filter(value => String(value || "") !== "").join("/");
      const values = {
        name: data.name,
        purchase_value: data.purchase,
        experience_cost: numberValue(data.permanent),
        concealment,
        attack: data.attack,
        defense: data.defense,
        range: data.range,
        slot: data.slot,
        control_modifier: numberValue(data.control),
        description: buildOFCDescription(data)
      };

      for (const [field, value] of Object.entries(values)) {
        await setControl(card.querySelector(`[data-o="${field}"]`), value ?? "");
        card = document.querySelector(`[data-outfit-key="${CSS.escape(key)}"]`) || card;
      }
    }
  }

  function moveSKDButton() {
    const button = document.querySelector("#import-skd");
    const styleAdd = document.querySelector("#add-style-skill");
    if (!button || !styleAdd) return;
    const oldToolbar = button.parentElement;
    const styleToolbar = styleAdd.parentElement;
    if (oldToolbar !== styleToolbar) styleAdd.insertAdjacentElement("afterend", button);
  }

  function createGuide(dialog) {
    const textarea = dialog.querySelector("#tsv-text");
    if (!textarea || dialog.querySelector("#tsv-import-guide")) return;

    const guide = document.createElement("section");
    guide.id = "tsv-import-guide";
    guide.className = "tsv-import-guide";
    guide.setAttribute("aria-labelledby", "tsv-guide-title");
    guide.innerHTML = `
      <header class="tsv-import-guide__header">
        <div>
          <h3 id="tsv-guide-title"></h3>
          <p id="tsv-guide-description"></p>
        </div>
        <button id="tsv-sample-insert" type="button">サンプルを入力欄へ挿入<small>INSERT SAMPLE</small></button>
      </header>
      <p class="tsv-import-guide__notice">1行目に項目名を記載し、各列をタブで区切ってください。ExcelやGoogleスプレッドシートのセル範囲を、そのままコピーして貼り付けられます。</p>
      <div class="tsv-import-guide__fields-wrap">
        <table class="tsv-import-guide__fields">
          <thead><tr><th>項目名</th><th>必要性</th><th>内容</th></tr></thead>
          <tbody id="tsv-guide-fields"></tbody>
        </table>
      </div>
      <div class="tsv-import-guide__sample-heading"><strong>入力サンプル</strong><small>TAB SEPARATED VALUES</small></div>
      <pre class="tsv-import-guide__sample"><code id="tsv-guide-sample"></code></pre>
    `;

    textarea.before(guide);
    guide.querySelector("#tsv-sample-insert")?.addEventListener("click", () => {
      const sample = GUIDES[activeMode]?.sample || "";
      textarea.value = sample;
      textarea.focus();
      textarea.setSelectionRange(sample.length, sample.length);
    });
  }

  function renderGuide(mode) {
    const dialog = document.querySelector("#tsv-dialog");
    if (!dialog) return;
    createGuide(dialog);

    activeMode = GUIDES[mode] ? mode : "skd";
    const guide = GUIDES[activeMode];
    const title = dialog.querySelector("#tsv-guide-title");
    const description = dialog.querySelector("#tsv-guide-description");
    const fields = dialog.querySelector("#tsv-guide-fields");
    const sample = dialog.querySelector("#tsv-guide-sample");

    if (title) title.textContent = guide.title;
    if (description) description.textContent = guide.description;
    if (fields) {
      fields.replaceChildren(...guide.fields.map(([name, requirement, detail]) => {
        const row = document.createElement("tr");
        const nameCell = document.createElement("th");
        const requirementCell = document.createElement("td");
        const detailCell = document.createElement("td");
        nameCell.scope = "row";
        nameCell.textContent = name;
        requirementCell.textContent = requirement;
        requirementCell.dataset.requirement = requirement;
        detailCell.textContent = detail;
        row.append(nameCell, requirementCell, detailCell);
        return row;
      }));
    }
    if (sample) sample.textContent = guide.sample;
    dialog.dataset.importMode = activeMode;
  }

  async function applyExpandedImport(event) {
    const button = event.target.closest("#tsv-apply");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    const textarea = document.querySelector("#tsv-text");
    const dialog = document.querySelector("#tsv-dialog");
    const rows = parseTSV(textarea?.value || "");
    button.disabled = true;
    button.textContent = "取込中…";

    try {
      if (activeMode === "skd") await importSKD(rows);
      else await importOFC(rows);
      dialog?.close();
    } catch (error) {
      console.error("TSV import failed", error);
      window.alert("TSVの取り込みに失敗しました。項目名とデータ形式を確認してください。");
    } finally {
      button.disabled = false;
      button.textContent = "取り込む";
    }
  }

  function initialize() {
    const dialog = document.querySelector("#tsv-dialog");
    if (!dialog) return;
    moveSKDButton();
    createGuide(dialog);
    renderGuide("skd");

    document.querySelector("#import-skd")?.addEventListener("click", () => renderGuide("skd"));
    document.querySelector("#import-ofc")?.addEventListener("click", () => renderGuide("ofc"));
    document.querySelector("#tsv-apply")?.addEventListener("click", applyExpandedImport, true);

    const title = dialog.querySelector("#tsv-title");
    if (title) {
      new MutationObserver(() => {
        const text = title.textContent || "";
        renderGuide(text.includes("OFC") ? "ofc" : "skd");
      }).observe(title, { childList: true, characterData: true, subtree: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
