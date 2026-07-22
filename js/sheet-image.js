import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js";

const BUCKET_NAME="character-images";
const MAX_FILE_SIZE=6*1024*1024;
const PLACEHOLDER="./assets/placeholders/scan-failed.webp";

const form=document.querySelector("#image-form");
const fileInput=document.querySelector("#image-file");
const preview=document.querySelector("#image-preview");
const fileInfo=document.querySelector("#image-file-info");
const messageArea=document.querySelector("#image-message");
const uploadButton=document.querySelector("#upload-button");
const clearButton=document.querySelector("#clear-image-button");

let currentUser=null;
let character=null;
let selectedFile=null;
let previewObjectUrl="";
let processing=false;

if(form&&fileInput&&preview&&fileInfo&&messageArea&&uploadButton&&clearButton)initialize();

async function initialize(){
  currentUser=await requireAuth();
  if(!currentUser)return;

  fileInput.addEventListener("change",handleFileSelection);
  form.addEventListener("submit",uploadImage);
  clearButton.addEventListener("click",clearImageReference);
  preview.addEventListener("error",()=>{
    if(!preview.src.endsWith("/assets/placeholders/scan-failed.webp"))preview.src=PLACEHOLDER;
  });
  window.addEventListener("beforeunload",releasePreviewUrl);

  const publicId=getPublicId();
  if(publicId)await loadCharacter(publicId);
  else setMessage("画像はキャスト本体の初回保存後に登録されます。","");
}

function getPublicId(){
  return new URLSearchParams(location.search).get("id")?.trim()||"";
}

async function loadCharacter(publicId){
  const {data,error}=await supabase
    .from("characters")
    .select("id,public_id,character_name,owner_id,image_url")
    .eq("public_id",publicId)
    .eq("owner_id",currentUser.id)
    .maybeSingle();

  if(error)throw error;
  if(!data)throw new Error("指定されたキャストを編集する権限がありません。");

  character=data;
  if(character.image_url){
    preview.src=character.image_url;
    fileInfo.textContent="CURRENT IMAGE DATA";
  }else if(!selectedFile){
    preview.src=PLACEHOLDER;
    fileInfo.textContent="NO IMAGE DATA";
  }
  return character;
}

function handleFileSelection(){
  releasePreviewUrl();
  const file=fileInput.files?.[0]||null;
  selectedFile=file;

  if(!file){
    preview.src=character?.image_url||PLACEHOLDER;
    fileInfo.textContent=character?.image_url?"CURRENT IMAGE DATA":"NO IMAGE SELECTED";
    setMessage("","");
    return;
  }

  const error=validateFile(file);
  if(error){
    selectedFile=null;
    fileInput.value="";
    preview.src=character?.image_url||PLACEHOLDER;
    fileInfo.textContent=character?.image_url?"CURRENT IMAGE DATA":"NO IMAGE SELECTED";
    setMessage(error,"error");
    return;
  }

  previewObjectUrl=URL.createObjectURL(file);
  preview.src=previewObjectUrl;
  fileInfo.textContent=`${file.name} / ${formatBytes(file.size)} / ${file.type}`;
  setMessage("画像を選択しました。登録ボタンで反映します。","success");
}

function validateFile(file){
  if(!["image/jpeg","image/png","image/webp"].includes(file.type))return"JPEG・PNG・WEBP形式のみ登録できます。";
  if(file.size>MAX_FILE_SIZE)return"画像サイズは6MB以下にしてください。";
  return"";
}

async function ensureCharacter(){
  const currentId=getPublicId();
  if(character&&character.public_id===currentId)return character;
  if(currentId)return loadCharacter(currentId);

  const name=document.querySelector("#character-name")?.value.trim()||"";
  const player=document.querySelector("#player-name")?.value.trim()||"";
  if(!name||!player)throw new Error("画像登録前にキャスト名とプレイヤー名を入力してください。");

  const saveButton=document.querySelector("#save-button");
  const saveStatus=document.querySelector("#save-status");
  if(!saveButton||!saveStatus)throw new Error("キャスト保存機能を確認できませんでした。");

  setMessage("キャスト本体を保存してから画像を登録します…","loading");
  saveButton.click();

  const started=Date.now();
  while(Date.now()-started<20000){
    if(saveStatus.classList.contains("error")||/失敗|エラー/.test(saveStatus.textContent||"")){
      throw new Error(saveStatus.textContent||"キャスト本体の保存に失敗しました。");
    }
    const publicId=getPublicId();
    const saved=saveStatus.classList.contains("saved")||/保存済み/.test(saveStatus.textContent||"");
    if(publicId&&saved)return loadCharacter(publicId);
    await new Promise(resolve=>setTimeout(resolve,150));
  }
  throw new Error("キャスト本体の保存完了を確認できませんでした。");
}

