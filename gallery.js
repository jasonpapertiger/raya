(function(){
  const TRIBES={
    Rann:{bg:'#e39f00',text:'#1d1d1d'},
    Skog:{bg:'#509074',text:'#ffffff'},
    Moana:{bg:'#5175c8',text:'#ffffff'},
    Kazan:{bg:'#dc5e45',text:'#ffffff'},
  };

  const rawEls=Array.from(document.querySelectorAll('[data-gallery-item]'));
  const items=rawEls.map(el=>{
    const photoEl=el.querySelector('[data-role="gallery-photo"]');
    return{
      student: el.getAttribute('data-student')||'',
      body:    el.getAttribute('data-modal-text')||el.getAttribute('data-quote')||'',
      tribe:   el.getAttribute('data-tribe')||'Moana',
      photoEl: photoEl||null,
      imageSrc: photoEl?photoEl.src:(el.getAttribute('data-image')||''),
    };
  }).filter(it=>it.student);

  if(!items.length){console.warn('[Raya Gallery] No [data-gallery-item] elements found.');return;}

  const style=document.createElement('style');
  style.textContent=`
#raya-gallery-root{background:#1d1d1d}
#raya-gallery-root .gc{overflow:hidden;height:100%;position:relative;cursor:grab;user-select:none;-webkit-user-select:none}
#raya-gallery-root .gc.dragging{cursor:grabbing}
#raya-gallery-root .col-inner{position:absolute;left:0;right:0;display:flex;flex-direction:column;gap:10px}
#raya-gallery-root .gcard{position:relative;overflow:hidden;flex-shrink:0;cursor:pointer;transition:filter 0.3s,opacity 0.3s}
#raya-gallery-root .gcard img{width:100%;height:auto;display:block;vertical-align:top;opacity:0;transition:opacity 0.5s ease}
#raya-gallery-root .gcard img.loaded{opacity:1}
#raya-gallery-root .gcard-footer{position:absolute;bottom:0;left:0;right:0;padding:40px 12px 10px;background:linear-gradient(to top,rgba(0,0,0,0.72),transparent);display:flex;align-items:flex-end;justify-content:space-between}
#raya-gallery-root .gcard-name{font-size:12px;font-weight:400;color:rgba(255,255,255,0.85);letter-spacing:0.02em;pointer-events:none}
#raya-gallery-root .gcard-icon{pointer-events:none;flex-shrink:0;transition:opacity 0.18s,transform 0.18s}
#raya-gallery-root.is-desktop .gcard-icon{opacity:0;transform:translateY(4px)}
#raya-gallery-root.is-desktop .gcard.hovered .gcard-icon{opacity:1;transform:translateY(0)}
#raya-gallery-root.is-touch .gcard-icon{opacity:1}
#raya-g.dim .gcard{filter:blur(4px);opacity:0.15}
#raya-g.dim .gcard.hovered{filter:none;opacity:1}
#raya-modal-img img{width:100%;height:auto;display:block}
/* Fix 5: prevent body scroll when modal open */
body.raya-modal-open{overflow:hidden;touch-action:none}
@media(max-width:600px){
  #raya-modal-layout{flex-direction:column !important}
  #raya-modal-img{width:100% !important}
  #raya-modal-text{padding:24px 20px 32px !important}
}`;
  document.head.appendChild(style);

  const root=document.getElementById('raya-gallery-root');
  if(!root){console.warn('[Raya Gallery] #raya-gallery-root not found.');return;}

  root.innerHTML=`
  <div id="raya-g" style="height:100%;padding:10px;box-sizing:border-box"></div>
  <div id="raya-modal" style="display:none;position:fixed;inset:0;background:rgba(29,29,29,0.6);z-index:9999;backdrop-filter:blur(4px);align-items:center;justify-content:center;padding:32px 16px;box-sizing:border-box;overflow-y:auto;-webkit-overflow-scrolling:touch">
    <div id="raya-modal-inner" style="max-width:900px;width:100%;margin:auto;position:relative;opacity:0;transform:translateY(16px)">
      <!-- Fix 1: close button always inside modal-inner, top-right corner -->
      <button id="raya-mc" style="position:absolute;top:0;right:0;width:44px;height:44px;background:rgba(29,29,29,0.05);border:none;cursor:pointer;z-index:10;display:flex;align-items:center;justify-content:center;transform:rotate(45deg)">
        <svg id="raya-close-svg" width="20" height="20" viewBox="0 0 33 33" fill="none">
          <line x1="16.9317" y1="0" x2="16.9317" y2="33" stroke="white" stroke-width="1.6"/>
          <line x1="33" y1="16.4489" x2="0" y2="16.4489" stroke="white" stroke-width="1.6"/>
        </svg>
      </button>
      <div id="raya-modal-layout" style="display:flex;flex-direction:row">
        <div id="raya-modal-img" style="flex-shrink:0;line-height:0"></div>
        <div id="raya-modal-text" style="padding:40px 36px;display:flex;flex-direction:column;justify-content:center">
          <div id="raya-mh" class="text-size-large text-weight-medium" style="margin-bottom:12px"></div>
          <div id="raya-mb" class="text-size-regular text-weight-medium"></div>
        </div>
      </div>
    </div>
  </div>`;

  const PLUS=`<svg width="16" height="16" viewBox="0 0 33 33" fill="none"><line x1="16.9317" y1="0" x2="16.9317" y2="33" stroke="white" stroke-width="1.6"/><line x1="33" y1="16.4489" x2="0" y2="16.4489" stroke="white" stroke-width="1.6"/></svg>`;

  // Fix 3: slightly faster speeds
  const SPEEDS=[0.022,-0.017,0.019,-0.024,0.016];
  const GAP=10;
  const gal=document.getElementById('raya-g');
  const modal=document.getElementById('raya-modal');
  const modalInner=document.getElementById('raya-modal-inner');
  const isTouch=('ontouchstart' in window)||navigator.maxTouchPoints>0;
  root.classList.add(isTouch?'is-touch':'is-desktop');

  let numCols=5,lastT=null;
  const pos=[],loopH=[],colInnerA=[],colInnerB=[],speeds=[];

  // Fix 6: proper drag with momentum — separate tracking per column
  const drag={on:false,col:-1,startY:0,startPos:0,vy:0,prevY:0,prevT:0,moved:false};

  let pendingCard=null,hoverEntryX=0,hoverEntryY=0;
  const HOVER_PX=8;

  function getCols(){
    const w=root.offsetWidth;
    if(w<480)return 2;if(w<768)return 3;if(w<1024)return 4;return 5;
  }

  const io=new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(!e.isIntersecting)return;
      const img=e.target;
      const src=img.getAttribute('data-src');
      if(src){
        img.src=src;img.removeAttribute('data-src');
        img.addEventListener('load',()=>requestAnimationFrame(()=>img.classList.add('loaded')),{once:true});
        img.addEventListener('error',()=>img.classList.add('loaded'),{once:true});
      }
      io.unobserve(img);
    });
  },{rootMargin:'500px 0px'});

  function clearHover(){
    gal.classList.remove('dim');
    gal.querySelectorAll('.gcard.hovered').forEach(c=>c.classList.remove('hovered'));
    pendingCard=null;
  }

  if(!isTouch){
    document.addEventListener('mousemove',e=>{
      if(!pendingCard)return;
      const dx=e.clientX-hoverEntryX,dy=e.clientY-hoverEntryY;
      if(Math.sqrt(dx*dx+dy*dy)>=HOVER_PX){
        gal.classList.add('dim');pendingCard=null;
      }
    });
  }

  function makeCard(item,col){
    const tribe=TRIBES[item.tribe]||TRIBES.Moana;
    const card=document.createElement('div');
    card.className='gcard';
    card.style.background=tribe.bg+'18';
    if(item.imageSrc){
      const img=document.createElement('img');
      img.setAttribute('data-src',item.imageSrc);
      img.alt=item.student;
      card.appendChild(img);
      io.observe(img);
    }
    const footer=document.createElement('div');footer.className='gcard-footer';
    const nameEl=document.createElement('span');nameEl.className='gcard-name';nameEl.textContent=item.student;
    const iconEl=document.createElement('span');iconEl.className='gcard-icon';iconEl.innerHTML=PLUS;
    footer.appendChild(nameEl);footer.appendChild(iconEl);
    card.appendChild(footer);
    card.addEventListener('click',()=>{if(!drag.moved)openModal(item);});
    if(!isTouch){
      card.addEventListener('mouseenter',e=>{
        hoverEntryX=e.clientX;hoverEntryY=e.clientY;
        pendingCard=card;card.classList.add('hovered');
      });
      card.addEventListener('mouseleave',()=>clearHover());
    }
    return card;
  }

  function buildInner(c){
    const inner=document.createElement('div');
    inner.className='col-inner';inner.style.top='0';
    const offset=Math.floor((items.length/numCols)*c)%items.length;
    const ordered=items.slice(offset).concat(items.slice(0,offset));
    ordered.forEach(item=>inner.appendChild(makeCard(item,c)));
    return inner;
  }

  // Fix 6: smooth drag with momentum on both desktop and mobile
  function attachDrag(colEl,c){
    let pointerDown=false;

    function onStart(y){
      pointerDown=true;
      drag.on=true;drag.col=c;
      drag.startY=y;drag.startPos=pos[c];
      drag.prevY=y;drag.prevT=performance.now();
      drag.vy=0;drag.moved=false;
      colEl.classList.add('dragging');
    }
    function onMove(y){
      if(!pointerDown||drag.col!==c)return;
      if(Math.abs(y-drag.startY)>4)drag.moved=true;
      const now=performance.now(),dt=Math.max(now-drag.prevT,1);
      drag.vy=(y-drag.prevY)/dt;
      drag.prevY=y;drag.prevT=now;
      const lh=loopH[c]||1;
      pos[c]=((drag.startPos-(y-drag.startY))%lh+lh)%lh;
    }
    function onEnd(){
      if(!pointerDown||drag.col!==c)return;
      pointerDown=false;drag.on=false;
      colEl.classList.remove('dragging');
      // Apply momentum — blend from drag velocity back to base speed
      speeds[c]=-drag.vy*0.8;
      const base=SPEEDS[c%SPEEDS.length];
      let f=0;
      const decay=()=>{
        f++;const t=Math.min(f/120,1);
        speeds[c]=speeds[c]*(1-t)+base*t;
        if(t<1)requestAnimationFrame(decay);else speeds[c]=base;
      };
      requestAnimationFrame(decay);
    }

    // Mouse events
    colEl.addEventListener('mousedown',e=>{
      onStart(e.clientY);e.preventDefault();
    });
    window.addEventListener('mousemove',e=>{
      if(drag.on&&drag.col===c)onMove(e.clientY);
    });
    window.addEventListener('mouseup',()=>{
      if(drag.on&&drag.col===c)onEnd();
    });

    // Touch events — Fix 7: passive listeners, no interference with page scroll
    colEl.addEventListener('touchstart',e=>{
      // Only take over if touch is clearly vertical drag intent
      onStart(e.touches[0].clientY);
    },{passive:true});

    colEl.addEventListener('touchmove',e=>{
      if(!drag.on||drag.col!==c)return;
      const dy=Math.abs(e.touches[0].clientY-drag.startY);
      const dx=Math.abs(e.touches[0].clientX-(drag.startX||e.touches[0].clientX));
      // Only prevent default if clearly scrolling vertically in column
      if(dy>dx&&dy>8){
        e.preventDefault();
        onMove(e.touches[0].clientY);
      }
    },{passive:false});

    colEl.addEventListener('touchend',()=>{
      if(drag.on&&drag.col===c)onEnd();
    },{passive:true});
  }

  function initColB(c,innerA,colRef){
    function tryClone(){
      const h=innerA.offsetHeight;
      if(h<100){setTimeout(tryClone,150);return;}
      loopH[c]=h;
      const innerB=innerA.cloneNode(true);
      innerB.className='col-inner';
      // Fix 2: ensure gap is preserved in clone by setting top correctly
      innerB.style.top=h+'px';
      // Images in clone load from cache — no bump-in
      colRef.appendChild(innerB);
      colInnerB[c]=innerB;
    }
    setTimeout(tryClone,80);
  }

  function build(){
    numCols=getCols();
    gal.innerHTML='';
    colInnerA.length=0;colInnerB.length=0;
    pos.length=0;loopH.length=0;speeds.length=0;
    gal.style.cssText=`display:grid;grid-template-columns:repeat(${numCols},1fr);gap:10px;height:100%;padding:10px;box-sizing:border-box`;

    for(let c=0;c<numCols;c++){
      const col=document.createElement('div');col.className='gc';
      const innerA=buildInner(c);
      col.appendChild(innerA);
      gal.appendChild(col);
      colInnerA.push(innerA);
      pos.push(0);loopH.push(0);
      speeds.push(SPEEDS[c%SPEEDS.length]);
      attachDrag(col,c);
      initColB(c,innerA,col);
    }
  }

  build();
  let resizeTimer;
  window.addEventListener('resize',()=>{
    clearTimeout(resizeTimer);
    resizeTimer=setTimeout(()=>{if(getCols()!==numCols)build();},200);
  });

  function tick(ts){
    if(!lastT)lastT=ts;
    const dt=Math.min(ts-lastT,50);lastT=ts;
    for(let c=0;c<numCols;c++){
      if(drag.on&&drag.col===c)continue;
      const lh=loopH[c];if(!lh||!colInnerB[c])continue;
      pos[c]+=speeds[c]*dt;
      pos[c]=((pos[c]%lh)+lh)%lh;
      colInnerA[c].style.top=(-pos[c])+'px';
      colInnerB[c].style.top=(lh-pos[c])+'px';
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // ── Modal ────────────────────────────────────────────────────────────────────
  function openModal(item){
    const tribe=TRIBES[item.tribe]||TRIBES.Moana;
    const isMobile=window.innerWidth<600;

    // Fix 4: close button always white
    document.getElementById('raya-close-svg').querySelectorAll('line')
      .forEach(l=>l.setAttribute('stroke','white'));

    document.getElementById('raya-mh').textContent=item.student;
    document.getElementById('raya-mb').textContent=item.body;
    const textPane=document.getElementById('raya-modal-text');
    textPane.style.background=tribe.bg;
    document.getElementById('raya-mh').style.color=tribe.text;
    document.getElementById('raya-mb').style.color=tribe.text;

    const imgWrap=document.getElementById('raya-modal-img');
    imgWrap.innerHTML='';
    let mImg=null;
    if(item.photoEl&&item.photoEl.complete&&item.photoEl.naturalWidth>0){
      mImg=item.photoEl.cloneNode(false);
      mImg.removeAttribute('data-role');
      mImg.style.cssText='width:100%;height:auto;display:block';
    } else if(item.imageSrc){
      mImg=document.createElement('img');
      mImg.src=item.imageSrc;mImg.alt=item.student;
      mImg.style.cssText='width:100%;height:auto;display:block';
    }

    const layout=document.getElementById('raya-modal-layout');
    function applyLayout(){
      if(isMobile){
        layout.style.flexDirection='column';imgWrap.style.width='100%';
        textPane.style.padding='24px 20px 32px';
      } else if(mImg&&mImg.naturalWidth>mImg.naturalHeight){
        layout.style.flexDirection='column';imgWrap.style.width='100%';
        textPane.style.padding='32px 36px';
      } else {
        layout.style.flexDirection='row';imgWrap.style.width='45%';
        textPane.style.padding='40px 36px';
      }
    }

    if(mImg){
      imgWrap.appendChild(mImg);
      if(mImg.complete&&mImg.naturalWidth>0)applyLayout();
      else{applyLayout();mImg.addEventListener('load',applyLayout,{once:true});}
    } else {
      imgWrap.style.background=tribe.bg;imgWrap.style.minHeight='200px';applyLayout();
    }

    // Fix 5: lock body scroll when modal opens
    document.body.classList.add('raya-modal-open');
    modal.style.display='flex';
    modal.scrollTop=0;
    modalInner.style.opacity='0';modalInner.style.transform='translateY(16px)';
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      modalInner.style.transition='opacity 0.25s ease,transform 0.25s ease';
      modalInner.style.opacity='1';modalInner.style.transform='translateY(0)';
    }));
  }

  function closeModal(){
    clearHover();
    // Fix 5: restore body scroll
    document.body.classList.remove('raya-modal-open');
    modalInner.style.transition='opacity 0.15s ease,transform 0.15s ease';
    modalInner.style.opacity='0';modalInner.style.transform='translateY(10px)';
    setTimeout(()=>{modal.style.display='none';modalInner.style.transition='';},160);
  }

  document.getElementById('raya-mc').onclick=closeModal;
  modal.addEventListener('click',e=>{if(e.target===modal)closeModal();});
})();