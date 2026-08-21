import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js?v=4";
import { requestSheetSave, waitForSheetSaved } from "./sheet-save-state.js?v=2";
import { getImageFocusX, getImageFocusY, getImageObjectPosition, getImageScale, getImageTransformOrigin, getImageZoom, setImageFocusX, setImageFocusY, setImageZoom } from "./image-focus.js?v=3";

const BUCKET_NAME="character-images";
const MAX_SOURCE_FILE_SIZE=20*1024*1024;
const MAX_SOURCE_PIXELS=40_000_000;
const MAX_LONG_EDGE=1920;
const MIN_LONG_EDGE=1100;
const TARGET_FILE_SIZE=500*1024;
const MAX_OUTPUT_FILE_SIZE=1024*1024;
const OUTPUT_TYPE="image/webp";
const PLACEHOLDER="./assets/placeholders/scan-failed.webp";

const form=document.querySelector("#image-form");
const fileInput=document.querySelector("#image-file");
const preview=document.querySelector("#image-preview");
const fileInfo=document.querySelector("#image-file-info");
const messageArea=document.querySelector("#image-message");
const uploadButton=document.querySelector("#upload-button");
const clearButton=document.querySelector("#clear-image-button");
const focusXInput=document.querySelector("#image-focus-x");
const focusYInput=document.querySelector("#image-focus-y");
const zoomInput=document.querySelector("#image-zoom");
const focusXValue=document.querySelector("#image-focus-x-value");
const focusYValue=document.querySelector("#image-focus-y-value");
const zoomValue=document.querySelector("#image-zoom-value");

let currentUser=null;
let character=null;
let sourceFile=null;
let uploadFile=null;
let previewObjectUrl="";
let processing=false;

if(form&&fileInput&&preview&&fileInfo&&messageArea&&uploadButton&&clearButton&&focusXInput&&focusYInput&&zoomInput&&focusXValue&&focusYValue&&zoomValue)initialize();

async function initialize(){
  currentUser=await requireAuth();
  if(!currentUser)return;

  fileInput.addEventListener("change",handleFileSelection);
  form.addEventListener("submit",uploadImage);
  clearButton.addEventListener("click",clearImageReference);
  for(const input of [focusXInput,focusYInput,zoomInput]){
    input.addEventListener("input",event=>{
      event.stopPropagation();
      previewImageFocus();
    });
    input.addEventListener("change",event=>{
      event.stopPropagation();
      void saveImageFocus();
    });
  }
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
  setFocusControl(character.image_url);
  if(character.image_url){
    preview.src=character.image_url;
    applyPreviewFocus();
    fileInfo.textContent="CURRENT IMAGE DATA";
  }else if(!sourceFile){
    preview.src=PLACEHOLDER;
    applyPreviewFocus();
    fileInfo.textContent="NO IMAGE DATA";
  }
  return character;
}

async function handleFileSelection(){
  if(processing)return;

  releasePreviewUrl();
  sourceFile=fileInput.files?.[0]||null;
  uploadFile=null;

  if(!sourceFile){
    preview.src=character?.image_url||PLACEHOLDER;
    setFocusControl(character?.image_url||"");
    applyPreviewFocus();
    fileInfo.textContent=character?.image_url?"CURRENT IMAGE DATA":"NO IMAGE SELECTED";
    setMessage("","");
    return;
  }

  const error=validateSourceFile(sourceFile);
  if(error){
    resetSelection();
    setMessage(error,"error");
    return;
  }

  processing=true;
  setControlsDisabled(true);
  fileInfo.textContent=`${sourceFile.name} / ${formatBytes(sourceFile.size)} / OPTIMIZING`;
  setMessage("画像をWebPへ自動圧縮しています…","loading");

  try{
    const optimized=await optimizeImage(sourceFile);
    uploadFile=optimized.file;
    previewObjectUrl=URL.createObjectURL(uploadFile);
    preview.src=previewObjectUrl;
    applyPreviewFocus();

    const reduction=Math.max(0,Math.round((1-uploadFile.size/sourceFile.size)*100));
    const sizeText=sourceFile===uploadFile
      ? formatBytes(uploadFile.size)
      : `${formatBytes(sourceFile.size)} → ${formatBytes(uploadFile.size)}`;
    fileInfo.textContent=`${uploadFile.name} / ${sizeText} / ${optimized.width}×${optimized.height} / ${uploadFile.type}`;

    if(sourceFile===uploadFile){
      setMessage("この画像は既に十分軽量です。元データのまま登録します。","success");
    }else{
      setMessage(`画像を自動圧縮しました。容量を約${reduction}%削減して登録します。`,"success");
    }
  }catch(error){
    console.error(error);
    resetSelection();
    setMessage(error instanceof Error?error.message:"画像の自動圧縮に失敗しました。","error");
  }finally{
    processing=false;
    setControlsDisabled(false);
  }
}

