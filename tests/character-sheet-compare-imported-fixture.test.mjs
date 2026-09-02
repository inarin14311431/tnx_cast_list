import test from "node:test";
import assert from "node:assert/strict";
import { canonicalizeArchiveBundle, canonicalizeCharacterSheetJsonp, diffCanonicalBundles } from "../js/character-sheet-jsonp-canonical.js";

test("freshly imported TNX-000168-shaped data compares equal to its source JSONP", () => {
  const raw = {
    base:{name:"“甘噛み” スグリ",nameKana:"“デスロール” スグリ",player:"稲荷秋",post:"マーダー・インク",rank:"X",age:"2x",sex:"女",height:"155",weight:"49",eyes:"Green",hair:"W&Y",skin:"Deadman",lifepath:{origin:"ストリートチルドレン（社会：ストリート）",environment:"犯罪（コネ：長谷部万力）",encounter:"宿命（コネ：ナイン）",memo:"「アハ、ハハヘハア、もう我慢、できないの...」"}},
    outline:"STYLE:Kabuto-Wari◎●=Ayakashi=Hiruko",
    ability:{reason:{abl:"3",ctl:"12"},passion:{abl:"4",ctl:"14"},life:{abl:"8",ctl:"10"},mundane:{abl:"6",ctl:"12"},cs:"7"},
    skills1:[{name:"医療",level:"1",s:true},{name:"射撃",level:"3",s:true,h:true,d:true}],
    skills3:[{name:"N◎VA",level:"1",d:true},{name:"ストリート",level:"1",h:true}],
    skills4:[{name:"長谷部万力",level:"1",d:true},{name:"ナイン",level:"1",h:true}],
    superhumanskills:[{name:"硬化",level:"1",c:true,notes:"ダメージ軽減技能\n肉体ダメージを[カードの数字]点軽減"},{name:"ヒューマナイズ",level:"1",notes:"スタイル偽装技能"}],
    weapons:[{name:"ハントマン",purchase:"8",permanent:"5",concealA:"5",concealB:"-2",attack:"I+8",range:"近",slot:"片手",electrical_control:"15",notes:"[対象：範囲]"}],
    armors:[{name:"鎧皮",purchase:"22",permanent:"6",concealA:"10",concealB:"-1",slot:"皮膚",protecS:"5",protecP:"4",protecI:"7",control:"0",electrical_control:"17",notes:"肉体ダメージを5点軽減する。1シーン1回"},{name:"ステイマッスル",purchase:"20",permanent:"7",concealA:"14",concealB:"0",slot:"筋肉",protecS:"3",protecP:"3",protecI:"3",control:"0",electrical_control:"13"}],
    residences:[{name:"レッドのマンション",permanent:"0"}],
    outfits:[{name:"IANUS",purchase:"0",permanent:"0",concealA:"10",concealB:"0",slot:"全身",electrical_control:"制御値"}]
  };
  const archive = {
    character:{character_name:"スグリ",character_kana:"スグリ",handle:"“甘噛み”",handle_kana:"“デスロール”",player_name:"稲荷秋",affiliation:"マーダー・インク",citizen_rank:"X",summary:"「アハ、ハハヘハア、もう我慢、できないの...」",profile:"",age:"2x",gender:"女",height:"155",weight:"49",eyes:"Green",hair:"W&Y",skin:"Deadman",life_path_origin:"ストリートチルドレン（社会：ストリート）",life_path_experience:"犯罪（コネ：長谷部万力）",life_path_encounter:"宿命（コネ：ナイン）",style_1:"カブトワリ",style_1_mark:"◎●",style_1_attribute:"",style_2:"アヤカシ",style_2_mark:"",style_2_attribute:"",style_3:"ヒルコ",style_3_mark:"",style_3_attribute:"",reason_base:3,reason_gear:0,reason_control_base:12,reason_control_gear:0,passion_base:4,passion_gear:0,passion_control_base:14,passion_control_gear:0,life_base:8,life_gear:0,life_control_base:10,life_control_gear:0,mundane_base:6,mundane_gear:0,mundane_control_base:12,mundane_control_gear:0,cs_base:7,cs_gear:0},
    skills:[
      {category:"general",name:"医療",level:1,free_level:0,skill_kind:"general",reason:true,passion:false,life:false,mundane:false,description:""},
      {category:"general",name:"射撃",level:3,free_level:0,skill_kind:"general",reason:true,passion:false,life:true,mundane:true,description:""},
      {category:"social",name:"社会：N◎VA",level:1,free_level:0,skill_kind:"proper",reason:false,passion:false,life:false,mundane:true,description:""},
      {category:"social",name:"社会：ストリート",level:1,free_level:0,skill_kind:"proper",reason:false,passion:false,life:true,mundane:false,description:""},
      {category:"connection",name:"コネ：長谷部万力",level:1,free_level:0,skill_kind:"proper",reason:false,passion:false,life:false,mundane:true,description:""},
      {category:"connection",name:"コネ：ナイン",level:1,free_level:0,skill_kind:"proper",reason:false,passion:false,life:true,mundane:false,description:""},
      {category:"style",name:"硬化",level:1,free_level:0,skill_kind:"normal",reason:false,passion:true,life:false,mundane:false,description:"ダメージ軽減技能\n肉体ダメージを[カードの数字]点軽減"},
      {category:"style",name:"ヒューマナイズ",level:1,free_level:0,skill_kind:"normal",reason:false,passion:false,life:false,mundane:false,description:"スタイル偽装技能"}
    ],
    outfits:[
      {category:"weapon",name:"ハントマン",purchase_value:"8",experience_cost:5,concealment:"5",slot:"片手",range:"近",attack:"I+8",description:"[対象：範囲]",cs_modifier:0,control_modifier:0,ofc_details:{permanent_cost:"5",purchase_target:"8",electronic_control:"15",concealment_penalty:"-2"}},
      {category:"armor",name:"鎧皮",purchase_value:"22",experience_cost:6,concealment:"10",slot:"皮膚",description:"肉体ダメージを5点軽減する。1シーン1回",cs_modifier:0,control_modifier:0,ofc_details:{defense_s:"5",defense_p:"4",defense_i:"7",permanent_cost:"6",purchase_target:"22",electronic_control:"17",concealment_penalty:"-1"}},
      {category:"armor",name:"ステイマッスル",purchase_value:"20",experience_cost:7,concealment:"14",slot:"筋肉",description:"",cs_modifier:0,control_modifier:0,ofc_details:{defense_s:"3",defense_p:"3",defense_i:"3",permanent_cost:"7",purchase_target:"20",electronic_control:"13",concealment_penalty:"0"}},
      {category:"residence",name:"レッドのマンション",purchase_value:"",experience_cost:0,concealment:"",slot:"",description:"",cs_modifier:0,control_modifier:0,ofc_details:{permanent_cost:"0"}},
      {category:"other",name:"IANUS",purchase_value:"",experience_cost:0,concealment:"10",slot:"全身",description:"",cs_modifier:0,control_modifier:0,ofc_details:{permanent_cost:"0",electronic_control:"制御値",concealment_penalty:"0"}}
    ]
  };
  const differences=diffCanonicalBundles(canonicalizeArchiveBundle(archive),canonicalizeCharacterSheetJsonp(raw));
  assert.deepEqual(differences,[]);
});
