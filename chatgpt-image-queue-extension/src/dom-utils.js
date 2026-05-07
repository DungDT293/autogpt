window.CGPTIQ = window.CGPTIQ || {};

(() => {
  const { panelId } = window.CGPTIQ.config;

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function textOf(element) {
    return (element?.innerText || element?.textContent || "").replace(/\s+/g, " ").trim();
  }

  function visible(element) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
  }

  function includesAny(text, needles) {
    const normalized = text.toLowerCase();
    return needles.some((needle) => normalized.includes(needle.toLowerCase()));
  }

  function isOwnPanelElement(element) {
    return Boolean(element?.closest?.(`#${panelId}`));
  }

  function elementLabel(element) {
    return [
      element.getAttribute("aria-label"),
      element.getAttribute("data-testid"),
      element.getAttribute("title"),
      textOf(element)
    ].filter(Boolean).join(" ");
  }

  function queryButtons(root = document) {
    return [...root.querySelectorAll("button, [role='button']")]
      .filter((button) => visible(button) && !isOwnPanelElement(button));
  }

  function findButtonByText(labels, root = document) {
    return queryButtons(root).find((button) => includesAny(elementLabel(button), labels));
  }

  async function clickButtonByText(labels, timeoutMs = 5000, root = document) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const button = findButtonByText(labels, root);
      if (button) {
        clickElement(button);
        return true;
      }
      await sleep(250);
    }
    return false;
  }

  function clickElement(element) {
    const rect = element.getBoundingClientRect();
    const options = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2
    };

    element.dispatchEvent(new PointerEvent("pointerdown", { ...options, pointerId: 1, pointerType: "mouse", isPrimary: true }));
    element.dispatchEvent(new MouseEvent("mousedown", options));
    element.dispatchEvent(new PointerEvent("pointerup", { ...options, pointerId: 1, pointerType: "mouse", isPrimary: true }));
    element.dispatchEvent(new MouseEvent("mouseup", options));
    element.dispatchEvent(new MouseEvent("click", options));
  }

  window.CGPTIQ.dom = {
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
  };
})();
