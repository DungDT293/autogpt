window.CGPTIQ = window.CGPTIQ || {};

(() => {
  const { ratioPromptSuffix, ratioValues } = window.CGPTIQ.config;
  const { sleep } = window.CGPTIQ.dom;
  const { chooseRatio, chooseSpeed, ensureImageMode, submitPrompt } = window.CGPTIQ.chatgpt;

  const state = {
    running: false,
    paused: false,
    stop: false,
    index: 0,
    total: 0
  };

  function parsePrompts(raw) {
    const hasSeparator = /(?:^|\r?\n)\s*---+\s*(?:\r?\n|$)/.test(raw);
    const splitter = hasSeparator ? /(?:^|\r?\n)\s*---+\s*(?:\r?\n|$)/ : /\r?\n/;
    return raw.split(splitter)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function applyRatioFallback(prompt, ratio) {
    const suffix = ratioPromptSuffix[ratio];
    const ratioValue = ratioValues[ratio];
    if (!suffix || !ratioValue) return prompt;

    let normalized = prompt
      .replace(/aspect\s+ratio\s*(?:is|:)?\s*(1:1|3:4|9:16|4:3|16:9)\.?/gi, suffix)
      .replace(/(?:tỉ lệ|tỷ lệ)\s*(?:là|:)?\s*(1:1|3:4|9:16|4:3|16:9)\.?/gi, suffix)
      .replace(/\b(1:1|3:4|9:16|4:3|16:9)\b/g, ratioValue);

    if (/aspect ratio|tỉ lệ|tỷ lệ/i.test(normalized) || normalized.includes(ratioValue)) return normalized;
    return `${normalized}\n${suffix}`;
  }

  function buildPrompt(prompt, settings) {
    return settings.ratio === "auto" ? prompt : applyRatioFallback(prompt, settings.ratio);
  }

  async function runQueue(settings, callbacks) {
    if (state.running) return;

    const prompts = parsePrompts(settings.prompts);
    if (!prompts.length) {
      callbacks.setStatus("Chưa có prompt. Nhập mỗi prompt một dòng.");
      return;
    }

    state.running = true;
    state.paused = false;
    state.stop = false;
    state.index = Math.min(settings.startIndex - 1, prompts.length - 1);
    state.total = prompts.length;
    callbacks.updateButtons();

    try {
      const imageModeReady = await ensureImageMode();
      if (!imageModeReady) {
        callbacks.setStatus("Không bật lại được tool Tạo ảnh. Sẽ gửi prompt dạng yêu cầu tạo ảnh để tiếp tục.");
        await sleep(1200);
      }

      const speedChanged = imageModeReady ? await chooseSpeed(settings.speed) : true;
      if (!speedChanged) throw new Error("Không chọn được chế độ tốc độ trên ChatGPT.");

      const ratioChanged = imageModeReady ? await chooseRatio(settings.ratio) : false;
      if (!ratioChanged && settings.ratio !== "auto") {
        callbacks.setStatus("Không mở được menu tỉ lệ. Sẽ thêm tỉ lệ vào cuối prompt để tiếp tục hàng đợi.");
        await sleep(1200);
      } else if (!ratioChanged) {
        throw new Error("Không chọn được tỉ lệ ảnh trên ChatGPT.");
      }

      for (let i = state.index; i < prompts.length; i += 1) {
        if (state.stop) break;
        while (state.paused && !state.stop) {
          callbacks.setStatus(`Đang tạm dừng tại ${i + 1}/${prompts.length}.`);
          await sleep(500);
        }
        if (state.stop) break;

        state.index = i;
        const prompt = buildPrompt(prompts[i], settings);
        callbacks.setStatus(`Đang gửi ${i + 1}/${prompts.length}:\n${prompt}`);
        await submitPrompt(prompt);

        if (i < prompts.length - 1) {
          callbacks.setStatus(`Đã gửi ${i + 1}/${prompts.length}. Chờ ${settings.delaySeconds}s trước prompt tiếp theo.`);
          await sleep(settings.delaySeconds * 1000);
        }
      }

      callbacks.setStatus(state.stop ? `Đã dừng tại ${state.index + 1}/${prompts.length}.` : "Hoàn tất hàng đợi.");
    } catch (error) {
      callbacks.setStatus(`Lỗi: ${error.message}`);
    } finally {
      state.running = false;
      state.paused = false;
      callbacks.updateButtons();
    }
  }

  function pauseOrResume() {
    state.paused = !state.paused;
  }

  function stop() {
    state.stop = true;
    state.paused = false;
  }

  window.CGPTIQ.queue = {
    parsePrompts,
    pauseOrResume,
    runQueue,
    state,
    stop
  };
})();
