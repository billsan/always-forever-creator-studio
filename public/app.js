(() => {
  "use strict";
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const apiHeaders = {};
  const designs = {
    memorial: [
      { id: "gentle-light", name: "Gentle Light", background: "linear-gradient(135deg,#18241f,#71877a)", transition: "fade" },
      { id: "garden-memory", name: "Garden Memory", background: "linear-gradient(135deg,#30443a,#c0a66c)", transition: "dissolve" }
    ],
    wedding: [
      { id: "ivory-promise", name: "Ivory Promise", background: "linear-gradient(135deg,#fffaf0,#d8c4af)", transition: "fade" },
      { id: "sage-romance", name: "Sage Romance", background: "linear-gradient(135deg,#496257,#d6c28e)", transition: "dissolve" }
    ],
    birthday: [{ id: "bright-years", name: "Bright Years", background: "linear-gradient(135deg,#718d80,#d7ad67)", transition: "slide" }],
    anniversary: [{ id: "golden-story", name: "Golden Story", background: "linear-gradient(135deg,#3f5148,#b89557)", transition: "fade" }],
    celebration: [{ id: "life-in-color", name: "Life in Color", background: "linear-gradient(135deg,#547165,#d79f71)", transition: "slide" }]
  };
  const effectPacks = [
    { id: "gentle-light", name: "Gentle Light", mood: "Light rays and floating dust", category: "Memorial" },
    { id: "garden-legacy", name: "Garden Legacy", mood: "Drifting leaves and warm light", category: "Memorial" },
    { id: "faithful-journey", name: "Faithful Journey", mood: "Heavenly glow and golden motes", category: "Memorial" },
    { id: "ivory-promise", name: "Ivory Promise", mood: "Pearl shimmer and champagne light", category: "Wedding" },
    { id: "garden-romance", name: "Garden Romance", mood: "Soft petals and garden bokeh", category: "Wedding" },
    { id: "golden-vows", name: "Golden Vows", mood: "Candle glow and gold sparkle", category: "Wedding" },
    { id: "bright-years", name: "Bright Years", mood: "Colorful floating confetti", category: "Birthday" },
    { id: "milestone-celebration", name: "Milestone Celebration", mood: "Jewel-tone stars and gold", category: "Birthday" },
    { id: "our-golden-story", name: "Our Golden Story", mood: "Warm film dust and nostalgia", category: "Anniversary" },
    { id: "then-and-now", name: "Then and Now", mood: "Vintage frame and light leak", category: "Anniversary" },
    { id: "life-in-color", name: "Life in Color", mood: "Lively multicolor bokeh", category: "General" },
    { id: "elegant-celebration", name: "Elegant Celebration", mood: "Refined golden flecks", category: "General" },
    { id: "soft-snow", name: "Soft Snow", mood: "Quiet snowfall and winter glow", category: "Seasonal" },
    { id: "rose-petals", name: "Rose Petals", mood: "Romantic red and blush petals", category: "Wedding" },
    { id: "autumn-leaves", name: "Autumn Leaves", mood: "Warm leaves drifting downward", category: "Nature" },
    { id: "butterfly-garden", name: "Butterfly Garden", mood: "Delicate butterflies in soft light", category: "Nature" },
    { id: "floating-hearts", name: "Floating Hearts", mood: "Small glowing hearts rising", category: "Wedding" },
    { id: "champagne-bubbles", name: "Champagne Bubbles", mood: "Celebratory bubbles and shimmer", category: "General" },
    { id: "firefly-evening", name: "Firefly Evening", mood: "Golden fireflies in twilight", category: "Nature" },
    { id: "starry-night", name: "Starry Night", mood: "Twinkling stars and deep-blue glow", category: "General" },
    { id: "heavenly-clouds", name: "Heavenly Clouds", mood: "Slow luminous clouds", category: "Faith" },
    { id: "sunbeam-bloom", name: "Sunbeam Bloom", mood: "Warm sunrise beams and bloom", category: "Faith" },
    { id: "quiet-candle", name: "Quiet Candle", mood: "Gentle candlelit flicker", category: "Memorial" },
    { id: "dove-flight", name: "Dove Flight", mood: "Soft white shapes gliding upward", category: "Faith" },
    { id: "silver-sparkle", name: "Silver Sparkle", mood: "Cool silver glints and stars", category: "Anniversary" },
    { id: "gold-dust", name: "Gold Dust", mood: "Fine drifting golden dust", category: "General" },
    { id: "confetti-rain", name: "Confetti Rain", mood: "High-energy falling confetti", category: "Birthday" },
    { id: "balloon-drift", name: "Balloon Drift", mood: "Colorful balloons floating upward", category: "Birthday" },
    { id: "fireworks-glow", name: "Fireworks Glow", mood: "Radiant celebration bursts", category: "General" },
    { id: "disco-bokeh", name: "Disco Bokeh", mood: "Bright party lights and motion", category: "Birthday" },
    { id: "vintage-film", name: "Vintage Film", mood: "Grain, scratches, and warm flicker", category: "Vintage" },
    { id: "sepia-light-leak", name: "Sepia Light Leak", mood: "Warm sepia wash and film flare", category: "Vintage" },
    { id: "polaroid-frame", name: "Polaroid Frame", mood: "Classic instant-photo border", category: "Vintage" },
    { id: "watercolor-wash", name: "Watercolor Wash", mood: "Soft color washes at the edges", category: "General" },
    { id: "floral-corners", name: "Floral Corners", mood: "Subtle botanical corner accents", category: "Wedding" },
    { id: "elegant-lace", name: "Elegant Lace", mood: "Fine ivory lace framing", category: "Wedding" }
  ];
  const motionBackgrounds = [
    { id: "heavenly-clouds", name: "Heavenly Clouds", category: "Memorial" }
  ];

  let project = null;
  let templates = [];
  let templateCategory = "all";
  let effectCategory = "all";
  let motionCategoryFilter = "all";
  let selectedId = null;
  let filter = "all";
  let timelineZoom = 100;
  let saveTimer = null;
  let noticeTimer = null;
  let playbackTimer = null;
  let previewAudioNodes = [];
  let audioPreviewErrorShown = false;
  let playbackStarted = 0;
  let history = [];
  let future = [];
  let draggedId = null;
  let renderPollTimer = null;

  const uid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const formatTime = (seconds) => `${Math.floor(Number(seconds || 0) / 60)}:${String(Math.floor(Number(seconds || 0) % 60)).padStart(2, "0")}`;
  const assetById = (id) => project?.assets.find((asset) => asset.id === id);
  const itemById = (id) => project?.timeline.find((item) => item.id === id);
  const isOverlayText = (item) => item?.type === "text" && Boolean(item.overlay || ["caption", "quote", "details", "heading"].includes(item.role));
  const visualItems = () => project.timeline.filter((item) => item.type === "visual" || item.type === "placeholder" || item.type === "collage" || (item.type === "text" && !isOverlayText(item)));
  const captionItems = () => project.timeline.filter(isOverlayText);
  const totalDuration = () => visualItems().reduce((sum, item) => sum + Number(item.duration || 0), 0);
  const previewDuration = () => Math.max(
    totalDuration(),
    ...captionItems().map((item) => Number(item.start || 0) + Number(item.duration || 0)),
    ...project.timeline.filter((item) => item.type === "audio").map((item) => Number(item.start || 0) + Number(item.duration || 0))
  );
  const sceneStartTime = (target) => {
    let elapsed = 0;
    for (const item of visualItems()) {
      if (item.id === target?.id) return elapsed;
      elapsed += Number(item.duration || 0);
    }
    return 0;
  };
  const overlaysAtTime = (elapsed) => captionItems().filter((item) => elapsed >= Number(item.start || 0) && elapsed < Number(item.start || 0) + Number(item.duration || 0));

  async function request(path, options = {}) {
    options.headers = { ...apiHeaders, ...(options.headers || {}) };
    const response = await fetch(path, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "The request could not be completed.");
    return data;
  }

  function notify(text, type = "") {
    const box = $("#notice");
    box.textContent = text;
    box.className = `notice show ${type}`;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => box.className = "notice", 3500);
  }

  function snapshot() {
    if (!project) return;
    history.push(JSON.stringify({ timeline: project.timeline, canvas: project.canvas, settings: project.settings, effects: project.effects, occasion: project.occasion }));
    if (history.length > 50) history.shift();
    future = [];
  }

  function restore(serialized, destination) {
    if (!serialized) return;
    destination.push(JSON.stringify({ timeline: project.timeline, canvas: project.canvas, settings: project.settings, effects: project.effects, occasion: project.occasion }));
    const state = JSON.parse(serialized);
    Object.assign(project, state);
    selectedId = null;
    renderAll();
    scheduleSave();
  }

  function scheduleSave() {
    if (!project) return;
    clearTimeout(saveTimer);
    $("#save-state").textContent = "Saving…";
    $(".save-dot").classList.add("saving");
    saveTimer = setTimeout(saveProject, 650);
  }

  async function saveProject() {
    if (!project) return;
    try {
      const body = { title: project.title, occasion: project.occasion, aspectRatio: project.aspectRatio, resolution: project.resolution, duration: totalDuration(), canvas: project.canvas, timeline: project.timeline, settings: project.settings, effects: project.effects, obituary: project.obituary, render: project.render };
      const data = await request(`/api/projects/${project.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      project.updatedAt = data.project.updatedAt;
      $("#save-state").textContent = "Saved";
      $(".save-dot").classList.remove("saving");
    } catch (error) {
      $("#save-state").textContent = "Not saved";
      notify(error.message, "error");
    }
  }

  async function initialize() {
    try {
      const [projectData, templateData] = await Promise.all([request("/api/projects"), request("/api/templates")]);
      templates = templateData.templates || [];
      renderTemplates();
      if (!projectData.projects.length) return $("#welcome-dialog").showModal();
      project = projectData.projects[0];  
      normalizeProject();
      renderAll();
      pollRenderStatus();
    } catch (error) {
      notify(error.message, "error");
      if (/Always & Forever account/i.test(error.message)) $("#access-dialog")?.showModal();
    }
  }

  function normalizeProject() {
    project.assets ||= [];
    project.timeline ||= [];
    project.obituary ||= { details: {}, tone: "Warm & Personal", length: "Standard", obituary: "", videoScript: "" };
    if (project.share?.enabled && project.share.token) {
      project.share.shareUrl = `${location.origin}/share/${project.share.token}`;
      project.share.qrUrl = `${project.share.shareUrl}/qr.svg`;
    }
    project.timeline.forEach((item) => {
      if (item.type !== "text") return;
      if (!item.role) {
        if (item.text === "A Life Remembered") item.role = "title";
        else if (item.text === "Love leaves a memory no one can steal") item.role = "quote";
        else item.role = "caption";
      }
      if (["caption", "quote", "details", "heading"].includes(item.role)) item.overlay = true;
      if (item.overlay) {
        item.position ||= item.role === "caption" ? "bottom-center" : item.role === "details" ? "bottom-left" : item.role === "heading" ? "top-center" : "center";
        item.fontSize ||= item.role === "details" || item.role === "caption" ? 32 : 42;
        item.color ||= "#ffffff";
        item.x ??= 50;
        item.y ??= 50;
      }
    });
    project.timeline = [...project.timeline.filter((item) => item.type === "text" && item.role === "title"), ...project.timeline.filter((item) => !(item.type === "text" && item.role === "title"))];
    const legacyEffect = project.effects?.pack && project.effects.pack !== "none" ? { ...project.effects } : null;
    visualItems().forEach((item) => {
      item.effect ||= { pack: "none", intensity: "none" };
      item.motionBackground ||= { type: "none" };
      if (item.motionBackground.type === "preset" && item.motionBackground.id !== "heavenly-clouds") item.motionBackground = { type: "none" };
      item.frameStyle ||= "none";
      item.cinematicAction ||= "none";
      if (item.type === "collage") item.slots ||= Array.from({ length: Number(item.layout || 2) }, () => null);
    });
    if (legacyEffect && visualItems()[0]?.effect?.pack === "none") visualItems()[0].effect = legacyEffect;
    project.canvas ||= { background: "#18221e" };
    project.settings ||= { transition: "fade", photoDuration: 5, musicVolume: 0.32 };
    project.settings.motionCategories ||= {};
    project.effects = { pack: "none", intensity: "none" };
    project.occasion ||= "memorial";
    project.aspectRatio ||= "16:9";
    $("#project-title").value = project.title;
    $("#aspect").value = project.aspectRatio;
    $("#occasion").value = project.occasion;
    $("#effect-intensity").value = "subtle";
    $("#background-color").value = /^#[0-9a-f]{6}$/i.test(project.canvas.background) ? project.canvas.background : "#18221e";
  }

  const obituaryInputs = {
    name: "obit-name", nickname: "obit-nickname", birthDate: "obit-birth-date", passingDate: "obit-passing-date", hometown: "obit-hometown",
    survivingFamily: "obit-surviving-family", precededInDeath: "obit-preceded", educationCareer: "obit-career", militaryService: "obit-military",
    hobbiesPassions: "obit-hobbies", churchCommunity: "obit-community", personalityTraits: "obit-personality", favoriteMemories: "obit-favorite-memories",
    serviceDetails: "obit-service", closingMessage: "obit-closing", memories: "obit-memories"
  };

  function obituaryPayload() {
    return { details: Object.fromEntries(Object.entries(obituaryInputs).map(([key, id]) => [key, $("#" + id).value.trim()])), tone: $("#obit-tone").value, length: $("#obit-length").value, obituary: $("#generated-obituary").value.trim(), videoScript: $("#video-script").value.trim(), share: { ...(project.obituary?.share || {}), livestreamUrl: $("#obit-livestream-url").value.trim() } };
  }

  function renderObituary() {
    const saved = project.obituary || {};
    for (const [key, id] of Object.entries(obituaryInputs)) $("#" + id).value = saved.details?.[key] || "";
    $("#obit-tone").value = saved.tone || "Warm & Personal";
    $("#obit-length").value = saved.length || "Standard";
    $("#generated-obituary").value = saved.obituary || "";
    $("#video-script").value = saved.videoScript || "";
    $("#obit-livestream-url").value = saved.share?.livestreamUrl || "";
    $("#obituary-result").hidden = !saved.obituary;
    $("#video-script-wrap").hidden = !saved.videoScript;
    renderMemorialShare(saved.share);
  }

  function memorialShareUrls(share = project.obituary?.share || {}) {
    if (!share?.enabled || !share.token) return null;
    const base = `${location.origin}/memorial/${share.token}`;
    return { memorialUrl: base, qrUrl: `${base}/qr.svg` };
  }

  function renderMemorialShare(share = project.obituary?.share || {}, urls = null) {
    const resolved = urls || memorialShareUrls(share);
    const card = $("#memorial-qr-card");
    card.hidden = !resolved;
    if (!resolved) return;
    $("#memorial-qr-image").src = resolved.qrUrl;
    $("#view-memorial").href = resolved.memorialUrl;
    $("#download-memorial-qr").href = resolved.qrUrl;
    $("#memorial-link").textContent = resolved.memorialUrl;
  }

  async function ensureMemorialShare() {
    const data = await request(`/api/projects/${project.id}/obituary/share`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: true, livestreamUrl: $("#obit-livestream-url").value.trim() }) });
    project.obituary ||= obituaryPayload();
    project.obituary.share = { enabled: true, token: data.token, livestreamUrl: data.livestreamUrl || $("#obit-livestream-url").value.trim(), updatedAt: new Date().toISOString() };
    renderMemorialShare(project.obituary.share, data);
    return data;
  }

  async function copyMemorialLink() {
    const urls = memorialShareUrls();
    if (!urls) return;
    await navigator.clipboard.writeText(urls.memorialUrl);
    notify("Memorial link copied.");
  }

  function memorialSocialText() {
    const name = project.obituary?.details?.name || project.title || "a loved one";
    return `In loving memory of ${name}. View and share this memorial.`;
  }

  function openMemorialSocial(url) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function memorialQrSocialFile() {
    const urls = memorialShareUrls();
    if (!urls) throw new Error("Create the memorial first.");
    const svgBlob = await fetch(urls.qrUrl).then((response) => { if (!response.ok) throw new Error("QR image could not be loaded."); return response.blob(); });
    const objectUrl = URL.createObjectURL(svgBlob);
    try {
      const image = new Image();
      await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = objectUrl; });
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1080;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#0d1512"; ctx.fillRect(0, 0, 1080, 1080);
      ctx.fillStyle = "#c7a45f"; ctx.textAlign = "center"; ctx.font = "700 30px system-ui"; ctx.fillText("ALWAYS & FOREVER", 540, 105);
      ctx.fillStyle = "#fff8e8"; ctx.font = "52px Georgia"; ctx.fillText((project.obituary?.details?.name || "In Loving Memory").slice(0, 36), 540, 185);
      ctx.fillStyle = "#ffffff"; ctx.fillRect(165, 235, 750, 750); ctx.drawImage(image, 210, 280, 660, 660);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Could not create the social QR image.");
      return new File([blob], "always-forever-memorial-qr.png", { type: "image/png" });
    } finally { URL.revokeObjectURL(objectUrl); }
  }

  async function shareMemorialMore() {
    const urls = memorialShareUrls();
    if (!urls) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Always & Forever Memorial", text: memorialSocialText(), url: urls.memorialUrl });
        return;
      }
      await navigator.clipboard.writeText(urls.memorialUrl);
      notify("Memorial link copied. Open it on your phone to continue sharing.");
    } catch (error) {
      if (error?.name !== "AbortError") notify("Use Copy Memorial Link to share this memorial.", "error");
    }
  }

  async function shareMemorialQrImage() {
    try {
      const file = await memorialQrSocialFile();
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: "Always & Forever Memorial", text: memorialSocialText(), files: [file] });
        return;
      }
      const href = URL.createObjectURL(file);
      const link = document.createElement("a"); link.href = href; link.download = file.name; link.click();
      setTimeout(() => URL.revokeObjectURL(href), 1500);
      notify("QR social image downloaded. Upload it to your social media app.");
    } catch (error) { notify(error.message || "Unable to share the QR image.", "error"); }
  }

  function shareMemorialTo(service) {
    const urls = memorialShareUrls();
    if (!urls) return;
    const text = memorialSocialText();
    if (service === "facebook") return openMemorialSocial(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(urls.memorialUrl)}`);
    if (service === "x") return openMemorialSocial(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(urls.memorialUrl)}`);
    if (service === "whatsapp") return openMemorialSocial(`https://wa.me/?text=${encodeURIComponent(`${text} ${urls.memorialUrl}`)}`);
    if (service === "email") location.href = `mailto:?subject=${encodeURIComponent("Always & Forever Memorial")}&body=${encodeURIComponent(`${text}\n\n${urls.memorialUrl}`)}`;
  }

  function printMemorialQr() {
    const urls = memorialShareUrls();
    if (!urls) return;
    const name = project.obituary?.details?.name || project.title || "Memorial";
    const popup = window.open("", "_blank", "noopener,noreferrer,width=720,height=820");
    if (!popup) return notify("Allow pop-ups to print the QR code.", "error");
    popup.document.write(`<!doctype html><html><head><title>${name} Memorial QR</title><style>body{font-family:system-ui;text-align:center;padding:48px;color:#23372e}h1{font-family:Georgia,serif;margin-bottom:8px}p{color:#6f6757}img{width:360px;height:360px;margin:24px}small{display:block;margin-top:14px}</style></head><body><h1>${name}</h1><p>Scan to view the Always & Forever memorial</p><img src="${urls.qrUrl}" onload="window.print()"><small>${urls.memorialUrl}</small></body></html>`);
    popup.document.close();
  }

  async function generateObituary() {
    const button = $("#generate-obituary");
    button.disabled = true; button.textContent = "Writing with care…";
    try {
      const payload = obituaryPayload();
      const data = await request(`/api/projects/${project.id}/obituary/generate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload.details, tone: payload.tone, length: payload.length, videoScript: payload.videoScript }) });
      project.obituary = { ...payload, obituary: data.obituary };
      $("#generated-obituary").value = data.obituary;
      $("#obituary-result").hidden = false;
      const share = await ensureMemorialShare();
      notify(share?.memorialUrl ? "Obituary created, saved, and memorial QR code generated." : "Obituary created and saved to this memorial.");
    } finally { button.disabled = false; button.textContent = "Generate obituary"; }
  }

  async function saveObituary() {
    project.obituary = obituaryPayload();
    await saveProject();
    await ensureMemorialShare();
    notify("Obituary saved and memorial QR code updated.");
  }

  async function createVideoScript() {
    const button = $("#create-video-script");
    button.disabled = true; button.textContent = "Creating narration…";
    try {
      const payload = obituaryPayload();
      const data = await request(`/api/projects/${project.id}/obituary/video-script`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      project.obituary = { ...payload, videoScript: data.videoScript };
      $("#video-script").value = data.videoScript;
      $("#video-script-wrap").hidden = false;
      notify("Memorial video narration is ready for the Shotstack workflow.");
    } finally { button.disabled = false; button.textContent = "Create Memorial Video Script"; }
  }

  async function createProject() {
    const title = $("#new-project-name").value.trim() || "My Story";
    const data = await request("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) });
    project = data.project;
    normalizeProject();
    renderAll();
  }

  async function uploadFiles(files) {
    if (!files.length || !project) return;
    for (const file of files) {
      try {
        notify(`Uploading ${file.name}…`);
        const data = await request(`/api/projects/${project.id}/assets`, { method: "POST", headers: { "Content-Type": file.type || "application/octet-stream", "X-File-Name": encodeURIComponent(file.name) }, body: file });
        project.assets.push(data.asset);
        renderAssets();
        renderMotionLibrary();
      } catch (error) { notify(`${file.name}: ${error.message}`, "error"); }
    }
    notify("Your media is ready.");
  }

  function assetMarkup(asset) {
    if (asset.kind === "photo") return `<img src="${escapeHtml(asset.url)}" alt="">`;
    if (asset.kind === "video") return `<video src="${escapeHtml(asset.url)}" muted preload="metadata"></video>`;
    return `<span>♫</span>`;
  }

  function renderAssets() {
    if (!project) return;
    const assets = project.assets.filter((asset) => filter === "all" || asset.kind === filter);
    $("#asset-list").innerHTML = assets.map((asset) => `<article class="asset-card ${asset.kind}" data-asset-id="${asset.id}">${assetMarkup(asset)}<footer><span title="${escapeHtml(asset.filename)}">${escapeHtml(asset.filename)}</span><span class="asset-actions"><button data-add-asset="${asset.id}" title="Add to timeline">＋</button><button class="asset-delete" data-delete-asset="${asset.id}" title="Delete from Media" aria-label="Delete ${escapeHtml(asset.filename)}">×</button></span></footer></article>`).join("") || '<p class="empty-list">Upload photos, video clips, music, or voice recordings to begin.</p>';
  }

  async function deleteMediaAsset(assetId) {
    const asset = assetById(assetId);
    if (!asset || !confirm(`Permanently delete “${asset.filename}” from this project?`)) return;
    try {
      await request(`/api/projects/${project.id}/assets/${assetId}`, { method: "DELETE" });
      project.assets = project.assets.filter((item) => item.id !== assetId);
      delete project.settings.motionCategories[assetId];
      renderAssets();
      renderMotionLibrary();
      notify("Media item deleted.");
    } catch (error) { notify(error.message, "error"); }
  }

  function photoPrepTarget() {
    const selected = itemById(selectedId);
    const visual = isOverlayText(selected) ? effectTarget() : selected;
    const asset = visual?.type === "visual" ? assetById(visual.assetId) : null;
    return asset?.kind === "photo" ? { item: visual, asset } : null;
  }

  function renderPhotoPrep() {
    const target = photoPrepTarget();
    $("#prep-empty").hidden = Boolean(target);
    $("#prep-workspace").hidden = !target;
    if (!target) { $("#prep-preview").replaceChildren(); return; }
    const image = document.createElement("img");
    image.src = target.asset.url;
    image.alt = target.asset.filename || "Selected photo";
    $("#prep-preview").replaceChildren(image);
  }

  function releaseOutput(format = "master") {
    return project.render?.outputs?.[format] || (format === "master" ? project.render?.outputUrl : "") || "";
  }

  function renderReleaseCenter() {
    const paid = project.entitlement?.paid === true;
    const finished = project.render?.status === "complete";
    const unlocked = paid && finished && Boolean(releaseOutput("master"));
    const status = $("#release-status");
    status.classList.toggle("ready", unlocked);
    status.textContent = unlocked ? "Paid final video ready to download and share." : !paid ? "Locked until payment is verified." : !finished ? "Payment verified. Waiting for the final render." : "Final output is not available yet.";
    $("#release-caption").value = project.settings.releaseCaption || "";
    $$('[data-release-format]').forEach((button) => button.disabled = !unlocked || !releaseOutput(button.dataset.releaseFormat));
    $("#native-share").disabled = !unlocked;
    $("#native-share").textContent = project.share?.shareUrl ? "Share from this device" : "Create share page";
    const shareResult = $("#share-result");
    shareResult.hidden = !project.share?.shareUrl;
    if (project.share?.shareUrl) { $("#share-link").href = project.share.shareUrl; $("#share-qr").src = project.share.qrUrl; }
  }

  function downloadRelease(format) {
    const url = releaseOutput(format);
    if (!project.entitlement?.paid || project.render?.status !== "complete" || !url) return notify("This download unlocks after payment and final rendering.", "error");
    const link = document.createElement("a");
    link.href = url;
    link.download = `${project.title || "video"}-${format}.mp4`;
    link.rel = "noopener";
    link.click();
  }

  async function shareRelease() {
    const url = releaseOutput("master");
    if (!project.entitlement?.paid || project.render?.status !== "complete" || !url) return notify("Sharing unlocks after payment and final rendering.", "error");
    if (!project.share?.shareUrl) {
      const data = await request(`/api/projects/${project.id}/share`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ enabled: true }) });
      project.share = data;
      renderReleaseCenter();
      notify("Share page and QR code created.");
      return;
    }
    const shareData = { title: project.title, text: project.settings.releaseCaption || `Watch ${project.title}`, url: project.share.shareUrl };
    if (navigator.share) {
      try { await navigator.share(shareData); }
      catch (error) { if (error.name !== "AbortError") notify("This device could not open its sharing menu.", "error"); }
    } else {
      await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
      notify("Caption and video link copied.");
    }
  }

  async function removeSelectedPhotoBackground() {
    const target = photoPrepTarget();
    if (!target) return notify("Select a photo slide first.", "error");
    if (!$("#prep-consent").checked) return notify("Please approve external background-removal processing first.", "error");
    const button = $("#remove-photo-background");
    button.disabled = true;
    button.textContent = "Removing background…";
    try {
      const data = await request(`/api/projects/${project.id}/assets/${target.asset.id}/remove-background`, { method: "POST" });
      snapshot();
      project.assets.push(data.asset);
      target.item.assetId = data.asset.id;
      target.item.photoRestore = { mode: "none", strength: .65, brightness: 1 };
      renderAll();
      scheduleSave();
      notify("Transparent cutout created. The original photo is still in Media.");
    } catch (error) { notify(error.message, "error"); }
    finally {
      button.disabled = false;
      button.textContent = "Remove background";
    }
  }

  function renderDesigns() {
    const list = designs[project.occasion] || designs.celebration;
    $("#design-list").innerHTML = list.map((design) => `<article class="design-card"><div class="design-preview" style="background:${design.background}">A<span>&amp;</span>F</div><div><strong>${escapeHtml(design.name)}</strong><button data-design="${design.id}">Apply</button></div></article>`).join("");
  }

  function renderTemplates() {
    const list = templates.filter((template) => templateCategory === "all" || template.category === templateCategory);
    $("#template-list").innerHTML = list.map((template) => `
      <article class="template-card">
        <div class="template-art${template.darkText ? " dark-text" : ""}" style="background:${template.background}"><span class="template-monogram">${escapeHtml(template.name)}</span></div>
        <div class="template-card-body">
          <div class="template-card-head"><h3>${escapeHtml(template.name)}</h3><span class="template-category">${escapeHtml(template.category)}</span></div>
          <p>${escapeHtml(template.summary)}</p>
          <div class="template-meta"><span>${template.sceneCount} scenes · ${template.aspectRatios.join(" · ")}</span><span class="template-swatches">${template.colors.map((color) => `<i style="background:${color}"></i>`).join("")}</span></div>
          <button class="template-use" data-template-id="${template.id}">Use this template</button>
        </div>
      </article>`).join("") || '<p class="empty-list">No templates found for this occasion.</p>';
  }

  async function applyTemplate(templateId) {
    if (!project) return;
    if (project.timeline.length && !confirm("Replace the current timeline with this template? Your uploaded media will remain in the Media panel.")) return;
    const data = await request(`/api/projects/${project.id}/template`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templateId }) });
    project = data.project;
    selectedId = null;
    normalizeProject();
    renderAll();
    notify(`${templates.find((item) => item.id === templateId)?.name || "Template"} applied. Select a photo slot, then add a photo.`);
  }

  function timelineItemMarkup(item) {
    const width = Math.max(58, Number(item.duration || 1) * (timelineZoom / 5));
    const selected = item.id === selectedId ? " selected" : "";
    const effectClass = item.effect?.pack && item.effect.pack !== "none" ? " has-effect" : "";
    if (item.type === "text") {
      const timed = isOverlayText(item);
      const placement = timed ? `left:${Math.max(0, Number(item.start || 0)) * (timelineZoom / 5)}px;` : "";
      return `<article draggable="true" class="timeline-item text${timed ? " caption-overlay" : ""}${effectClass}${selected}" data-item-id="${item.id}"${timed ? ' data-timed="true"' : ""} style="width:${width}px;${placement}">${escapeHtml(item.text || "Text")}<small>${formatTime(item.duration)}</small></article>`;
    }
    if (item.type === "placeholder") return `<article draggable="true" class="timeline-item placeholder${effectClass}${selected}" data-item-id="${item.id}" style="width:${width}px">${escapeHtml(item.label || "Add photo")}<small>${formatTime(item.duration)}</small></article>`;
    if (item.type === "collage") {
      const cells = (item.slots || []).map((assetId) => assetById(assetId) ? assetMarkup(assetById(assetId)) : '<i class="empty-mini"></i>').join("");
      return `<article draggable="true" class="timeline-item collage${effectClass}${selected}" data-item-id="${item.id}" style="width:${width}px">${cells}<small>${formatTime(item.duration)}</small></article>`;
    }
    const asset = assetById(item.assetId);
    if (!asset) return "";
    if (item.type === "audio") return `<article draggable="true" class="timeline-item audio${selected}" data-item-id="${item.id}" style="width:${width}px;margin-left:${Math.max(0, Number(item.start || 0)) * (timelineZoom / 5)}px"><span>♫</span>${escapeHtml(asset.filename)}<small>${formatTime(item.duration)}</small></article>`;
    return `<article draggable="true" class="timeline-item${effectClass}${selected}" data-item-id="${item.id}" style="width:${width}px">${assetMarkup(asset)}<small>${formatTime(item.duration)}</small></article>`;
  }

  function renderTimeline() {
    const visuals = project.timeline.filter((item) => item.type === "visual" || item.type === "placeholder" || item.type === "collage");
    const texts = project.timeline.filter((item) => item.type === "text");
    const audios = project.timeline.filter((item) => item.type === "audio");
    $("#visual-track").innerHTML = visuals.map(timelineItemMarkup).join("");
    $("#text-track").innerHTML = texts.map(timelineItemMarkup).join("");
    $("#audio-track").innerHTML = audios.map(timelineItemMarkup).join("");
    const duration = previewDuration();
    $("#timeline-summary").textContent = `${visuals.length + texts.length} scenes · ${formatTime(duration)}`;
    $("#total-time").textContent = formatTime(duration);
    $("#scrubber").max = Math.max(1, duration * 10);
  }

  function renderInspector() {
    renderPhotoPrep();
    const item = itemById(selectedId);
    $("#inspector-empty").hidden = Boolean(item);
    $("#inspector-form").hidden = !item;
    if (!item) return;
    const asset = assetById(item.assetId);
    $("#item-name").value = item.type === "text" ? item.text || "Text" : item.type === "placeholder" ? item.label || "Add photo" : item.type === "collage" ? item.label || `${item.layout || 2}-photo slide` : asset?.filename || "Timeline item";
    $("#item-duration").value = item.duration || 5;
    $("#item-start").value = item.start || 0;
    $("#item-fit").value = item.fit || "contain";
    $("#item-transition").value = item.transition || "fade";
    $("#item-caption").value = item.caption || "";
    $("#item-volume").value = item.volume ?? .32;
    $("#item-position").value = item.position || "bottom-center";
    $("#item-font-size").value = String(item.fontSize || 32);
    $("#item-text-color").value = /^#[0-9a-f]{6}$/i.test(item.color || "") ? item.color : "#ffffff";
    $("#item-photo-restore").value = item.photoRestore?.mode || "none";
    $("#item-photo-strength").value = String(item.photoRestore?.strength ?? .65);
    $("#item-photo-brightness").value = String(item.photoRestore?.brightness ?? 1);
    $("#item-frame-style").value = item.frameStyle || "none";
    $("#item-cinematic-action").value = item.cinematicAction || "none";
    $$(".visual-only").forEach((element) => element.hidden = item.type === "audio" || item.type === "text");
    $$(".audio-only").forEach((element) => element.hidden = item.type !== "audio");
    $$(".text-overlay-only").forEach((element) => element.hidden = !isOverlayText(item));
    $$(".attached-caption-field").forEach((element) => element.hidden = item.type === "text");
    $$(".photo-only").forEach((element) => element.hidden = !(item.type === "visual" && asset?.kind === "photo"));
    $$(".slide-style-only").forEach((element) => element.hidden = !["visual", "collage"].includes(item.type));
    $$(".collage-only").forEach((element) => element.hidden = item.type !== "collage");
    $(".visual-sort-controls").hidden = !visualItems().includes(item);
  }

  function renderMotionBackground(item = null) {
    const layer = $("#motion-layer");
    const motion = item?.motionBackground || { type: "none" };
    layer.className = "motion-layer";
    layer.replaceChildren();
    layer.style.filter = "";
    layer.style.setProperty("--motion-darken", String(motion.darken ?? .2));
    if (motion.type === "none") return;
    layer.style.filter = `blur(${Math.max(0, Number(motion.blur || 0))}px)`;
    if (motion.type === "asset") {
      const asset = assetById(motion.assetId);
      if (!asset || asset.kind !== "video") return;
      const video = document.createElement("video");
      video.src = asset.url;
      video.autoplay = true;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "auto";
      layer.append(video);
      video.play().catch(() => {});
    } else {
      layer.classList.add(`motion-${motion.id}`);
      Array.from({ length: 7 }, (_, index) => index).forEach((index) => {
        const part = document.createElement("i");
        part.className = "motion-scene-part";
        part.style.setProperty("--i", String(index));
        part.style.setProperty("--delay", `${-index * 1.4}s`);
        layer.append(part);
      });
    }
    const shade = document.createElement("span");
    shade.className = "motion-shade";
    layer.append(shade);
  }

  function renderMotionLibrary() {
    const target = effectTarget();
    const active = target?.motionBackground || { type: "none" };
    $("#motion-list").innerHTML = motionBackgrounds.map((motion) => `<article class="motion-option${active.type === "preset" && active.id === motion.id ? " active" : ""}"><div class="motion-thumb motion-${motion.id}"><i></i><i></i><i></i></div><div><small>${motion.category}</small><strong>${motion.name}</strong><button data-motion-preset="${motion.id}">${active.type === "preset" && active.id === motion.id ? "Applied to slide" : "Use on selected slide"}</button></div></article>`).join("");
    const categories = ["Memorial", "Wedding", "Birthday", "Anniversary", "Faith", "Nature", "General"];
    const videos = project.assets.filter((asset) => asset.kind === "video" && (motionCategoryFilter === "all" || (project.settings.motionCategories[asset.id] || "General") === motionCategoryFilter));
    $("#motion-video-list").innerHTML = videos.map((asset) => {
      const category = project.settings.motionCategories[asset.id] || "General";
      const options = categories.map((name) => `<option${name === category ? " selected" : ""}>${name}</option>`).join("");
      return `<article class="motion-uploaded-card"><button data-motion-asset="${asset.id}" class="motion-video-choice${active.type === "asset" && active.assetId === asset.id ? " active" : ""}">${escapeHtml(asset.filename)}</button><label>Category<select data-motion-category="${asset.id}">${options}</select></label></article>`;
    }).join("") || '<p class="empty-list">No uploaded motion videos in this category.</p>';
    if (active.type !== "none") {
      $("#motion-foreground").value = active.foreground || "framed";
      $("#motion-darken").value = active.darken ?? .2;
      $("#motion-blur").value = active.blur ?? 0;
    }
  }

  function applyMotionBackground(value, type = "preset") {
    const target = effectTarget();
    if (!target) return notify("Select a photo, video, placeholder, or title slide first.", "error");
    snapshot();
    target.motionBackground = type === "none" ? { type: "none" } : {
      type, ...(type === "asset" ? { assetId: value } : { id: value }),
      foreground: $("#motion-foreground").value,
      darken: Number($("#motion-darken").value), blur: Number($("#motion-blur").value)
    };
    renderCanvas();
    renderMotionLibrary();
    scheduleSave();
    notify(type === "none" ? "Motion background removed from this slide." : "Motion background applied to this slide only.");
  }

 function showCanvasItem(item) {
  const canvas = $("#canvas");

  canvas
    .querySelectorAll(
      ":scope > img,:scope > video,:scope > .canvas-media-frame,:scope > .canvas-text,:scope > .canvas-placeholder,:scope > .canvas-collage,:scope > .cinematic-reveal"
    )
    .forEach((element) => element.remove());

  $(".canvas-empty").hidden = Boolean(item);
  $("#canvas-caption").textContent = item?.caption || "";

  renderMotionBackground(item);
  renderEffects(item);

  if (!item) return;

  if (item.type === "placeholder") {
    const placeholder = document.createElement("div");
    placeholder.className = "canvas-placeholder";
    placeholder.innerHTML = `<div><strong>+ Add your photo</strong><small>${escapeHtml(
      item.label || "Select this slot, then choose a photo from Media."
    )}</small></div>`;
    canvas.prepend(placeholder);
    return;
  }

  if (item.type === "collage") {
    const collage = document.createElement("div");
    collage.className = `canvas-collage layout-${
      item.layout || 2
    } frame-${item.frameStyle || "none"}`;

    if (item.cinematicAction && item.cinematicAction !== "none") {
      collage.classList.add(`cinematic-${item.cinematicAction}`);
    }

    (item.slots || []).forEach((assetId, index) => {
      const slot = document.createElement("div");
      slot.className = "collage-slot";

      const slotAsset = assetById(assetId);

      if (slotAsset?.kind === "photo") {
        const image = document.createElement("img");
        image.src = slotAsset.url;
        image.alt = slotAsset.filename || `Photo ${index + 1}`;
        slot.append(image);
      } else {
        slot.textContent = `+ Photo ${index + 1}`;
      }

      collage.append(slot);
    });

    canvas.prepend(collage);
    renderCinematicReveal(item);
    return;
  }

  if (item.type === "text") {
    const text = document.createElement("div");
    text.className = "canvas-text";

    if (item.style?.darkText) {
      text.classList.add("dark-text");
    }

    text.style.cssText =
      "z-index:2;padding:10%;font:clamp(24px,5vw,64px) Georgia,serif;text-align:center";

    text.textContent = item.text || "Your words here";
    canvas.prepend(text);
    return;
  }

  const asset = assetById(item.assetId);
  if (!asset) return;

  const media = document.createElement(
    asset.kind === "photo" ? "img" : "video"
  );

  media.src = asset.url;
  media.style.objectFit = item.fit || "contain";

  if (asset.kind === "photo") {
    applyPhotoRestore(media, item.photoRestore);
  }

  const frameStyle = item.frameStyle || "none";
  const hasFrame =
    frameStyle !== "none" &&
    frameStyle !== "backgroundphoto" &&
    item.fit !== "cover";

  if (item.cinematicAction && item.cinematicAction !== "none") {
    media.classList.add(`cinematic-${item.cinematicAction}`);
  }

  if (
    item.motionBackground?.type &&
    item.motionBackground.type !== "none"
  ) {
    media.classList.add(
      "motion-foreground",
      `motion-foreground-${
        item.motionBackground.foreground || "framed"
      }`
    );
  }

  if (media.tagName === "VIDEO") {
    media.controls = true;
    media.playsInline = true;
  }

  if (hasFrame) {
    const frame = document.createElement("div");

    frame.className =
      `canvas-media-frame canvas-media-frame-${frameStyle}`;

    frame.append(media);
    canvas.prepend(frame);
  } else {
    if (frameStyle !== "none") {
      media.classList.add(`frame-${frameStyle}`);
    }

    canvas.prepend(media);
  }

  renderCinematicReveal(item);
}
  function renderCinematicReveal(item) {
    const action = item?.cinematicAction || "none";
    if (action === "none") return;
    const layer = document.createElement("div");
    layer.className = `cinematic-reveal cinematic-overlay-${action}`;
    layer.setAttribute("aria-hidden", "true");
    const particleCount = action.includes("breakthrough") || action === "petal-burst" ? 12 : 3;
    Array.from({ length: particleCount }, (_, index) => index).forEach((index) => {
      const particle = document.createElement("i");
      particle.style.setProperty("--i", String(index));
      particle.style.setProperty("--angle", `${index * (360 / particleCount)}deg`);
      particle.style.setProperty("--delay", `${index * .035}s`);
      layer.append(particle);
    });
    $("#canvas").append(layer);
  }

  function renderTextOverlays(elapsed, baseItem = null) {
    const canvas = $("#canvas");
    canvas.querySelectorAll(":scope > .canvas-overlay-text").forEach((element) => element.remove());
    overlaysAtTime(elapsed).forEach((item) => {
      const text = document.createElement("div");
      text.className = `canvas-overlay-text position-${item.position || "bottom-center"}`;
      if (item.id === selectedId && !playbackTimer) text.classList.add("selected");
      text.style.fontSize = `${Math.max(16, Math.min(72, Number(item.fontSize || 32)))}px`;
      text.style.color = item.color || "#ffffff";
      if (item.position === "custom") {
        text.style.setProperty("--text-x", `${Math.max(2, Math.min(98, Number(item.x ?? 50)))}%`);
        text.style.setProperty("--text-y", `${Math.max(2, Math.min(98, Number(item.y ?? 50)))}%`);
      }
      text.dataset.overlayId = item.id;
      text.textContent = item.text || "Your words here";
      canvas.append(text);
    });
    $("#canvas-caption").textContent = baseItem?.caption || "";
  }

  function renderCanvas() {
    const selected = itemById(selectedId);
    const previewTime = isOverlayText(selected) ? Number(selected.start || 0) : sceneStartTime(selected);
    const first = isOverlayText(selected) ? sceneAtTime(visualItems(), previewTime) : visualItems().includes(selected) ? selected : visualItems()[0] || null;
    $("#canvas").dataset.ratio = project.aspectRatio;
    $("#canvas").style.background = project.canvas.background || "#18221e";
    showCanvasItem(first);
    renderTextOverlays(previewTime, first);
  }

  function applyPhotoRestore(element, restore = null) {
    const mode = restore?.mode || "none";
    const strength = Math.max(0, Math.min(1, Number(restore?.strength ?? .65)));
    const brightness = Math.max(.4, Math.min(1.8, Number(restore?.brightness ?? 1)));
    if (mode === "none") { element.style.filter = `brightness(${brightness})`; return; }
    const presets = {
      auto: `contrast(${1 + .24 * strength}) saturate(${1 + .18 * strength}) brightness(${brightness * (1 + .06 * strength)})`,
      faded: `contrast(${1 + .32 * strength}) saturate(${1 + .42 * strength}) brightness(${brightness * (1 + .04 * strength)})`,
      bw: `grayscale(1) contrast(${1 + .38 * strength}) brightness(${brightness * (1 + .08 * strength)})`,
      warm: `sepia(${.22 * strength}) contrast(${1 + .22 * strength}) saturate(${1 + .16 * strength}) brightness(${brightness * (1 + .05 * strength)})`
    };
    element.style.filter = presets[mode] || "none";
  }

  function effectTarget() {
    const selected = itemById(selectedId);
    if (isOverlayText(selected)) return sceneAtTime(visualItems(), Number(selected.start || 0));
    return visualItems().includes(selected) ? selected : null;
  }

  function renderEffectLibrary() {
    const activePack = effectTarget()?.effect?.pack || "none";
    const visibleEffects = effectPacks.filter((effect) => effectCategory === "all" || effect.category === effectCategory);
    $("#effect-list").innerHTML = visibleEffects.map((effect) => `<article class="effect-option${activePack === effect.id ? " active" : ""}"><div class="effect-option-art effect-${effect.id}"><span>✦</span></div><div><small>${effect.category}</small><strong>${effect.name}</strong><p>${effect.mood}</p><button data-effect-pack="${effect.id}">${activePack === effect.id ? "Applied to slide" : "Apply to selected slide"}</button></div></article>`).join("");
  }

  function renderEffects(item = null) {
    const layer = $("#effect-layer");
    const pack = item?.effect?.pack || "none";
    const intensity = item?.effect?.intensity || "none";
    layer.className = "effect-layer";
    layer.replaceChildren();
    if (intensity !== "none") $("#effect-intensity").value = intensity;
    if (pack === "none" || intensity === "none") return;
    layer.classList.add(`effect-${pack}`, `intensity-${intensity}`);
    const atmosphere = document.createElement("div");
    atmosphere.className = "fx-atmosphere";
    layer.append(atmosphere);
    Array.from({ length: 16 }, (_, index) => index).forEach((index) => {
      const particle = document.createElement("i");
      particle.className = "fx-particle";
      particle.style.setProperty("--x", `${(index * 29 + 7) % 96}%`);
      particle.style.setProperty("--y", `${(index * 41 + 13) % 91}%`);
      particle.style.setProperty("--delay", `${-(index % 8) * 1.1}s`);
      particle.style.setProperty("--size", `${3 + (index % 5) * 2}px`);
      particle.style.setProperty("--drift", `${14 + (index % 6) * 7}px`);
      particle.style.setProperty("--hue", `${(index * 47) % 360}`);
      layer.append(particle);
    });
    const vignette = document.createElement("div");
    vignette.className = "fx-vignette";
    layer.append(vignette);
  }

  function applySlideEffect(pack) {
    const target = effectTarget();
    if (!target) return notify("Select a photo, video, placeholder, or title slide first.", "error");
    snapshot();
    target.effect = pack === "none" ? { pack: "none", intensity: "none" } : { pack, intensity: $("#effect-intensity").value || "subtle" };
    renderCanvas();
    renderEffectLibrary();
    renderTimeline();
    scheduleSave();
    notify(pack === "none" ? "Effect removed from this slide." : `${effectPacks.find((effect) => effect.id === pack)?.name || "Effect"} applied to this slide only.`);
  }

  function renderAll() { if (!project) return; renderTemplates(); renderAssets(); renderPhotoPrep(); renderDesigns(); renderTimeline(); renderInspector(); renderCanvas(); renderEffectLibrary(); renderMotionLibrary(); renderReleaseCenter(); renderObituary(); }

  function addAsset(assetId) {
    const asset = assetById(assetId);
    if (!asset) return;
    snapshot();
    const selected = itemById(selectedId);
    if (selected?.type === "collage") {
      if (asset.kind !== "photo") return notify("Multi-photo openings accept photos only.", "error");
      const emptyIndex = selected.slots.findIndex((slot) => !slot);
      if (emptyIndex < 0) return notify("This multi-photo slide is full. Clear it or insert another layout.", "error");
      selected.slots[emptyIndex] = asset.id;
      renderAll();
      scheduleSave();
      notify(`Photo added to opening ${emptyIndex + 1}.`);
      return;
    }
    if (selected?.type === "placeholder" && asset.kind !== "audio") {
      selected.type = "visual";
      selected.assetId = asset.id;
      selected.fit = "contain";
      selected.caption = "";
      selected.effect = { pack: "none", intensity: "none" };
      selected.motionBackground = { type: "none" };
      selected.frameStyle = "none";
      selected.cinematicAction = "none";
      renderAll();
      scheduleSave();
      notify("Photo slot filled.");
      return;
    }
    const item = { id: uid(), assetId, type: asset.kind === "audio" ? "audio" : "visual", duration: asset.kind === "photo" ? Number(project.settings.photoDuration || 5) : asset.kind === "audio" ? Math.max(10, totalDuration()) : 8, start: 0, fit: "contain", transition: project.settings.transition || "fade", caption: "", frameStyle: "none", cinematicAction: "none", effect: { pack: "none", intensity: "none" }, motionBackground: { type: "none" }, volume: asset.kind === "audio" ? Number(project.settings.musicVolume || .32) : 1 };
    project.timeline.push(item);
    selectedId = item.id;
    renderAll();
    scheduleSave();
  }

  function addCollage(count) {
    const layout = Math.max(2, Math.min(4, Number(count || 2)));
    snapshot();
    const item = { id: uid(), type: "collage", label: `${layout}-photo slide`, layout, slots: Array.from({ length: layout }, () => null), duration: Number(project.settings.photoDuration || 5), start: 0, transition: project.settings.transition || "fade", caption: "", frameStyle: "none", effect: { pack: "none", intensity: "none" }, motionBackground: { type: "none" } };
    project.timeline.push(item);
    selectedId = item.id;
    renderAll();
    scheduleSave();
    notify(`${layout}-photo slide added. Choose photos from Media to fill it.`);
  }

  function addText(kind) {
    snapshot();
    const defaults = { title: "A Life Remembered", heading: "Full Name", details: "Full Name\nBorn: Month Day, Year\nPassed: Month Day, Year", caption: "A moment worth keeping", quote: "Love leaves a memory no one can steal" };
    const selected = itemById(selectedId);
    const selectedStory = isOverlayText(selected) ? sceneAtTime(visualItems(), Number(selected.start || 0)) : visualItems().includes(selected) ? selected : visualItems()[0];
    const start = sceneStartTime(selectedStory);
    const overlay = kind !== "title";
    const positions = { heading: "top-center", details: "bottom-left", caption: "bottom-center", quote: "center" };
    const item = { id: uid(), type: "text", role: kind, overlay, text: defaults[kind] || "Your words here", duration: overlay ? Number(selectedStory?.duration || 5) : 5, start: overlay ? start : 0, transition: "fade", caption: "", effect: { pack: "none", intensity: "none" }, motionBackground: { type: "none" }, position: positions[kind] || "center", fontSize: kind === "details" || kind === "caption" ? 32 : 42, color: "#ffffff" };
    if (overlay) project.timeline.push(item);
    else project.timeline.unshift(item);
    selectedId = item.id;
    renderAll();
    scheduleSave();
  }

  function updateSelected() {
    const item = itemById(selectedId);
    if (!item) return;
    snapshot();
    if (item.type === "text") item.text = $("#item-name").value;
    else if (item.type === "placeholder" || item.type === "collage") item.label = $("#item-name").value;
    else {
      const asset = assetById(item.assetId);
      if (asset) asset.filename = $("#item-name").value;
    }
    item.duration = Math.max(.5, Number($("#item-duration").value || 5));
    item.start = Math.max(0, Number($("#item-start").value || 0));
    item.fit = $("#item-fit").value;
    item.transition = $("#item-transition").value;
    item.caption = $("#item-caption").value;
    item.volume = Number($("#item-volume").value);
    if (isOverlayText(item)) {
      item.position = $("#item-position").value;
      item.fontSize = Number($("#item-font-size").value || 32);
      item.color = $("#item-text-color").value;
    }
    const selectedAsset = assetById(item.assetId);
    if (item.type === "visual" && selectedAsset?.kind === "photo") item.photoRestore = { mode: $("#item-photo-restore").value, strength: Number($("#item-photo-strength").value), brightness: Number($("#item-photo-brightness").value) };
    if (["visual", "collage"].includes(item.type)) item.frameStyle = $("#item-frame-style").value;
    if (["visual", "collage"].includes(item.type)) item.cinematicAction = $("#item-cinematic-action").value;
    renderTimeline(); renderCanvas();
    scheduleSave();
  }

  function removeSelected() {
    if (!selectedId) return;
    snapshot();
    project.timeline = project.timeline.filter((item) => item.id !== selectedId);
    selectedId = null;
    renderAll(); scheduleSave();
  }

  function duplicateSelected() {
    const item = itemById(selectedId); if (!item) return;
    snapshot();
    const copy = { ...structuredClone(item), id: uid() };
    project.timeline.splice(project.timeline.indexOf(item) + 1, 0, copy);
    selectedId = copy.id;
    renderAll(); scheduleSave();
  }

  function clearCollage() {
    const item = itemById(selectedId);
    if (item?.type !== "collage") return;
    snapshot();
    item.slots = Array.from({ length: Number(item.layout || 2) }, () => null);
    renderAll();
    scheduleSave();
    notify("Multi-photo slide cleared. Your uploaded photos remain in Media.");
  }

  function clearSlideStyling() {
    const item = effectTarget();
    if (!item) return notify("Select a photo, collage, video, or title slide first.", "error");
    snapshot();
    item.effect = { pack: "none", intensity: "none" };
    item.motionBackground = { type: "none" };
    item.frameStyle = "none";
    item.cinematicAction = "none";
    renderAll();
    scheduleSave();
    notify("This slide is now clean with no motion, effect, frame, or cinematic action.");
  }

  function reorder(dragId, targetId) {
    const drag = itemById(dragId), target = itemById(targetId);
    if (!drag || !target || !visualItems().includes(drag) || !visualItems().includes(target)) return;
    snapshot();
    const without = project.timeline.filter((item) => item.id !== drag.id);
    without.splice(without.findIndex((item) => item.id === target.id), 0, drag);
    project.timeline = without;
    renderTimeline(); scheduleSave();
  }

  function moveSelectedVisual(direction) {
    const item = itemById(selectedId);
    const visuals = visualItems();
    const currentIndex = visuals.indexOf(item);
    const target = visuals[currentIndex + direction];
    if (currentIndex < 0 || !target) return notify(direction < 0 ? "This is already the first slide." : "This is already the last slide.");
    snapshot();
    const itemIndex = project.timeline.indexOf(item);
    const targetIndex = project.timeline.indexOf(target);
    project.timeline.splice(itemIndex, 1);
    project.timeline.splice(targetIndex, 0, item);
    renderAll();
    scheduleSave();
    notify(direction < 0 ? "Slide moved earlier." : "Slide moved later.");
  }

  function beginTextDrag(event) {
    const element = event.target.closest(".canvas-overlay-text.selected");
    if (!element || playbackTimer) return;
    const item = itemById(element.dataset.overlayId);
    if (!isOverlayText(item)) return;
    event.preventDefault();
    snapshot();
    element.setPointerCapture?.(event.pointerId);
    const canvas = $("#canvas");
    const move = (moveEvent) => {
      const rect = canvas.getBoundingClientRect();
      item.position = "custom";
      item.x = Math.max(2, Math.min(98, ((moveEvent.clientX - rect.left) / rect.width) * 100));
      item.y = Math.max(2, Math.min(98, ((moveEvent.clientY - rect.top) / rect.height) * 100));
      element.className = "canvas-overlay-text position-custom selected";
      element.style.setProperty("--text-x", `${item.x}%`);
      element.style.setProperty("--text-y", `${item.y}%`);
      $("#item-position").value = "custom";
    };
    const end = () => {
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerup", end);
      element.removeEventListener("pointercancel", end);
      renderTimeline();
      scheduleSave();
    };
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerup", end);
    element.addEventListener("pointercancel", end);
  }

  function moveTimedItem(item, clientX, trackElement) {
    if (!item || !trackElement || !isOverlayText(item)) return false;
    snapshot();
    const rectangle = trackElement.getBoundingClientRect();
    const rawTime = (clientX - rectangle.left - 4) / (timelineZoom / 5);
    item.start = Math.min(Math.max(0, totalDuration() - Number(item.duration || 0)), Math.max(0, Math.round(rawTime * 2) / 2));
    selectedId = item.id;
    renderTimeline();
    renderInspector();
    renderCanvas();
    scheduleSave();
    notify(`Text moved to ${formatTime(item.start)}.`);
    return true;
  }

  function stopPlayback() {
    cancelAnimationFrame(playbackTimer); playbackTimer = null;
    audioPreviewErrorShown = true;
    previewAudioNodes.forEach(({ audio }) => {
      audio.pause();
      audio.src = "";
    });
    previewAudioNodes = [];
    $("#play-button").textContent = "▶";
    $("#preview-button").textContent = "▶ Preview";
    $("#canvas").querySelector("video")?.pause();
  }

  function startPreviewAudio() {
    audioPreviewErrorShown = false;
    project.timeline.filter((item) => item.type === "audio").forEach((item) => {
      const asset = assetById(item.assetId);
      if (!asset) return;
      const audio = new Audio(asset.url);
      const start = Math.max(0, Number(item.start || 0));
      const duration = Math.max(.5, Number(item.duration || totalDuration() - start || 10));
      const volume = Math.min(1, Math.max(0, Number(item.volume ?? project.settings.musicVolume ?? .32)));
      audio.preload = "auto";
      audio.muted = start > 0;
      audio.volume = volume;
      const previewTrack = { audio, item, asset, start, duration, volume, active: start === 0, playRequested: false };
      previewAudioNodes.push(previewTrack);
      audio.addEventListener("error", () => {
        if (audioPreviewErrorShown) return;
        audioPreviewErrorShown = true;
        notify(`Music preview could not load ${asset.filename}.`, "error");
      }, { once: true });
      previewTrack.playRequested = true;
      const playPromise = audio.play();
      if (playPromise) playPromise.then(() => previewTrack.playRequested = false).catch(() => {
          previewTrack.playRequested = false;
          if (audioPreviewErrorShown) return;
          audioPreviewErrorShown = true;
          notify("Your browser blocked the music preview. Press Preview again to allow audio.", "error");
        });
    });
  }

  function syncPreviewAudio(elapsed) {
    previewAudioNodes.forEach((track) => {
      const { audio, start, duration, volume, asset } = track;
      const isActive = elapsed >= start && elapsed < start + duration;
      if (elapsed < start) {
        audio.muted = true;
        return;
      }
      if (!isActive) {
        audio.pause();
        return;
      }
      const expected = Math.max(0, elapsed - start);
      if (!track.active) {
        try { audio.currentTime = expected; } catch { /* Metadata may still be loading. */ }
      }
      track.active = true;
      audio.muted = false;
      audio.volume = volume;
      if (audio.paused && !track.playRequested) {
        track.playRequested = true;
        audio.play().then(() => track.playRequested = false).catch(() => {
            track.playRequested = false;
            if (audioPreviewErrorShown) return;
            audioPreviewErrorShown = true;
            notify(`Music preview could not start ${asset.filename}.`, "error");
          });
      }
    });
  }

  function sceneAtTime(items, elapsed) {
    let cursor = 0;
    for (const item of items) {
      cursor += Number(item.duration || 0);
      if (elapsed < cursor) return item;
    }
    return items.at(-1) || null;
  }

  function seekPreview(seconds) {
    if (playbackTimer) stopPlayback();
    const elapsed = Math.min(previewDuration(), Math.max(0, Number(seconds || 0)));
    const item = sceneAtTime(visualItems(), elapsed);
    if (item) {
      selectedId = item.id;
      showCanvasItem(item);
      renderTextOverlays(elapsed, item);
      $$('[data-item-id]').forEach((element) => element.classList.toggle("selected", element.dataset.itemId === item.id));
      renderInspector();
      renderEffectLibrary();
      renderMotionLibrary();
    }
    $("#current-time").textContent = formatTime(elapsed);
    $("#scrubber").value = elapsed * 10;
    $("#playhead").style.left = `${12 + elapsed * (timelineZoom / 5)}px`;
  }

  function stepPreview(direction) {
    const items = visualItems();
    if (!items.length) return;
    const selected = itemById(selectedId);
    const current = isOverlayText(selected) ? sceneAtTime(items, Number(selected.start || 0)) : selected;
    const index = Math.max(0, items.findIndex((item) => item.id === current?.id));
    const nextIndex = Math.min(items.length - 1, Math.max(0, index + direction));
    seekPreview(sceneStartTime(items[nextIndex]));
  }

  function playPreview() {
    if (playbackTimer) return stopPlayback();
    const items = visualItems();
    if (!items.length) return notify("Add a photo, clip, or text scene first.", "error");
    playbackStarted = performance.now();
    $("#play-button").textContent = "■";
    $("#preview-button").textContent = "■ Stop";
    startPreviewAudio();
    let currentSceneId = null;
    const tick = (timestamp) => {
      const elapsed = Math.min(totalDuration(), (timestamp - playbackStarted) / 1000);
      const item = sceneAtTime(items, elapsed);
      if (item && item.id !== currentSceneId) {
        currentSceneId = item.id;
        selectedId = item.id;
        showCanvasItem(item);
        $$('[data-item-id]').forEach((element) => element.classList.toggle("selected", element.dataset.itemId === item.id));
        renderInspector();
        renderEffectLibrary();
        renderMotionLibrary();
        const video = $("#canvas").querySelector("video");
        if (video) { video.currentTime = 0; video.play().catch(() => {}); }
      }
      syncPreviewAudio(elapsed);
      renderTextOverlays(elapsed, item);
      $("#current-time").textContent = formatTime(elapsed);
      $("#scrubber").value = elapsed * 10;
      $("#playhead").style.left = `${12 + elapsed * (timelineZoom / 5)}px`;
      if (elapsed >= previewDuration()) {
        stopPlayback();
        $("#scrubber").value = 0;
        $("#current-time").textContent = "0:00";
        $("#playhead").style.left = "12px";
        return;
      }
      playbackTimer = requestAnimationFrame(tick);
    };
    playbackTimer = requestAnimationFrame(tick);
  }

  async function requestRender() {
    try {
      await saveProject();
      const data = await request(`/api/projects/${project.id}/render`, { method: "POST" });
      project.render = data.render;
      notify(data.message || "Render requested.");
      renderReleaseCenter();
      pollRenderStatus();
    } catch (error) { notify(error.message, "error"); }
  }

  async function pollRenderStatus() {
    clearTimeout(renderPollTimer);
if (!project?.render || project.render.status === "failed") return;    try {
      const data = await request(`/api/projects/${project.id}/render`);
      project.render = data.render;
      renderReleaseCenter();
      if (project.render?.status === "complete") {
  $('.tool-rail button[data-panel="release"]')?.click();

  const outputs = project.render.outputs || {};
  const allFormatsReady = ["master", "vertical", "portrait", "square"]
    .every((format) => Boolean(outputs[format] || (format === "master" && project.render.outputUrl)));

  if (allFormatsReady) {
    return notify("All four video formats are ready to download and share.");
  }
  }

   if (project.render?.status === "failed") return notify(project.render.error || "The render did not complete.", "error");
    } catch (error) { notify(error.message, "error"); }
    renderPollTimer = setTimeout(pollRenderStatus, 8000);
  }

  $$(".tool-rail button").forEach((button) => button.addEventListener("click", () => {
    $$(".tool-rail button").forEach((item) => item.classList.toggle("active", item === button));
    $$(".panel-view").forEach((view) => view.classList.toggle("active", view.dataset.view === button.dataset.panel));
  }));
  $$(".filter-row button").forEach((button) => button.addEventListener("click", () => { filter = button.dataset.filter; $$(".filter-row button").forEach((item) => item.classList.toggle("active", item === button)); renderAssets(); }));
  $("#template-category").addEventListener("change", () => { templateCategory = $("#template-category").value; renderTemplates(); });
  $("#template-list").addEventListener("click", (event) => { const button = event.target.closest("[data-template-id]"); if (button) applyTemplate(button.dataset.templateId).catch((error) => notify(error.message, "error")); });
  $("#file-input").addEventListener("change", (event) => { uploadFiles([...event.target.files]); event.target.value = ""; });
  $("#remove-photo-background").addEventListener("click", removeSelectedPhotoBackground);
  $("#obituary-form").addEventListener("submit", (event) => { event.preventDefault(); generateObituary().catch((error) => notify(error.message, "error")); });
  $("#regenerate-obituary").addEventListener("click", () => generateObituary().catch((error) => notify(error.message, "error")));
  $("#save-obituary").addEventListener("click", () => saveObituary().catch((error) => notify(error.message, "error")));
  $("#copy-memorial-link").addEventListener("click", () => copyMemorialLink().catch((error) => notify(error.message, "error")));
  $("#print-memorial-qr").addEventListener("click", printMemorialQr);
  $("#share-memorial-more").addEventListener("click", shareMemorialMore);
  $("#share-memorial-qr").addEventListener("click", shareMemorialQrImage);
  $("#share-memorial-facebook").addEventListener("click", () => shareMemorialTo("facebook"));
  $("#share-memorial-x").addEventListener("click", () => shareMemorialTo("x"));
  $("#share-memorial-whatsapp").addEventListener("click", () => shareMemorialTo("whatsapp"));
  $("#share-memorial-email").addEventListener("click", () => shareMemorialTo("email"));
  $("#create-video-script").addEventListener("click", () => createVideoScript().catch((error) => notify(error.message, "error")));
  $("#generated-obituary").addEventListener("input", () => { project.obituary = obituaryPayload(); scheduleSave(); });
  $("#video-script").addEventListener("input", () => { project.obituary = obituaryPayload(); scheduleSave(); });
  $("#prep-consent").addEventListener("change", () => $("#remove-photo-background").disabled = !$("#prep-consent").checked);
  $("#release-caption").addEventListener("input", () => { project.settings.releaseCaption = $("#release-caption").value; scheduleSave(); });
  $$("[data-release-format]").forEach((button) => button.addEventListener("click", () => downloadRelease(button.dataset.releaseFormat)));
  $("#native-share").addEventListener("click", shareRelease);
  $("#copy-share-link").addEventListener("click", async () => { if (!project.share?.shareUrl) return; await navigator.clipboard.writeText(project.share.shareUrl); notify("Share link copied."); });
  $("#asset-list").addEventListener("click", (event) => { const button = event.target.closest("[data-add-asset]"); if (button) addAsset(button.dataset.addAsset); });
  $$('[data-add-collage]').forEach((button) => button.addEventListener("click", () => addCollage(button.dataset.addCollage)));
  $$('[data-add-text]').forEach((button) => button.addEventListener("click", () => addText(button.dataset.addText)));
  $("#occasion").addEventListener("change", () => { snapshot(); project.occasion = $("#occasion").value; renderDesigns(); scheduleSave(); });
  $("#design-list").addEventListener("click", (event) => { const button = event.target.closest("[data-design]"); if (!button) return; const design = (designs[project.occasion] || []).find((item) => item.id === button.dataset.design); if (!design) return; snapshot(); project.canvas.background = design.background; project.settings.transition = design.transition; renderCanvas(); scheduleSave(); notify(`${design.name} applied.`); });
  $("#effect-list").addEventListener("click", (event) => { const button = event.target.closest("[data-effect-pack]"); if (button) applySlideEffect(button.dataset.effectPack); });
  $("#effect-category").addEventListener("change", () => { effectCategory = $("#effect-category").value; renderEffectLibrary(); });
  $("#remove-slide-effect").addEventListener("click", () => applySlideEffect("none"));
  $("#motion-list").addEventListener("click", (event) => { const button = event.target.closest("[data-motion-preset]"); if (button) applyMotionBackground(button.dataset.motionPreset); });
  $("#motion-video-list").addEventListener("click", (event) => { const button = event.target.closest("[data-motion-asset]"); if (button) applyMotionBackground(button.dataset.motionAsset, "asset"); });
  $("#motion-video-list").addEventListener("change", (event) => {
    const select = event.target.closest("[data-motion-category]");
    if (!select) return;
    project.settings.motionCategories[select.dataset.motionCategory] = select.value;
    scheduleSave();
    if (motionCategoryFilter !== "all" && select.value !== motionCategoryFilter) renderMotionLibrary();
    notify(`Motion clip assigned to ${select.value}.`);
  });
  $("#motion-category-filter").addEventListener("change", () => { motionCategoryFilter = $("#motion-category-filter").value; renderMotionLibrary(); });
  $("#remove-motion-background").addEventListener("click", () => applyMotionBackground(null, "none"));
  ["motion-foreground", "motion-darken", "motion-blur"].forEach((id) => $("#" + id).addEventListener("input", () => {
    const target = effectTarget();
    if (!target?.motionBackground || target.motionBackground.type === "none") return;
    target.motionBackground.foreground = $("#motion-foreground").value;
    target.motionBackground.darken = Number($("#motion-darken").value);
    target.motionBackground.blur = Number($("#motion-blur").value);
    renderCanvas();
    scheduleSave();
  }));
  $("#effect-intensity").addEventListener("change", () => {
    const target = effectTarget();
    if (!target || !target.effect?.pack || target.effect.pack === "none") return;
    snapshot();
    target.effect.intensity = $("#effect-intensity").value;
    renderCanvas();
    scheduleSave();
  });
  $("#project-title").addEventListener("input", () => { project.title = $("#project-title").value; scheduleSave(); });
  $("#aspect").addEventListener("change", () => { snapshot(); project.aspectRatio = $("#aspect").value; renderCanvas(); scheduleSave(); });
  $("#background-color").addEventListener("input", () => { project.canvas.background = $("#background-color").value; renderCanvas(); scheduleSave(); });
  $("#accent-color").addEventListener("input", () => document.documentElement.style.setProperty("--gold", $("#accent-color").value));
  $("#safe-area").addEventListener("click", () => $(".safe-guides").hidden = !$(".safe-guides").hidden);
  $("#timeline-zoom").addEventListener("input", () => { timelineZoom = Number($("#timeline-zoom").value); renderTimeline(); });
  $("#zoom-out").addEventListener("click", () => { $("#timeline-zoom").value = Math.max(60, Number($("#timeline-zoom").value) - 20); $("#timeline-zoom").dispatchEvent(new Event("input")); });
  $("#zoom-in").addEventListener("click", () => { $("#timeline-zoom").value = Math.min(180, Number($("#timeline-zoom").value) + 20); $("#timeline-zoom").dispatchEvent(new Event("input")); });
  $("#tracks").addEventListener("click", (event) => { const item = event.target.closest("[data-item-id]"); if (!item) return; selectedId = item.dataset.itemId; renderTimeline(); renderInspector(); renderCanvas(); renderEffectLibrary(); renderMotionLibrary(); });
  $("#tracks").addEventListener("dragstart", (event) => { draggedId = event.target.closest("[data-item-id]")?.dataset.itemId || null; });
  $("#tracks").addEventListener("dragover", (event) => event.preventDefault());
  $("#tracks").addEventListener("drop", (event) => {
    event.preventDefault();
    const dragged = itemById(draggedId);
    const track = event.target.closest(".track");
    if (dragged && track?.dataset.track === "text" && moveTimedItem(dragged, event.clientX, track)) { draggedId = null; return; }
    const target = event.target.closest("[data-item-id]")?.dataset.itemId;
    if (draggedId && target && draggedId !== target) reorder(draggedId, target);
    draggedId = null;
  });
  $("#canvas").addEventListener("pointerdown", beginTextDrag);
  $("#inspector-form").addEventListener("change", updateSelected);
  $("#inspector-form").addEventListener("input", (event) => { if (event.target.type === "range" || ["item-name", "item-caption", "item-text-color"].includes(event.target.id)) updateSelected(); });
  $("#delete-item").addEventListener("click", removeSelected);
  $("#asset-list").addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-asset]");
    if (button) deleteMediaAsset(button.dataset.deleteAsset);
  });
  $("#duplicate-item").addEventListener("click", duplicateSelected);
  $("#clear-collage").addEventListener("click", clearCollage);
  $("#clear-slide-styling").addEventListener("click", clearSlideStyling);
  $("#move-item-earlier").addEventListener("click", () => moveSelectedVisual(-1));
  $("#move-item-later").addEventListener("click", () => moveSelectedVisual(1));
  $("#undo").addEventListener("click", () => restore(history.pop(), future));
  $("#redo").addEventListener("click", () => restore(future.pop(), history));
  $("#play-button").addEventListener("click", playPreview);
  $("#preview-button").addEventListener("click", playPreview);
  $("#back-frame").addEventListener("click", () => stepPreview(-1));
  $("#forward-frame").addEventListener("click", () => stepPreview(1));
  $("#scrubber").addEventListener("input", () => seekPreview(Number($("#scrubber").value) / 10));
  $("#render-button").addEventListener("click", requestRender);
  $("#new-project-button").addEventListener("click", () => {
  if (project?.entitlement?.paid === true && project?.entitlement?.administrator !== true) {
    return notify("Your purchase includes one video project. Continue editing this project to use the photos, songs, and video length included with your package.");
  }

  $("#new-project-name").value = "My New Story";
  $("#welcome-dialog").showModal();
});
 
  $("#create-project").addEventListener("click", () => createProject().catch((error) => notify(error.message, "error")));
  initialize();
})();
