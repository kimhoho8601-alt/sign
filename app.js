(() => {
  const RED = "#c9002b";
  const INK = "#241b1d";
  const CANVAS_W = 1200;
  const CANVAS_H = 600;

  const state = {
    mode: "text",
    textKind: "signature",
    sealStyle: "goin",
    sealScript: "auto",
    selectedIndex: 0,
    uploadImage: null,
    uploadName: "",
    generation: 0,
    isDrawing: false,
    hasDrawing: false,
    drawHistory: []
  };

  const els = {
    tabs: [...document.querySelectorAll(".mode-tab")],
    textPanel: document.getElementById("textPanel"),
    drawPanel: document.getElementById("drawPanel"),
    uploadPanel: document.getElementById("uploadPanel"),
    nameInput: document.getElementById("nameInput"),
    generateTextBtn: document.getElementById("generateTextBtn"),
    kindButtons: [...document.querySelectorAll(".kind-btn")],
    signatureControls: document.getElementById("signatureControls"),
    sealControls: document.getElementById("sealControls"),
    sealStyleSelect: document.getElementById("sealStyleSelect"),
    sealScriptSelect: document.getElementById("sealScriptSelect"),
    regenerateBtn: document.getElementById("regenerateBtn"),
    resetBtn: document.getElementById("resetBtn"),
    resultTitle: document.getElementById("resultTitle"),
    resultGrid: document.getElementById("resultGrid"),
    resultCards: [...document.querySelectorAll(".sign-card")],
    canvases: [...document.querySelectorAll(".sign-card canvas")],
    selectedLabel: document.getElementById("selectedLabel"),
    downloadBtn: document.getElementById("downloadBtn"),
    copyBtn: document.getElementById("copyBtn"),
    drawCanvas: document.getElementById("drawCanvas"),
    drawHint: document.getElementById("drawHint"),
    undoDrawBtn: document.getElementById("undoDrawBtn"),
    clearDrawBtn: document.getElementById("clearDrawBtn"),
    applyDrawBtn: document.getElementById("applyDrawBtn"),
    fileInput: document.getElementById("fileInput"),
    uploadBox: document.getElementById("uploadBox"),
    uploadStatus: document.getElementById("uploadStatus"),
    uploadThumb: document.getElementById("uploadThumb"),
    uploadFileName: document.getElementById("uploadFileName"),
    changeFileBtn: document.getElementById("changeFileBtn"),
    thresholdRange: document.getElementById("thresholdRange"),
    thresholdOutput: document.getElementById("thresholdOutput"),
    toast: document.getElementById("toast")
  };

  const signatureLabels = ["플로우 사인", "퀵 사인", "언더라인 사인"];
  const drawLabels = ["직접 그린 사인", "선명한 잉크", "레드 잉크"];
  const uploadLabels = ["원본 정리", "선명한 잉크", "레드 잉크"];

  const sealStyles = {
    goin:    { label:"고인체풍", font:"Noto Serif KR", weight:900, shape:"circle", border:"double", scaleX:.86, tracking:-2, rough:true },
    jeonseo: { label:"전서체풍", font:"Song Myung", weight:400, shape:"circle", border:"double", scaleX:.78, tracking:-4, rough:false },
    hanbeol: { label:"한벌고인체풍", font:"Nanum Myeongjo", weight:800, shape:"circle", border:"single", scaleX:.88, tracking:-3, rough:true },
    bancho:  { label:"반초서체풍", font:"Gowun Batang", weight:700, shape:"circle", border:"single", scaleX:.92, tracking:-1, rough:false },
    haeseo:  { label:"해서체풍", font:"Noto Serif KR", weight:700, shape:"square", border:"double", scaleX:.92, tracking:0, rough:false },
    wondou:  { label:"원도우체풍", font:"Black Han Sans", weight:400, shape:"round", border:"single", scaleX:.90, tracking:-3, rough:false }
  };

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => els.toast.classList.remove("show"), 1900);
  }

  function clearCanvas(canvas) {
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  }

  function roundedRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function fitFontSize(ctx, text, fontFamily, maxWidth, initial, min=80, weight=400) {
    let size=initial;
    while(size>min){
      ctx.font=`${weight} ${size}px "${fontFamily}"`;
      if(ctx.measureText(text).width<=maxWidth) break;
      size-=4;
    }
    return size;
  }

  function detectScript(text) {
    if (state.sealScript !== "auto") return state.sealScript;
    return /[\u3400-\u9fff\uf900-\ufaff]/u.test(text) ? "hanja" : "hangul";
  }

  function cleanSealName(text) {
    return (text || "").trim().replace(/[印인]+$/u, "").replace(/\s+/g, "").slice(0, 4);
  }

  function drawSealBorder(ctx, style, cx, cy, size) {
    ctx.strokeStyle=RED;
    ctx.lineCap="round";
    const drawOne=(offset,width)=>{
      ctx.lineWidth=width;
      if(style.shape==="circle"){
        ctx.beginPath();ctx.arc(cx,cy,size/2-offset,0,Math.PI*2);ctx.stroke();
      } else {
        const radius=style.shape==="round"?54:16;
        roundedRect(ctx,cx-size/2+offset,cy-size/2+offset,size-offset*2,size-offset*2,radius);ctx.stroke();
      }
    };
    drawOne(0,15);
    if(style.border==="double") drawOne(24,4);
    if(style.rough){
      ctx.save();ctx.globalAlpha=.22;ctx.lineWidth=2;
      for(let i=0;i<5;i++){
        const d=5+i*3;
        if(style.shape==="circle"){
          ctx.beginPath();ctx.arc(cx+(i%2?1:-1),cy,size/2-d,0,Math.PI*2);ctx.stroke();
        }
      }
      ctx.restore();
    }
  }

  function drawSealGlyph(ctx, char, x, y, style, fontSize=104) {
    ctx.save();
    ctx.translate(x,y);
    ctx.scale(style.scaleX,1.08);
    ctx.fillStyle=RED;
    ctx.textAlign="center";
    ctx.textBaseline="middle";
    ctx.font=`${style.weight} ${fontSize}px "${style.font}", "Noto Serif KR", serif`;
    ctx.fillText(char,0,2);
    if(style.rough){
      ctx.globalAlpha=.18;
      ctx.fillText(char,1.6,0);
      ctx.fillText(char,-1.2,1.2);
    }
    ctx.restore();
  }

  function drawSeal(canvas, rawText) {
    clearCanvas(canvas);
    const ctx=canvas.getContext("2d");
    const name=cleanSealName(rawText);
    if(!name) return;

    const script=detectScript(name);
    const style=sealStyles[state.sealStyle] || sealStyles.goin;
    const cx=CANVAS_W/2, cy=CANVAS_H/2;
    const size=354;
    drawSealBorder(ctx,style,cx,cy,size);

    const chars=[...name].slice(0,4);

    // 1글자: 중앙에 크게.
    if(chars.length===1){
      drawSealGlyph(ctx,chars[0],cx,cy,style,166);
    }

    // 2글자: 참고 사례처럼 인/印을 억지로 붙이지 않고 세로 한 줄로 크게 배치.
    // 원형 인장 안에서 위·아래 여백을 동일하게 두어 가장 안정적으로 보이게 한다.
    else if(chars.length===2){
      const top=cy-72;
      const bottom=cy+72;
      drawSealGlyph(ctx,chars[0],cx,top,style,136);
      drawSealGlyph(ctx,chars[1],cx,bottom,style,136);
    }

    // 3글자: 2×2 균형을 위해 인/印을 추가.
    else if(chars.length===3){
      const left=cx-62, right=cx+62, top=cy-64, bottom=cy+64;
      if(script==="hanja"){
        // 한자형 읽기 방향: 우측 열 위→아래, 좌측 열 위→아래.
        const source=[chars[0],chars[1],chars[2],"印"];
        [
          {c:source[0],x:right,y:top},
          {c:source[1],x:right,y:bottom},
          {c:source[2],x:left,y:top},
          {c:source[3],x:left,y:bottom}
        ].forEach(cell=>drawSealGlyph(ctx,cell.c,cell.x,cell.y,style,122));
      } else {
        // 한글형: 화면에서 읽기 쉬운 2×2 가로 배치, 인은 오른쪽 아래.
        [
          {c:chars[0],x:left,y:top},
          {c:chars[1],x:right,y:top},
          {c:chars[2],x:left,y:bottom},
          {c:"인",x:right,y:bottom}
        ].forEach(cell=>drawSealGlyph(ctx,cell.c,cell.x,cell.y,style,122));
      }
    }

    // 4글자: 인/印을 추가하지 않고 네 글자를 그대로 꽉 채운다.
    else {
      const left=cx-62, right=cx+62, top=cy-64, bottom=cy+64;
      if(script==="hanja"){
        [
          {c:chars[0],x:right,y:top},
          {c:chars[1],x:right,y:bottom},
          {c:chars[2],x:left,y:top},
          {c:chars[3],x:left,y:bottom}
        ].forEach(cell=>drawSealGlyph(ctx,cell.c,cell.x,cell.y,style,118));
      } else {
        [
          {c:chars[0],x:left,y:top},
          {c:chars[1],x:right,y:top},
          {c:chars[2],x:left,y:bottom},
          {c:chars[3],x:right,y:bottom}
        ].forEach(cell=>drawSealGlyph(ctx,cell.c,cell.x,cell.y,style,118));
      }
    }

    if(style.rough){
      ctx.save();
      ctx.globalAlpha=.07;
      ctx.translate(1.5,-1);
      drawSealBorder(ctx,{...style,border:"single",rough:false},cx,cy,size-7);
      ctx.restore();
    }
  }

  function drawSignature(canvas,text,variant=0){
    clearCanvas(canvas);
    const ctx=canvas.getContext("2d");
    const safe=(text||"Signature").trim().slice(0,14);
    const fonts=["Nanum Pen Script","Nanum Pen Script","Gaegu"];
    const weights=[400,400,700];
    const slants=[-.28,-.20,-.16];
    const rotations=[-.045,-.025,-.065];
    const yOffsets=[-28,-20,-8];

    ctx.save();
    ctx.translate(CANVAS_W/2,CANVAS_H/2+12);
    ctx.rotate(rotations[variant]);
    ctx.transform(1,0,slants[variant],1,0,0);
    ctx.fillStyle=INK;
    ctx.textAlign="center";
    ctx.textBaseline="middle";

    const size=fitFontSize(ctx,safe,fonts[variant],820,variant===2?225:270,112,weights[variant]);
    ctx.font=`${weights[variant]} ${size}px "${fonts[variant]}"`;

    // Slight overlap/offset makes typed names feel less like a font sample.
    if([...safe].length<=4 && /[가-힣]/.test(safe)){
      const chars=[...safe];
      const widths=chars.map(ch=>ctx.measureText(ch).width);
      const total=widths.reduce((a,b)=>a+b,0)*.72;
      let cursor=-total/2;
      chars.forEach((ch,i)=>{
        const w=widths[i]*.72;
        ctx.save();
        ctx.translate(cursor+w/2,(i%2?5:-5)+(variant===2?i*2:0));
        ctx.rotate((i-1)*.018);
        ctx.fillText(ch,0,yOffsets[variant]);
        ctx.restore();
        cursor+=w;
      });
    } else {
      ctx.fillText(safe,-18,yOffsets[variant]);
    }

    const measured=Math.max(360,Math.min(820,ctx.measureText(safe).width*.82));
    ctx.strokeStyle=INK;
    ctx.lineCap="round";
    ctx.lineJoin="round";

    // terminal flourish
    ctx.lineWidth=variant===2?7:5.5;
    ctx.beginPath();
    ctx.moveTo(measured*.08,18);
    ctx.bezierCurveTo(measured*.30,-2,measured*.43,70,measured*.63,-18);
    ctx.bezierCurveTo(measured*.70,-48,measured*.77,-40,measured*.72,-2);
    ctx.stroke();

    // underline / return stroke
    if(variant!==1){
      ctx.lineWidth=variant===2?4.8:3.4;
      ctx.beginPath();
      ctx.moveTo(-measured*.48,118);
      ctx.bezierCurveTo(-measured*.19,102,measured*.20,135,measured*.57,86);
      ctx.stroke();
    } else {
      ctx.lineWidth=3.2;
      ctx.beginPath();
      ctx.moveTo(-measured*.38,108);
      ctx.bezierCurveTo(-measured*.08,90,measured*.27,111,measured*.52,76);
      ctx.stroke();
    }

    // final upward flick
    ctx.lineWidth=2.8;
    ctx.beginPath();
    ctx.moveTo(measured*.48,88);
    ctx.bezierCurveTo(measured*.66,54,measured*.76,18,measured*.68,-22);
    ctx.stroke();

    ctx.restore();
    centerInkBounds(canvas,CANVAS_W/2,CANVAS_H/2,false);
  }

  function setVisibleResultCount(count){
    els.resultGrid.classList.toggle("one-option",count===1);
    els.resultGrid.classList.toggle("two-options",count===2);
    els.resultCards.forEach((card,index)=>card.hidden=index>=count);
    if(state.selectedIndex>=count) state.selectedIndex=0;
  }

  function setModeLabels(labels){
    els.resultCards.forEach((card,index)=>{
      if(labels[index]) card.querySelector(".sign-meta strong").textContent=labels[index];
    });
    els.selectedLabel.textContent=labels[state.selectedIndex]||labels[0];
  }

  function currentLabels(){
    if(state.mode==="draw") return drawLabels;
    if(state.mode==="upload") return uploadLabels;
    if(state.textKind==="seal") return [sealStyles[state.sealStyle].label];
    return signatureLabels;
  }

  function selectCard(index){
    if(els.resultCards[index]?.hidden) index=0;
    state.selectedIndex=index;
    els.resultCards.forEach((card,i)=>{
      const active=i===index&&!card.hidden;
      card.classList.toggle("selected",active);
      card.setAttribute("aria-pressed",String(active));
      card.querySelector(".sign-meta i").textContent=active?"선택됨":"선택";
    });
    const labels=currentLabels();
    els.selectedLabel.textContent=labels[index]||labels[0];
  }

  function renderTextOptions(){
    const value=els.nameInput.value.trim();
    if(!value){showToast("이름 또는 문구를 입력해 주세요.");els.nameInput.focus();return;}
    state.generation++;
    state.selectedIndex=0;
    if(state.textKind==="seal"){
      setVisibleResultCount(1);
      drawSeal(els.canvases[0],value);
      clearCanvas(els.canvases[1]);clearCanvas(els.canvases[2]);
      setModeLabels([sealStyles[state.sealStyle].label]);
      els.resultTitle.textContent="선택한 도장을 확인하세요";
    } else {
      setVisibleResultCount(3);
      drawSignature(els.canvases[0],value,0);
      drawSignature(els.canvases[1],value,1);
      drawSignature(els.canvases[2],value,2);
      setModeLabels(signatureLabels);
      els.resultTitle.textContent="사인 스타일을 골라보세요";
    }
    selectCard(0);
  }

  function getContainRect(img,targetW,targetH,padding=90){
    const availableW=targetW-padding*2,availableH=targetH-padding*2;
    const scale=Math.min(availableW/img.naturalWidth,availableH/img.naturalHeight);
    const w=img.naturalWidth*scale,h=img.naturalHeight*scale;
    return{x:(targetW-w)/2,y:(targetH-h)/2,w,h};
  }

  function createProcessedUpload(img,variant,thresholdPct){
    const work=document.createElement("canvas");work.width=CANVAS_W;work.height=CANVAS_H;
    const ctx=work.getContext("2d",{willReadFrequently:true});
    const rect=getContainRect(img,CANVAS_W,CANVAS_H,85);
    ctx.drawImage(img,rect.x,rect.y,rect.w,rect.h);
    const frame=ctx.getImageData(0,0,CANVAS_W,CANVAS_H),data=frame.data;
    const threshold=Math.round(255*(thresholdPct/100)),hardThreshold=Math.max(120,threshold-35);
    for(let i=0;i<data.length;i+=4){
      const r=data[i],g=data[i+1],b=data[i+2];
      const brightness=.299*r+.587*g+.114*b;
      const chroma=Math.max(r,g,b)-Math.min(r,g,b);
      let alpha=variant===1?(brightness<hardThreshold?255:Math.max(0,Math.min(255,(threshold-brightness)*8))):(brightness<threshold?Math.max(0,Math.min(255,(threshold-brightness)*5.5+chroma*1.5)):0);
      if(variant===2){data[i]=201;data[i+1]=0;data[i+2]=43;}
      else if(variant===1){data[i]=36;data[i+1]=27;data[i+2]=29;}
      else{const ink=Math.max(22,Math.min(85,brightness*.3));data[i]=ink;data[i+1]=ink;data[i+2]=ink;}
      data[i+3]=alpha;
    }
    ctx.putImageData(frame,0,0);centerInkBounds(work,CANVAS_W/2,CANVAS_H/2,false);return work;
  }

  function renderUploadOptions(){
    if(!state.uploadImage){showToast("먼저 자필 사인 이미지를 올려 주세요.");return;}
    setVisibleResultCount(3);
    const threshold=Number(els.thresholdRange.value);
    els.canvases.forEach((canvas,index)=>{
      clearCanvas(canvas);
      canvas.getContext("2d").drawImage(createProcessedUpload(state.uploadImage,index,threshold),0,0);
    });
    setModeLabels(uploadLabels);els.resultTitle.textContent="정리된 사인을 골라보세요";selectCard(state.selectedIndex);
  }

  function cloneDrawVariant(source,variant){
    const out=document.createElement("canvas");
    out.width=CANVAS_W;
    out.height=CANVAS_H;
    const ctx=out.getContext("2d",{willReadFrequently:true});

    const trimmed=trimCanvas(source,18);
    const scale=Math.min(900/trimmed.width,390/trimmed.height,1.7);
    const w=trimmed.width*scale;
    const h=trimmed.height*scale;

    // 먼저 기하학적으로 캔버스 중앙에 배치
    ctx.drawImage(trimmed,(CANVAS_W-w)/2,(CANVAS_H-h)/2,w,h);

    if(variant!==0){
      const frame=ctx.getImageData(0,0,CANVAS_W,CANVAS_H);
      const data=frame.data;
      for(let i=0;i<data.length;i+=4){
        if(data[i+3]<4) continue;
        if(variant===2){
          data[i]=201; data[i+1]=0; data[i+2]=43;
        } else {
          data[i]=36; data[i+1]=27; data[i+2]=29;
          data[i+3]=Math.min(255,data[i+3]*1.3);
        }
      }
      ctx.putImageData(frame,0,0);

      if(variant===1){
        const base=document.createElement("canvas");
        base.width=CANVAS_W;base.height=CANVAS_H;
        base.getContext("2d").drawImage(out,0,0);
        ctx.save();
        ctx.globalAlpha=.18;
        ctx.drawImage(base,1.5,0);
        ctx.drawImage(base,-1.5,0);
        ctx.restore();
      }
    }

    // 핵심: 1/2/3안 모두 실제 획의 좌우 끝값 기준으로 중앙을 다시 맞춘다.
    centerInkBounds(out,CANVAS_W/2,CANVAS_H/2,false);
    return out;
  }

  function renderDrawOptions(){
    if(!state.hasDrawing){showToast("먼저 빈 공간에 사인을 그려 주세요.");return;}
    setVisibleResultCount(3);
    els.canvases.forEach((canvas,index)=>{clearCanvas(canvas);canvas.getContext("2d").drawImage(cloneDrawVariant(els.drawCanvas,index),0,0);});
    setModeLabels(drawLabels);els.resultTitle.textContent="직접 그린 사인을 골라보세요";selectCard(state.selectedIndex);
  }

  function setTextKind(kind){
    state.textKind=kind;
    els.kindButtons.forEach(btn=>btn.classList.toggle("active",btn.dataset.kind===kind));
    els.signatureControls.hidden=kind!=="signature";
    els.sealControls.hidden=kind!=="seal";
    renderTextOptions();
  }

  function setMode(mode){
    state.mode=mode;
    els.tabs.forEach(tab=>{const active=tab.dataset.mode===mode;tab.classList.toggle("active",active);tab.setAttribute("aria-selected",String(active));});
    [els.textPanel,els.drawPanel,els.uploadPanel].forEach(panel=>{const active=panel.id===`${mode}Panel`;panel.hidden=!active;panel.classList.toggle("active",active);});
    state.selectedIndex=0;
    if(mode==="text")renderTextOptions();
    else if(mode==="draw"){
      if(state.hasDrawing)renderDrawOptions();
      else{setVisibleResultCount(3);els.canvases.forEach(clearCanvas);setModeLabels(drawLabels);els.resultTitle.textContent="직접 사인해 주세요";selectCard(0);}
    }else if(state.uploadImage)renderUploadOptions();
    else{setVisibleResultCount(3);els.canvases.forEach(clearCanvas);setModeLabels(uploadLabels);els.resultTitle.textContent="사인 이미지를 올려주세요";selectCard(0);}
  }

  function centerInkBounds(source, targetX=CANVAS_W/2, targetY=CANVAS_H/2, adjustY=false){
    const ctx=source.getContext("2d",{willReadFrequently:true});
    const {width,height}=source;
    const data=ctx.getImageData(0,0,width,height).data;
    let minX=width,minY=height,maxX=-1,maxY=-1;

    for(let y=0;y<height;y++){
      for(let x=0;x<width;x++){
        if(data[(y*width+x)*4+3]>8){
          if(x<minX)minX=x;
          if(x>maxX)maxX=x;
          if(y<minY)minY=y;
          if(y>maxY)maxY=y;
        }
      }
    }
    if(maxX<0) return source;

    const boundsCX=(minX+maxX)/2;
    const boundsCY=(minY+maxY)/2;
    const dx=targetX-boundsCX;
    const dy=adjustY ? targetY-boundsCY : 0;

    if(Math.abs(dx)<.5 && Math.abs(dy)<.5) return source;

    const copy=document.createElement("canvas");
    copy.width=width; copy.height=height;
    copy.getContext("2d").drawImage(source,0,0);
    ctx.clearRect(0,0,width,height);
    ctx.drawImage(copy,dx,dy);
    return source;
  }

  function centerInkOptically(source, targetX=CANVAS_W/2, targetY=CANVAS_H/2, strengthX=1, strengthY=.35){
    const ctx=source.getContext("2d",{willReadFrequently:true});
    const {width,height}=source;
    const data=ctx.getImageData(0,0,width,height).data;

    let mass=0,sumX=0,sumY=0;
    for(let y=0;y<height;y++){
      for(let x=0;x<width;x++){
        const a=data[(y*width+x)*4+3];
        if(a>8){
          const w=a/255;
          mass+=w;
          sumX+=x*w;
          sumY+=y*w;
        }
      }
    }
    if(!mass) return source;

    const cx=sumX/mass;
    const cy=sumY/mass;
    const dx=(targetX-cx)*strengthX;
    const dy=(targetY-cy)*strengthY;

    const copy=document.createElement("canvas");
    copy.width=width; copy.height=height;
    copy.getContext("2d").drawImage(source,0,0);

    ctx.clearRect(0,0,width,height);
    ctx.drawImage(copy,dx,dy);
    return source;
  }

  function trimCanvas(source,padding=46){
    const ctx=source.getContext("2d",{willReadFrequently:true}),{width,height}=source;
    const pixels=ctx.getImageData(0,0,width,height).data;
    let minX=width,minY=height,maxX=-1,maxY=-1;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const alpha=pixels[(y*width+x)*4+3];
      if(alpha>8){if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;}
    }
    if(maxX<0)return source;
    minX=Math.max(0,minX-padding);minY=Math.max(0,minY-padding);maxX=Math.min(width-1,maxX+padding);maxY=Math.min(height-1,maxY+padding);
    const out=document.createElement("canvas");out.width=maxX-minX+1;out.height=maxY-minY+1;
    out.getContext("2d").drawImage(source,minX,minY,out.width,out.height,0,0,out.width,out.height);return out;
  }

  function safeFileBase(){
    if(state.mode==="upload"&&state.uploadName)return state.uploadName.replace(/\.[^.]+$/,"").replace(/[^0-9a-zA-Z가-힣_-]+/g,"-").slice(0,32)||"signature";
    if(state.mode==="draw")return"handwritten-signature";
    return els.nameInput.value.trim().replace(/[^0-9a-zA-Z가-힣_-]+/g,"-").slice(0,32)||(state.textKind==="seal"?"seal":"signature");
  }

  function downloadSelected(){
    const selected=trimCanvas(els.canvases[state.selectedIndex]);
    const link=document.createElement("a");
    link.download=`${safeFileBase()}-${state.textKind==="seal"?"seal":"sign"}-${state.selectedIndex+1}.png`;
    link.href=selected.toDataURL("image/png");link.click();showToast("투명 PNG를 저장했습니다.");
  }

  async function copySelected(){
    if(!navigator.clipboard||!window.ClipboardItem){showToast("이 브라우저는 이미지 복사를 지원하지 않습니다.");return;}
    try{
      const selected=trimCanvas(els.canvases[state.selectedIndex]);
      const blob=await new Promise(resolve=>selected.toBlob(resolve,"image/png"));
      await navigator.clipboard.write([new ClipboardItem({"image/png":blob})]);showToast("투명 이미지를 클립보드에 복사했습니다.");
    }catch{showToast("이미지 복사가 제한되어 있습니다. PNG 저장을 이용해 주세요.");}
  }

  function loadFile(file){
    if(!file||!file.type.startsWith("image/")){showToast("PNG, JPG 또는 WEBP 이미지를 선택해 주세요.");return;}
    if(file.size>12*1024*1024){showToast("12MB 이하 이미지를 사용해 주세요.");return;}
    const reader=new FileReader();
    reader.onload=e=>{const img=new Image();img.onload=()=>{state.uploadImage=img;state.uploadName=file.name;els.uploadThumb.src=e.target.result;els.uploadFileName.textContent=file.name;els.uploadStatus.hidden=false;renderUploadOptions();};img.onerror=()=>showToast("이미지를 읽을 수 없습니다.");img.src=e.target.result;};
    reader.readAsDataURL(file);
  }

  function drawPointFromEvent(e){
    const rect=els.drawCanvas.getBoundingClientRect();
    return{x:(e.clientX-rect.left)*(els.drawCanvas.width/rect.width),y:(e.clientY-rect.top)*(els.drawCanvas.height/rect.height)};
  }
  function saveDrawSnapshot(){if(state.drawHistory.length>=20)state.drawHistory.shift();state.drawHistory.push(els.drawCanvas.toDataURL("image/png"));}
  function restoreDrawSnapshot(dataUrl){
    clearCanvas(els.drawCanvas);
    if(!dataUrl){state.hasDrawing=false;els.drawHint.hidden=false;return;}
    const img=new Image();img.onload=()=>{els.drawCanvas.getContext("2d").drawImage(img,0,0);state.hasDrawing=true;els.drawHint.hidden=true;if(state.mode==="draw")renderDrawOptions();};img.src=dataUrl;
  }
  function initDrawing(){
    const ctx=els.drawCanvas.getContext("2d");ctx.lineCap="round";ctx.lineJoin="round";ctx.strokeStyle=INK;ctx.lineWidth=8;
    els.drawCanvas.addEventListener("pointerdown",e=>{e.preventDefault();els.drawCanvas.setPointerCapture?.(e.pointerId);saveDrawSnapshot();const p=drawPointFromEvent(e);state.isDrawing=true;state.hasDrawing=true;els.drawHint.hidden=true;ctx.beginPath();ctx.moveTo(p.x,p.y);});
    els.drawCanvas.addEventListener("pointermove",e=>{if(!state.isDrawing)return;e.preventDefault();const p=drawPointFromEvent(e);const pressure=e.pressure&&e.pressure>0?e.pressure:.5;ctx.lineWidth=5.5+pressure*7;ctx.lineTo(p.x,p.y);ctx.stroke();});
    const finish=e=>{if(!state.isDrawing)return;e.preventDefault();state.isDrawing=false;ctx.closePath();};
    els.drawCanvas.addEventListener("pointerup",finish);els.drawCanvas.addEventListener("pointercancel",finish);els.drawCanvas.addEventListener("pointerleave",e=>{if(e.buttons===0)finish(e);});
  }
  function undoDrawing(){const last=state.drawHistory.pop();if(last===undefined){showToast("취소할 선이 없습니다.");return;}restoreDrawSnapshot(last);}
  function clearDrawing(showMessage=true){clearCanvas(els.drawCanvas);state.drawHistory=[];state.hasDrawing=false;els.drawHint.hidden=false;if(state.mode==="draw"){els.canvases.forEach(clearCanvas);selectCard(0);}if(showMessage)showToast("그린 내용을 지웠습니다.");}

  function resetAll(){
    state.selectedIndex=0;state.uploadImage=null;state.uploadName="";state.generation=0;state.textKind="signature";state.sealStyle="goin";state.sealScript="auto";
    els.nameInput.value="김홍섭";els.fileInput.value="";els.uploadStatus.hidden=true;els.thresholdRange.value="88";els.thresholdOutput.value="88%";
    els.sealStyleSelect.value="goin";els.sealScriptSelect.value="auto";clearDrawing(false);setTextKind("signature");setMode("text");showToast("처음 상태로 되돌렸습니다.");
  }

  els.tabs.forEach(tab=>tab.addEventListener("click",()=>setMode(tab.dataset.mode)));
  els.kindButtons.forEach(btn=>btn.addEventListener("click",()=>setTextKind(btn.dataset.kind)));
  els.sealStyleSelect.addEventListener("change",()=>{state.sealStyle=els.sealStyleSelect.value;if(state.textKind==="seal")renderTextOptions();});
  els.sealScriptSelect.addEventListener("change",()=>{state.sealScript=els.sealScriptSelect.value;if(state.textKind==="seal")renderTextOptions();});
  els.generateTextBtn.addEventListener("click",renderTextOptions);
  els.regenerateBtn.addEventListener("click",()=>{if(state.mode==="text")renderTextOptions();else if(state.mode==="draw")renderDrawOptions();else renderUploadOptions();});
  els.nameInput.addEventListener("keydown",e=>{if(e.key==="Enter")renderTextOptions();});
  els.nameInput.addEventListener("input",()=>{if(state.mode==="text"&&state.textKind==="seal")renderTextOptions();});
  els.resultCards.forEach((card,index)=>card.addEventListener("click",()=>selectCard(index)));
  els.downloadBtn.addEventListener("click",downloadSelected);els.copyBtn.addEventListener("click",copySelected);els.resetBtn.addEventListener("click",resetAll);
  els.undoDrawBtn.addEventListener("click",undoDrawing);els.clearDrawBtn.addEventListener("click",()=>clearDrawing(true));els.applyDrawBtn.addEventListener("click",renderDrawOptions);
  els.uploadBox.addEventListener("click",()=>els.fileInput.click());els.changeFileBtn.addEventListener("click",()=>els.fileInput.click());els.fileInput.addEventListener("change",e=>loadFile(e.target.files[0]));
  ["dragenter","dragover"].forEach(type=>els.uploadBox.addEventListener(type,e=>{e.preventDefault();els.uploadBox.classList.add("dragover");}));
  ["dragleave","drop"].forEach(type=>els.uploadBox.addEventListener(type,e=>{e.preventDefault();els.uploadBox.classList.remove("dragover");}));
  els.uploadBox.addEventListener("drop",e=>loadFile(e.dataTransfer.files[0]));
  els.thresholdRange.addEventListener("input",()=>{els.thresholdOutput.value=`${els.thresholdRange.value}%`;});
  els.thresholdRange.addEventListener("change",renderUploadOptions);

  initDrawing();
  Promise.race([document.fonts?document.fonts.ready:Promise.resolve(),new Promise(resolve=>setTimeout(resolve,1800))]).then(renderTextOptions);
})();