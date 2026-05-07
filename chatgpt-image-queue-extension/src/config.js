window.CGPTIQ = window.CGPTIQ || {};

window.CGPTIQ.config = {
  panelId: "cgptiq-panel",
  storageKey: "cgptiq-settings",
  ratioLabels: {
    auto: ["Tự động", "Auto"],
    square: ["Vuông 1:1", "Square 1:1"],
    portrait: ["Chân dung 3:4", "Portrait 3:4"],
    tall: ["Tin 9:16", "Story 9:16"],
    landscape: ["Ngang 4:3", "Landscape 4:3"],
    widescreen: ["Màn ảnh rộng 16:9", "Widescreen 16:9"]
  },
  speedLabels: {
    keep: [],
    instant: ["Instant"],
    longer: ["Lâu hơn", "Longer"],
    auto: ["Tự động", "Auto"]
  },
  ratioPromptSuffix: {
    auto: "",
    square: "Aspect ratio 1:1.",
    portrait: "Aspect ratio 3:4.",
    tall: "Aspect ratio 9:16.",
    landscape: "Aspect ratio 4:3.",
    widescreen: "Aspect ratio 16:9."
  },
  ratioValues: {
    auto: "",
    square: "1:1",
    portrait: "3:4",
    tall: "9:16",
    landscape: "4:3",
    widescreen: "16:9"
  },
  defaultSettings: {
    prompts: "",
    ratio: "auto",
    speed: "keep",
    delaySeconds: 45,
    startIndex: 1
  }
};
