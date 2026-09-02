import test from "node:test";
import assert from "node:assert/strict";
import { canonicalizeArchiveBundle, canonicalizeCharacterSheetJsonp } from "../js/character-sheet-jsonp-canonical.js";

test("duplicate skill names compare independently of source row order and sparse indexes", () => {
  const raw = {
    skills1: [
      { name:"回避", level:"1", c:true },
      null,
      null,
      { name:"隠密", level:"2", s:true, c:true, h:true, d:true },
      { name:"回避", level:"4", s:true, c:true, h:true, d:true },
      null,
      { name:"隠密", level:"1", s:true }
    ]
  };
  const archive = {
    character:{},
    outfits:[],
    skills:[
      { category:"general", name:"回避", level:4, free_level:0, reason:true, passion:true, life:true, mundane:true, description:"", skill_kind:"general" },
      { category:"general", name:"隠密", level:1, free_level:0, reason:true, passion:false, life:false, mundane:false, description:"", skill_kind:"general" },
      { category:"general", name:"回避", level:1, free_level:0, reason:false, passion:true, life:false, mundane:false, description:"", skill_kind:"general" },
      { category:"general", name:"隠密", level:4, free_level:0, reason:true, passion:true, life:true, mundane:true, description:"", skill_kind:"general" }
    ]
  };
  const warehouse = canonicalizeCharacterSheetJsonp(raw).general;
  const current = canonicalizeArchiveBundle(archive).general;
  assert.deepEqual(current, warehouse);
});
