// Fixed (mock) data for the ACT SHOWCASE E2E checks that need a full three-cast act. Same content as the
// visual baselines' fixture (visual-regression-baseline: tests/visual/act-showcase-fixtures.js). Never reads
// the production database.
export const ACT_SLUG = "visual-act-001";
export const ACT_THEMES = ["nova", "intron", "vlad", "lutetia"];

const portrait = (from, to) => `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="600" height="800" fill="url(#g)"/><circle cx="300" cy="300" r="110" fill="rgba(255,255,255,.18)"/><rect x="170" y="440" width="260" height="260" rx="130" fill="rgba(255,255,255,.18)"/></svg>`
)}`;

const castBase = { reading: "", tagline: "", imageAlt: "", link: { disabled: true, href: "", text: "" } };

export const showcaseData = Object.freeze({
  version: 2,
  pageTitle: "VISUAL ACT SHOWCASE",
  heroTitle: "TOKYO N◎VA THE AXLERATION",
  heroSubTitle: "CAST SHOWCASE",
  actName: "夜明けを駆ける者",
  rulerName: "VISUAL RULER",
  background: "",
  trailer: {
    title: "夜明け前の通信",
    body: "夜のN◎VAに未明の警報が響く。\n消えたデータの痕跡を追い、三人のキャストが動き出す。"
  },
  casts: [
    {
      ...castBase,
      slot: "CAST 01",
      serial: "TNX-VISUAL001",
      fullName: "“ブルー・モーメント” 夜明けのランナー",
      reading: "ブルー・モーメント ヨアケノランナー",
      tagline: "夜明けの運び屋",
      imageUrl: portrait("#0b4a6e", "#1c1f4a"),
      imageAlt: "夜明けのランナー",
      styles: [
        { label: "カブキ◎", handoutRole: true },
        { label: "カゼ●", handoutRole: false },
        { label: "ニューロ", handoutRole: false }
      ],
      meta: [
        { label: "PLAYER", value: "VISUAL TESTER" },
        { label: "AFFILIATION", value: "N◎VA市政調査局" },
        { label: "AGE", value: "24" },
        { label: "GENDER / RANK", value: "女性 / B" }
      ],
      handout: {
        title: "『カブキ』用ハンドアウト",
        body: "推奨スタイル：カブキ\nコネ：千早雅之　推奨スート：情熱\n消えたデータの痕跡を追う運び屋として、事件の渦中に巻き込まれる。"
      }
    },
    {
      ...castBase,
      slot: "CAST 02",
      serial: "TNX-VISUAL003",
      fullName: "“ガーディアン” 鋼鉄の番犬",
      reading: "ガーディアン コウテツノバンケン",
      tagline: "生還を最優先する企業戦士",
      imageUrl: "",
      imageAlt: "鋼鉄の番犬",
      styles: [
        { label: "カブト◎", handoutRole: true },
        { label: "クグツ●", handoutRole: false },
        { label: "アラシ", handoutRole: false }
      ],
      meta: [
        { label: "PLAYER", value: "SAMPLE PLAYER" },
        { label: "AFFILIATION", value: "千早重工後方処理課" },
        { label: "AGE", value: "35" },
        { label: "GENDER / RANK", value: "男性 / C" }
      ],
      handout: {
        title: "『カブト』用ハンドアウト",
        body: "推奨スタイル：カブト\nコネ：依頼人　推奨スート：理性\n依頼人の生還を最優先に行動する。"
      }
    },
    {
      ...castBase,
      slot: "CAST 03",
      serial: "TNX-VISUAL002",
      fullName: "“ホワイトノイズ” 境界線の観測者",
      reading: "ホワイトノイズ キョウカイセンノカンソクシャ",
      tagline: "境界から届くニュース",
      imageUrl: portrait("#5a1a4e", "#0f2f3f"),
      imageAlt: "境界線の観測者",
      styles: [
        { label: "トーキー◎", handoutRole: true },
        { label: "ミストレス●", handoutRole: false },
        { label: "ニューロ", handoutRole: false }
      ],
      meta: [
        { label: "PLAYER", value: "VISUAL TESTER" },
        { label: "AFFILIATION", value: "フリーランス" },
        { label: "AGE", value: "29" },
        { label: "GENDER / RANK", value: "— / A" }
      ],
      handout: {
        title: "『トーキー』用ハンドアウト",
        body: "推奨スタイル：トーキー\nコネ：情報屋　推奨スート：生命\n境界領域から事件の真相を報じる。"
      }
    }
  ]
});

export const guestData = Object.freeze([{
  sort_order: 1,
  handle: "ゲスト",
  name: "協力者 K",
  persona_style: "トーキー",
  affiliation: "N◎VA市政調査局",
  gender: "—",
  age: "—",
  tagline: "SUPPORTING",
  summary: "アクトを支える協力者。",
  image_url: ""
}]);

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "apikey, authorization, content-type, x-client-info",
  "access-control-allow-methods": "POST, OPTIONS",
  "content-type": "application/json"
};

async function fulfill(route, body) {
  if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: corsHeaders, body: "" });
  return route.fulfill({ status: 200, headers: corsHeaders, body: JSON.stringify(body) });
}

export async function installActShowcaseRoutes(page, data = showcaseData) {
  // Remote web fonts would make the first frame depend on the network.
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
  await page.route("**/rest/v1/rpc/get_public_act_showcase", route => fulfill(route, data));
  await page.route("**/rest/v1/rpc/get_public_act_showcase_guests", route => fulfill(route, guestData));
}

// Same routes, but the showcase RPC is held until release() is called, so the loading screen can be captured.
export async function installHeldActShowcaseRoutes(page) {
  let release;
  const held = new Promise(resolve => { release = resolve; });
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
  await page.route("**/rest/v1/rpc/get_public_act_showcase", async route => {
    await held;
    await fulfill(route, showcaseData);
  });
  await page.route("**/rest/v1/rpc/get_public_act_showcase_guests", route => fulfill(route, guestData));
  return release;
}
