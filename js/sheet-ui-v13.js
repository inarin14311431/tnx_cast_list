const viewLink = document.querySelector('#cast-view-button');

function updateViewLink(){
  if(!viewLink) return;
  const id = new URLSearchParams(location.search).get('id')?.trim();
  if(!id){
    viewLink.classList.remove('is-visible');
    viewLink.removeAttribute('href');
    return;
  }
  viewLink.href = `./cast.html?id=${encodeURIComponent(id)}`;
  viewLink.classList.add('is-visible');
}

updateViewLink();
window.addEventListener('popstate', updateViewLink);

const status = document.querySelector('#save-status');
if(status){
  const observer = new MutationObserver(updateViewLink);
  observer.observe(status,{childList:true,subtree:true});
}
