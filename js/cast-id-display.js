const publicIdElement = document.querySelector("#cast-public-id");
const statusElement = document.querySelector("#cast-status");
const accessTargetElement = document.querySelector(".cast-access-target");
const sourceId = new URLSearchParams(window.location.search).get("id")?.trim() ?? "";
const displayId = obfuscatePublicId(sourceId);
let updating = false;

function obfuscatePublicId(value) {
  const source = `TNX_CAST_ARCHIVE::${String(value ?? "")}`;
  let hash = 0x811c9dc5;
  for (let index = 0; index < source.length; index++) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `TNX-${(hash >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
}

function replaceVisibleId(element) {
  if (!element?.textContent.includes(sourceId)) return;
  element.textContent = element.textContent.replaceAll(sourceId, displayId);
}

function refreshDisplay() {
  if (updating || !sourceId) return;
  updating = true;

  if (publicIdElement && publicIdElement.textContent !== displayId) {
    publicIdElement.textContent = displayId;
  }

  replaceVisibleId(statusElement);
  replaceVisibleId(accessTargetElement);

  updating = false;
}

const observer = new MutationObserver(refreshDisplay);
if (publicIdElement) observer.observe(publicIdElement, { childList: true, characterData: true, subtree: true });
if (statusElement) observer.observe(statusElement, { childList: true, characterData: true, subtree: true });
if (accessTargetElement) observer.observe(accessTargetElement, { childList: true, characterData: true, subtree: true });

refreshDisplay();
