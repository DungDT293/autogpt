window.CGPTIQ = window.CGPTIQ || {};

(() => {
  const { uploadImageFile } = window.CGPTIQ.chatgpt;

  const state = {
    mode: "none",
    files: []
  };

  function setMode(mode) {
    state.mode = mode;
  }

  function setFiles(fileList) {
    state.files = [...fileList]
      .filter((file) => file.type.startsWith("image/"))
      .sort((a, b) => {
        const aPath = a.webkitRelativePath || a.name;
        const bPath = b.webkitRelativePath || b.name;
        return aPath.localeCompare(bPath, undefined, { numeric: true, sensitivity: "base" });
      });
  }

  function clearFiles() {
    state.files = [];
  }

  function getFileForPrompt(promptIndex) {
    if (state.mode === "none" || !state.files.length) return null;
    if (state.mode === "same") return state.files[0];
    if (state.mode === "sequence") return state.files[promptIndex] || null;
    return null;
  }

  async function uploadForPrompt(promptIndex) {
    const file = getFileForPrompt(promptIndex);
    if (!file) return { uploaded: false, name: "" };

    await uploadImageFile(file);
    return { uploaded: true, name: file.webkitRelativePath || file.name };
  }

  window.CGPTIQ.images = {
    clearFiles,
    setFiles,
    setMode,
    state,
    uploadForPrompt
  };
})();
