window.CGPTIQ = window.CGPTIQ || {};

(() => {
  const { panelId } = window.CGPTIQ.config;
  const { loadSettings, saveSettings } = window.CGPTIQ.storage;
  const queue = window.CGPTIQ.queue;

  function parsePromptText(raw) {
    return queue.parsePrompts(raw)
      .map((prompt) => prompt.replace(/^\s*(?:[-*]\s+|\d+[\.)]\s+)/, "").trim())
      .filter(Boolean);
  }

  function formatPromptText(prompts) {
    if (prompts.length <= 1) return prompts[0] || "";
    return prompts.map((prompt, index) => {
      const lines = prompt.split(/\r?\n/);
      const [firstLine, ...rest] = lines;
      const body = rest.map((line) => `   ${line}`).join("\n");
      return body ? `${index + 1}. ${firstLine}\n${body}` : `${index + 1}. ${firstLine}`;
    }).join("\n");
  }

  function serializePromptItems() {
    return [...document.querySelectorAll(".cgptiq-prompt-text")]
      .map((field) => field.value.trim())
      .filter(Boolean)
      .join("\n---\n");
  }

  function getSettingsFromPanel() {
    syncPromptItemsToHidden();
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
        <div class="cgptiq-prompt-editor">
          <input id="cgptiq-prompts" type="hidden">
          <div class="cgptiq-editor-head">
            <label for="cgptiq-paste">Prompt</label>
            <span id="cgptiq-prompt-count">0 lệnh</span>
          </div>
          <textarea id="cgptiq-paste" spellcheck="false" placeholder="Dán danh sách prompt vào đây. Mỗi dòng là một ảnh, hoặc ngăn cách prompt nhiều dòng bằng ---"></textarea>
          <div class="cgptiq-prompt-actions">
            <button id="cgptiq-add-prompt" type="button">Thêm lệnh</button>
            <button id="cgptiq-clear-prompts" type="button">Xóa rỗng</button>
          </div>
          <div id="cgptiq-prompt-list" class="cgptiq-prompt-list" aria-label="Danh sách prompt"></div>
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
        <div class="cgptiq-small">Mẹo: dán danh sách prompt, tool sẽ tự đánh số. Có thể dán dạng 1., 2., -, *; khi gửi tool tự bỏ ký hiệu đầu dòng. Prompt nhiều dòng thì ngăn cách bằng ---.</div>
      </div>
    `;
  }

  function fillSettings(settings) {
    document.querySelector("#cgptiq-prompts").value = settings.prompts;
    const prompts = parsePromptText(settings.prompts);
    document.querySelector("#cgptiq-paste").value = formatPromptText(prompts);
    renderPromptList(prompts);
    document.querySelector("#cgptiq-ratio").value = settings.ratio;
    document.querySelector("#cgptiq-speed").value = settings.speed;
    document.querySelector("#cgptiq-delay").value = settings.delaySeconds;
    document.querySelector("#cgptiq-start-index").value = settings.startIndex;
  }

  function syncPromptItemsToHidden() {
    const hidden = document.querySelector("#cgptiq-prompts");
    if (!hidden) return;
    hidden.value = serializePromptItems();
  }

  function autoSizePromptField(field) {
    field.style.height = "auto";
    field.style.height = `${Math.min(Math.max(field.scrollHeight, 44), 160)}px`;
  }

  function updatePromptCount() {
    const count = document.querySelectorAll(".cgptiq-prompt-item").length;
    const label = document.querySelector("#cgptiq-prompt-count");
    if (label) label.textContent = `${count} lệnh`;
  }

  function renderPromptList(prompts) {
    const list = document.querySelector("#cgptiq-prompt-list");
    if (!list) return;

    list.innerHTML = "";
    prompts.forEach((prompt, index) => {
      list.appendChild(createPromptItem(prompt, index));
    });
    updatePromptCount();
    syncPromptItemsToHidden();
  }

  function renumberPromptItems() {
    document.querySelectorAll(".cgptiq-prompt-index").forEach((button, index) => {
      button.textContent = String(index + 1);
      button.title = `Sửa prompt ${index + 1}`;
    });
    updatePromptCount();
  }

  function createPromptItem(prompt, index) {
    const item = document.createElement("div");
    item.className = "cgptiq-prompt-item";

    const indexButton = document.createElement("button");
    indexButton.className = "cgptiq-prompt-index";
    indexButton.type = "button";
    indexButton.textContent = String(index + 1);
    indexButton.title = `Sửa prompt ${index + 1}`;

    const field = document.createElement("textarea");
    field.className = "cgptiq-prompt-text";
    field.spellcheck = false;
    field.value = prompt;

    const removeButton = document.createElement("button");
    removeButton.className = "cgptiq-prompt-remove";
    removeButton.type = "button";
    removeButton.textContent = "x";
    removeButton.title = "Xóa prompt";

    indexButton.addEventListener("click", () => {
      field.focus();
      field.select();
    });
    field.addEventListener("input", () => {
      autoSizePromptField(field);
      syncPromptItemsToHidden();
      document.querySelector("#cgptiq-paste").value = formatPromptText(parsePromptText(document.querySelector("#cgptiq-prompts").value));
      saveSettings(getSettingsFromPanel());
    });
    removeButton.addEventListener("click", () => {
      item.remove();
      renumberPromptItems();
      syncPromptItemsToHidden();
      document.querySelector("#cgptiq-paste").value = formatPromptText(parsePromptText(document.querySelector("#cgptiq-prompts").value));
      saveSettings(getSettingsFromPanel());
    });

    item.append(indexButton, field, removeButton);
    requestAnimationFrame(() => autoSizePromptField(field));
    return item;
  }

  function appendPrompt(prompt = "") {
    const list = document.querySelector("#cgptiq-prompt-list");
    const item = createPromptItem(prompt, list.children.length);
    list.appendChild(item);
    renumberPromptItems();
    syncPromptItemsToHidden();
    document.querySelector("#cgptiq-paste").value = formatPromptText(parsePromptText(document.querySelector("#cgptiq-prompts").value));
    const field = item.querySelector(".cgptiq-prompt-text");
    field.focus();
  }

  function bindPanelEvents(panel) {
    panel.querySelectorAll("input, select").forEach((field) => {
      field.addEventListener("change", () => saveSettings(getSettingsFromPanel()));
      field.addEventListener("input", () => saveSettings(getSettingsFromPanel()));
    });

    document.querySelector("#cgptiq-paste").addEventListener("input", (event) => {
      const prompts = parsePromptText(event.target.value);
      renderPromptList(prompts);
      saveSettings(getSettingsFromPanel());
    });
    document.querySelector("#cgptiq-paste").addEventListener("paste", () => {
      setTimeout(() => {
        const pasteField = document.querySelector("#cgptiq-paste");
        const prompts = parsePromptText(pasteField.value);
        pasteField.value = formatPromptText(prompts);
        renderPromptList(prompts);
        saveSettings(getSettingsFromPanel());
      }, 0);
    });
    document.querySelector("#cgptiq-add-prompt").addEventListener("click", () => {
      appendPrompt("");
      saveSettings(getSettingsFromPanel());
    });
    document.querySelector("#cgptiq-clear-prompts").addEventListener("click", () => {
      document.querySelector("#cgptiq-paste").value = "";
      renderPromptList([]);
      saveSettings(getSettingsFromPanel());
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