function validateSourceFile(file){
  if(!["image/jpeg","image/png","image/webp"].includes(file.type))return"JPEG・PNG・WEBP形式のみ登録できます。";
  if(file.size>MAX_SOURCE_FILE_SIZE)return"圧縮前の画像サイズは20MB以下にしてください。";
  return"";
}

async function optimizeImage(file){
  const drawable=await decodeImage(file);
  try{
    const originalWidth=drawable.width;
    const originalHeight=drawable.height;
    const pixelCount=originalWidth*originalHeight;
    if(!originalWidth||!originalHeight)throw new Error("画像サイズを確認できませんでした。");
    if(pixelCount>MAX_SOURCE_PIXELS)throw new Error("画像の解像度が大きすぎます。4000万画素以下の画像を使用してください。");

    const initialScale=Math.min(1,MAX_LONG_EDGE/Math.max(originalWidth,originalHeight));
    let width=Math.max(1,Math.round(originalWidth*initialScale));
    let height=Math.max(1,Math.round(originalHeight*initialScale));
    let smallest=null;
    let targetCandidate=null;
    const qualitySteps=[.9,.84,.78,.72,.66,.6,.54];

    for(let dimensionPass=0;dimensionPass<6;dimensionPass+=1){
      const canvas=renderToCanvas(drawable.source,width,height);
      for(const quality of qualitySteps){
        const blob=await canvasToBlob(canvas,OUTPUT_TYPE,quality);
        const candidate={blob,width,height};
        if(!smallest||blob.size<smallest.blob.size)smallest=candidate;
        if(blob.size<=TARGET_FILE_SIZE){
          targetCandidate=candidate;
          break;
        }
      }
      if(targetCandidate)break;

      const longEdge=Math.max(width,height);
      if(longEdge<=MIN_LONG_EDGE)break;
      const scale=Math.max(MIN_LONG_EDGE/longEdge,.86);
      width=Math.max(1,Math.round(width*scale));
      height=Math.max(1,Math.round(height*scale));
    }

    const selected=targetCandidate||smallest;
    if(!selected)throw new Error("圧縮画像を生成できませんでした。");
    if(selected.blob.size>MAX_OUTPUT_FILE_SIZE)throw new Error("画像を1MB以下に圧縮できませんでした。より小さい画像を使用してください。");

    const canKeepOriginal=initialScale===1&&file.size<=TARGET_FILE_SIZE&&file.size<=selected.blob.size;
    if(canKeepOriginal){
      return{file,width:originalWidth,height:originalHeight};
    }

    const optimizedFile=new File(
      [selected.blob],
      `${safeFileBase(file.name)}.webp`,
      {type:OUTPUT_TYPE,lastModified:Date.now()}
    );
    return{file:optimizedFile,width:selected.width,height:selected.height};
  }finally{
    drawable.close();
  }
}

