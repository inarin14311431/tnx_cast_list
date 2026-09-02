import { supabase } from "./supabase-client.js";
import { loadSheetBundle } from "./sheet-load-persistence.js?v=1";
import { buildSkillSavePayloads, buildOutfitSavePayloads } from "./sheet-save-payload.js?v=1";
import { getSheetSaveState, focusSheetSaveButton } from "./sheet-save-state.js?v=2";
import { normalizeCharacterSheetUrl, buildCharacterSheetReadUrl, extractCharacterSheetKey } from "./character-sheet-url.js?v=2";
import { canonicalizeArchiveBundle, canonicalizeCharacterSheetJsonp, diffCanonicalBundles } from "./character-sheet-jsonp-canonical.js?v=2";
import { groupCharacterSheetDifferences, summarizeCharacterSheetDifferences } from "./character-sheet-diff-display.js?v=3";

const SESSION_KEY = "tnx:character-sheet-comparison:v2";
const STYLE_SEPARATOR_MARKER = "[[STYLE_SEPARATOR]]";
const CATEGORY_LABELS = {basic:"基本情報",personal:"パーソナル／ライフパス",styles:"スタイル",abilities:"能力値・制御値・CS",general:"一般技能",social:"社会",connection:"コネ",styleSkills:"スタイル技能",outfits:"アウトフィット"};
const STYLE_CODE_NAMES = new Map([["0","カブキ"],["1","バサラ"],["2","タタラ"],["3","ミストレス"],["4","カブト"],["5","カリスマ"],["6","マネキン"],["7","カゼ"],["8","フェイト"],["9","クロマク"],["10","エグゼク"],["11","カタナ"],["12","クグツ"],["13","カゲ"],["14","チャクラ"],["15","レッガー"],["16","カブトワリ"],["17","ハイランダー"],["18","マヤカシ"],["19","トーキー"],["20","イヌ"],["21","ニューロ"],["-0","コモン"],["-1","ヒルコ"],["-2","クロガネ"],["-4","イブキ"],["-6","シキガミ"],["-7","アラシ"],["-9","カゲムシャ"],["-12","ミギウデ"],["-17","エトランゼ"],["-18","アヤカシ"],["-21","ウツワ"]]);

queueMicrotask(()=>{installCompareButton();restoreComparison().catch(error=>console.error("character sheet comparison restore failed",error));});

function installCompareButton(){
  const input=document.querySelector("#character-sheet-url");
  if(!input||document.querySelector("#character-sheet-compare"))return;
  const button=document.createElement("button");
  button.id="character-sheet-compare";button.type="button";button.className="character-sheet-compare-button";button.textContent="倉庫との差分を確認";
  input.insertAdjacentElement("afterend",button);button.addEventListener("click",()=>startComparison(button));
}

async function startComparison(button){
  const sourceUrl=normalizeCharacterSheetUrl(document.querySelector("#character-sheet-url")?.value);
  if(!sourceUrl){alert("キャラクターシート倉庫の保存済みTNXシートURLを入力してください。");document.querySelector("#character-sheet-url")?.focus();return;}
  if(getSheetSaveState()!=="saved"){alert("比較前にCAST ARCHIVEの編集内容を保存してください。比較中は保存済み状態を基準にします。");focusSheetSaveButton();return;}
  button.disabled=true;showBusy();
  try{
    const externalPayload=await fetchCharacterSheetPayload(sourceUrl),comparedAt=new Date().toISOString();
    const archiveBundle=await loadCurrentArchiveBundle();
    const differences=compareArchiveToJsonp(archiveBundle,externalPayload);
    sessionStorage.setItem(SESSION_KEY,JSON.stringify({phase:"ready",sourceUrl,externalPayload,comparedAt}));
    hideBusy();button.disabled=false;
    showComparisonModal({sourceUrl,externalPayload,comparedAt,archiveBundle,differences});
  }catch(error){console.error(error);clearSession();hideBusy();button.disabled=false;alert(`差分比較に失敗しました：${error?.message||error}`);}
}

