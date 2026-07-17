let castV22Attempts = 0;

function applyCastV22(){
  const outfit = document.querySelector("#outfit-container");
  if(!outfit || !outfit.querySelector("table")){
    if(castV22Attempts++ < 40) window.setTimeout(applyCastV22,100);
    return;
  }

  outfit.querySelectorAll("table").forEach(table => {
    const headers = [...table.querySelectorAll("thead th")];
    const detailIndex = headers.findIndex(cell => /解説|詳細/.test(cell.textContent));
    if(detailIndex < 0) return;

    table.querySelectorAll("tbody tr").forEach(row => {
      const cell = row.children[detailIndex];
      if(!cell || cell.querySelector(".cast-outfit-detail")) return;
      const textarea = document.createElement("textarea");
      textarea.className = "cast-outfit-detail";
      textarea.readOnly = true;
      textarea.value = cell.textContent.trim();
      textarea.setAttribute("aria-label","アウトフィット解説");
      cell.replaceChildren(textarea);
    });
  });
}

applyCastV22();
