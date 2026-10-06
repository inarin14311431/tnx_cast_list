export const SHOWCASE_BACKGROUND_BUCKET = "act-showcase-backgrounds";
export const SHOWCASE_BACKGROUND_PUBLIC_BASE = "https://koprmbkoftuuffslhsvt.supabase.co/storage/v1/object/public/act-showcase-backgrounds";

const SHOWCASE_BACKGROUND_ASSET_BASE = new URL("../assets/showcase/backgrounds/", import.meta.url);
const SHOWCASE_BACKGROUND_ASSET_VERSION = "20261006-green-area-cyberspace";
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

// Retired presets (the neon-market and incident-blockade SVGs): the files stay in assets/ because published acts store
// the image URL, not the key. An act that still points at one opens in the editor as a custom background; they
// are deliberately not aliased to a new preset.
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
    key: "green-area",
    name: "グリーンエリア",
    description: "緑化されたテラスと歩行者デッキが続く、治安の安定したグリーンエリアの街路",
    url: assetUrl("green-area.avif")
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
    key: "cyberspace",
    name: "電脳空間",
    description: "データの柱と光の回線が格子状に広がる、ウェブ内部の電脳空間",
    url: assetUrl("cyberspace.avif")
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
