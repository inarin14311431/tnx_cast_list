// Synthetic data only: no live cast IDs or personal records.
export const character = {
  id: 'fixture', public_id: 'TNX-FIXTURE', character_name: '<名前> & "引用"',
  character_kana: 'ナマエ', handle: "灯'", handle_kana: 'アカリ', player_name: 'PLAYER',
  style_1: 'フェイト', style_1_mark: '◎●', divine_1: '真実',
  style_2: 'ミストレス', style_2_mark: '', divine_2: 'ファイト！',
  style_3: 'マヤカシ', style_3_mark: '', divine_3: '守護神',
  reason_value: 0, reason_control: 10, passion_value: 7, passion_control: 15,
  life_value: 3, life_control: 9, mundane_value: 5, mundane_control: 12, cs: 8,
  experience_points: 0, age: 25, gender: '女性', citizen_rank: 'B', affiliation: '探偵',
  image_url: 'https://example.test/full.webp', image_thumbnail_url: 'https://example.test/thumb.webp'
};
export const skills = [
  { category: 'general', name: '製作；道具', level: 2, reason: true, life: true },
  { category: 'general', name: '白兵', level: 0, passion: true },
  { category: 'general', name: '追加技能', level: 1, mundane: true },
  { category: 'social', name: '社会：N◎VA', level: 2 },
  { category: 'connection', name: '<コネ>', level: 1 },
  { category: 'style', name: '旧形式', level: 1, description: '技能：知覚\nタイミング：メジャー\n解説：長文<&>\n参照P：123' },
  { category: 'style', name: '構造化', level: 0, description: '@@TNX_STYLE_DETAIL_V1@@{"skill":"交渉","description":"長文\\n二行目"}' },
  { category: 'style', name: '破損JSON', level: 1, description: '@@TNX_STYLE_DETAIL_V1@@{invalid' }
];
export const outfits = ['weapon', 'armor', 'cyberware', 'tron', 'vehicle', 'residence', 'other', 'unknown'].map((category, i) => ({
  category, name: `${category}<&>`, purchase_value: '12', experience_cost: 3,
  concealment: '', attack: 'S+5', range: '至近', description: '解説\n二行目',
  defense: 'S:2 P:3 I:4', cs_modifier: 0,
  ofc_details: { concealment_penalty: 0, electronic_control: '10', speed: i,
    defense_s: '5', defense_p: '6', defense_i: '7', tron_software: '2', crew: 1 }
}));
export const combos = [
  { id: 'combo', name: '<攻撃>', ability: 'reason', skills: '白兵', act_use_limit: 3, target_value: 15, timing: 'メジャー', description: '説明<&>' },
  { id: 'counter', name: 'カウンター', skills: 'カウンター', act_use_limit: 2 },
  { id: 'legacy', ability_key: 'life', skill_names: ['知覚', '交渉'], achievement: 0, effect: '旧形式', act_use_limit: null }
];
export const usageEntries = [['combo', 2], ['counter', 1]];
export const quickCases = [
  { name: 'empty', data: { character: {}, skills: [], outfits: [], combos: [] } },
  { name: 'mixed', data: { character, skills, outfits, combos } },
  { name: 'long', data: { character, skills: Array.from({ length: 45 }, (_, i) => ({ ...skills[5], name: `長文${i}`, description: '解説：' + '長い解説<&>\n'.repeat(24) })), outfits, combos } }
];
export const baseUrl = 'https://example.test/archive/showcase-generator.html';
export const showcaseCases = ['nova', 'intron', 'vlad', 'lutetia', 'unknown'].flatMap(theme => ['', "https://example.test/bg')\n.webp"].map(background => ({
  name: `${theme}-${background ? 'background' : 'plain'}`,
  data: { title: '<アクト>', actName: 'N◎VA', rulerName: 'RL & name', intro: '導入\n二行目', theme, background,
    casts: [
      { source: 'public', character, quote: 'フェイト', description: '<ハンドアウト>' },
      { source: 'private', character: { ...character, public_id: 'PRIVATE-SECRET', image_thumbnail_url: '', character_name: '長い名前'.repeat(7) }, quote: '共通', description: '' },
      { manual: true, character: { character_name: '手動', manual_styles: 'カタナ◎／カブト●, カブキ', image_url: '' }, quote: '', description: '' }
    ] }
})));
