// Copies the in-browser video tool (ffmpeg.wasm) into public/ffmpeg so the
// admin's preview maker loads it from this site, not a third-party CDN.
// Runs before `npm run dev` and `npm run build`; public/ffmpeg is gitignored.
import { cpSync, existsSync, mkdirSync } from "node:fs";

const copies = [
  ["node_modules/@ffmpeg/core/dist/esm", "public/ffmpeg/core"],
  ["node_modules/@ffmpeg/ffmpeg/dist/esm", "public/ffmpeg/esm"],
];
for (const [from, to] of copies) {
  if (!existsSync(from)) {
    console.warn(`copy-ffmpeg: ${from} missing (run npm install)`);
    continue;
  }
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true, filter: (p) => !p.endsWith(".d.ts") && !p.endsWith(".d.mts") });
}
console.log("copy-ffmpeg: public/ffmpeg ready");