async function restoreComparison(){
  const stored=readSession();if(!stored||stored.phase!=="ready")return;
  if(getSheetSaveState()!=="saved"){setTimeout(restoreComparison,150);return;}
  const archiveBundle=await loadCurrentArchiveBundle();
  showComparisonModal({...stored,archiveBundle,differences:compareArchiveToJsonp(archiveBundle,stored.externalPayload)});
}
async function loadCurrentArchiveBundle(){
  const publicId=new URLSearchParams(location.search).get("id")||"";if(!publicId)throw new Error("CAST ARCHIVE IDを確認できませんでした。");
  const {data:auth}=await supabase.auth.getUser();if(!auth?.user)throw new Error("ログイン状態を確認できませんでした。");
  return loadSheetBundle({publicId,ownerId:auth.user.id});
}
function compareArchiveToJsonp(archiveBundle,externalPayload){return diffCanonicalBundles(canonicalizeArchiveBundle(archiveBundle),canonicalizeCharacterSheetJsonp(externalPayload));}
function readSession(){try{return JSON.parse(sessionStorage.getItem(SESSION_KEY)||"null");}catch{return null;}}
function clearSession(){sessionStorage.removeItem(SESSION_KEY);}

async function fetchCharacterSheetPayload(sourceUrl){
  const primary=buildCharacterSheetReadUrl(sourceUrl),key=extractCharacterSheetKey(sourceUrl);if(!primary||!key)throw new Error("キャラクターシート倉庫URLを解析できませんでした。");
  const encoded=encodeURIComponent(key),urls=[primary,`https://character-sheets.appspot.com/tnx/display.html?ajax=1&key=${encoded}`,`https://character-sheets.appspot.com/tnx/display?key=${encoded}&ajax=1`,`https://character-sheets.appspot.com/tnx/display.html?key=${encoded}&ajax=1`];
  let lastError;for(const url of urls){try{return normalizePayload(await jsonpOnce(url));}catch(error){lastError=error;}}
  throw lastError||new Error("キャラクターシート倉庫からデータを取得できませんでした。");
}
function jsonpOnce(url,timeout=15000){return new Promise((resolve,reject)=>{const callback=`__tnxCompare_${Date.now()}_${Math.random().toString(36).slice(2)}`,script=document.createElement("script");let done=false;const finish=(fn,value)=>{if(done)return;done=true;clearTimeout(timer);try{delete window[callback];}catch{window[callback]=undefined;}script.remove();fn(value);};const timer=setTimeout(()=>finish(reject,new Error("キャラクターシート倉庫の応答がタイムアウトしました。")),timeout);window[callback]=value=>finish(resolve,value);script.onerror=()=>finish(reject,new Error("キャラクターシート倉庫のデータ取得に失敗しました。"));const request=new URL(url);request.searchParams.set("callback",callback);script.src=request.href;document.head.append(script);});}
function parseJsonData(value){if(typeof value!=="string")return value;let source=value.trim();if(!source)return value;if(source.endsWith(";"))source=source.slice(0,-1).trim();if(source.startsWith("(")&&source.endsWith(")"))source=source.slice(1,-1).trim();try{return JSON.parse(source);}catch{return value;}}
function mergeWrapperMetadata(parsed,wrapper){if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))return parsed;const result={...parsed};for(const key of ["outline","name","nameKana","player","display"])if((result[key]===undefined||result[key]===null||result[key]==="")&&wrapper?.[key]!==undefined)result[key]=wrapper[key];return result;}
function normalizePayload(payload){let data=payload;for(let i=0;i<6;i+=1){if(typeof data==="string"){const parsed=parseJsonData(data);if(parsed!==data){data=parsed;continue;}break;}if(data&&typeof data==="object"&&typeof data.jsonData==="string"&&data.jsonData.trim()){const parsed=parseJsonData(data.jsonData);if(parsed!==data.jsonData){data=mergeWrapperMetadata(parsed,data);continue;}}if(data&&typeof data==="object"&&data.data&&typeof data.data==="object"&&!data.base&&!data.skills1&&!data.superhumanskills&&!data.weapons){data=mergeWrapperMetadata(data.data,data);continue;}break;}if(!data||typeof data!=="object")throw new Error("倉庫データをTNXキャラクターとして認識できませんでした。");if(!data.outline&&data.styles&&typeof data.styles==="object"&&!Array.isArray(data.styles)){const names=[data.styles.style1,data.styles.style2,data.styles.style3].map(value=>STYLE_CODE_NAMES.get(String(value??""))||"");if(names.every(Boolean))data={...data,outline:`STYLE:${names.join("=")}`};}return data;}

