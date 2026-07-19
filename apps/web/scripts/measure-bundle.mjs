// 프리렌더 HTML 이 참조하는 JS 청크를 gzip 합산해 라우트별 First Load JS 를 근사한다(#204 방법).
// 사용: node scripts/measure-bundle.mjs
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const APP = ".next/server/app";
const STATIC = ".next";

const ROUTES = {
  "/ (홈)": "index.html",
  "/events": "events.html",
  "/news": "news.html",
  "/sermons": "sermons.html",
  "/about": "about.html",
  "/login": "login.html",
  "/mypage": "mypage.html",
  "/notifications": "notifications.html",
};

const gzipCache = new Map();
function gz(path) {
  if (gzipCache.has(path)) return gzipCache.get(path);
  const full = join(STATIC, path.replace(/^\//, ""));
  if (!existsSync(full)) return 0;
  const n = gzipSync(readFileSync(full)).length;
  gzipCache.set(path, n);
  return n;
}

function chunksOf(htmlFile) {
  const html = readFileSync(join(APP, htmlFile), "utf8");
  const set = new Set();
  // 실제 First Load JS 만 — <script src="..._next/static/....js"> 태그. prefetch/preload <link> 는
  // 추측성이라 제외한다(포함하면 라우트가 링크한 다른 라우트 청크까지 섞여 수치가 부풀려진다).
  const re = /<script[^>]*\bsrc="[^"]*_next\/(static\/[^"'?]+\.js)/g;
  let m;
  while ((m = re.exec(html))) set.add(m[1]);
  return [...set];
}

const perRoute = {};
const routeChunkSets = {};
for (const [name, file] of Object.entries(ROUTES)) {
  if (!existsSync(join(APP, file))) continue;
  const chunks = chunksOf(file);
  routeChunkSets[name] = new Set(chunks);
  perRoute[name] = chunks.reduce((s, c) => s + gz(c), 0);
}

// 공유 floor = 모든 측정 라우트에 공통으로 등장하는 청크의 gzip 합
const names = Object.keys(routeChunkSets);
let shared = null;
for (const n of names) {
  shared = shared === null ? new Set(routeChunkSets[n]) : new Set([...shared].filter((c) => routeChunkSets[n].has(c)));
}
const sharedBytes = [...(shared ?? [])].reduce((s, c) => s + gz(c), 0);

const kb = (b) => (b / 1024).toFixed(1) + " KB";
console.log("공유 floor (전 라우트 공통 청크 gzip 합):", kb(sharedBytes), `(${shared?.size ?? 0} chunks)`);
console.log("---- 라우트별 First Load JS (gzip) ----");
for (const n of names) console.log(n.padEnd(20), kb(perRoute[n]));
