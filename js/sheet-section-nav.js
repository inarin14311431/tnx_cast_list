/* Sidebar section navigation for long cast-sheet edits. */
initializeSheetSectionNav();

function initializeSheetSectionNav() {
  const nav = document.querySelector(".sheet-section-nav");
  if (!nav || nav.dataset.tnxSectionNavInitialized === "true") return;
  nav.dataset.tnxSectionNavInitialized = "true";

  const sectionIds = [
    "sheet-profile", "sheet-styles", "sheet-ability",
    "sheet-skills", "sheet-style-skills", "sheet-outfits"
  ];
  const sections = [...document.querySelectorAll(".sheet-main > .sheet-section")].slice(0, sectionIds.length);
  const links = [...nav.querySelectorAll("[data-sheet-section]")];

  function setActive(id) {
    links.forEach(link => {
      const active = link.dataset.sheetSection === id;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }

  links.forEach(link => link.addEventListener("click", event => {
    const section = document.getElementById(link.dataset.sheetSection);
    if (!section) return;
    event.preventDefault();
    if (!section.classList.contains("is-open")) section.querySelector(".section-toggle")?.click();
    section.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${section.id}`);
    setActive(section.id);
  }));

  const observer = new IntersectionObserver(entries => {
    const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
    if (visible[0]) setActive(visible[0].target.id);
  }, { rootMargin: "-12% 0px -68% 0px", threshold: 0 });
  sections.forEach(section => observer.observe(section));

  setActive(sectionIds.includes(location.hash.slice(1)) ? location.hash.slice(1) : sectionIds[0]);

  import("./help-ui.js?v=6").catch(error => console.warn("Editor help could not be initialized.", error));
  import("./sheet-save-diagnostics.js?v=1").catch(error => console.warn("Save diagnostics could not be initialized.", error));
}