function applyLegacyPayload(payload){
  return new Promise((resolve,reject)=>{
    const dialog=document.querySelector("#legacy-import-dialog"),text=document.querySelector("#legacy-import-json"),apply=document.querySelector("#legacy-import-apply"),message=document.querySelector("#legacy-import-message");
    if(!dialog||!text||!apply||!message)return reject(new Error("既存のデータ取込機能を利用できません。"));
    let baseFinished=false,baseOk=false,baseError="";const onBase=event=>{baseFinished=true;baseOk=event.detail?.ok===true;baseError=event.detail?.error||"";};document.addEventListener("tnx:legacy-import-base-finished",onBase,{once:true});
    text.value=JSON.stringify(payload);text.dispatchEvent(new Event("input",{bubbles:true}));apply.click();const started=Date.now();
    const tick=()=>{if(baseFinished&&dialog.dataset.importing!=="1"){document.removeEventListener("tnx:legacy-import-base-finished",onBase);if(!baseOk||message.dataset.state==="error"||String(message.textContent||"").includes("取込エラー"))reject(new Error(baseError||message.textContent||"データ取込に失敗しました。"));else resolve();return;}if(Date.now()-started>180000){document.removeEventListener("tnx:legacy-import-base-finished",onBase);reject(new Error("データ変換がタイムアウトしました。"));return;}setTimeout(tick,120);};setTimeout(tick,120);
  });
}

function captureEditorBundle(sourceUrl){return{character:captureCharacter(sourceUrl),skills:captureSkills(),outfits:captureOutfits()};}
function captureCharacter(sourceUrl){
  const value=s=>document.querySelector(s)?.value??"",number=s=>Number(value(s)||0),text=s=>String(document.querySelector(s)?.textContent||"").trim();
  const c={character_name:value("#character-name").trim(),character_kana:value("#character-kana").trim(),handle:value("#handle").trim(),handle_kana:value("#handle-kana").trim(),player_name:value("#player-name").trim(),affiliation:value("#affiliation").trim(),citizen_rank:value("#citizen-rank").trim(),summary:value("#summary"),profile:value("#profile"),visibility:value("#visibility")==="public"?"public":"private",experience_points:Number(text("#exp-total")||0),age:value("#age").trim(),gender:value("#gender").trim(),height:value("#height").trim(),weight:value("#weight").trim(),eyes:value("#eyes").trim(),hair:value("#hair").trim(),skin:value("#skin").trim(),life_path_origin:value("#life-path-origin").trim(),life_path_experience:value("#life-path-experience").trim(),life_path_encounter:value("#life-path-encounter").trim(),character_sheet_url:sourceUrl};
  for(let i=1;i<=3;i++){c[`style_${i}`]=value(`#style-${i}`);c[`style_${i}_mark`]=value(`#style-${i}-mark`);c[`style_${i}_attribute`]=value(`#style-${i}-attribute`);c[`divine_${i}`]=text(`#divine-${i}`);c[`divine_${i}_yomi`]=text(`#divine-${i}-yomi`);}
  for(const key of ["reason","passion","life","mundane"]){const current=number(`#${key}-base`),mod=number(`#${key}-mod`),ctl=number(`#${key}-control-base`),ctlMod=number(`#${key}-control-mod`);Object.assign(c,{[`${key}_base`]:current,[`${key}_growth`]:0,[`${key}_gear`]:mod,[`${key}_manual`]:0,[`${key}_value`]:current+mod,[`${key}_control_base`]:ctl,[`${key}_control_growth`]:0,[`${key}_control_gear`]:ctlMod,[`${key}_control_manual`]:0,[`${key}_control`]:ctl+ctlMod});}
  c.cs_base=number("#cs-base");c.cs_gear=number("#cs-mod");c.cs_manual=0;c.cs=c.cs_base+c.cs_gear;return c;
}
function captureSkills(){const rows=[];document.querySelectorAll(".skill-group[data-skill-category] tbody tr[data-skill-key]").forEach(row=>{const category=row.closest(".skill-group")?.dataset.skillCategory||"general";if(row.dataset.styleSeparator==="1"){rows.push({category:"style",name:row.querySelector('[data-f="name"]')?.value||"",level:1,free_level:0,skill_kind:"none",reason:false,passion:false,life:false,mundane:false,description:STYLE_SEPARATOR_MARKER,_separator:true});return;}const read=f=>row.querySelector(`[data-f="${f}"]`);rows.push({category,name:read("name")?.value||"",level:Number(read("level")?.value||0),free_level:Number(read("free_level")?.value||0),skill_kind:read("skill_kind")?.value||(category==="general"?"general":"proper"),reason:Boolean(read("reason")?.checked),passion:Boolean(read("passion")?.checked),life:Boolean(read("life")?.checked),mundane:Boolean(read("mundane")?.checked),timing:"",target:"",range:"",difficulty:"",confrontation:"",description:read("description")?.value||""});});return buildSkillSavePayloads(rows,{isStyleSeparator:item=>item?._separator===true,styleSeparatorMarker:STYLE_SEPARATOR_MARKER});}
function captureOutfits(){const rows=[];document.querySelectorAll(".outfit-card[data-outfit-key]").forEach(card=>{const item={};card.querySelectorAll("[data-o]").forEach(control=>{item[control.dataset.o]=control.type==="number"?Number(control.value||0):control.value;});try{item._ofc_details=JSON.parse(card.dataset.outfitOfcDetails||"{}");}catch{item._ofc_details={};}rows.push(item);});return buildOutfitSavePayloads(rows);}

