let BredkornModule;

try {
  BredkornModule = await import("./dist/index.js");
} catch {
  BredkornModule = await import("./index.js");
}

// jeśli eksport domyślny, bierzemy go, inaczej cały moduł
const Bredkorn = BredkornModule.default ?? BredkornModule;

const editor = new Bredkorn(document.querySelector(".editor"), {
  theme: "cs-dark-plus",
});

editor.addTheme("dht-bamboo-light", {
  inherit: "cs-dark",
  main: {
    bgColor: "#daf5bb",
    lineNumberBgColor: "#a7b992",
    lineBgColor: "#cee7b2",
  },
});

editor.addTheme("dht-bamboo-dark", {
  inherit: "cs-dark",
  main: {
    bgColor: "#0f140c",
    lineNumberBgColor: "#1a2214",
    lineBgColor: "#131a10",
  },
});

await editor.init();
editor.setTheme("cs-dark-plus");
