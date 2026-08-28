const SOURCE_SITE_URL = "https://character-sheets.appspot.com/tnx/";
const RIGHTS_TEXT = "(C)FarEast Amusement Research Co.,Ltd.／(C)GameField Co.,Ltd.";
const CONTACT_EMAIL = "inarin1431@gmail.com";
const CONTACT_X_URL = "https://x.com/inari_aki";

const TERMS_HTML = `
  <section id="legal-terms" class="legal-policy-section" data-legal-section="terms">
    <h2>利用規約 <small>TERMS OF USE</small></h2>
    <p>本サイトは『トーキョーN◎VA THE AXLERATION』を題材とする、日本国内での利用を想定した非公式ファンツールです。各権利者による公式サービスではなく、提携・承認・運営上の関係を有するものではありません。</p>
    <h3>1. 利用について</h3>
    <p>本サイトは、利用者が自身のキャスト情報を登録・編集・閲覧し、TRPGのプレイを補助する目的で提供します。法令、公序良俗、第三者の権利および各サービスの利用条件に反する利用を行わないでください。</p>
    <h3>2. 登録データと権利</h3>
    <p>キャスト名、設定、文章、画像その他の登録データについて、利用者は本サイトで保存・表示・公開するために必要な権利または許諾を有するもののみ登録してください。公式画像や第三者の著作物、個人情報等を必要な許諾なく登録・公開することは禁止します。</p>
    <p>利用者が公開設定にしたデータについては、本サイトの提供に必要な範囲で保存・複製・公衆送信・表示します。権利そのものが運営者へ移転するものではありません。権利侵害その他の問題が確認された場合、必要な範囲で非公開化・削除等を行う場合があります。</p>
    <h3>3. データ取込・データ転記</h3>
    <p>本サイトのデータ取込・データ転記機能は、「トーキョーN◎VA THE AXLERATION Cast Profile DataBase（キャラクターシート倉庫）」とのデータ移行を利用者自身の操作で補助する非公式機能です。</p>
    <p>転記元・転記先サイトのシステム、表示、コンテンツ等に関する権利は、それぞれの権利者に帰属します。個々のキャラクター名、設定、画像、文章その他のデータについては各投稿者・作成者等の権利を尊重し、利用者自身が利用可能なデータのみを取り込み・転記してください。</p>
    <p><a href="${SOURCE_SITE_URL}" target="_blank" rel="noopener noreferrer">キャラクターシート倉庫を開く</a></p>
    <h3>4. サービスの変更・停止</h3>
    <p>本サイトは個人運営の非公式ツールです。保守、障害対応、仕様変更、外部サービスの変更その他の理由により機能を変更・停止・終了する場合があります。重要なキャストデータは必要に応じて利用者自身でもバックアップしてください。</p>
    <h3>5. 免責</h3>
    <p>本サイトは現状有姿で提供します。本サイトの利用、サービス停止、データ消失、外部サービスとの連携等によって生じた損害について、故意または重大な過失がある場合など法令上責任を制限できない場合を除き、法令上認められる範囲で責任を限定します。</p>
    <h3>6. アカウント・データの削除</h3>
    <p>アカウントおよび登録データは、本サイトが提供する削除機能の範囲で削除できます。公開設定にした情報は、削除または非公開化するまで第三者から閲覧される場合があります。</p>
    <h3>7. 準拠法</h3>
    <p>本規約および本サイトには日本法を適用します。</p>
  </section>`;

