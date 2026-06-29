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
#raya-gallery-root .col-inner{position:absolute;left:0;right:0;display:flex;flex-direction:column;gap:10px;will-change:transform}
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
body.raya-modal-open{overflow:hidden}
@media(max-width:600px){
  #raya-modal-layout{flex-direction:column !important}
  #raya-modal-img{width:100% !important}
  #raya-modal-text{padding:24px 20px 32px !important}
}`;
  document.head.appendChild(style);

  const root=document.getElementById('raya-gallery-root');
  if(!root){console.warn('[Raya Gallery] #raya-gallery-root not found.');return;}

  root.innerHTML=`
  <!-- Intro overlay -->
  <div id="raya-intro" style="position:absolute;inset:0;background:rgba(29,29,29,0.7);z-index:100;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;padding:40px;box-sizing:border-box;color:#ffffff">
    <h1 class="heading-style-h1 mega">Rayots in motion</h1>
    <div class="spacer-small"></div>
    <p class="text-size-medium">Every photo a moment. Every moment a Rayot.</p>
    <div class="spacer-medium"></div>
    <a id="raya-launch" href="#" class="button is-red w-button">Launch</a>
  </div>
  <div id="raya-g" style="height:100%;padding:10px;box-sizing:border-box"></div>`;

  // Append modal to body so it escapes gallery stacking context and overflow:hidden
  const modalEl=document.createElement('div');
  modalEl.innerHTML=`<div id="raya-modal" data-lenis-prevent style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(29,29,29,0.6);z-index:10000;backdrop-filter:blur(4px);overflow-y:scroll;-webkit-overflow-scrolling:touch;padding:40px 16px 60px;box-sizing:border-box">
    <div id="raya-modal-inner" style="max-width:900px;width:100%;margin:0 auto;position:relative;opacity:0;transform:translateY(16px)">
      <button id="raya-mc" style="position:fixed;top:16px;right:16px;width:44px;height:44px;background:rgba(29,29,29,0.15);border:none;cursor:pointer;z-index:10001;display:flex;align-items:center;justify-content:center;border-radius:2px">
        <svg id="raya-close-svg" width="20" height="20" viewBox="0 0 33 33" fill="none" style="transform:rotate(45deg)">
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
  document.body.appendChild(modalEl.firstElementChild);

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

  // Load images immediately — needed so all heights are correct before cloning
  function loadImg(img){
    if(img.complete&&img.naturalHeight>0){
      img.classList.add('loaded');
      return;
    }
    img.addEventListener('load',()=>requestAnimationFrame(()=>img.classList.add('loaded')),{once:true});
    img.addEventListener('error',()=>img.classList.add('loaded'),{once:true});
  }

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
      img.src=item.imageSrc;
      img.alt=item.student;
      card.appendChild(img);
      loadImg(img);
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

  // Seeded shuffle — deterministic per column, different each time called with different seed
  function seededShuffle(arr,seed){
    const a=[...arr];
    let s=seed;
    for(let i=a.length-1;i>0;i--){
      s=(s*1664525+1013904223)&0xffffffff;
      const j=Math.abs(s)%(i+1);
      [a[i],a[j]]=[a[j],a[i]];
    }
    return a;
  }

  function buildInner(c){
    const inner=document.createElement('div');
    inner.className='col-inner';inner.style.top='0';
    // Build 3 shuffled passes of items, each with a different seed
    // so the column is 3x longer and each third looks different
    const passes=[
      seededShuffle(items, c*1000+1),
      seededShuffle(items, c*1000+2),
      seededShuffle(items, c*1000+3),
    ];
    passes.forEach(pass=>pass.forEach(item=>inner.appendChild(makeCard(item,c))));
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

    // Touch events — defer drag.on until intent is confirmed so Lenis can page-scroll freely
    let tStartX=0,tStartY=0,tDecided=false,tIsCol=false;

    colEl.addEventListener('touchstart',e=>{
      tStartX=e.touches[0].clientX;
      tStartY=e.touches[0].clientY;
      tDecided=false;tIsCol=false;
      pointerDown=true;
      drag.col=c;
      drag.startY=tStartY;drag.startPos=pos[c];
      drag.prevY=tStartY;drag.prevT=performance.now();
      drag.vy=0;drag.moved=false;
    },{passive:true});

    colEl.addEventListener('touchmove',e=>{
      if(!pointerDown||drag.col!==c)return;
      const dy=Math.abs(e.touches[0].clientY-tStartY);
      const dx=Math.abs(e.touches[0].clientX-tStartX);
      if(!tDecided){
        if(dy<6&&dx<6)return;
        if(dx>=dy){
          // Horizontal — let Lenis/browser handle page scroll
          tDecided=true;tIsCol=false;pointerDown=false;return;
        }
        // Vertical — take over as column drag
        tDecided=true;tIsCol=true;
        drag.on=true;colEl.classList.add('dragging');
      }
      if(!tIsCol)return;
      e.preventDefault();
      onMove(e.touches[0].clientY);
    },{passive:false});

    colEl.addEventListener('touchend',()=>{
      if(tIsCol&&drag.on&&drag.col===c)onEnd();
      pointerDown=false;tDecided=false;tIsCol=false;
    },{passive:true});
  }

  function initColB(c,innerA,colRef){
    const imgs=Array.from(innerA.querySelectorAll('img'));

    function allLoaded(){
      return imgs.every(img=>img.complete&&img.naturalHeight>0);
    }

    function tryClone(){
      if(!allLoaded()){setTimeout(tryClone,100);return;}
      requestAnimationFrame(()=>{
        const h=innerA.offsetHeight;
        if(h<100){setTimeout(tryClone,200);return;}
        loopH[c]=h+GAP; // include trailing gap so loop join matches inter-card spacing

        // Build innerB fresh (not cloneNode) so event listeners are properly attached
        const innerB=buildInner(c);
        innerB.style.cssText=`position:absolute;left:0;right:0;top:0;will-change:transform;transform:translateY(${h+GAP}px)`;
        // Images load from cache instantly
        innerB.querySelectorAll('img').forEach(img=>loadImg(img));
        colRef.appendChild(innerB);
        colInnerB[c]=innerB;

        // loopH locked after clone — no further height updates
      });
    }

    setTimeout(tryClone,100);
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

  // Intro overlay
  const intro=document.getElementById('raya-intro');
  document.getElementById('raya-launch').addEventListener('click',e=>{
    e.preventDefault();
    intro.style.transition='opacity 0.5s ease';
    intro.style.opacity='0';
    setTimeout(()=>intro.style.display='none',500);
  });

  let resizeTimer;
  window.addEventListener('resize',()=>{
    clearTimeout(resizeTimer);
    resizeTimer=setTimeout(()=>{if(getCols()!==numCols)build();},200);
  });

  let ticking=false,colsReady=false,galVisible=true;

  function maybeStartTick(){
    if(colsReady&&galVisible&&!ticking){
      ticking=true;lastT=null;requestAnimationFrame(tick);
    }
  }

  function tick(ts){
    if(!ticking)return;
    if(!lastT)lastT=ts;
    const dt=Math.min(ts-lastT,50);lastT=ts;
    for(let c=0;c<numCols;c++){
      const lh=loopH[c];if(!lh||!colInnerB[c])continue;
      if(!(drag.on&&drag.col===c)){
        pos[c]+=speeds[c]*dt;
        pos[c]=((pos[c]%lh)+lh)%lh;
      }
      colInnerA[c].style.transform=`translateY(${-pos[c]}px)`;
      colInnerB[c].style.transform=`translateY(${lh-pos[c]}px)`;
    }
    requestAnimationFrame(tick);
  }

  // Pause tick when gallery is off-screen so it doesn't compete with Lenis during scroll
  if(window.IntersectionObserver){
    new IntersectionObserver(entries=>{
      galVisible=entries[0].isIntersecting;
      if(galVisible)maybeStartTick();
      else ticking=false;
    },{threshold:0}).observe(root);
  }

  function waitForAllCols(){
    const allReady=colInnerA.every((_,i)=>!!colInnerB[i]&&loopH[i]>100);
    if(allReady){colsReady=true;maybeStartTick();}
    else{setTimeout(waitForAllCols,50);}
  }
  waitForAllCols();

  // ── Modal ────────────────────────────────────────────────────────────────────
  function openModal(item){
    const tribe=TRIBES[item.tribe]||TRIBES.Moana;
    const isMobile=window.innerWidth<600;
    // Reset layout state from previous open
    const layout=document.getElementById('raya-modal-layout');
    layout.style.flexDirection='';
    document.getElementById('raya-modal-img').style.width='';

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

    document.body.classList.add('raya-modal-open');
    // Stop Lenis smooth scroll so it doesn't intercept modal scroll events
    if(window.lenis) window.lenis.stop();
    modal.style.display='block';
    modal.scrollTop=0;
    modalInner.style.opacity='0';modalInner.style.transform='translateY(16px)';
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      modalInner.style.transition='opacity 0.25s ease,transform 0.25s ease';
      modalInner.style.opacity='1';modalInner.style.transform='translateY(0)';
    }));
  }

  function closeModal(){
    clearHover();
    document.body.classList.remove('raya-modal-open');
    // Restart Lenis smooth scroll
    if(window.lenis) window.lenis.start();
    modalInner.style.transition='opacity 0.15s ease,transform 0.15s ease';
    modalInner.style.opacity='0';modalInner.style.transform='translateY(10px)';
    setTimeout(()=>{modal.style.display='none';modalInner.style.transition='';},160);
  }

  document.getElementById('raya-mc').onclick=closeModal;
  modal.addEventListener('click',e=>{if(e.target===modal)closeModal();});
  // Prevent background page scroll when touching the modal backdrop
  // but allow the modal itself to scroll normally
  modal.addEventListener('touchstart',e=>{
    // Track touch start Y for modal scroll clamping
    modal._touchStartY=e.touches[0].clientY;
  },{passive:true});
  modal.addEventListener('touchmove',e=>{
    // Only block if the touch target is the modal backdrop itself (not inner content)
    if(e.target===modal){
      e.preventDefault();
      return;
    }
    // For content inside modal: allow scroll, but clamp at top/bottom to prevent
    // the scroll bleeding through to the page behind
    const scrollTop=modal.scrollTop;
    const maxScroll=modal.scrollHeight-modal.clientHeight;
    const dy=(modal._touchStartY||0)-e.touches[0].clientY;
    if((scrollTop<=0&&dy<0)||(scrollTop>=maxScroll&&dy>0)){
      e.preventDefault();
    }
  },{passive:false});
})();