async function decodeImage(file){
  if("createImageBitmap" in window){
    let bitmap;
    try{
      bitmap=await createImageBitmap(file,{imageOrientation:"from-image"});
    }catch{
      bitmap=await createImageBitmap(file);
    }
    return{
      source:bitmap,
      width:bitmap.width,
      height:bitmap.height,
      close:()=>bitmap.close()
    };
  }

  const url=URL.createObjectURL(file);
  try{
    const image=await new Promise((resolve,reject)=>{
      const element=new Image();
      element.onload=()=>resolve(element);
      element.onerror=()=>reject(new Error("画像を読み込めませんでした。"));
      element.src=url;
    });
    return{
      source:image,
      width:image.naturalWidth,
      height:image.naturalHeight,
      close:()=>URL.revokeObjectURL(url)
    };
  }catch(error){
    URL.revokeObjectURL(url);
    throw error;
  }
}

function renderToCanvas(source,width,height){
  const canvas=document.createElement("canvas");
  canvas.width=width;
  canvas.height=height;
  const context=canvas.getContext("2d",{alpha:true});
  if(!context)throw new Error("画像処理用のCanvasを作成できませんでした。");
  context.imageSmoothingEnabled=true;
  context.imageSmoothingQuality="high";
  context.drawImage(source,0,0,width,height);
  return canvas;
}

function canvasToBlob(canvas,type,quality){
  return new Promise((resolve,reject)=>{
    canvas.toBlob(blob=>{
      if(blob)resolve(blob);
      else reject(new Error("ブラウザがWebP圧縮に対応していません。"));
    },type,quality);
  });
}

function safeFileBase(name){
  return String(name||"cast-image")
    .replace(/\.[^.]+$/,"")
    .normalize("NFKC")
    .replace(/[^a-zA-Z0-9_-]+/g,"-")
    .replace(/^-+|-+$/g,"")
    .slice(0,80)||"cast-image";
}

async function ensureCharacter(){
  const currentId=getPublicId();
  if(character&&character.public_id===currentId)return character;
  if(currentId)return loadCharacter(currentId);

  const name=document.querySelector("#character-name")?.value.trim()||"";
  const player=document.querySelector("#player-name")?.value.trim()||"";
  if(!name||!player)throw new Error("画像登録前にキャスト名とプレイヤー名を入力してください。");

  setMessage("キャスト本体を保存してから画像を登録します…","loading");
  if(!requestSheetSave())throw new Error("キャスト保存機能を確認できませんでした。");
  await waitForSheetSaved(20000);
  const publicId=getPublicId();
  if(!publicId)throw new Error("保存後のキャストIDを確認できませんでした。");
  return loadCharacter(publicId);
}

async function uploadImage(event){
  event.preventDefault();
  if(processing)return;

  if(!sourceFile){
    setMessage("画像ファイルを選択してください。","error");
    return;
  }
  if(!uploadFile){
    setMessage("画像の圧縮処理が完了していません。画像を選び直してください。","error");
    return;
  }

  processing=true;
  setControlsDisabled(true);
  let uploadedPath="";
  try{
    const requestedFocusX=focusXInput.value;
    const requestedFocusY=focusYInput.value;
    const requestedZoom=zoomInput.value;
    const target=await ensureCharacter();
    focusXInput.value=requestedFocusX;
    focusYInput.value=requestedFocusY;
    zoomInput.value=requestedZoom;
    updateFocusValues(requestedFocusX,requestedFocusY);
    updateZoomValue(requestedZoom);
    applyPreviewFocus();
    const previousImageUrl=target.image_url||"";
    setMessage("圧縮済み画像をアップロードしています…","loading");

    const extension=getFileExtension(uploadFile);
    uploadedPath=`${currentUser.id}/${target.public_id}/${Date.now()}.${extension}`;
    const {error:uploadError}=await supabase.storage
      .from(BUCKET_NAME)
      .upload(uploadedPath,uploadFile,{cacheControl:"86400",contentType:uploadFile.type,upsert:false});
    if(uploadError)throw uploadError;

    const {data:publicUrlData}=supabase.storage.from(BUCKET_NAME).getPublicUrl(uploadedPath);
    const publicImageUrl=publicUrlData.publicUrl;
    if(!publicImageUrl)throw new Error("公開URLを取得できませんでした。");
    const imageUrl=setImageZoom(
      setImageFocusY(
        setImageFocusX(publicImageUrl,requestedFocusX),
        requestedFocusY
      ),
      requestedZoom
    );

    const {error:updateError}=await supabase
      .from("characters")
      .update({image_url:imageUrl})
      .eq("id",target.id)
      .eq("owner_id",currentUser.id);
    if(updateError)throw updateError;

    character.image_url=imageUrl;
    await removeOwnedStorageObject(previousImageUrl);

    const uploadedSize=uploadFile.size;
    releasePreviewUrl();
    sourceFile=null;
    uploadFile=null;
    fileInput.value="";
    preview.src=imageUrl;
    applyPreviewFocus();
    setFocusControl(imageUrl);
    fileInfo.textContent=`CURRENT IMAGE DATA / ${formatBytes(uploadedSize)} / OPTIMIZED`;
    setMessage("キャスト画像を圧縮して登録しました。","success");
    document.dispatchEvent(new CustomEvent("tnx-image-updated",{detail:{imageUrl}}));
  }catch(error){
    console.error(error);
    if(uploadedPath)await removeStoragePath(uploadedPath);
    setMessage(translateUploadError(error),"error");
  }finally{
    processing=false;
    setControlsDisabled(false);
  }
}