const PRIVACY_HTML = `
  <section id="legal-privacy" class="legal-policy-section" data-legal-section="privacy">
    <h2>プライバシーポリシー <small>PRIVACY POLICY</small></h2>
    <p>本サイトでは、アカウント認証、キャスト管理、アクト・経験点管理その他の機能提供に必要な範囲で利用者情報を取り扱います。本サイトは日本国内での利用を想定しています。</p>
    <h3>取り扱う情報</h3>
    <ul>
      <li>メールアドレス、認証識別子、ログインに関する情報</li>
      <li>キャスト名、PL名、RULER名、プロフィール、技能、アウトフィット、画像その他の登録情報</li>
      <li>参加アクト履歴、経験点の獲得・消費履歴、スナップショット等の利用者が入力・生成する情報</li>
      <li>公開・非公開設定、更新日時その他サービス提供に必要な設定・技術情報</li>
      <li>障害調査、不正利用防止、安全管理のため外部基盤が生成するアクセス・エラーログ等</li>
    </ul>
    <h3>利用目的</h3>
    <p>本人認証、登録データの保存・表示・編集・復元、公開設定の反映、不具合対応、不正利用対策、セキュリティ確保、バックアップその他本サイトの提供・保守のために利用します。</p>
    <h3>公開情報と非公開情報</h3>
    <p>利用者が「公開」に設定したキャスト情報、画像および公開アクト紹介は、ログインしていない第三者を含めインターネット上から閲覧可能になります。非公開データ、本人専用の履歴・スナップショット等は、アクセス制御により通常利用者から本人のみが利用できるよう管理します。</p>
    <h3>外部サービス・国外での処理</h3>
    <p>本サイトは認証、データベース、ストレージ等にSupabaseを、静的Web配信にGitHub Pagesを利用しています。これらの外部サービスの提供に必要な範囲で情報が処理されます。現在のSupabaseプロジェクトは韓国（ソウル）リージョンで稼働しており、利用者が日本国内にいてもデータ保管場所自体が日本国内に限定されるものではありません。</p>
    <h3>アクセス解析・ブラウザ保存領域</h3>
    <p>ログイン状態や表示テーマ等の機能提供のため、認証セッションやブラウザの保存領域を利用する場合があります。現時点では広告配信や行動ターゲティングを目的としたアクセス解析は実施していません。導入する場合は本ポリシーを更新します。</p>
    <h3>保存・削除</h3>
    <p>登録データは、本サイトの提供に必要な期間または利用者が削除するまで保存します。利用者は本サイトの編集・削除機能を通じて自ら登録した情報を確認・訂正・削除でき、アカウント画面からアカウント全体を削除できます。障害復旧・監査用のバックアップ等は、必要な期間に限り通常利用者からアクセスできない状態で保管する場合があります。</p>
    <h3>安全管理</h3>
    <p>認証、Row Level Security（RLS）、所有者単位のアクセス制御、公開・非公開の分離、権限の最小化、セキュリティ監査等により、不正アクセス、漏えい、改ざん等の防止に努めます。</p>
  </section>`;

const CONTACT_HTML = `
  <section id="legal-contact" class="legal-policy-section" data-legal-section="contact">
    <h2>お問い合わせ <small>CONTACT</small></h2>
    <p>本サイトに関するお問い合わせ、不具合のご連絡、権利侵害に関する申告、登録データの削除等に関するご連絡は、以下の窓口までお願いします。</p>
    <ul>
      <li>メール：<a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></li>
      <li>X：<a href="${CONTACT_X_URL}" target="_blank" rel="noopener noreferrer">@inari_aki</a></li>
    </ul>
    <p>権利侵害に関するご連絡では、対象となるページやデータ、権利関係を確認できる情報を可能な範囲でお知らせください。</p>
  </section>`;

function whenReady(callback) {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", callback, { once: true });
  else callback();
}

function installDialog() {
  let dialog = document.querySelector("#site-legal-dialog");
  if (dialog) return dialog;
  dialog = document.createElement("dialog");
  dialog.id = "site-legal-dialog";
  dialog.setAttribute("aria-labelledby", "site-legal-dialog-title");
  dialog.innerHTML = `
    <header class="legal-dialog__header"><strong id="site-legal-dialog-title">サイトポリシー</strong><button type="button" data-legal-close>閉じる</button></header>
    <div class="legal-dialog__body">
      <nav class="legal-dialog__tabs" aria-label="サイトポリシー"><button type="button" data-open-legal="terms">利用規約</button><button type="button" data-open-legal="privacy">プライバシーポリシー</button><button type="button" data-open-legal="contact">お問い合わせ</button></nav>
      ${TERMS_HTML}
      ${PRIVACY_HTML}
      ${CONTACT_HTML}
      <section class="legal-policy-section"><h2>権利表示 <small>RIGHTS NOTICE</small></h2><p>本サイトは『トーキョーN◎VA THE AXLERATION』の非公式ファンツールです。各権利者による公式サービスではありません。</p><p>${RIGHTS_TEXT}</p></section>
    </div>`;
  document.body.append(dialog);
  dialog.querySelector("[data-legal-close]")?.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
  return dialog;
}

function openPolicy(section = "terms") {
  const dialog = installDialog();
  if (!dialog.open) dialog.showModal();
  requestAnimationFrame(() => dialog.querySelector(`[data-legal-section="${section}"]`)?.scrollIntoView({ block: "start" }));
}

function bindPolicyButtons(root = document) {
  root.querySelectorAll("[data-open-legal]").forEach(button => {
    if (button.dataset.legalBound === "1") return;
    button.dataset.legalBound = "1";
    button.addEventListener("click", event => {
      event.preventDefault();
      openPolicy(button.dataset.openLegal || "terms");
    });
  });
}

