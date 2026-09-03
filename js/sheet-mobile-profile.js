const GROUPS = {
  identity: {
    title: "基本情報",
    english: "BASIC PROFILE",
    wide: true,
    fields: [
      ["handle", "ハンドル", "text", "HANDLE"], ["character_name", "キャスト名", "text", "CAST NAME"],
      ["handle_kana", "ハンドルルビ", "text", "HANDLE READING"], ["character_kana", "キャスト名ルビ", "text", "NAME READING"],
      ["player_name", "プレイヤー名", "text", "PLAYER"], ["affiliation", "所属", "text", "AFFILIATION"],
      ["citizen_rank", "市民ランク", "text", "CITIZEN RANK"], ["birthplace", "出身", "text", "BIRTHPLACE"]
    ]
  },
  personal: {
    title: "パーソナルデータ",
    english: "PERSONAL DATA",
    wide: true,
    fields: [
      ["age", "年齢", "text", "AGE"], ["gender", "性別", "text", "GENDER"], ["height", "身長", "text", "HEIGHT"], ["weight", "体重", "text", "WEIGHT"],
      ["eyes", "瞳", "text", "EYES"], ["hair", "髪", "text", "HAIR"], ["skin", "肌", "text", "SKIN"]
    ]
  },
  lifepath: { title: "ライフパス", english: "LIFE PATH", wide: true, fields: [] },
  source: { title: "キャラクターシート倉庫", english: "CHARACTER SHEETS", wide: true, fields: [["character_sheet_url", "URL", "url", "CHARACTER SHEETS URL"]] },
  summary: { title: "一言", english: "TAGLINE", wide: true, fields: [["summary", "一言", "textarea-short", "TAGLINE"]] },
  profile: { title: "背景設定", english: "BACKGROUND", wide: true, fields: [["profile", "背景設定", "textarea-long", "BACKGROUND"]] }
};
const LIFE_PATHS = [["life_path_origin", "出自", "ORIGIN"],["life_path_experience", "経験", "EXPERIENCE"],["life_path_encounter", "邂逅", "ENCOUNTER"]];
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const quote = value => {
  const text = String(value || "").trim();
  if (!text) return "—";
  if (/^(?:“.*”|”.*”|".*"|「.*」|『.*』)$/.test(text)) return text;
  return `“${text}”`;
};
const bilingual = (japanese, english) => `${esc(japanese)}${english ? `<small class="mobile-profile-en">${esc(english)}</small>` : ""}`;
let activeGroup = null;
function source(field){return document.querySelector(`[data-mobile-character-field="${field}"]`);}
function basicSummaryHtml(){const handle=quote(source("handle")?.value||"");const name=source("character_name")?.value||"名称未設定";const handleKana=quote(source("handle_kana")?.value||"");const nameKana=source("character_kana")?.value||"—";const player=source("player_name")?.value||"—";const affiliation=source("affiliation")?.value||"—";const rank=source("citizen_rank")?.value||"—";const birthplace=source("birthplace")?.value||"Ｎ◎ＶＡ";return `<div class="mobile-basic-name-block"><div><b>${bilingual("読み", "READING")}</b><span>${esc(handleKana)} ${esc(nameKana)}</span></div><div><b>${bilingual("氏名", "NAME")}</b><strong>${esc(handle)} ${esc(name)}</strong></div></div><div class="mobile-basic-meta-grid"><span><b>${bilingual("プレイヤー", "PLAYER")}</b><em>${esc(player)}</em></span><span><b>${bilingual("所属", "AFFILIATION")}</b><em>${esc(affiliation)}</em></span><span><b>${bilingual("市民ランク", "CITIZEN RANK")}</b><em>${esc(rank)}</em></span><span><b>${bilingual("出身", "BIRTHPLACE")}</b><em>${esc(birthplace)}</em></span></div>`;}
function personalSummaryHtml(){const fields=[["age","年齢","AGE"],["gender","性別","GENDER"],["height","身長","HEIGHT"],["weight","体重","WEIGHT"],["eyes","瞳","EYES"],["hair","髪","HAIR"],["skin","肌","SKIN"]];return `<div class="mobile-personal-summary">${fields.map(([field,label,en])=>`<span><b>${bilingual(label,en)}</b><em>${esc(source(field)?.value||"—")}</em></span>`).join("")}</div>`;}
function lifePathSummaryHtml(){return `<div class="mobile-lifepath-summary">${LIFE_PATHS.map(([field,label,en])=>{const value=String(source(field)?.value||"").trim();return `<div class="mobile-lifepath-row"><b>${bilingual(label,en)}</b><span>${esc(value||"—")}</span></div>`;}).join("")}</div>`;}
function summaryText(groupKey){const group=GROUPS[groupKey];const field=group?.fields?.[0]?.[0];return field ? (source(field)?.value || "未入力") : "";}
function cardInnerHtml(key,group){const title=`<strong>${bilingual(group.title,group.english)}</strong>`;if(key==="identity")return `${title}${basicSummaryHtml()}`;if(key==="personal")return `${title}${personalSummaryHtml()}`;if(key==="lifepath")return `${title}${lifePathSummaryHtml()}`;return `${title}<span data-mobile-profile-summary>${esc(summaryText(key))}</span>`;}
function injectSummaryUi(){const form=$("#mobile-profile-form");if(!form||$("#mobile-profile-summary-grid"))return;form.classList.add("mobile-profile-source");const grid=document.createElement("div");grid.id="mobile-profile-summary-grid";grid.className="mobile-profile-summary-grid";grid.innerHTML=Object.entries(GROUPS).map(([key,group])=>`<button type="button" class="mobile-profile-summary-card mobile-profile-summary-card--wide" data-mobile-profile-group="${key}">${cardInnerHtml(key,group)}</button>`).join("");form.before(grid);}
function injectDialog(){if($("#mobile-profile-dialog"))return;const dialog=document.createElement("dialog");dialog.id="mobile-profile-dialog";dialog.className="mobile-editor-dialog";dialog.innerHTML=`<form method="dialog"><header class="mobile-editor-dialog__header mobile-editor-dialog__header--actions"><button id="mobile-profile-dialog-cancel" type="button">キャンセル</button><strong id="mobile-profile-dialog-title">基本情報編集</strong><button id="mobile-profile-dialog-apply" type="button">反映</button></header><div class="mobile-editor-dialog__body"><div id="mobile-profile-dialog-fields" class="mobile-form-grid mobile-form-grid--two"></div></div></form>`;document.body.append(dialog);}
function injectGlobalActions(){const actions=$(".mobile-sheet-actions");if(!actions)return;if(!actions.querySelector("[data-mobile-fixed-top]")){const top=document.createElement("a");top.href="#mobile-sheet-top";top.className="mobile-global-top";top.dataset.mobileFixedTop="1";top.textContent="↑ TOP";actions.prepend(top);}if(!$("#mobile-global-visibility")){const wrap=document.createElement("label");wrap.className="mobile-global-visibility";wrap.innerHTML=`<span>公開 <small>VISIBILITY</small></span><select id="mobile-global-visibility"><option value="public">公開 / PUBLIC</option><option value="private">非公開 / PRIVATE</option></select>`;actions.insertBefore(wrap,$("#mobile-save")||null);}}
function syncGlobalVisibility(){const original=source("visibility");const global=$("#mobile-global-visibility");if(original&&global&&document.activeElement!==global)global.value=original.value==="public"?"public":"private";}
function renderSummaries(){for(const [key,group] of Object.entries(GROUPS)){const card=document.querySelector(`[data-mobile-profile-group="${key}"]`);if(card)card.innerHTML=cardInnerHtml(key,group);}syncGlobalVisibility();}
function buildControl(field,label,type,english){const current=source(field)?.value||"";const caption=`<span class="mobile-profile-field-label">${bilingual(label,english)}</span>`;if(type.startsWith("textarea")){const rows=type==="textarea-long"?12:2;return `<label class="mobile-span-2">${caption}<textarea rows="${rows}" data-mobile-profile-modal-field="${field}">${esc(current)}</textarea></label>`;}if(type==="url")return `<label class="mobile-span-2">${caption}<input type="url" inputmode="url" autocomplete="url" data-mobile-profile-modal-field="${field}" value="${esc(current)}" placeholder="https://character-sheets.appspot.com/tnx/edit.html?key=..."></label>`;return `<label>${caption}<input data-mobile-profile-modal-field="${field}" value="${esc(current)}"></label>`;}
function buildLifePathEditor(){return LIFE_PATHS.map(([field,label,en])=>{const current=source(field)?.value||"";return `<label class="mobile-lifepath-editor" data-mobile-lifepath-editor="${field}"><span class="mobile-profile-field-label">${bilingual(label,en)}</span><input data-mobile-profile-modal-field="${field}" value="${esc(current)}"></label>`;}).join("");}
function openGroup(key){const group=GROUPS[key],dialog=$("#mobile-profile-dialog"),body=$("#mobile-profile-dialog-fields");if(!group||!dialog||!body)return;activeGroup=key;$("#mobile-profile-dialog-title").innerHTML=`${bilingual(group.title,group.english)}<span class="mobile-profile-dialog-edit">編集</span>`;body.innerHTML=key==="lifepath"?buildLifePathEditor():group.fields.map(args=>buildControl(...args)).join("");dialog.showModal();}
function notifyProfileChanged(){const form=$("#mobile-profile-form");form?.dispatchEvent(new Event("input",{bubbles:true}));renderSummaries();}
function syncActiveGroupFromDialog(){if(!activeGroup)return;let changed=false;document.querySelectorAll("[data-mobile-profile-modal-field]").forEach(control=>{const original=source(control.dataset.mobileProfileModalField);if(!original||original.value===control.value)return;original.value=control.value;changed=true;});if(changed)notifyProfileChanged();}
function applyDialog(){syncActiveGroupFromDialog();activeGroup=null;$("#mobile-profile-dialog")?.close();}
function cancelDialog(){activeGroup=null;$("#mobile-profile-dialog")?.close();}
function bind(){document.addEventListener("click",event=>{const button=event.target.closest("[data-mobile-profile-group]");if(button)openGroup(button.dataset.mobileProfileGroup);});$("#mobile-profile-dialog-apply")?.addEventListener("click",applyDialog);$("#mobile-profile-dialog-cancel")?.addEventListener("click",cancelDialog);$("#mobile-profile-dialog")?.addEventListener("cancel",event=>{event.preventDefault();cancelDialog();});$("#mobile-global-visibility")?.addEventListener("change",event=>{const original=source("visibility");if(!original||original.value===event.target.value)return;original.value=event.target.value;notifyProfileChanged();});document.addEventListener("tnx:mobile-profile-loaded",renderSummaries);const status=$("#mobile-save-status");if(status)new MutationObserver(renderSummaries).observe(status,{childList:true,subtree:true,attributes:true,attributeFilter:["data-state"]});}
function init(){if(window.__TNXMobileProfileInitialized)return;window.__TNXMobileProfileInitialized=true;injectSummaryUi();injectDialog();injectGlobalActions();bind();setTimeout(renderSummaries,0);}init();