function showComparisonModal(context){
  document.querySelector("#character-sheet-compare-dialog")?.remove();const dialog=document.createElement("dialog");dialog.id="character-sheet-compare-dialog";dialog.className="character-sheet-compare-dialog";const diffs=groupCharacterSheetDifferences(context.differences),summaries=summarizeCharacterSheetDifferences(diffs);
  const overview=summaries.length?`<div class="character-sheet-compare-overview"><p>キャラクターシート倉庫のデータと比べ、CAST ARCHIVEでは次の差分があります。</p><ul>${summaries.map(summary=>`<li>${esc(summary)}</li>`).join("")}</ul></div>`:`<div class="character-sheet-compare-overview"><p>キャラクターシート倉庫のデータと比べ、差分はありません。CAST ARCHIVEとキャラクターシート倉庫は一致しています。</p></div>`;
  dialog.innerHTML=`<form method="dialog"><header class="character-sheet-compare-header"><div><h2>キャラクターシート倉庫との差分</h2><small>${esc(formatDate(context.comparedAt))}</small></div></header><section class="character-sheet-compare-meta"><strong>差分 ${summaries.length}件</strong><a href="${esc(context.sourceUrl)}" target="_blank" rel="noopener noreferrer">キャラクターシート倉庫を開く</a></section>${overview}<section class="character-sheet-compare-choice"><h3>どちらを編集画面に残しますか？</h3><button id="compare-adopt-warehouse" type="button"><strong>CAST ARCHIVEを保存して、倉庫版を採用</strong><small>現在のCAST ARCHIVEをスナップショットに残し、比較した倉庫版を編集画面へ反映します。</small></button><button id="compare-keep-archive" type="button"><strong>倉庫版を保存して、CAST ARCHIVE版を採用</strong><small>比較した倉庫版をスナップショットに残し、現在の編集画面はそのまま維持します。</small></button></section><footer class="character-sheet-compare-actions"><button id="compare-copy" type="button">差分をコピー</button><button value="cancel">閉じる</button></footer><p id="character-sheet-compare-message" aria-live="polite"></p></form>`;
  document.body.append(dialog);dialog.querySelector("#compare-copy").addEventListener("click",()=>copyDifferences(context));dialog.querySelector("#compare-adopt-warehouse").addEventListener("click",()=>adoptWarehouse(context,dialog));dialog.querySelector("#compare-keep-archive").addEventListener("click",()=>keepArchive(context,dialog));dialog.addEventListener("close",()=>{if(dialog.returnValue==="cancel")clearSession();});dialog.showModal();
}
async function copyDifferences(context){
  const diffs=groupCharacterSheetDifferences(context.differences),summaries=summarizeCharacterSheetDifferences(diffs);
  const lines=["キャラクターシート倉庫との差分",`比較日時: ${formatDate(context.comparedAt)}`,`URL: ${context.sourceUrl}`,`差分: ${summaries.length}件`,""];
  if(!summaries.length)lines.push("キャラクターシート倉庫のデータと比べ、差分はありません。");
  else{lines.push("キャラクターシート倉庫のデータと比べ、CAST ARCHIVEでは次の差分があります。","");summaries.forEach(summary=>lines.push(`・${summary}`));}
  const output=lines.join("\n");
  try{await navigator.clipboard.writeText(output);setMessage("差分をクリップボードへコピーしました。","saved");}catch{prompt("差分をコピーしてください。",output);}
}
async function adoptWarehouse(context,dialog){if(!confirm("現在のCAST ARCHIVEをスナップショットに保存し、比較したキャラクターシート倉庫版を編集画面へ反映します。続行しますか？"))return;disableChoices(dialog,true);try{const snapshots=await waitForSnapshots();setMessage("CAST ARCHIVE版をスナップショットへ保存しています…");await snapshots.createCurrent(`比較前 CAST ARCHIVE ${formatDate(context.comparedAt)}`);setMessage("キャラクターシート倉庫版を編集画面へ反映しています…");await applyLegacyPayload(context.externalPayload);setCharacterSheetUrl(context.sourceUrl);clearSession();dialog.close("adopted");}catch(error){console.error(error);setMessage(`処理に失敗しました：${error?.message||error}`,"error");disableChoices(dialog,false);}}
async function keepArchive(context,dialog){if(!confirm("比較したキャラクターシート倉庫版をスナップショットに保存し、現在のCAST ARCHIVE版を編集画面に残します。続行しますか？"))return;disableChoices(dialog,true);try{const snapshots=await waitForSnapshots();setMessage("キャラクターシート倉庫版をスナップショットへ変換しています…");await applyLegacyPayload(context.externalPayload);setCharacterSheetUrl(context.sourceUrl);const warehouseBundle=captureEditorBundle(context.sourceUrl),snapshotData={character:{...context.archiveBundle.character,...warehouseBundle.character,character_sheet_url:context.sourceUrl},skills:warehouseBundle.skills,outfits:warehouseBundle.outfits};setMessage("キャラクターシート倉庫版をスナップショットへ保存しています…");await snapshots.createBundle(snapshotData,`キャラクターシート倉庫 ${formatDate(context.comparedAt)}`);clearSession();dialog.close("kept-archive");location.reload();}catch(error){console.error(error);setMessage(`スナップショット作成に失敗しました：${error?.message||error}`,"error");disableChoices(dialog,false);}}
function setCharacterSheetUrl(sourceUrl){const target=document.querySelector("#character-sheet-url");if(target){target.value=sourceUrl;target.dispatchEvent(new Event("input",{bubbles:true}));target.dispatchEvent(new Event("change",{bubbles:true}));}}
function waitForSnapshots(timeout=10000){const started=Date.now();return new Promise((resolve,reject)=>{const tick=()=>{if(window.TNXSheetSnapshots?.createCurrent&&window.TNXSheetSnapshots?.createBundle)return resolve(window.TNXSheetSnapshots);if(Date.now()-started>timeout)return reject(new Error("既存スナップショット機能を利用できません。"));setTimeout(tick,100);};tick();});}
function disableChoices(dialog,disabled){dialog.querySelectorAll("#compare-adopt-warehouse,#compare-keep-archive,#compare-copy").forEach(button=>button.disabled=disabled);}
function setMessage(text,state=""){const node=document.querySelector("#character-sheet-compare-message");if(node){node.textContent=text;node.dataset.state=state;}}
function showBusy(){hideBusy();const overlay=document.createElement("div");overlay.id="character-sheet-compare-busy";overlay.className="character-sheet-compare-busy";overlay.innerHTML="<div><strong>キャラクターシート倉庫を取得して比較しています…</strong><small>JSONPデータとCAST ARCHIVE保存データを直接比較しています。</small></div>";document.body.append(overlay);}
function hideBusy(){document.querySelector("#character-sheet-compare-busy")?.remove();}
function displayValue(value){if(value===""||value===null||value===undefined)return"（空欄）";if(typeof value==="boolean")return value?"あり":"なし";return typeof value==="object"?JSON.stringify(value):String(value);}
function formatDate(value){try{return new Intl.DateTimeFormat("ja-JP",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(value));}catch{return String(value||"");}}
function esc(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
