(() => {
  const $ = (selector) => document.querySelector(selector);
  let key = "";
  const escapeHtml = (value) => String(value || "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  async function api(path, options = {}) {
    options.headers = { Authorization: `Bearer ${key}`, ...(options.headers || {}) };
    const response = await fetch(path, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Request failed.");
    return data;
  }
  function notice(message, error = false) {
    $("#admin-notice").textContent = message;
    $("#admin-notice").style.color = error ? "#8b2e2e" : "#416153";
  }
  async function load() {
    const data = await api("/api/admin/safe-music");
    $("#admin-track-list").innerHTML = data.tracks.map((track) => `<article class="track-row"><div><strong>${escapeHtml(track.title)}</strong><small>${escapeHtml(track.artist)} · ${escapeHtml(track.provider)} · ${escapeHtml(track.platforms.join(", "))}</small><span class="status-pill ${track.status}">${track.status}</span></div><div class="track-actions"><button data-status="${track.id}" data-next="${track.status === "active" ? "inactive" : "active"}">${track.status === "active" ? "Unpublish" : "Publish"}</button><button class="delete-track" data-delete="${track.id}">Delete</button></div></article>`).join("") || "<p>No music has been uploaded.</p>";
  }
  $("#unlock").addEventListener("click", async () => {
    key = $("#admin-key").value;
    try { await load(); $("#access-card").hidden = true; $("#admin-workspace").hidden = false; }
    catch (error) { alert(error.message); }
  });
  $("#refresh").addEventListener("click", () => load().catch((error) => notice(error.message, true)));
  $("#music-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const file = $("#track-file").files[0];
    if (!file || !$("#rights-confirm").checked) return;
    const headers = {
      "Content-Type": file.type, "X-File-Name": encodeURIComponent(file.name),
      "X-Track-Title": $("#track-title").value, "X-Track-Artist": $("#track-artist").value,
      "X-Track-Mood": $("#track-mood").value, "X-Duration-Seconds": $("#track-duration").value,
      "X-Track-Occasions": $("#track-occasions").value, "X-Track-Platforms": $("#track-platforms").value,
      "X-License-Provider": $("#license-provider").value, "X-License-Reference": $("#license-reference").value,
      "X-License-Version": $("#license-version").value, "X-Content-Id-Policy": $("#content-id-policy").value
    };
    try {
      notice("Uploading…");
      const data = await api("/api/admin/safe-music", { method: "POST", headers, body: file });
      notice(data.message); event.target.reset(); await load();
    } catch (error) { notice(error.message, true); }
  });
  $("#admin-track-list").addEventListener("click", async (event) => {
    const status = event.target.closest("[data-status]");
    const remove = event.target.closest("[data-delete]");
    try {
      if (status) await api(`/api/admin/safe-music/${status.dataset.status}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: status.dataset.next }) });
      if (remove && confirm("Permanently delete this catalog track and audio file?")) await api(`/api/admin/safe-music/${remove.dataset.delete}`, { method: "DELETE" });
      if (status || remove) await load();
    } catch (error) { notice(error.message, true); }
  });
})();