function installFooter() {
  let footer = document.querySelector("footer.archive-copyright, footer.site-legal-footer, [data-legal-footer]");
  if (!footer) {
    footer = document.createElement("footer");
    document.body.append(footer);
  }
  footer.className = "site-legal-footer";
  footer.dataset.legalFooter = "1";
  footer.innerHTML = `<p>本サイトは『トーキョーN◎VA THE AXLERATION』の非公式ファンツールです。各権利者による公式サービスではありません。</p><p>${RIGHTS_TEXT}</p><div class="site-legal-footer__links"><button type="button" data-open-legal="terms">利用規約</button><button type="button" data-open-legal="privacy">プライバシーポリシー</button><button type="button" data-open-legal="contact">お問い合わせ</button></div>`;
  bindPolicyButtons(footer);
}

function installSignupConsent() {
  const form = document.querySelector("#signup-form");
  if (!form || form.querySelector("#signup-legal-consent")) return;
  const label = document.createElement("label");
  label.className = "legal-consent";
  label.innerHTML = `<input id="signup-legal-consent" name="legalConsent" type="checkbox" required><span><span class="legal-consent__links"><button type="button" data-open-legal="terms">利用規約</button>および<button type="button" data-open-legal="privacy">プライバシーポリシー</button></span>を確認し、同意してアカウントを登録します。</span>`;
  form.querySelector("button[type='submit']")?.before(label);
  bindPolicyButtons(label);
}

function installImageNotice() {
  const forms = [...document.querySelectorAll("#image-form, form")].filter(form => form.querySelector("input[type='file'][accept*='image']"));
  forms.forEach(form => {
    if (form.querySelector(".legal-image-rights-notice")) return;
    const note = document.createElement("p");
    note.className = "legal-inline-notice legal-inline-notice--important legal-image-rights-notice";
    note.textContent = "自身が使用・公開する権利を有する画像のみ登録してください。公式画像や第三者の著作物など、無断使用となる画像の登録はお控えください。";
    const guidance = form.querySelector(".image-guidance");
    if (guidance) guidance.append(note);
    else form.querySelector("input[type='file']")?.closest("label")?.after(note);
  });
}

function transferNoticeHtml(short = false) {
  if (short) return `キャラクターシート倉庫とのデータ取込・転記機能です。転記元・転記先サイトおよび登録データの権利を尊重し、自身が利用可能なデータのみ使用してください。詳細は <button type="button" data-open-legal="terms">利用規約</button> をご確認ください。`;
  return `本機能は「トーキョーN◎VA THE AXLERATION Cast Profile DataBase（キャラクターシート倉庫）」とのデータ取込・転記を補助する非公式機能です。本サイトと同サイトの運営者との間に提携・承認・運営上の関係はありません。個々の登録データの権利は各投稿者・作成者等に帰属します。<a href="${SOURCE_SITE_URL}" target="_blank" rel="noopener noreferrer">キャラクターシート倉庫</a>`;
}

function installTransferNotices() {
  const transferPage = document.querySelector(".transfer-page");
  if (transferPage && !transferPage.querySelector(".legal-transfer-notice")) {
    const note = document.createElement("p");
    note.className = "legal-inline-notice legal-inline-notice--important legal-transfer-notice";
    note.innerHTML = transferNoticeHtml(false);
    transferPage.querySelector(".lead")?.after(note);
  }

  const importButton = document.querySelector("#legacy-import-open");
  if (importButton && !document.querySelector(".legal-import-short-notice")) {
    const note = document.createElement("p");
    note.className = "legal-inline-notice legal-import-short-notice";
    note.innerHTML = transferNoticeHtml(true);
    importButton.after(note);
    bindPolicyButtons(note);
  }

  const importDialogForm = document.querySelector("#legacy-import-dialog form");
  if (importDialogForm && !importDialogForm.querySelector(".legal-import-dialog-notice")) {
    const note = document.createElement("p");
    note.className = "legal-inline-notice legal-inline-notice--important legal-import-dialog-notice";
    note.innerHTML = transferNoticeHtml(false);
    importDialogForm.querySelector("h2")?.after(note);
  }
}

function removeMasterTsvImportUi() {
  document.querySelector("#import-skd")?.remove();
  document.querySelector("#import-ofc")?.remove();
  document.querySelector("#tsv-dialog")?.remove();
}

function init() {
  installDialog();
  installFooter();
  installSignupConsent();
  installImageNotice();
  installTransferNotices();
  removeMasterTsvImportUi();
  bindPolicyButtons(document);
}

whenReady(init);

globalThis.TNX_LEGAL = Object.freeze({ openPolicy });