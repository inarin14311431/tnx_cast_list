import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js?v=4";
import { SITE_BASE_PATH } from "./config.js?v=2";

const $=s=>document.querySelector(s);
let user=null,busy=false;
function status(text,state=""){const node=$("#mobile-new-status");if(!node)return;node.textContent=text;node.dataset.state=state;}
async function createCast(){if(busy||!user)return;const characterName=$("#mobile-new-character-name")?.value.trim()||"",playerName=$("#mobile-new-player-name")?.value.trim()||"",visibility=$("#mobile-new-visibility")?.value==="public"?"public":"private";if(!characterName||!playerName){status("キャスト名とプレイヤー名を入力してください。","error");return;}busy=true;$("#mobile-new-create").disabled=true;status("キャストを作成しています…","loading");try{const{data,error}=await supabase.from("characters").insert({owner_id:user.id,character_name:characterName,player_name:playerName,visibility,birthplace:"Ｎ◎ＶＡ"}).select("public_id").single();if(error)throw error;const target=new URL(`${SITE_BASE_PATH}sheet-mobile.html`,location.origin);target.searchParams.set("id",data.public_id);target.searchParams.set("return",`${SITE_BASE_PATH}account.html`);location.href=target.href;}catch(error){console.error(error);status(`作成に失敗しました：${error?.message||"不明なエラー"}`,"error");busy=false;$("#mobile-new-create").disabled=false;}}
async function init(){user=await requireAuth();if(!user)return;$("#mobile-new-player-name").value=user.user_metadata?.display_name||user.email?.split("@")[0]||"";$("#mobile-new-create")?.addEventListener("click",createCast);}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();