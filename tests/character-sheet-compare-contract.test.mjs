import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { canonicalizeArchiveBundle, canonicalizeCharacterSheetJsonp, diffCanonicalBundles } from "../js/character-sheet-jsonp-canonical.js";

const compare = fs.readFileSync(new URL("../js/sheet-character-sheet-compare.js", import.meta.url), "utf8");
const snapshots = fs.readFileSync(new URL("../js/sheet-snapshots.js", import.meta.url), "utf8");
const migration = fs.readFileSync(new URL("../supabase/38_snapshot_from_bundle.sql", import.meta.url), "utf8");

test("comparison reads JSONP directly without running the importer first", () => {
  assert.match(compare, /canonicalizeCharacterSheetJsonp\(externalPayload\)/);
  assert.match(compare, /canonicalizeArchiveBundle\(archiveBundle\)/);
  assert.match(compare, /diffCanonicalBundles/);
  const start = compare.slice(compare.indexOf("async function startComparison"), compare.indexOf("async function restoreComparison"));
  assert.doesNotMatch(start, /applyLegacyPayload/);
  assert.doesNotMatch(start, /captureEditorBundle/);
  assert.doesNotMatch(start, /location\.reload/);
});

test("comparison remains read-only until the user chooses a side", () => {
  assert.match(compare, /getSheetSaveState\(\)\s*!==\s*"saved"/);
  assert.match(compare, /showComparisonModal/);
  assert.match(compare, /compare-adopt-warehouse/);
  assert.match(compare, /compare-keep-archive/);
  assert.match(compare, /差分をコピー/);
  assert.doesNotMatch(compare, /persistSheetBundle/);
  assert.doesNotMatch(compare, /save_character_bundle/);
});

test("comparison modal and clipboard use concise warehouse-baseline summaries", () => {
  assert.match(compare, /groupCharacterSheetDifferences\(context\.differences\)/);
  assert.match(compare, /summarizeCharacterSheetDifferences\(diffs\)/);
  assert.match(compare, /キャラクターシート倉庫のデータと比べ、CAST ARCHIVEでは次の差分があります/);
  assert.doesNotMatch(compare, /function renderDifference/);
  assert.match(compare, /summaries\.forEach/);
  assert.match(compare, /summaries\.map/);
  assert.match(compare, /summaries\.forEach/);
  assert.match(compare, /navigator\.clipboard\.writeText/);
});

test("choice actions use the legacy importer only after an explicit choice", () => {
  const adopt = compare.slice(compare.indexOf("async function adoptWarehouse"), compare.indexOf("async function keepArchive"));
  const keep = compare.slice(compare.indexOf("async function keepArchive"), compare.indexOf("function setCharacterSheetUrl"));
  assert.match(adopt, /snapshots\.createCurrent/);
  assert.match(adopt, /applyLegacyPayload\(context\.externalPayload\)/);
  assert.match(keep, /applyLegacyPayload\(context\.externalPayload\)/);
  assert.match(keep, /captureEditorBundle/);
  assert.match(keep, /snapshots\.createBundle/);
  assert.match(keep, /location\.reload/);
});

test("comparison reuses the existing snapshot table and restore format", () => {
  assert.match(snapshots, /create_character_snapshot_from_bundle/);
  assert.match(snapshots, /TNXSheetSnapshots/);
  assert.match(migration, /returns public\.character_snapshots/);
  assert.match(migration, /insert into public\.character_snapshots/);
  assert.match(migration, /offset 10/);
  assert.match(migration, /jsonb_typeof\(p_snapshot_data->'character'\)/);
});

