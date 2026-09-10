export const SHOWCASE_BACKGROUND_BUCKET = "act-showcase-backgrounds";
export const SHOWCASE_BACKGROUND_PUBLIC_BASE = "https://koprmbkoftuuffslhsvt.supabase.co/storage/v1/object/public/act-showcase-backgrounds";

const SHOWCASE_BACKGROUND_ASSET_BASE = new URL("../assets/showcase/backgrounds/", import.meta.url);
const SHOWCASE_BACKGROUND_ASSET_VERSION = "20260910-user-images-v4-attached-situations";
const rawAssetUrl = filename => new URL(filename, SHOWCASE_BACKGROUND_ASSET_BASE).href;
const assetUrl = filename => {
  const url = new URL(filename, SHOWCASE_BACKGROUND_ASSET_BASE);
  url.searchParams.set("v", SHOWCASE_BACKGROUND_ASSET_VERSION);
  return url.href;
};
const normalizeAssetUrl = value => {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  try {
    const base = typeof window !== "undefined" && window.location?.href ? window.location.href : import.meta.url;
    const url = new URL(normalized, base);
    url.search = "";
    url.hash = "";
    return url.href;
  } catch {
    return normalized.split(/[?#]/, 1)[0];
  }
};

export const SHOWCASE_BACKGROUND_PRESETS = Object.freeze([
  Object.freeze({
    key: "nova-central-ring",
    name: "トーキョーN◎VA",
    description: "イワヤトビルを中心に同心円状へ広がるトーキョーN◎VAの中央市街",
    url: assetUrl("nova-central-ring.svg")
  }),
  Object.freeze({
    key: "kisarazu-lake-harbor",
    name: "木更津湖港湾",
    description: "高層建築と港湾施設の灯りが水面に映る木更津湖沿岸エリア",
    url: assetUrl("kisarazu-lake-harbor.svg")
  }),
  Object.freeze({
    key: "sunrise-megacity",
    name: "夜明けのメガシティ",
    description: "朝焼けに染まる高所からトーキョーN◎VAを一望する都市遠景",
    url: assetUrl("sunrise-megacity.svg")
  }),
  Object.freeze({
    key: "neon-market",
    name: "イエローエリア",
    description: "ネオンと露店、雑多な都市設備が密集するイエローエリアの街路",
    url: assetUrl("neon-market.svg")
  }),
  Object.freeze({
    key: "industrial-port",
    name: "工業港湾地区",
    description: "巨大クレーンとコンテナ船が並ぶ工業港湾エリア",
    url: assetUrl("industrial-port.svg")
  }),
  Object.freeze({
    key: "executive-lounge",
    name: "ホワイトエリア",
    description: "企業上層階のラウンジから摩天楼を望むホワイトエリアの風景",
    url: assetUrl("executive-lounge.svg")
  }),
  Object.freeze({
    key: "incident-blockade",
    name: "封鎖区域",
    description: "規制ラインと蒸気が漂う事件直後の封鎖都市街路",
    url: assetUrl("incident-blockade.svg")
  }),
  Object.freeze({
    key: "orbital-habitat",
    name: "軌道",
    description: "地球を眼下に望む軌道居住区と宇宙港デッキ",
    url: assetUrl("orbital-habitat.avif")
  }),
  Object.freeze({
    key: "prison-block",
    name: "牢獄",
    description: "監視設備と隔壁に囲まれた近未来の拘束・収容区画",
    url: assetUrl("prison-block.avif")
  }),
  Object.freeze({
    key: "slum-district",
    name: "スラム街",
    description: "配線とネオン、仮設建築が密集する都市下層の生活街区",
    url: assetUrl("slum-district.avif")
  })
]);

const LEGACY_PRESET_KEY_ALIASES = new Map([
  ["neotokyo-bay", "kisarazu-lake-harbor"]
]);
const LEGACY_PRESET_URL_ALIASES = new Map([
  [normalizeAssetUrl(rawAssetUrl("neotokyo-bay.svg")), "kisarazu-lake-harbor"]
]);

export function findShowcaseBackgroundPreset(key) {
  const normalized = String(key || "").trim().toLowerCase();
  const canonical = LEGACY_PRESET_KEY_ALIASES.get(normalized) || normalized;
  return SHOWCASE_BACKGROUND_PRESETS.find(preset => preset.key === canonical) || null;
}

export function findShowcaseBackgroundPresetByUrl(url) {
  const normalized = normalizeAssetUrl(url);
  if (!normalized) return null;
  const direct = SHOWCASE_BACKGROUND_PRESETS.find(preset => normalizeAssetUrl(preset.url) === normalized);
  if (direct) return direct;
  const aliasKey = LEGACY_PRESET_URL_ALIASES.get(normalized);
  return aliasKey ? findShowcaseBackgroundPreset(aliasKey) : null;
}
