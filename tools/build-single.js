#!/usr/bin/env node
/* Bundles the site into one self-contained HTML file (CSS and JS inlined).
     node tools/build-single.js                 → dist/nihon.html
     node tools/build-single.js --embed out.html → a page fragment for embedding
       in hosts that supply their own <html>/<head>/<body> skeleton. */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const args = process.argv.slice(2);
const embed = args.includes("--embed");
const outArg = args.find((a) => !a.startsWith("--"));
const out = outArg ? path.resolve(outArg) : path.join(ROOT, "dist", "nihon.html");

const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const safeScript = (js) => js.replace(/<\/script/gi, "<\\/script");

const css = read("css/app.css");
const scripts = (html.match(/<script src="([^"]+)"><\/script>/g) || []).map((tag) => tag.match(/src="([^"]+)"/)[1]);
/* The site serves its own fonts (css/fonts.css, about 9 MB in pieces), too
   much to put inside one file. The claude.ai preview may only load
   stylesheets from Google Fonts, so it takes the same fonts from there; the
   plain one-file copy uses the device's own fonts. */
const GOOGLE_FONTS = "https://fonts.googleapis.com/css2?family=BIZ+UDPGothic:wght@400;700&family=Fira+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Klee+One:wght@600&display=swap";
const fonts = embed ? GOOGLE_FONTS : "";
const dataUri = (rel) => "data:image/png;base64," + fs.readFileSync(path.join(ROOT, rel)).toString("base64");
// Images in the page (the logo) travel inside it too.
const body = html
  .slice(html.indexOf("<body>") + 6, html.indexOf("<script src="))
  .trim()
  .replace(/src="(img\/[^"]+\.png)"/g, (m, rel) => 'src="' + dataUri(rel) + '"');
const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || "日本";
const icon = dataUri("img/favicon-32.png");

// Files the site loads only when needed (kanji stroke order) come along in the one file.
const LAZY = ["js/data/kanji-strokes.js"];
const js = scripts.concat(LAZY).map((src) => "<script>/* " + src + " */\n" + safeScript(read(src)) + "\n</script>").join("\n");
const flag = "<script>window.NI_EMBED = " + (embed ? "true" : "false") + ";</script>";

let page;
if (embed) {
  page = [
    "<title>" + title + "</title>",
    '<meta name="claude:viewport-fit-sides" content="cover">',
    fonts ? '<link rel="stylesheet" href="' + fonts + '">' : "",
    "<style>\n" + css + "\n</style>",
    body,
    flag,
    js,
  ].join("\n");
} else {
  page = [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
    "<title>" + title + "</title>",
    '<link rel="icon" href="' + icon + '">',
    fonts ? '<link rel="stylesheet" href="' + fonts + '">' : "",
    "<style>\n" + css + "\n</style>",
    "</head>",
    "<body>",
    body,
    flag,
    js,
    "</body>",
    "</html>",
  ].join("\n");
}

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, page);
console.log("wrote " + path.relative(process.cwd(), out) + " (" + Math.round(page.length / 1024) + " KB, " + scripts.length + " scripts)");
