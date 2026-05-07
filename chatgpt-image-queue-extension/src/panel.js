window.CGPTIQ = window.CGPTIQ || {};

(() => {
  const { panelId } = window.CGPTIQ.config;
  const { loadSettings, saveSettings } = window.CGPTIQ.storage;
  const queue = window.CGPTIQ.queue;

  function getSettingsFromPanel() {
    return {
      prompts: document.querySelector("#cgptiq-prompts").value,
      ratio: document.querySelector("#cgptiq-ratio").value,
      speed: document.querySelector("#cgptiq-speed").value,
      delaySeconds: Math.max(3, Number(document.querySelector("#cgptiq-delay").value || 45)),
      startIndex: Math.max(1, Number(document.querySelector("#cgptiq-start-index").value || 1))
    };
  }

  function setStatus(message) {
    const status = document.querySelector("#cgptiq-status");
    if (status) status.textContent = message;
  }

  function updateButtons() {
    const start = document.querySelector("#cgptiq-start");
    const pause = document.querySelector("#cgptiq-pause");
    const stop = document.querySelector("#cgptiq-stop");
    if (!start || !pause || !stop) return;

    start.disabled = queue.state.running;
    pause.disabled = !queue.state.running;
    stop.disabled = !queue.state.running;
    pause.textContent = queue.state.paused ? "Tiếp tục" : "Tạm dừng";
  }

  function panelTemplate() {
    return `
      <div class="cgptiq-header">
        <div class="cgptiq-title">Image Prompt Queue</div>
        <div class="cgptiq-header-actions">
          <button id="cgptiq-collapse" type="button" title="Thu gọn">_</button>
          <button id="cgptiq-close" type="button" title="Ẩn panel">x</button>
        </div>
      </div>
      <div class="cgptiq-body">
        <div class="cgptiq-row">
          <label for="cgptiq-prompts">Prompt, mỗi dòng một ảnh</label>
          <textarea id="cgptiq-prompts" spellcheck="false" placeholder="Prompt 1&#10;Prompt 2&#10;Prompt 3"></textarea>
        </div>
        <div class="cgptiq-grid">
          <div class="cgptiq-row">
            <label for="cgptiq-ratio">Tỉ lệ</label>
            <select id="cgptiq-ratio">
              <option value="auto">Tự động</option>
              <option value="square">Vuông 1:1</option>
              <option value="portrait">Chân dung 3:4</option>
              <option value="tall">Tin 9:16</option>
              <option value="landscape">Ngang 4:3</option>
              <option value="widescreen">Màn ảnh rộng 16:9</option>
            </select>
          </div>
          <div class="cgptiq-row">
            <label for="cgptiq-speed">Chế độ</label>
            <select id="cgptiq-speed">
              <option value="keep">Giữ hiện tại</option>
              <option value="instant">Instant</option>
              <option value="longer">Lâu hơn</option>
              <option value="auto">Tự động</option>
            </select>
          </div>
        </div>
        <div class="cgptiq-grid">
          <div class="cgptiq-row">
            <label for="cgptiq-delay">Chờ giữa prompt (giây)</label>
            <input id="cgptiq-delay" type="number" min="3" step="1">
          </div>
          <div class="cgptiq-row">
            <label for="cgptiq-start-index">Bắt đầu từ số</label>
            <input id="cgptiq-start-index" type="number" min="1" step="1">
          </div>
        </div>
        <div class="cgptiq-controls">
          <button id="cgptiq-start" type="button">Chạy</button>
          <button id="cgptiq-pause" type="button" disabled>Tạm dừng</button>
          <button id="cgptiq-stop" type="button" disabled>Dừng</button>
        </div>
        <div id="cgptiq-status" class="cgptiq-status">Sẵn sàng.</div>
        <div class="cgptiq-small">Mẹo: dùng dòng riêng cho từng prompt. Nếu prompt nhiều dòng, ngăn cách bằng một dòng chỉ có ---.</div>
      </div>
    `;
  }

  function fillSettings(settings) {
    document.querySelector("#cgptiq-prompts").value = settings.prompts;
    document.querySelector("#cgptiq-ratio").value = settings.ratio;
    document.querySelector("#cgptiq-speed").value = settings.speed;
    document.querySelector("#cgptiq-delay").value = settings.delaySeconds;
    document.querySelector("#cgptiq-start-index").value = settings.startIndex;
  }

  function bindPanelEvents(panel) {
    panel.querySelectorAll("textarea, input, select").forEach((field) => {
      field.addEventListener("change", () => saveSettings(getSettingsFromPanel()));
      field.addEventListener("input", () => saveSettings(getSettingsFromPanel()));
    });

    document.querySelector("#cgptiq-start").addEventListener("click", async () => {
      const settings = getSettingsFromPanel();
      await saveSettings(settings);
      queue.runQueue(settings, { setStatus, updateButtons });
    });
    document.querySelector("#cgptiq-pause").addEventListener("click", () => {
      queue.pauseOrResume();
      updateButtons();
    });
    document.querySelector("#cgptiq-stop").addEventListener("click", () => {
      queue.stop();
      updateButtons();
    });
    document.querySelector("#cgptiq-collapse").addEventListener("click", () => {
      panel.classList.toggle("cgptiq-collapsed");
    });
    document.querySelector("#cgptiq-close").addEventListener("click", () => {
      panel.remove();
    });
  }

  function enableDrag(panel) {
    const header = panel.querySelector(".cgptiq-header");
    let drag = null;

    header.addEventListener("pointerdown", (event) => {
      if (event.target.closest("button")) return;
      const rect = panel.getBoundingClientRect();
      drag = {
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top
      };
      header.setPointerCapture(event.pointerId);
    });

    header.addEventListener("pointermove", (event) => {
      if (!drag) return;
      const left = Math.max(8, Math.min(window.innerWidth - panel.offsetWidth - 8, event.clientX - drag.offsetX));
      const top = Math.max(8, Math.min(window.innerHeight - panel.offsetHeight - 8, event.clientY - drag.offsetY));
      panel.style.left = `${left}px`;
      panel.style.top = `${top}px`;
      panel.style.right = "auto";
    });

    header.addEventListener("pointerup", () => {
      drag = null;
    });
  }

  async function createPanel() {
    if (document.getElementById(panelId)) return;

    const settings = await loadSettings();
    const panel = document.createElement("section");
    panel.id = panelId;
    panel.innerHTML = panelTemplate();
    document.documentElement.appendChild(panel);

    fillSettings(settings);
    bindPanelEvents(panel);
    enableDrag(panel);
  }

  function togglePanel() {
    const panel = document.getElementById(panelId);
    if (panel) panel.remove();
    else createPanel();
  }

  window.CGPTIQ.panel = {
    createPanel,
    getSettingsFromPanel,
    setStatus,
    togglePanel,
    updateButtons
  };
})();
