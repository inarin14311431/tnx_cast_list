import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js";
import { SITE_BASE_PATH } from "./config.js";

const BUCKET_NAME = "character-images";
const MAX_FILE_SIZE = 6 * 1024 * 1024;

const form = document.querySelector("#image-form");
const fileInput = document.querySelector("#image-file");
const preview = document.querySelector("#image-preview");
const fileInfo = document.querySelector("#image-file-info");
const messageArea = document.querySelector("#image-message");
const uploadButton = document.querySelector("#upload-button");
const clearButton = document.querySelector("#clear-image-button");

let currentUser = null;
let character = null;
let previewObjectUrl = "";
let processing = false;

initialize();

async function initialize() {
  currentUser = await requireAuth();

  if (!currentUser) {
    return;
  }

  const publicId = new URLSearchParams(window.location.search)
    .get("id")
    ?.trim();

  if (!publicId) {
    showFatalError("キャストIDが指定されていません。");
    return;
  }

  setupEvents();
  await loadCharacter(publicId);
}

function setupEvents() {
  fileInput.addEventListener("change", handleFileSelection);
  form.addEventListener("submit", uploadImage);
  clearButton.addEventListener("click", clearImageReference);

  window.addEventListener("beforeunload", () => {
    releasePreviewUrl();
  });
}

async function loadCharacter(publicId) {
  setMessage("ACCESSING CAST DATA...", "loading");

  const { data, error } = await supabase
    .from("characters")
    .select("id, public_id, character_name, owner_id, image_url")
    .eq("public_id", publicId)
    .eq("owner_id", currentUser.id)
    .maybeSingle();

  if (error) {
    console.error(error);
    showFatalError("キャスト情報の取得に失敗しました。");
    return;
  }

  if (!data) {
    showFatalError("指定されたキャストを編集する権限がありません。");
    return;
  }

  character = data;

  document.querySelector("#character-id").textContent = character.public_id;
  document.querySelector("#character-name").textContent = character.character_name;
  document.querySelector("#return-to-cast").href =
    `${SITE_BASE_PATH}cast.html?id=${encodeURIComponent(character.public_id)}`;

  if (character.image_url) {
    preview.src = character.image_url;
    fileInfo.textContent = "CURRENT IMAGE DATA";
  }

  preview.addEventListener("error", () => {
    preview.src = "./assets/placeholders/scan-failed.webp";
  });

  setMessage("VISUAL DATA READY", "success");
}

function handleFileSelection() {
  releasePreviewUrl();

  const file = fileInput.files?.[0];

  if (!file) {
    fileInfo.textContent = "NO IMAGE SELECTED";
    return;
  }

  const validationError = validateFile(file);

  if (validationError) {
    fileInput.value = "";
    setMessage(validationError, "error");
    return;
  }

  previewObjectUrl = URL.createObjectURL(file);
  preview.src = previewObjectUrl;

  fileInfo.textContent =
    `${file.name} / ${formatBytes(file.size)} / ${file.type}`;

  setMessage("IMAGE DATA SELECTED", "success");
}

function validateFile(file) {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp"
  ];

  if (!allowedTypes.includes(file.type)) {
    return "JPEG・PNG・WEBP形式のみ登録できます。";
  }

  if (file.size > MAX_FILE_SIZE) {
    return "画像サイズは6MB以下にしてください。";
  }

  return "";
}

async function uploadImage(event) {
  event.preventDefault();

  if (processing || !character) {
    return;
  }

  const file = fileInput.files?.[0];

  if (!file) {
    setMessage("画像ファイルを選択してください。", "error");
    return;
  }

  const validationError = validateFile(file);

  if (validationError) {
    setMessage(validationError, "error");
    return;
  }

  processing = true;
  setControlsDisabled(true);
  setMessage("UPLOADING VISUAL DATA...", "loading");

  try {
    const extension = getFileExtension(file);
    const timestamp = Date.now();
    const objectPath =
      `${currentUser.id}/${character.public_id}/${timestamp}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(objectPath, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(objectPath);

    const imageUrl = publicUrlData.publicUrl;

    if (!imageUrl) {
      throw new Error("公開URLを取得できませんでした。");
    }

    const { error: updateError } = await supabase
      .from("characters")
      .update({ image_url: imageUrl })
      .eq("id", character.id)
      .eq("owner_id", currentUser.id);

    if (updateError) {
      throw updateError;
    }

    character.image_url = imageUrl;
    preview.src = imageUrl;
    fileInput.value = "";
    releasePreviewUrl();

    setMessage("VISUAL DATA UPDATED", "success");

    window.setTimeout(() => {
      window.location.href =
        `${SITE_BASE_PATH}cast.html?id=${encodeURIComponent(character.public_id)}`;
    }, 700);
  } catch (error) {
    console.error(error);
    setMessage(translateUploadError(error), "error");
  } finally {
    processing = false;
    setControlsDisabled(false);
  }
}

async function clearImageReference() {
  if (processing || !character) {
    return;
  }

  if (!window.confirm("キャスト画像の参照を解除します。")) {
    return;
  }

  processing = true;
  setControlsDisabled(true);
  setMessage("CLEARING VISUAL DATA...", "loading");

  try {
    const { error } = await supabase
      .from("characters")
      .update({ image_url: "" })
      .eq("id", character.id)
      .eq("owner_id", currentUser.id);

    if (error) {
      throw error;
    }

    character.image_url = "";
    preview.src = "./assets/placeholders/scan-failed.webp";
    fileInfo.textContent = "NO IMAGE DATA";

    setMessage("IMAGE REFERENCE CLEARED", "success");
  } catch (error) {
    console.error(error);
    setMessage("画像参照の解除に失敗しました。", "error");
  } finally {
    processing = false;
    setControlsDisabled(false);
  }
}

function getFileExtension(file) {
  const byMime = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp"
  };

  return byMime[file.type] ?? "bin";
}

function setControlsDisabled(disabled) {
  uploadButton.disabled = disabled;
  clearButton.disabled = disabled;
  fileInput.disabled = disabled;
}

function releasePreviewUrl() {
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = "";
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function setMessage(message, type = "") {
  messageArea.textContent = message;
  messageArea.className = "image-message";

  if (type) {
    messageArea.classList.add(`image-message--${type}`);
  }
}

function showFatalError(message) {
  setMessage(message, "error");
  setControlsDisabled(true);
}

function translateUploadError(error) {
  const message = String(error?.message ?? "");

  if (message.includes("Bucket not found")) {
    return "Storageバケット character-images が見つかりません。";
  }

  if (
    message.includes("row-level security") ||
    message.includes("Unauthorized")
  ) {
    return "画像のアップロード権限がありません。StorageのRLSを確認してください。";
  }

  if (message.includes("Payload too large")) {
    return "画像ファイルが大きすぎます。";
  }

  return "画像のアップロードに失敗しました。";
}
