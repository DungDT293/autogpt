window.CGPTIQ = window.CGPTIQ || {};

(() => {
  const { ratioLabels, ratioValues, speedLabels } = window.CGPTIQ.config;
  const {
    clickButtonByText,
    clickElement,
    elementLabel,
    findButtonByText,
    includesAny,
    isOwnPanelElement,
    queryButtons,
    sleep,
    textOf,
    visible
  } = window.CGPTIQ.dom;

  function getComposerInput() {
    const candidates = [
      "#prompt-textarea",
      "[data-testid='composer'] [contenteditable='true']",
      "form [contenteditable='true']",
      "form textarea",
      "main textarea",
      "textarea",
      "main [contenteditable='true']",
      "[contenteditable='true']"
    ];

    for (const selector of candidates) {
      const elements = [...document.querySelectorAll(selector)]
        .filter((element) => visible(element) && !isOwnPanelElement(element))
        .sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom);
      if (elements[0]) return elements[0];
    }
    return null;
  }

  function getComposerContainer(input = getComposerInput()) {
    if (!input) return null;
    const directContainer = input.closest("form") ||
      input.closest("[data-testid='composer']") ||
      input.closest("[data-testid*='composer']");

    if (directContainer) return directContainer;

    let candidate = input.parentElement;
    while (candidate && candidate !== document.body) {
      const buttons = queryButtons(candidate);
      const hasComposerControls = buttons.some((button) => {
        const label = elementLabel(button);
        return /instant|lâu hơn|longer|tự động|auto|tạo ảnh|image|ảnh/i.test(label);
      });
      if (hasComposerControls) return candidate;
      candidate = candidate.parentElement;
    }

    return input.parentElement;
  }

  function setComposerValue(input, value) {
    input.focus();
    input.click();

    if (input.tagName === "TEXTAREA" || input.tagName === "INPUT") {
      const setter = Object.getOwnPropertyDescriptor(input.constructor.prototype, "value")?.set;
      setter ? setter.call(input, value) : (input.value = value);
      input.dispatchEvent(new InputEvent("beforeinput", { bubbles: true, inputType: "insertText", data: value }));
      input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: " ", code: "Space" }));
      return;
    }

    document.execCommand("selectAll", false, null);
    document.execCommand("delete", false, null);
    input.textContent = "";

    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(input);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);

    input.dispatchEvent(new InputEvent("beforeinput", { bubbles: true, inputType: "insertText", data: value }));
    document.execCommand("insertText", false, value);
    input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
    input.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: " ", code: "Space" }));
  }

  function findSendButton() {
    const input = getComposerInput();
    const composer = getComposerContainer(input) || document;
    const buttons = queryButtons(composer);

    return buttons.find((button) => /composer-submit|send-button|submit-button/i.test(elementLabel(button))) ||
      buttons.find((button) => /send|submit|gửi|gui/i.test(elementLabel(button))) ||
      buttons.find((button) => {
        const rect = button.getBoundingClientRect();
        const inputRect = input?.getBoundingClientRect();
        return button.querySelector("svg") &&
          inputRect &&
          rect.left > inputRect.left &&
          rect.top >= inputRect.top - 8 &&
          rect.bottom <= inputRect.bottom + 24;
      });
  }

  function sendWithEnter(input) {
    const eventOptions = {
      bubbles: true,
      cancelable: true,
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13
    };
    input.focus();
    input.dispatchEvent(new KeyboardEvent("keydown", eventOptions));
    input.dispatchEvent(new KeyboardEvent("keypress", eventOptions));
    input.dispatchEvent(new KeyboardEvent("keyup", eventOptions));
  }

  async function waitForSendReady(timeoutMs = 12000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const button = findSendButton();
      if (button && !button.disabled && button.getAttribute("aria-disabled") !== "true") return button;
      await sleep(250);
    }
    return null;
  }

  function findComposerFileInput() {
    const composer = getComposerContainer() || document;
    return [...composer.querySelectorAll("input[type='file']"), ...document.querySelectorAll("input[type='file']")]
      .filter((input) => !isOwnPanelElement(input))
      .find((input) => /image|\*/i.test(input.accept || "") || input.multiple || input.type === "file");
  }

  async function openUploadMenu() {
    const composer = getComposerContainer() || document;
    const inputRect = getComposerInput()?.getBoundingClientRect();
    const plusButton = queryButtons(composer).find((button) => {
      const rect = button.getBoundingClientRect();
      const label = elementLabel(button);
      const text = textOf(button);
      const isPlusLike = /\+|attach|đính kèm|upload|tải lên|add/i.test(label) || text === "+";
      return isPlusLike &&
        (!inputRect || (rect.left <= inputRect.left + 80 && rect.top >= inputRect.top - 20 && rect.bottom <= inputRect.bottom + 35));
    });

    if (!plusButton) return false;
    clickElement(plusButton);
    return true;
  }

  async function waitForComposerFileInput(timeoutMs = 5000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const input = findComposerFileInput();
      if (input) return input;
      await sleep(150);
    }
    return null;
  }

  async function uploadImageFile(file) {
    if (!file) return true;

    const beforeCount = countComposerAttachments();
    let fileInput = findComposerFileInput();
    if (!fileInput) {
      await openUploadMenu();
      fileInput = await waitForComposerFileInput();
    }
    if (!fileInput) return pasteImageFile(file);

    try {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      fileInput.value = "";
      fileInput.files = transfer.files;
      fileInput.dispatchEvent(new Event("input", { bubbles: true }));
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    } catch {
      return pasteImageFile(file);
    }
    await waitForAttachmentReady(file, beforeCount);
    return true;
  }

  async function pasteImageFile(file) {
    const input = getComposerInput();
    const target = input || getComposerContainer() || document.body;
    const beforeCount = countComposerAttachments();
    const transfer = new DataTransfer();
    transfer.items.add(file);
    const pasteEvent = new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData: transfer
    });

    target.focus?.();
    target.dispatchEvent(pasteEvent);
    await waitForAttachmentReady(file, beforeCount);
    return true;
  }

  function countComposerAttachments() {
    const composer = getComposerContainer() || document;
    return [
      ...composer.querySelectorAll("img, [data-testid*='attachment'], [data-testid*='file'], [aria-label*='image' i], [aria-label*='ảnh' i]")
    ].filter((element) => visible(element) && !isOwnPanelElement(element)).length;
  }

  async function waitForAttachmentReady(file, beforeCount, timeoutMs = 12000) {
    const started = Date.now();
    const fileName = file.name.toLowerCase();
    while (Date.now() - started < timeoutMs) {
      const composer = getComposerContainer() || document;
      const text = textOf(composer).toLowerCase();
      const count = countComposerAttachments();
      if (count > beforeCount || text.includes(fileName)) {
        await sleep(600);
        return true;
      }
      await sleep(250);
    }
    await sleep(1000);
    return false;
  }

  async function ensureImageMode() {
    const promptInput = getComposerInput();
    const placeholder = promptInput?.getAttribute("placeholder") || "";
    if (/hình ảnh|image/i.test(placeholder) || findRatioButton()) return true;

    const composer = getComposerContainer(promptInput) || document;
    const clicked = await clickButtonByText(["Tạo ảnh", "Create image"], 2500, composer) ||
      await clickButtonByText(["Tạo ảnh", "Create image"], 2500) ||
      await openToolFromPlusMenu(["Tạo ảnh", "Create image"]);
    if (!clicked) return false;

    const started = Date.now();
    while (Date.now() - started < 7000) {
      const activeInput = getComposerInput();
      const activePlaceholder = activeInput?.getAttribute("placeholder") || "";
      if (/hình ảnh|image/i.test(activePlaceholder) || findRatioButton()) return true;
      await sleep(250);
    }

    return false;
  }

  async function openToolFromPlusMenu(labels) {
    const composer = getComposerContainer() || document;
    const inputRect = getComposerInput()?.getBoundingClientRect();
    const plusButton = queryButtons(composer).find((button) => {
      const rect = button.getBoundingClientRect();
      const label = elementLabel(button);
      const text = textOf(button);
      const isPlusLike = /\+|attach|đính kèm|upload|tải lên|add/i.test(label) || text === "+";
      return isPlusLike &&
        (!inputRect || (rect.left <= inputRect.left + 80 && rect.top >= inputRect.top - 20 && rect.bottom <= inputRect.bottom + 35));
    });

    if (!plusButton) return false;
    clickElement(plusButton);

    const option = await waitForVisibleOption(labels, 4000);
    if (!option) return false;
    clickElement(option);
    return true;
  }

  function findVisibleOption(labels, extraTokens = []) {
    const needles = [...labels, ...extraTokens].filter(Boolean);
    return [...document.querySelectorAll("[role='menuitem'], [role='option'], [cmdk-item], button, [role='button']")]
      .filter((element) => visible(element) && !isOwnPanelElement(element))
      .find((element) => includesAny(elementLabel(element), needles));
  }

  async function waitForVisibleOption(labels, timeoutMs = 4000, extraTokens = []) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const option = findVisibleOption(labels, extraTokens);
      if (option) return option;
      await sleep(150);
    }
    return null;
  }

  function findRatioButton(root = document) {
    const allRatioLabels = Object.values(ratioLabels).flat();
    const inputRect = getComposerInput()?.getBoundingClientRect();
    const ratioButtons = queryButtons(root).filter((button) => includesAny(elementLabel(button), allRatioLabels));

    if (!inputRect) {
      return ratioButtons[0] || findButtonByText(["Chọn tỷ lệ", "tỷ lệ", "aspect", "ratio"], root);
    }

    return ratioButtons.find((button) => {
      const rect = button.getBoundingClientRect();
      return rect.top >= inputRect.top - 10 &&
        rect.bottom <= inputRect.bottom + 35 &&
        rect.left > inputRect.left &&
        rect.left < inputRect.right;
    }) || ratioButtons[0] || findButtonByText(["Chọn tỷ lệ", "tỷ lệ", "aspect", "ratio"], root);
  }

  async function chooseRatio(ratio) {
    const labels = ratioLabels[ratio] || ratioLabels.auto;
    const ratioValue = ratioValues[ratio] || "";
    const composer = getComposerContainer() || document;

    const current = findButtonByText(labels, composer) || findButtonByText(labels);
    if (current && textOf(current).length < 40) return true;

    const ratioButton = findRatioButton(composer) || findRatioButton();
    if (ratioButton) clickElement(ratioButton);

    const opened = Boolean(ratioButton) ||
      await clickButtonByText(["Tự động", "Auto", "Chọn tỷ lệ", "aspect", "ratio"], 4000, composer) ||
      await clickButtonByText(["Tự động", "Auto", "Chọn tỷ lệ", "aspect", "ratio"], 4000);
    if (!opened) return false;

    const option = await waitForVisibleOption(labels, 5000, [ratioValue]);

    if (option) {
      clickElement(option.closest("button, [role='menuitem'], [role='option'], [cmdk-item], [role='button']") || option);
      await sleep(350);
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      await sleep(150);
      return Boolean(findButtonByText(labels, composer) || findButtonByText(labels)) || true;
    }
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    return false;
  }

  async function chooseSpeed(speed) {
    const labels = speedLabels[speed] || [];
    if (!labels.length) return true;

    const composer = getComposerContainer() || document;
    const alreadySelected = findButtonByText(labels, composer) || findButtonByText(labels);
    if (alreadySelected && textOf(alreadySelected).length < 30) return true;

    const opened = await clickButtonByText(["Instant", "Lâu hơn", "Longer"], 2500, composer) ||
      await clickButtonByText(["Instant", "Lâu hơn", "Longer"], 2500);
    if (!opened) return false;
    await sleep(350);

    const option = await waitForVisibleOption(labels);

    if (option) {
      clickElement(option);
      await sleep(350);
      return true;
    }
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    return false;
  }

  async function submitPrompt(prompt, options = {}) {
    const imageModeReady = options.skipImageMode ? true : await ensureImageMode();
    const finalPrompt = imageModeReady || /^create an image/i.test(prompt) ? prompt : `Create an image:\n${prompt}`;
    await sleep(300);

    const input = getComposerInput();
    if (!input) throw new Error("Không tìm thấy ô nhập prompt.");

    setComposerValue(input, finalPrompt);
    await sleep(500);

    const send = await waitForSendReady();
    if (send) {
      clickElement(send);
      return;
    }

    sendWithEnter(input);
  }

  window.CGPTIQ.chatgpt = {
    chooseRatio,
    chooseSpeed,
    ensureImageMode,
    getComposerContainer,
    getComposerInput,
    uploadImageFile,
    submitPrompt
  };
})();
