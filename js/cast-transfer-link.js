(function(){
  const publicId = new URLSearchParams(location.search).get("id")?.trim() || "";
  const link = document.querySelector("#cast-transfer-page-link");
  if (!link) return;
  if (!publicId) { link.remove(); return; }
  link.href = `./transfer.html?id=${encodeURIComponent(publicId)}`;
})();
