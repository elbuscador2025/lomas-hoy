import puppeteer from "puppeteer-core";
import fs from "fs";
const base = process.argv[2]; const src = base + "/out/presentacion.mp4";
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--allow-file-access-from-files", "--autoplay-policy=no-user-gesture-required"] });
const p = await b.newPage(); await p.setViewport({ width: 1600, height: 900 });
await p.goto(base + "/package.json");
const tiempos = process.argv.slice(3).map(Number);
const png = await p.evaluate(async (src, tiempos) => {
  const v = document.createElement("video"); v.muted = true; v.src = src; document.body.appendChild(v);
  await new Promise((r) => (v.onloadeddata = r));
  const w = 240, h = 427, cols = 6, filas = Math.ceil(tiempos.length / cols);
  const c = document.createElement("canvas"); c.width = w * cols; c.height = (h + 22) * filas; const x = c.getContext("2d"); x.fillStyle = "#222"; x.fillRect(0, 0, c.width, c.height);
  for (const [i, t] of tiempos.entries()) {
    v.currentTime = t; await new Promise((r) => (v.onseeked = r)); await new Promise((r) => setTimeout(r, 120));
    const cx = (i % cols) * w, cy = Math.floor(i / cols) * (h + 22);
    x.drawImage(v, cx, cy + 22, w, h); x.fillStyle = "#fff"; x.font = "16px sans-serif"; x.fillText(t.toFixed(1) + " s", cx + 6, cy + 16);
  }
  return c.toDataURL("image/png");
}, src, tiempos);
fs.writeFileSync("out/hoja.png", Buffer.from(png.split(",")[1], "base64"));
await b.close(); console.log("ok", tiempos.length);