async function clearImageReference(){
  if(processing)return;

  if(!character&&!getPublicId()){
    resetSelection();
    setMessage("選択中の画像を解除しました。","success");
    return;
  }

  try{
    if(!character)await loadCharacter(getPublicId());
  }catch(error){
    setMessage(error.message||"キャスト情報を取得できませんでした。","error");
    return;
  }

  if(!character.image_url&&!sourceFile){
    setMessage("解除する画像はありません。","");
    return;
  }
  if(!confirm("キャスト画像を解除し、Storage上の登録画像も削除します。"))return;

  processing=true;
  setControlsDisabled(true);
  try{
    const previousImageUrl=character.image_url||"";
    const {error}=await supabase
      .from("characters")
      .update({image_url:""})
      .eq("id",character.id)
      .eq("owner_id",currentUser.id);
    if(error)throw error;

    character.image_url="";
    await removeOwnedStorageObject(previousImageUrl);
    resetSelection();
    setFocusControl("");
    setMessage("キャスト画像を解除しました。","success");
    document.dispatchEvent(new CustomEvent("tnx-image-updated",{detail:{imageUrl:""}}));
  }catch(error){
    console.error(error);
    setMessage("画像の解除に失敗しました。","error");
  }finally{
    processing=false;
    setControlsDisabled(false);
  }
}

async function removeOwnedStorageObject(imageUrl){
  const objectPath=getStorageObjectPath(imageUrl);
  if(!objectPath||!objectPath.startsWith(`${currentUser.id}/`))return;
  await removeStoragePath(objectPath);
}

async function removeStoragePath(objectPath){
  const {error}=await supabase.storage.from(BUCKET_NAME).remove([objectPath]);
  if(error)console.warn("Unused image could not be removed.",error);
}

