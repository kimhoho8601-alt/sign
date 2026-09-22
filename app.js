(() => {
  const RED = "#c9002b";
  const INK = "#241b1d";
  const NAVY = "#25304a";
  const CANVAS_W = 1200;
  const CANVAS_H = 600;

  const state = {
    mode: "text",
    selectedIndex: 0,
    uploadImage: null,
    uploadName: "",
    generation: 0
  };

  const els = {
    tabs: [...document.querySelectorAll(".mode-tab")],
    textPanel: document.getElementById("textPanel"),
    uploadPanel: document.getElementById("uploadPanel"),
    nameInput: document.getElementById("nameInput"),
    generateTextBtn: document.getElementById("generateTextBtn"),
    regenerateBtn: document.getElementById("regenerateBtn"),
    resetBtn: document.getElementById("resetBtn"),
    resultCards: [...document.querySelectorAll(".sign-card")],
    canvases: [...document.querySelectorAll(".sign-card canvas")],
    selectedLabel: document.getElementById("selectedLabel"),
    downloadBtn: document.getElementById("downloadBtn"),
    copyBtn: document.getElementById("copyBtn"),
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

  const textLabels = ["인장형", "유려한 사인", "빠른 필기형"];
  const uploadLabels = ["원본 정리", "선명한 잉크", "레드 잉크"];

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => els.toast.classList.remove("show"), 1900);
  }

  function clearCanvas(canvas) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
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

  function fitFontSize(ctx, text, fontFamily, maxWidth, initial, min = 80, weight = 400) {
    let size = initial;
    while (size > min) {
      ctx.font = `${weight} ${size}px "${fontFamily}"`;
      if (ctx.measureText(text).width <= maxWidth) break;
      size -= 4;
    }
    return size;
  }

  function drawSeal(canvas, text) {
    clearCanvas(canvas);
    const ctx = canvas.getContext("2d");
    const safe = (text || "사인").trim().slice(0, 8);
    const size = 350;
    const x = (CANVAS_W - size) / 2;
    const y = (CANVAS_H - size) / 2;

    ctx.save();
    ctx.strokeStyle = RED;
    ctx.fillStyle = RED;
    ctx.lineWidth = 18;
    roundedRect(ctx, x, y, size, size, 54);
    ctx.stroke();

    ctx.lineWidth = 4;
    roundedRect(ctx, x + 28, y + 28, size - 56, size - 56, 34);
    ctx.stroke();

    const chars = [...safe];
    if (chars.length <= 4) {
      const cols = chars.length <= 2 ? 1 : 2;
      const rows = Math.ceil(chars.length / cols);
      const cellW = 210 / cols;
      const cellH = 210 / rows;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `700 ${Math.min(116, cellH * .78)}px "IBM Plex Sans KR"`;
      chars.forEach((char, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        ctx.fillText(char, CANVAS_W / 2 - 105 + cellW * (col + .5), CANVAS_H / 2 - 105 + cellH * (row + .5));
      });
    } else {
      const fontSize = fitFontSize(ctx, safe, "IBM Plex Sans KR", 250, 100, 54, 700);
      ctx.font = `700 ${fontSize}px "IBM Plex Sans KR"`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(safe, CANVAS_W / 2, CANVAS_H / 2);
    }
    ctx.restore();
  }

  function drawFlowSignature(canvas, text, variation = 0) {
    clearCanvas(canvas);
    const ctx = canvas.getContext("2d");
    const safe = (text || "Signature").trim().slice(0, 14);
    const angle = ((variation % 5) - 2) * 0.006;

    ctx.save();
    ctx.translate(CANVAS_W / 2, CANVAS_H / 2 + 8);
    ctx.rotate(angle);
    ctx.fillStyle = INK;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const fontSize = fitFontSize(ctx, safe, "Nanum Pen Script", 900, 270, 120, 400);
    ctx.font = `400 ${fontSize}px "Nanum Pen Script"`;
    ctx.fillText(safe, 0, -12);

    const width = Math.min(820, Math.max(340, ctx.measureText(safe).width * .9));
    ctx.strokeStyle = INK;
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-width * .45, 118);
    ctx.bezierCurveTo(-width * .16, 92 + variation * 2, width * .12, 145 - variation * 2, width * .48, 95);
    ctx.stroke();

    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(width * .29, 95);
    ctx.bezierCurveTo(width * .48, 64, width * .51, 54, width * .57, 60);
    ctx.stroke();
    ctx.restore();
  }

  function drawQuickSignature(canvas, text, variation = 0) {
    clearCanvas(canvas);
    const ctx = canvas.getContext("2d");
    const safe = (text || "Signature").trim().slice(0, 14);

    ctx.save();
    ctx.translate(CANVAS_W / 2, CANVAS_H / 2);
    ctx.rotate(-0.032 + (variation % 4) * .005);
    ctx.fillStyle = NAVY;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const fontFamily = variation % 2 ? "Single Day" : "Gaegu";
    const weight = fontFamily === "Gaegu" ? 700 : 400;
    const fontSize = fitFontSize(ctx, safe, fontFamily, 900, 245, 115, weight);
    ctx.font = `${weight} ${fontSize}px "${fontFamily}"`;
    ctx.fillText(safe, -18, -4);

    const m = ctx.measureText(safe);
    const width = Math.min(780, Math.max(310, m.width));
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 9;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(width * .26, 45);
    ctx.quadraticCurveTo(width * .42, 85, width * .52, 20);
    ctx.stroke();

    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-width * .50, 126);
    ctx.lineTo(width * .45, 108);
    ctx.stroke();
    ctx.restore();
  }

  function renderTextOptions() {
    const value = els.nameInput.value.trim();
    if (!value) {
      showToast("이름 또는 문구를 입력해 주세요.");
      els.nameInput.focus();
      return;
    }
    state.generation += 1;
    drawSeal(els.canvases[0], value);
    drawFlowSignature(els.canvases[1], value, state.generation);
    drawQuickSignature(els.canvases[2], value, state.generation);
    setModeLabels(textLabels);
    selectCard(state.selectedIndex);
  }

  function getContainRect(img, targetW, targetH, padding = 90) {
    const availableW = targetW - padding * 2;
    const availableH = targetH - padding * 2;
    const scale = Math.min(availableW / img.naturalWidth, availableH / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    return { x: (targetW - w) / 2, y: (targetH - h) / 2, w, h };
  }

  function createProcessedUpload(img, variant, thresholdPct) {
    const work = document.createElement("canvas");
    work.width = CANVAS_W;
    work.height = CANVAS_H;
    const ctx = work.getContext("2d", { willReadFrequently: true });
    const rect = getContainRect(img, CANVAS_W, CANVAS_H, 85);
    ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h);

    const frame = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
    const data = frame.data;
    const threshold = Math.round(255 * (thresholdPct / 100));
    const hardThreshold = Math.max(120, threshold - 35);

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      const min = Math.min(r, g, b);
      const max = Math.max(r, g, b);
      const chroma = max - min;

      let alpha = 0;
      if (variant === 1) {
        alpha = brightness < hardThreshold ? 255 : Math.max(0, Math.min(255, (threshold - brightness) * 8));
      } else {
        alpha = brightness < threshold ? Math.max(0, Math.min(255, (threshold - brightness) * 5.5 + chroma * 1.5)) : 0;
      }

      if (variant === 2) {
        data[i] = 201;
        data[i + 1] = 0;
        data[i + 2] = 43;
      } else if (variant === 1) {
        data[i] = 36;
        data[i + 1] = 27;
        data[i + 2] = 29;
      } else {
        const ink = Math.max(22, Math.min(85, brightness * .3));
        data[i] = ink;
        data[i + 1] = ink;
        data[i + 2] = ink;
      }
      data[i + 3] = alpha;
    }

    ctx.putImageData(frame, 0, 0);
    return work;
  }

  function renderUploadOptions() {
    if (!state.uploadImage) {
      showToast("먼저 자필 사인 이미지를 올려 주세요.");
      return;
    }
    const threshold = Number(els.thresholdRange.value);
    els.canvases.forEach((canvas, index) => {
      clearCanvas(canvas);
      const processed = createProcessedUpload(state.uploadImage, index, threshold);
      canvas.getContext("2d").drawImage(processed, 0, 0);
    });
    setModeLabels(uploadLabels);
    selectCard(state.selectedIndex);
  }

  function setModeLabels(labels) {
    els.resultCards.forEach((card, index) => {
      card.querySelector(".sign-meta strong").textContent = labels[index];
    });
    els.selectedLabel.textContent = labels[state.selectedIndex];
  }

  function selectCard(index) {
    state.selectedIndex = index;
    els.resultCards.forEach((card, i) => {
      const active = i === index;
      card.classList.toggle("selected", active);
      card.setAttribute("aria-pressed", String(active));
      card.querySelector(".sign-meta i").textContent = active ? "선택됨" : "선택";
    });
    const labels = state.mode === "upload" ? uploadLabels : textLabels;
    els.selectedLabel.textContent = labels[index];
  }

  function setMode(mode) {
    state.mode = mode;
    els.tabs.forEach(tab => {
      const active = tab.dataset.mode === mode;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    els.textPanel.hidden = mode !== "text";
    els.uploadPanel.hidden = mode !== "upload";
    els.textPanel.classList.toggle("active", mode === "text");
    els.uploadPanel.classList.toggle("active", mode === "upload");

    if (mode === "text") renderTextOptions();
    else if (state.uploadImage) renderUploadOptions();
    else {
      els.canvases.forEach(clearCanvas);
      setModeLabels(uploadLabels);
    }
  }

  function trimCanvas(source, padding = 46) {
    const ctx = source.getContext("2d", { willReadFrequently: true });
    const { width, height } = source;
    const pixels = ctx.getImageData(0, 0, width, height).data;
    let minX = width, minY = height, maxX = -1, maxY = -1;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const alpha = pixels[(y * width + x) * 4 + 3];
        if (alpha > 8) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < 0) return source;

    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(width - 1, maxX + padding);
    maxY = Math.min(height - 1, maxY + padding);

    const out = document.createElement("canvas");
    out.width = maxX - minX + 1;
    out.height = maxY - minY + 1;
    out.getContext("2d").drawImage(source, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
    return out;
  }

  function safeFileBase() {
    if (state.mode === "upload" && state.uploadName) {
      return state.uploadName.replace(/\.[^.]+$/, "").replace(/[^0-9a-zA-Z가-힣_-]+/g, "-").slice(0, 32) || "signature";
    }
    return els.nameInput.value.trim().replace(/[^0-9a-zA-Z가-힣_-]+/g, "-").slice(0, 32) || "signature";
  }

  function downloadSelected() {
    const selected = trimCanvas(els.canvases[state.selectedIndex]);
    const link = document.createElement("a");
    link.download = `${safeFileBase()}-sign-${state.selectedIndex + 1}.png`;
    link.href = selected.toDataURL("image/png");
    link.click();
    showToast("투명 PNG를 저장했습니다.");
  }

  async function copySelected() {
    if (!navigator.clipboard || !window.ClipboardItem) {
      showToast("이 브라우저는 이미지 복사를 지원하지 않습니다.");
      return;
    }
    try {
      const selected = trimCanvas(els.canvases[state.selectedIndex]);
      const blob = await new Promise(resolve => selected.toBlob(resolve, "image/png"));
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      showToast("투명 이미지를 클립보드에 복사했습니다.");
    } catch {
      showToast("이미지 복사가 제한되어 있습니다. PNG 저장을 이용해 주세요.");
    }
  }

  function loadFile(file) {
    if (!file || !file.type.startsWith("image/")) {
      showToast("PNG, JPG 또는 WEBP 이미지를 선택해 주세요.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      showToast("12MB 이하 이미지를 사용해 주세요.");
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        state.uploadImage = img;
        state.uploadName = file.name;
        els.uploadThumb.src = e.target.result;
        els.uploadFileName.textContent = file.name;
        els.uploadStatus.hidden = false;
        renderUploadOptions();
      };
      img.onerror = () => showToast("이미지를 읽을 수 없습니다.");
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function resetAll() {
    state.selectedIndex = 0;
    state.uploadImage = null;
    state.uploadName = "";
    state.generation = 0;
    els.nameInput.value = "김홍섭";
    els.fileInput.value = "";
    els.uploadStatus.hidden = true;
    els.thresholdRange.value = "88";
    els.thresholdOutput.value = "88%";
    setMode("text");
    selectCard(0);
    showToast("처음 상태로 되돌렸습니다.");
  }

  els.tabs.forEach(tab => tab.addEventListener("click", () => setMode(tab.dataset.mode)));
  els.generateTextBtn.addEventListener("click", renderTextOptions);
  els.regenerateBtn.addEventListener("click", () => state.mode === "text" ? renderTextOptions() : renderUploadOptions());
  els.nameInput.addEventListener("keydown", e => {
    if (e.key === "Enter") renderTextOptions();
  });
  els.resultCards.forEach((card, index) => card.addEventListener("click", () => selectCard(index)));
  els.downloadBtn.addEventListener("click", downloadSelected);
  els.copyBtn.addEventListener("click", copySelected);
  els.resetBtn.addEventListener("click", resetAll);

  els.uploadBox.addEventListener("click", () => els.fileInput.click());
  els.changeFileBtn.addEventListener("click", () => els.fileInput.click());
  els.fileInput.addEventListener("change", e => loadFile(e.target.files[0]));

  ["dragenter", "dragover"].forEach(type => {
    els.uploadBox.addEventListener(type, e => {
      e.preventDefault();
      els.uploadBox.classList.add("dragover");
    });
  });
  ["dragleave", "drop"].forEach(type => {
    els.uploadBox.addEventListener(type, e => {
      e.preventDefault();
      els.uploadBox.classList.remove("dragover");
    });
  });
  els.uploadBox.addEventListener("drop", e => loadFile(e.dataTransfer.files[0]));

  els.thresholdRange.addEventListener("input", () => {
    els.thresholdOutput.value = `${els.thresholdRange.value}%`;
  });
  els.thresholdRange.addEventListener("change", renderUploadOptions);

  Promise.race([
    document.fonts ? document.fonts.ready : Promise.resolve(),
    new Promise(resolve => setTimeout(resolve, 1800))
  ]).then(renderTextOptions);
})();