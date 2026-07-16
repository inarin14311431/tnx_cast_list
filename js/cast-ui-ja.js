import { supabase } from './supabase-client.js';

const publicId = new URLSearchParams(location.search).get('id')?.trim();
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

init();

async function init(){
  localizeStaticLabels();
  if(!publicId) return;
  const {data} = await supabase.from('characters').select('divine_1_yomi,divine_2_yomi,divine_3_yomi').eq('public_id',publicId).maybeSingle();
  if(!data) return;
  for(let i=0;i<30;i++){
    const cards=[...document.querySelectorAll('.divine-card')];
    if(cards.length){
      const yomis=[data.divine_1_yomi,data.divine_2_yomi,data.divine_3_yomi];
      cards.forEach((card,index)=>{
        const name=card.querySelector('.divine-card__name');
        if(!name) return;
        const yomi=String(yomis[index]||'').trim();
        if(yomi && !card.querySelector('.divine-card__yomi')){
          const ruby=document.createElement('span');
          ruby.className='divine-card__yomi';
          ruby.textContent=`《${yomi}》`;
          name.before(ruby);
        }
      });
      break;
    }
    await wait(100);
  }
}

function localizeStaticLabels(){
  const replacements=[
    ['.cast-header__back','キャスト一覧へ','RETURN TO ARCHIVE'],
    ['[data-tab="session"]','セッションデータ','SESSION DATA'],
    ['[data-tab="profile"]','プロフィール','PROFILE'],
    ['[data-tab="outfits"]','アウトフィット','OUTFITS']
  ];
  for(const [selector,jp,en] of replacements){
    const el=document.querySelector(selector);
    if(el) el.innerHTML=`<span>${jp}</span><small>${en}</small>`;
  }
  const headings=[
    ['ABILITY / CONTROL','能力値／制御値'],
    ['DIVINE WORKS','神業'],
    ['SKILLS','技能'],
    ['COMBOS','コンボ'],
    ['PERSONAL DATA','パーソナルデータ'],
    ['LIFE PATH','ライフパス'],
    ['PROFILE','プロフィール']
  ];
  document.querySelectorAll('.data-panel__header h2').forEach(h=>{
    const hit=headings.find(([en])=>h.textContent.trim()===en);
    if(hit) h.innerHTML=`${hit[1]} <small>${hit[0]}</small>`;
  });
  const identity=[['PLAYER','プレイヤー'],['AFFILIATION','所属'],['CITIZEN RANK','市民ランク'],['EXP','消費経験点']];
  document.querySelectorAll('.identity-grid dt').forEach(dt=>{
    const hit=identity.find(([en])=>dt.textContent.trim()===en);
    if(hit) dt.innerHTML=`${hit[1]} <small>${hit[0]}</small>`;
  });
}
