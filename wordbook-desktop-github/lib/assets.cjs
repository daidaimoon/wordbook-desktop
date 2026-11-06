const path = require('node:path');
const fs = require('node:fs');
const MIME = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.mp3':'audio/mpeg','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.txt':'text/plain; charset=utf-8','.woff2':'font/woff2'};
function resolveAsset(root, rawUrl) {
  let url, pathname;
  try { url = new URL(rawUrl); pathname = decodeURIComponent(url.pathname); } catch { return null; }
  if (url.protocol !== 'wordbook:' || url.hostname !== 'app' || url.port || url.username || url.password || pathname.includes('\0') || pathname.includes('\\')) return null;
  const target = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!target.startsWith(path.resolve(root) + path.sep)) return null;
  try { if (!fs.statSync(target).isFile()) return null; if (!fs.realpathSync(target).startsWith(fs.realpathSync(root)+path.sep)) return null; } catch { return null; }
  return target;
}
function byteRange(header, size) {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!m || (!m[1] && !m[2]) || !size) return false;
  const start = m[1] ? Number(m[1]) : Math.max(0, size-Number(m[2]));
  const end = m[1] ? (m[2] ? Math.min(Number(m[2]),size-1) : size-1) : size-1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start<0 || start>=size || end<start) return false;
  return {start,end};
}
module.exports={resolveAsset,byteRange,MIME};
