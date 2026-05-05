import Bredkorn from "./dist/index.js";
const editor = new Bredkorn(document.querySelector(".editor"), {theme: "cs-dark-plus"})
await editor.init()