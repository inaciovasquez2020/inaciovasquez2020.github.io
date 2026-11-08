/* Optional, no storage or source upload; illustrations are schematic. */
const dialog=document.getElementById('lab-tour');
const launch=document.getElementById('open-tour');
const slides=[...dialog.querySelectorAll('[data-tour-step]')];
const back=document.getElementById('tour-back');
const next=document.getElementById('tour-next');
const close=document.getElementById('tour-close');
const position=document.getElementById('tour-position');
let page=0;
function render(){
  for(let i=0;i<slides.length;i++)slides[i].hidden=i!==page;
  back.disabled=page===0;
  next.textContent=globalThis.MathLabTranslations?.uiText?.(page===slides.length-1?'Finish':'Next') ?? (page===slides.length-1?'Finish':'Next');
  position.textContent=globalThis.MathLabTranslations?.tourPosition?.(page,slides.length) ?? ('Step '+(page+1)+' of '+slides.length);
  dialog.setAttribute('aria-labelledby','tour-step-title-'+(page+1));
}
launch.addEventListener('click',()=>{
  page=0;render();
  if(typeof dialog.showModal==='function'){dialog.showModal();close.focus();}
  else window.location.assign('how-to.html');
});
back.addEventListener('click',()=>{page=Math.max(0,page-1);render();});
next.addEventListener('click',()=>{
  if(page===slides.length-1){dialog.close();return;}
  page++;render();
});
close.addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>launch.focus());
dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
