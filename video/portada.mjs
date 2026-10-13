import puppeteer from "puppeteer-core";
import fs from "fs";
const base = process.argv[2];
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--allow-file-access-from-files"] });
const p = await b.newPage(); await p.goto(base + "/package.json");
const jpg = await p.evaluate(async (src) => {
  const v = document.createElement("video"); v.muted = true; v.src = src; document.body.appendChild(v);
  await new Promise((r) => (v.onloadeddata = r)); v.currentTime = 8; await new Promise((r) => (v.onseeked = r)); await new Promise((r) => setTimeout(r, 150));
  const c = document.createElement("canvas"); c.width = 720; c.height = 1280; c.getContext("2d").drawImage(v, 0, 0, 720, 1280); return c.toDataURL("image/jpeg", 0.85);
}, base + "/out/presentacion.mp4");
fs.writeFileSync("../public/presentacion/portada.jpg", Buffer.from(jpg.split(",")[1], "base64"));
await b.close(); console.log("portada ok");
