import Bredkorn from "./dist/index.js";
const editor = Bredkorn.getMAPI(document.querySelector(".editor"), {theme: "cs-dark-plus"})
editor.addTheme("dht-bamboo-light", 
    {
        inherit: "cs-dark",
main: {
    bgColor: "#daf5bb",
    lineNumberBgColor: "#a7b992",
    lineBgColor: "#cee7b2",
}
})
editor.addTheme("dht-bamboo-dark", {
    inherit: "cs-dark",
    main: {
        bgColor: "#0f140c",          // bardzo ciemna zieleń (prawie czarna)
        lineNumberBgColor: "#1a2214", // ciemny bambusowy panel
        lineBgColor: "#131a10",       // delikatnie jaśniejsze tło linii
    }
})
await editor.init()
editor.setTheme("cs-dark-plus")

