import test from 'node:test';
import assert from 'node:assert/strict';
import { appendMissingInitialGeneralSkills } from '../js/sheet-mobile-initial-skills.js';
import { buildNewCharacterSkills } from '../js/sheet-new-character-state.js';
import { GENERAL_MASTER_ROWS } from '../js/general-skill-catalog.js';
let id = 0;
const blank = category => ({id:`temp-${++id}`, _new:true, category, reason:false, passion:false, life:false, mundane:false});
const fields = row => [row.name,row.level,row.free_level,row.skill_kind,...['reason','passion','life','mundane'].map(key=>Boolean(row[key]))];
test('mobile empty character receives the same 13 automatic general skills as desktop',()=>{
 const desktop=buildNewCharacterSkills({masterRows:GENERAL_MASTER_ROWS,suits:['reason','passion','life','mundane'],createBlankSkill:blank,createSkillRow:(category,values)=>({...blank(category),...values})});
 const mobile=appendMissingInitialGeneralSkills([],blank);
 assert.equal(mobile.added.length,13);
 assert.deepEqual(mobile.rows.map(fields),desktop.filter(row=>row.category==='general' && row.skill_kind==='general').map(fields));
 assert.equal(new Set(mobile.rows.map(row=>row.id)).size,13);
});
test('reload does not duplicate initial skills and preserves paid levels and other categories',()=>{
 const existing=[{...blank('general'),id:'saved',_new:false,name:'射撃',level:3,reason:true,life:true,description:'keep',sort_order:7}, {...blank('style'),name:'style',level:2}];
 const before=structuredClone(existing);
 const first=appendMissingInitialGeneralSkills(existing,blank);
 assert.equal(first.added.length,12);
 assert.deepEqual(existing,before);
 assert.equal(first.rows[0],existing[0]);
 assert.equal(first.rows[1],existing[1]);
 assert.equal(appendMissingInitialGeneralSkills(first.rows,blank).added.length,0);
 assert.ok(first.added.every(row=>row._new && row.sort_order>7));
});
