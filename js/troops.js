import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js?v=4";

const list = document.querySelector("#troop-list");
const status = document.querySelector("#troop-list-status");
const characterFilter = document.querySelector("#troop-character-filter");
const visibilityFilter = document.querySelector("#troop-visibility-filter");
const resetButton = document.querySelector("#troop-filter-reset");
const newLink = document.querySelector("#troop-new-link");
let user = null;
let characters = [];
let troops = [];

initialize();

async function initialize() {
  user = await requireAuth(); if (!user) return;
  const requestedCharacter = new URLSearchParams(location.search).get("character")?.trim() || "";
  const [characterResult, troopResult] = await Promise.all([
    supabase.from("characters").select("id, public_id, character_name, handle").eq("owner_id", user.id).order("character_name"),
    supabase.from("troops").select("id, public_id, character_id, name, visibility, level, member_max, style_1, experience_spent, updated_at").eq("owner_id", user.id).order("updated_at", { ascending:false })
  ]);
  if (characterResult.error || troopResult.error) { console.error(characterResult.error || troopResult.error); status.textContent="トループ情報を取得できませんでした。"; return; }
  characters=characterResult.data??[]; troops=troopResult.data??[];
  characterFilter.innerHTML=`<option value="">すべて</option><option value="unlinked">未設定</option>${characters.map(c=>`<option value="${escapeHtml(c.public_id)}">${escapeHtml(c.character_name)}</option>`).join("")}`;
  if(requestedCharacter&&characters.some(c=>c.public_id===requestedCharacter))characterFilter.value=requestedCharacter;
  if(requestedCharacter)newLink.href=`./troop.html?edit=1&character=${encodeURIComponent(requestedCharacter)}`;
  characterFilter.addEventListener("change",render); visibilityFilter.addEventListener("change",render); resetButton.addEventListener("click",()=>{characterFilter.value="";visibilityFilter.value="";render();}); render();
}
function render(){
  const charValue=characterFilter.value,visibility=visibilityFilter.value,selectedCharacter=characters.find(c=>c.public_id===charValue);
  const filtered=troops.filter(t=>(!charValue||(charValue==="unlinked"?!t.character_id:t.character_id===selectedCharacter?.id))&&(!visibility||t.visibility===visibility));
  status.textContent=`登録 ${troops.length}件 / 表示 ${filtered.length}件`;
  if(!filtered.length){list.innerHTML=`<p class="empty-data">条件に一致するトループはありません。<small>NO MATCHING TROOP</small></p>`;return;}
  list.innerHTML=filtered.map(t=>`<article class="troop-card"><div class="troop-card__head"><div><p>${escapeHtml(t.public_id)}</p><h2>${escapeHtml(t.name||"名称未設定")}</h2></div><span class="troop-visibility troop-visibility--${escapeHtml(t.visibility)}">${t.visibility==="public"?"公開":"非公開"}</span></div><div class="troop-card__stats"><span><small>スタイル</small><strong class="troop-card__style">${escapeHtml(t.style_1||"—")}</strong></span><span><small>レベル / CS</small><strong>${t.level}</strong></span><span><small>最大人数</small><strong>${t.member_max}</strong></span><span><small>消費経験点</small><strong>${t.experience_spent??0}</strong></span></div><div class="troop-card__actions"><a href="./troop.html?id=${encodeURIComponent(t.public_id)}">閲覧 <small>OPEN</small></a><a href="./troop.html?id=${encodeURIComponent(t.public_id)}&edit=1">編集 <small>EDIT</small></a></div></article>`).join("");
}
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
