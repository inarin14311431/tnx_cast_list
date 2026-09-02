import test from "node:test";
import assert from "node:assert/strict";
import { canonicalizeArchiveBundle, canonicalizeCharacterSheetJsonp, diffCanonicalBundles } from "../js/character-sheet-jsonp-canonical.js";

const zeroAbilityCharacter = {
  reason_base:0, reason_gear:0, reason_control_base:0, reason_control_gear:0,
  passion_base:0, passion_gear:0, passion_control_base:0, passion_control_gear:0,
  life_base:0, life_gear:0, life_control_base:0, life_control_gear:0,
  mundane_base:0, mundane_gear:0, mundane_control_base:0, mundane_control_gear:0
};

const zeroAbilityJsonp = {
  reason:{abl:"0",ctl:"0/0"}, passion:{abl:"0",ctl:"0/0"},
  life:{abl:"0",ctl:"0/0"}, mundane:{abl:"0",ctl:"0/0"}
};

test("fresh import normalizes displayed CS, style skill prefix, and dash purchase values", () => {
  const raw = {
    base:{name:"スグリ"},
    ability:{...zeroAbilityJsonp,cs:"6"},
    superhumanskills:[{name:"宴の味",level:"2",h:true,d:true,skill:"射撃",notes:"[レベル×7]以下のフーズを選択する。組み合わせた攻撃で肉体ダメージを与えた場合、選択したフーズを使用したのと同じ効果を得る"}],
    armors:[{name:"HAジャケット",purchase:"-",permanent:"9",notes:"CS-1"}],
    outfits:[{name:"Xランク",purchase:"-",permanent:"0"}]
  };
  const archive = {
    character:{character_name:"スグリ",...zeroAbilityCharacter,cs_base:7,cs_gear:0},
    skills:[{category:"style",name:"宴の味",level:2,free_level:0,reason:false,passion:false,life:true,mundane:true,description:"射撃\n[レベル×7]以下のフーズを選択する。組み合わせた攻撃で肉体ダメージを与えた場合、選択したフーズを使用したのと同じ効果を得る"}],
    outfits:[
      {category:"armor",name:"HAジャケット",purchase_value:"",experience_cost:9,description:"CS-1",ofc_details:{permanent_cost:"9"}},
      {category:"other",name:"Xランク",purchase_value:"",experience_cost:0,description:"",ofc_details:{permanent_cost:"0"}}
    ]
  };
  const differences = diffCanonicalBundles(canonicalizeArchiveBundle(archive), canonicalizeCharacterSheetJsonp(raw));
  assert.deepEqual(differences, []);
});

test("real CS changes remain detectable after equipment normalization", () => {
  const raw = {base:{name:"スグリ"},ability:{...zeroAbilityJsonp,cs:"5"},armors:[{name:"HAジャケット",notes:"CS-1"}]};
  const archive = {character:{character_name:"スグリ",...zeroAbilityCharacter,cs_base:7,cs_gear:0},skills:[],outfits:[{category:"armor",name:"HAジャケット",description:"CS-1",ofc_details:{}}]};
  const differences = diffCanonicalBundles(canonicalizeArchiveBundle(archive), canonicalizeCharacterSheetJsonp(raw));
  assert.ok(differences.some(item=>item.category==="abilities"&&item.path==="cs_base"));
});