async function uploadImage(event){
  event.preventDefault();
  if(processing)return;

  const file=selectedFile||fileInput.files?.[0];
  if(!file){
    setMessage("画像ファイルを選択してください。","error");
    return;
  }
  const validationError=validateFile(file);
  if(validationError){
    setMessage(validationError,"error");
    return;
  }

  processing=true;
  setControlsDisabled(true);
  try{
    const target=await ensureCharacter();
    setMessage("画像をアップロードしています…","loading");

    const extension=getFileExtension(file);
    const objectPath=`${currentUser.id}/${target.public_id}/${Date.now()}.${extension}`;
    const {error:uploadError}=await supabase.storage
      .from(BUCKET_NAME)
      .upload(objectPath,file,{cacheControl:"3600",contentType:file.type,upsert:false});
    if(uploadError)throw uploadError;

    const {data:publicUrlData}=supabase.storage.from(BUCKET_NAME).getPublicUrl(objectPath);
    const imageUrl=publicUrlData.publicUrl;
    if(!imageUrl)throw new Error("公開URLを取得できませんでした。");

    const {error:updateError}=await supabase
      .from("characters")
      .update({image_url:imageUrl})
      .eq("id",target.id)
      .eq("owner_id",currentUser.id);
    if(updateError)throw updateError;

    character.image_url=imageUrl;
    releasePreviewUrl();
    selectedFile=null;
    fileInput.value="";
    preview.src=imageUrl;
    fileInfo.textContent="CURRENT IMAGE DATA";
    setMessage("キャスト画像を登録しました。","success");
    document.dispatchEvent(new CustomEvent("tnx-image-updated",{detail:{imageUrl}}));
  }catch(error){
    console.error(error);
    setMessage(translateUploadError(error),"error");
  }finally{
    processing=false;
    setControlsDisabled(false);
  }
}

async function clearImageReference(){
  if(processing)return;

  if(!character&&!getPublicId()){
    selectedFile=null;
    fileInput.value="";
    releasePreviewUrl();
    preview.src=PLACEHOLDER;
    fileInfo.textContent="NO IMAGE DATA";
    setMessage("選択中の画像を解除しました。","success");
    return;
  }

  try{
    if(!character)await loadCharacter(getPublicId());
  }catch(error){
    setMessage(error.message||"キャスト情報を取得できませんでした。","error");
    return;
  }

  if(!character.image_url&&!selectedFile){
    setMessage("解除する画像はありません。","");
    return;
  }
  if(!confirm("キャスト画像の参照を解除します。"))return;

  processing=true;
  setControlsDisabled(true);
  try{
    const {error}=await supabase
      .from("characters")
      .update({image_url:""})
      .eq("id",character.id)
      .eq("owner_id",currentUser.id);
    if(error)throw error;

    character.image_url="";
    selectedFile=null;
    fileInput.value="";
    releasePreviewUrl();
    preview.src=PLACEHOLDER;
    fileInfo.textContent="NO IMAGE DATA";
    setMessage("キャスト画像の参照を解除しました。","success");
    document.dispatchEvent(new CustomEvent("tnx-image-updated",{detail:{imageUrl:""}}));
  }catch(error){
    console.error(error);
    setMessage("画像参照の解除に失敗しました。","error");
  }finally{
    processing=false;
    setControlsDisabled(false);
  }
}

function getFileExtension(file){
  return {"image/jpeg":"jpg","image/png":"png","image/webp":"webp"}[file.type]||"bin";
}

function setControlsDisabled(disabled){
  uploadButton.disabled=disabled;
  clearButton.disabled=disabled;
  fileInput.disabled=disabled;
}

function releasePreviewUrl(){
  if(!previewObjectUrl)return;
  URL.revokeObjectURL(previewObjectUrl);
  previewObjectUrl="";
}

function formatBytes(bytes){
  if(bytes<1024)return`${bytes} B`;
  if(bytes<1024*1024)return`${(bytes/1024).toFixed(1)} KB`;
  return`${(bytes/1024/1024).toFixed(2)} MB`;
}

function setMessage(message,type=""){
  messageArea.textContent=message;
  messageArea.className="image-message";
  if(type)messageArea.classList.add(`image-message--${type}`);
}

function translateUploadError(error){
  const message=String(error?.message||"");
  if(message.includes("Bucket not found"))return"Storageバケット character-images が見つかりません。";
  if(/row-level security|Unauthorized/i.test(message))return"画像のアップロード権限がありません。StorageのRLSを確認してください。";
  if(message.includes("Payload too large"))return"画像ファイルが大きすぎます。";
  return message||"画像のアップロードに失敗しました。";
}
