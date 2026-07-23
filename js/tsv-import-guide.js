(() => {
  const GUIDES = {
    skd: {
      title: "SKD TSV形式",
      description: "スタイル技能を1行につき1件取り込みます。現在の取込対象は、名称・種別・レベル・解説の4項目です。",
      fields: [
        ["名称", "必須", "スタイル技能名"],
        ["種別", "任意", "通常・秘技・奥義・演出。空欄や未認識の値は通常として扱います。"],
        ["レベル", "任意", "技能レベル。空欄の場合は1です。"],
        ["解説", "任意", "技能の説明。セル内改行は \\n と記述します。"]
      ],
      sample: [
        "名称\t種別\tレベル\t解説",
        "死の舞踏\t通常\t1\tカタナの代表的なスタイル技能",
        "元力：光学（正）\t秘技\t2\tダメージに光学効果を付与\\n詳細はルールブック参照"
      ].join("\n")
    },
    ofc: {
      title: "OFC TSV形式",
      description: "アウトフィットを1行につき1件取り込みます。name以外は省略できます。ヘッダー名は半角英字で入力してください。",
      fields: [
        ["target", "推奨", "分類。weapons / armours / vehicles / residences / outfits、または武器・防具・ヴィークル・住居・住宅・装備。"],
        ["name", "必須", "アウトフィット名"],
        ["purchase", "任意", "購入値"],
        ["permanent", "任意", "常備化経験点。数値で入力します。"],
        ["concealA", "任意", "隠匿値の前半"],
        ["concealB", "任意", "隠匿値の後半。concealAと「/」で連結されます。"],
        ["attack", "任意", "攻撃力"],
        ["defense", "任意", "防御値"],
        ["range", "任意", "射程"],
        ["part / slot", "任意", "部位。どちらのヘッダー名でも使用できます。"],
        ["notes", "任意", "解説。セル内改行は \\n と記述します。"]
      ],
      sample: [
        "target\tname\tpurchase\tpermanent\tconcealA\tconcealB\tattack\tdefense\trange\tpart\tnotes",
        "weapons\t斬魔刀\t15\t5\t12\t-1\tS+5\t\t至近\t片手持ち\t高周波ブレード",
        "armours\tアーマージャケット\t12\t3\t13\t0\t\t2/1/1\t\tスーツ\t都市生活用の軽装防具"
      ].join("\n")
    }
  };

  let activeMode = "skd";

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

  function initialize() {
    const dialog = document.querySelector("#tsv-dialog");
    if (!dialog) return;
    createGuide(dialog);
    renderGuide("skd");

    document.querySelector("#import-skd")?.addEventListener("click", () => renderGuide("skd"));
    document.querySelector("#import-ofc")?.addEventListener("click", () => renderGuide("ofc"));

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
