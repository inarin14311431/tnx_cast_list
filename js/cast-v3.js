import { supabase } from './supabase-client.js';

const publicId = new URLSearchParams(location.search).get('id')?.trim();
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

init();

async function init(){
  if(!publicId) return;
  const {data} = await supabase
    .from('characters')
    .select('divine_1_yomi,divine_2_yomi,divine_3_yomi')
    .eq('public_id',publicId)
    .maybeSingle();

  for(let i=0;i<40;i++){
    const divineCards=[...document.querySelectorAll('.divine-card')];
    const skillSections=[...document.querySelectorAll('.skill-section')];
    if(divineCards.length){
      const yomis=[data?.divine_1_yomi,data?.divine_2_yomi,data?.divine_3_yomi];
      divineCards.forEach((card,index)=>{
        const name=card.querySelector('.divine-card__name');
        if(!name||name.querySelector('ruby')) return;
        const text=name.textContent.trim();
        const yomi=String(yomis[index]||text).trim();
        name.innerHTML=`<ruby>${escapeHtml(text)}<rt>${escapeHtml(yomi)}</rt></ruby>`;
      });
      normalizeSkillSections(skillSections);
      break;
    }
    await wait(100);
  }
}

function normalizeSkillSections(sections){
  const labels={
    'GENERAL SKILLS':['一般技能','GENERAL SKILLS'],
    'SOCIAL':['社会','SOCIAL'],
    'CONNECTIONS':['コネクション','CONNECTIONS'],
    'STYLE SKILLS':['スタイル技能','STYLE SKILLS']
  };
  sections.forEach(section=>{
    const h=section.querySelector('h3');
    if(!h) return;
    const key=h.textContent.trim();
    const hit=labels[key];
    if(hit) h.innerHTML=`${hit[0]} <small>${hit[1]}</small>`;
    if(key==='STYLE SKILLS') return;
    section.querySelectorAll('tr').forEach(row=>row.lastElementChild?.remove());
  });
}

function escapeHtml(value){
  return String(value??'')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}