function getStorageObjectPath(imageUrl){
  const marker=`/storage/v1/object/public/${BUCKET_NAME}/`;
  const index=String(imageUrl||"").indexOf(marker);
  if(index<0)return"";
  const encodedPath=String(imageUrl).slice(index+marker.length).split(/[?#]/)[0];
  try{return decodeURIComponent(encodedPath);}catch{return encodedPath;}
}

function getFileExtension(file){
  return{"image/jpeg":"jpg","image/png":"png","image/webp":"webp"}[file.type]||"bin";
}

function setControlsDisabled(disabled){
  uploadButton.disabled=disabled;
  clearButton.disabled=disabled;
  fileInput.disabled=disabled;
  focusXInput.disabled=disabled||(!character?.image_url&&!uploadFile);
  focusYInput.disabled=disabled||(!character?.image_url&&!uploadFile);
  zoomInput.disabled=disabled||(!character?.image_url&&!uploadFile);
}

function resetSelection(){
  sourceFile=null;
  uploadFile=null;
  fileInput.value="";
  releasePreviewUrl();
  preview.src=character?.image_url||PLACEHOLDER;
  applyPreviewFocus();
  fileInfo.textContent=character?.image_url?"CURRENT IMAGE DATA":"NO IMAGE SELECTED";
}

function setFocusControl(imageUrl){
  const focusX=getImageFocusX(imageUrl);
  const focusY=getImageFocusY(imageUrl);
  const zoom=getImageZoom(imageUrl);
  focusXInput.value=String(focusX);
  focusYInput.value=String(focusY);
  zoomInput.value=String(zoom);
  focusXInput.disabled=!imageUrl||processing;
  focusYInput.disabled=!imageUrl||processing;
  zoomInput.disabled=!imageUrl||processing;
  updateFocusValues(focusX,focusY);
  updateZoomValue(zoom);
  applyPreviewFocus();
}

function previewImageFocus(){
  updateFocusValues(focusXInput.value,focusYInput.value);
  updateZoomValue(zoomInput.value);
  applyPreviewFocus();
}

function applyPreviewFocus(){
  const position=`${Number(focusXInput.value||50)}% ${Number(focusYInput.value||0)}%`;
  preview.style.objectPosition=position;
  preview.style.setProperty("--tnx-image-scale",String(Math.min(200,Math.max(100,Number(zoomInput.value)||100))/100));
  preview.style.setProperty("--tnx-image-origin",position);
}

function updateFocusValues(xValue,yValue){
  const focusX=Math.min(100,Math.max(0,Number(xValue)||0));
  const focusY=Math.min(100,Math.max(0,Number(yValue)||0));
  const xLabel=focusX===0?"左端":focusX===100?"右端":focusX<35?"左寄せ":focusX>65?"右寄せ":"中央";
  const yLabel=focusY===0?"上端":focusY===100?"下端":focusY<35?"上寄せ":focusY>65?"下寄せ":"中央";
  focusXValue.textContent=`${xLabel} / ${focusX}%`;
  focusYValue.textContent=`${yLabel} / ${focusY}%`;
}

function updateZoomValue(value){
  const zoom=Math.min(200,Math.max(100,Number(value)||100));
  zoomValue.textContent=`${zoom}%`;
}

async function saveImageFocus(){
  if(processing)return;
  if(sourceFile&&uploadFile){
    setMessage("この表示設定は画像登録時に保存されます。","");
    return;
  }
  if(!character?.image_url)return;
  const nextUrl=setImageZoom(
    setImageFocusY(
      setImageFocusX(character.image_url,focusXInput.value),
      focusYInput.value
    ),
    zoomInput.value
  );
  if(nextUrl===character.image_url){
    setMessage("画像表示設定は変更されていません。","");
    return;
  }

  processing=true;
  setControlsDisabled(true);
  try{
    const {error}=await supabase
      .from("characters")
      .update({image_url:nextUrl})
      .eq("id",character.id)
      .eq("owner_id",currentUser.id);
    if(error)throw error;

    character.image_url=nextUrl;
    preview.src=nextUrl;
    preview.style.objectPosition=getImageObjectPosition(nextUrl);
    preview.style.setProperty("--tnx-image-scale",String(getImageScale(nextUrl)));
    preview.style.setProperty("--tnx-image-origin",getImageTransformOrigin(nextUrl));
    updateFocusValues(getImageFocusX(nextUrl),getImageFocusY(nextUrl));
    updateZoomValue(getImageZoom(nextUrl));
    setMessage("画像表示設定を保存しました。","success");
    document.dispatchEvent(new CustomEvent("tnx-image-updated",{detail:{imageUrl:nextUrl}}));
  }catch(error){
    console.error(error);
    setFocusControl(character.image_url);
    setMessage("画像表示設定の保存に失敗しました。","error");
  }finally{
    processing=false;
    setControlsDisabled(false);
  }
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
  if(message.includes("Payload too large"))return"圧縮後の画像ファイルが大きすぎます。";
  return message||"画像のアップロードに失敗しました。";
}
