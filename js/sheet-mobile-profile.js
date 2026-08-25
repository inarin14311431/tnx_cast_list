const GROUPS = {
  identity: {
    title: "基本情報",
    wide: true,
    fields: [
      ["handle", "ハンドル", "text"], ["character_name", "キャスト名", "text"],
      ["handle_kana", "ハンドルルビ", "text"], ["character_kana", "キャスト名ルビ", "text"],
      ["player_name", "プレイヤー名", "text"], ["affiliation", "所属", "text"],
      ["citizen_rank", "市民ランク", "text"], ["birthplace", "出身", "text"]
    ]
  },
  personal: {
    title: "パーソナルデータ",
    wide: true,
    fields: [
      ["age", "年齢", "text"], ["gender", "性別", "text"], ["height", "身長", "text"], ["weight", "体重", "text"],
      ["eyes", "瞳", "text"], ["hair", "髪", "text"], ["skin", "肌", "text"]
    ]
  },
  lifepath: { title: "ライフパス", wide: true, fields: [] },
  summary: { title: "概要", wide: true, fields: [["summary", "概要", "textarea-short"]] },
  profile: { title: "プロフィール", wide: true, fields: [["profile", "プロフィール", "textarea-long"]] }
};
const LIFE_PATHS = [["life_path_origin", "出自"],["life_path_experience", "経験"],["life_path_encounter", "邂逅"]];
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const quote = value => {
  const text = String(value || "").trim();
  if (!text) return "—";
  if (/^(?:“.*”|”.*”|".*"|「.*」|『.*』)$/.test(text)) return text;
  return `“${text}”`;
};
let activeGroup = null;
function source(field){return document.querySelector(`[data-mobile-character-field="${field}"]`);}
function splitLifePath(value){const text=String(value||"").trim();const match=text.match(/^(.*?)[（(]([^（）()]*)[）)]\s*$/);return match?{name:match[1].trim(),skill:match[2].trim()}:{name:text,skill:""};}
function joinLifePath(name,skill){const left=String(name||"").trim();const right=String(skill||"").trim();return right?`${left}（${right}）`:left;}
function basicSummaryHtml(){const handle=quote(source("handle")?.value||"");const name=source("character_name")?.value||"名称未設定";const handleKana=quote(source("handle_kana")?.value||"");const nameKana=source("character_kana")?.value||"—";const player=source("player_name")?.value||"—";const affiliation=source("affiliation")?.value||"—";const rank=source("citizen_rank")?.value||"—";const birthplace=source("birthplace")?.value||"Ｎ◎ＶＡ";return `<div class="mobile-basic-name-block"><div><b>読み：</b><span>${esc(handleKana)} ${esc(nameKana)}</span></div><div><b>氏名：</b><strong>${esc(handle)} ${esc(name)}</strong></div></div><div class="mobile-basic-meta-grid"><span><b>プレイヤー</b><em>${esc(player)}</em></span><span><b>所属</b><em>${esc(affiliation)}</em></span><span><b>市民ランク</b><em>${esc(rank)}</em></span><span><b>出身</b><em>${esc(birthplace)}</em></span></div>`;}
function personalSummaryHtml(){const fields=[["age","年齢"],["gender","性別"],["height","身長"],["weight","体重"],["eyes","瞳"],["hair","髪"],["skin","肌"]];return `<div class="mobile-personal-summary">${fields.map(([field,label])=>`<span><b>${label}</b><em>${esc(source(field)?.value||"—")}</em></span>`).join("")}</div>`;}
function lifePathSummaryHtml(){return `<div class="mobile-lifepath-summary">${LIFE_PATHS.map(([field,label])=>{const detail=splitLifePath(source(field)?.value);return `<div class="mobile-lifepath-row"><b>${label}</b><span>${esc(detail.name||"—")}</span><span>${esc(detail.skill||"取得技能なし")}</span></div>`;}).join("")}</div>`;}
function summaryText(groupKey){const group=GROUPS[groupKey];const field=group?.fields?.[0]?.[0];return field ? (source(field)?.value || "未入力") : "";}
function cardInnerHtml(key,group){if(key==="identity")return `<strong>${group.title}</strong>${basicSummaryHtml()}`;if(key==="personal")return `<strong>${group.title}</strong>${personalSummaryHtml()}`;if(key==="lifepath")return `<strong>${group.title}</strong>${lifePathSummaryHtml()}`;return `<strong>${group.title}</strong><span data-mobile-profile-summary>${esc(summaryText(key))}</span>`;}
function injectSummaryUi(){const form=$("#mobile-profile-form");if(!form||$("#mobile-profile-summary-grid"))return;form.classList.add("mobile-profile-source");const grid=document.createElement("div");grid.id="mobile-profile-summary-grid";grid.className="mobile-profile-summary-grid";grid.innerHTML=Object.entries(GROUPS).map(([key,group])=>`<button type="button" class="mobile-profile-summary-card mobile-profile-summary-card--wide" data-mobile-profile-group="${key}">${cardInnerHtml(key,group)}</button>`).join("");form.before(grid);}
function injectDialog(){if($("#mobile-profile-dialog"))return;const dialog=document.createElement("dialog");dialog.id="mobile-profile-dialog";dialog.className="mobile-editor-dialog";dialog.innerHTML=`<form method="dialog"><header class="mobile-editor-dialog__header mobile-editor-dialog__header--actions"><button id="mobile-profile-dialog-cancel" type="button">キャンセル</button><strong id="mobile-profile-dialog-title">基本情報編集</strong><button id="mobile-profile-dialog-apply" type="button">反映</button></header><div class="mobile-editor-dialog__body"><div id="mobile-profile-dialog-fields" class="mobile-form-grid mobile-form-grid--two"></div></div></form>`;document.body.append(dialog);}
function injectGlobalActions(){const actions=$(".mobile-sheet-actions");if(!actions)return;if(!actions.querySelector("[data-mobile-fixed-top]")){const top=document.createElement("a");top.href="#mobile-sheet-top";top.className="mobile-global-top";top.dataset.mobileFixedTop="1";top.textContent="↑ TOP";actions.prepend(top);}if(!$("#mobile-global-visibility")){const wrap=document.createElement("label");wrap.className="mobile-global-visibility";wrap.innerHTML=`<span>公開</span><select id="mobile-global-visibility"><option value="public">公開</option><option value="private">非公開</option></select>`;actions.insertBefore(wrap,$("#mobile-save")||null);}}
function syncGlobalVisibility(){const original=source("visibility");const global=$("#mobile-global-visibility");if(original&&global&&document.activeElement!==global)global.value=original.value==="public"?"public":"private";}
function renderSummaries(){for(const [key,group] of Object.entries(GROUPS)){const card=document.querySelector(`[data-mobile-profile-group="${key}"]`);if(card)card.innerHTML=cardInnerHtml(key,group);}syncGlobalVisibility();}
function buildControl(field,label,type){const current=source(field)?.value||"";if(type.startsWith("textarea")){const rows=type==="textarea-long"?12:5;return `<label class="mobile-span-2">${label}<textarea rows="${rows}" data-mobile-profile-modal-field="${field}">${esc(current)}</textarea></label>`;}return `<label>${label}<input data-mobile-profile-modal-field="${field}" value="${esc(current)}"></label>`;}
function buildLifePathEditor(){return LIFE_PATHS.map(([field,label])=>{const detail=splitLifePath(source(field)?.value);return `<section class="mobile-lifepath-editor" data-mobile-lifepath-editor="${field}"><h3>${label}</h3><label>${label}<input data-mobile-lifepath-name value="${esc(detail.name)}"></label><label>取得技能<input data-mobile-lifepath-skill value="${esc(detail.skill)}"></label></section>`;}).join("");}
function openGroup(key){const group=GROUPS[key],dialog=$("#mobile-profile-dialog"),body=$("#mobile-profile-dialog-fields");if(!group||!dialog||!body)return;activeGroup=key;$("#mobile-profile-dialog-title").textContent=group.title;body.innerHTML=key==="lifepath"?buildLifePathEditor():group.fields.map(args=>buildControl(...args)).join("");dialog.showModal();}
function notifyProfileChanged(){const form=$("#mobile-profile-form");form?.dispatchEvent(new Event("input",{bubbles:true}));renderSummaries();}
function syncActiveGroupFromDialog(){if(!activeGroup)return;let changed=false;if(activeGroup==="lifepath"){document.querySelectorAll("[data-mobile-lifepath-editor]").forEach(editor=>{const original=source(editor.dataset.mobileLifepathEditor);if(!original)return;const next=joinLifePath(editor.querySelector("[data-mobile-lifepath-name]")?.value,editor.querySelector("[data-mobile-lifepath-skill]")?.value);if(original.value!==next){original.value=next;changed=true;}});}else{document.querySelectorAll("[data-mobile-profile-modal-field]").forEach(control=>{const original=source(control.dataset.mobileProfileModalField);if(!original||original.value===control.value)return;original.value=control.value;changed=true;});}if(changed)notifyProfileChanged();}
function applyDialog(){syncActiveGroupFromDialog();activeGroup=null;$("#mobile-profile-dialog")?.close();}
function cancelDialog(){activeGroup=null;$("#mobile-profile-dialog")?.close();}
function bind(){document.addEventListener("click",event=>{const button=event.target.closest("[data-mobile-profile-group]");if(button)openGroup(button.dataset.mobileProfileGroup);});$("#mobile-profile-dialog-apply")?.addEventListener("click",applyDialog);$("#mobile-profile-dialog-cancel")?.addEventListener("click",cancelDialog);$("#mobile-profile-dialog")?.addEventListener("cancel",event=>{event.preventDefault();cancelDialog();});$("#mobile-global-visibility")?.addEventListener("change",event=>{const original=source("visibility");if(!original||original.value===event.target.value)return;original.value=event.target.value;notifyProfileChanged();});document.addEventListener("tnx:mobile-profile-loaded",renderSummaries);const status=$("#mobile-save-status");if(status)new MutationObserver(renderSummaries).observe(status,{childList:true,subtree:true,attributes:true,attributeFilter:["data-state"]});}
function init(){if(window.__TNXMobileProfileInitialized)return;window.__TNXMobileProfileInitialized=true;injectSummaryUi();injectDialog();injectGlobalActions();bind();setTimeout(renderSummaries,0);}init();