test("raw Character Sheets JSONP and archive data canonicalize to the same semantic values", () => {
  const raw = {
    base: {
      name: "“汚い” メラキ",
      nameKana: "メラキ",
      player: "稲荷秋",
      post: "フリーランス",
      rank: "B-",
      age: "24",
      sex: "女",
      height: "178",
      weight: "65",
      eyes: "赤",
      hair: "青赤黒",
      skin: "白",
      lifepath: { origin: "企業の子", environment: "愛", encounter: "友情", memo: "概要" },
      memoir: "設定",
      memo: "補足",
      birth: "Ｎ◎ＶＡ"
    },
    outline: "STYLE:Kabuto●=Mannequin◎=Hiruko",
    ability: {
      reason: { abl: "4", ctl: "10/11" },
      passion: { abl: "7", ctl: "14/15" },
      life: { abl: "8", ctl: "15/16" },
      mundane: { abl: "2", ctl: "9/10" },
      cs: "9"
    },
    skills1: [{ name: "医療", level: "1", s: true }],
    skills3: [{ name: "N◎VA", level: "1", c: true }],
    skills4: [{ name: "メロディ", level: "1", c: true }],
    superhumanskills: [{ name: "†電光石火", level: "1", h: true, type: "秘技", skill: "一心同体", limit: "4", timing: "リアクション", target: "ー", range: "ー", aim: "達成値", confront: "ー", page: "54", notes: "追加行動技能" }],
    armors: [{ name: "ステイマッスル", slot: "筋肉", concealA: "14", concealB: "0", purchase: "20", permanent: "7", protecS: "3", protecP: "3", protecI: "3", electrical_control: "13", notes: "部位：皮膚の防具を準備している場合SPIに＋３" }]
  };
  const archive = {
    character: {
      character_name:"メラキ",character_kana:"メラキ",handle:"汚い",handle_kana:"",player_name:"稲荷秋",affiliation:"フリーランス",citizen_rank:"B-",summary:"概要",profile:"設定\n\n【メモ】\n補足\n\n出身：Ｎ◎ＶＡ",age:"24",gender:"女",height:"178",weight:"65",eyes:"赤",hair:"青赤黒",skin:"白",life_path_origin:"企業の子",life_path_experience:"愛",life_path_encounter:"友情",style_1:"カブト",style_1_mark:"●",style_1_attribute:"",style_2:"マネキン",style_2_mark:"◎",style_2_attribute:"",style_3:"ヒルコ",style_3_mark:"",style_3_attribute:"",reason_base:4,reason_gear:0,reason_control_base:10,reason_control_gear:1,passion_base:7,passion_gear:0,passion_control_base:14,passion_control_gear:1,life_base:8,life_gear:0,life_control_base:15,life_control_gear:1,mundane_base:2,mundane_gear:0,mundane_control_base:9,mundane_control_gear:1,cs_base:9,cs_gear:0
    },
    skills: [
      {category:"general",name:"医療",level:1,free_level:0,skill_kind:"general",reason:true,passion:false,life:false,mundane:false,description:""},
      {category:"social",name:"社会：N◎VA",level:1,free_level:0,skill_kind:"proper",reason:false,passion:true,life:false,mundane:false,description:""},
      {category:"connection",name:"コネ：メロディ",level:1,free_level:0,skill_kind:"proper",reason:false,passion:true,life:false,mundane:false,description:""},
      {category:"style",name:"†電光石火",level:1,free_level:0,skill_kind:"secret",reason:false,passion:false,life:true,mundane:false,description:'@@TNX_STYLE_DETAIL_V1@@\n{"skill":"一心同体","limit":"4","timing":"リアクション","target":"ー","range":"ー","difficulty":"達成値","confrontation":"ー","description":"追加行動技能","page":"54"}'}
    ],
    outfits: [{category:"armor",name:"ステイマッスル",slot:"筋肉",range:"",attack:"",concealment:"14/0",purchase_value:"20",experience_cost:7,cs_modifier:0,control_modifier:0,description:"部位：皮膚の防具を準備している場合SPIに＋３",ofc_details:{slot:"筋肉",defense_s:"3",defense_p:"3",defense_i:"3",purchase_target:"20",permanent_cost:"7",electronic_control:"13",concealment_penalty:"0",description:"部位：皮膚の防具を準備している場合SPIに＋３"}}]
  };
  const differences = diffCanonicalBundles(canonicalizeArchiveBundle(archive), canonicalizeCharacterSheetJsonp(raw));
  assert.deepEqual(differences, []);
});

test("direct JSONP comparison still reports real semantic changes", () => {
  const raw = { base:{name:"メラキ"}, ability:{reason:{abl:"5",ctl:"10/11"}} };
  const archive = { character:{character_name:"メラキ",reason_base:4,reason_gear:0,reason_control_base:10,reason_control_gear:1},skills:[],outfits:[] };
  const differences = diffCanonicalBundles(canonicalizeArchiveBundle(archive), canonicalizeCharacterSheetJsonp(raw));
  assert.ok(differences.some(item=>item.category==="abilities"&&item.path==="reason_base"&&item.archive===4&&item.warehouse===5));
});
