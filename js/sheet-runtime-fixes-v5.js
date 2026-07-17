const originalMathMax = Math.max.bind(Math);

Math.max = function patchedMathMax(...args) {
  const stack = new Error().stack || "";

  if (
    stack.includes("updatePaidGrowth") &&
    args.length === 3 &&
    Number(args[2]) === 0
  ) {
    return originalMathMax(Number(args[1]) || 0, 0);
  }

  return originalMathMax(...args);
};

initializeVisibilityLabels();

function initializeVisibilityLabels() {
  const select = document.querySelector("#visibility");
  const help = document.querySelector(".visibility-help");

  if (select) {
    const current = select.value;

    select.innerHTML = `
      <option value="draft">下書き / DRAFT</option>
      <option value="public">公開 / PUBLIC</option>
      <option value="private">非公開 / PRIVATE</option>
      <option value="archived">引退 / ARCHIVED</option>
    `;

    select.value = ["draft", "public", "private", "archived"].includes(current)
      ? current
      : "private";
  }

  if (help) {
    help.innerHTML = `
      <strong>公開状態について</strong>
      <dl>
        <div>
          <dt>下書き <small>DRAFT</small></dt>
          <dd>本人だけが編集・閲覧できます。</dd>
        </div>
        <div>
          <dt>公開 <small>PUBLIC</small></dt>
          <dd>キャスト一覧に掲載され、誰でも閲覧できます。</dd>
        </div>
        <div>
          <dt>非公開 <small>PRIVATE</small></dt>
          <dd>本人だけが閲覧できます。</dd>
        </div>
        <div>
          <dt>引退 <small>ARCHIVED</small></dt>
          <dd>過去データとして保存し、通常利用から除外されます。</dd>
        </div>
      </dl>
    `;
  }
}
