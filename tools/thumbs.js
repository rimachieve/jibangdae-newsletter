// 인터뷰 썸네일 시리즈: 히어로와 같은 점(도트) 스타일
// node thumbs.js <출력폴더>  → kb/cj/snow .svg + .txt(data URI)
const fs = require('fs');
const path = require('path');
const W = 1200, H = 900, GAP = 15;
const cx = W * 0.64, cy = H * 0.47, R = 320;

function segDist(px, py, ax, ay, bx, by) {
  const vx = bx - ax, vy = by - ay, wx = px - ax, wy = py - ay;
  const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / (vx * vx + vy * vy)));
  return Math.hypot(wx - t * vx, wy - t * vy);
}
const inRect = (u, v, x0, x1, y0, y1) => u >= x0 && u <= x1 && v >= y0 && v <= y1;

// 각 모양: (u, v) = 중심 기준 R 단위 좌표 → null(밖) | 'w'(흰색) | 's'(세이지) | 't'(탠)
const shapes = {
  snow(u, v) {
    if (Math.hypot(u, v) < 0.13) return 'w';
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3 - Math.PI / 2, ux = Math.cos(a), uy = Math.sin(a);
      if (segDist(u, v, 0, 0, ux, uy) < 17 / R) return 'w';
      for (const [at, len] of [[0.42, 0.26], [0.7, 0.19]]) {
        for (const s of [-1, 1]) {
          const b = a + s * Math.PI / 3;
          if (segDist(u, v, ux * at, uy * at, ux * at + Math.cos(b) * len, uy * at + Math.sin(b) * len) < 13 / R) return 'w';
        }
      }
    }
    return null;
  },
  kb(u, v) {
    // 박공지붕(삼각형) + 가운데 동전 구멍
    if (v >= -0.95 && v <= -0.47) {
      const half = ((v + 0.95) / 0.48) * 1.02;
      if (Math.abs(u) <= half) {
        const d = Math.hypot(u, v + 0.64);
        if (d < 0.1) return null;
        if (d < 0.16) return 't';
        return 'w';
      }
    }
    if (inRect(u, v, -0.96, 0.96, -0.43, -0.32)) return 'w';            // 처마
    for (const c of [-0.69, -0.23, 0.23, 0.69]) {                       // 기둥 4개
      if (inRect(u, v, c - 0.085, c + 0.085, -0.25, 0.5)) return 'w';
      if (inRect(u, v, c - 0.12, c + 0.12, -0.29, -0.24)) return 's';
    }
    if (inRect(u, v, -1.0, 1.0, 0.55, 0.66)) return 's';                // 계단
    if (inRect(u, v, -1.12, 1.12, 0.71, 0.83)) return 's';
    return null;
  },
  cj(u, v) {
    // 김(세 줄, 물결)
    for (const k of [-0.36, 0, 0.36]) {
      if (v >= -1.0 && v <= -0.5) {
        const x = k + 0.07 * Math.sin((v + 1.0) * 12 + k * 4);
        if (Math.abs(u - x) < 0.035) return 'w';
      }
    }
    // 밥(윗반원)
    if (v < -0.02 && v > -0.42 && (u * u) / (0.86 * 0.86) + ((v + 0.02) ** 2) / (0.4 * 0.4) <= 1) return 'w';
    // 그릇 테두리
    if (inRect(u, v, -1.02, 1.02, -0.04, 0.06)) return 't';
    // 그릇(아랫반원)
    if (v >= 0.06 && (u * u) / (0.98 * 0.98) + ((v - 0.06) ** 2) / (0.68 * 0.68) <= 1) {
      if (v > 0.3 && v < 0.36) return 't';                               // 그릇 띠
      return 's';
    }
    if (inRect(u, v, -0.34, 0.34, 0.74, 0.86)) return 's';              // 굽
    return null;
  },
};

const DOT = { w: '#F4F2EA', s: '#93A97B', t: '#C9BA8D' };
const font = "-apple-system,BlinkMacSystemFont,'Pretendard Variable',Pretendard,'Apple SD Gothic Neo','Malgun Gothic',sans-serif";

function build(name, label, big, sub, seed0) {
  let seed = seed0;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const groups = {};
  const add = (fill, w, op, x, y) => { const k = fill + "|" + w + "|" + op; (groups[k] = groups[k] || []).push("M" + x.toFixed(1) + " " + y.toFixed(1) + "h0"); };
  for (let y = GAP / 2; y < H; y += GAP) {
    for (let x = GAP / 2; x < W; x += GAP) {
      const u = (x - cx) / R, v = (y - cy) / R;
      const kind = shapes[name](u, v);
      if (kind) {
        let fill = DOT[kind];
        const r = rnd();
        if (kind === 'w' && r > 0.88) fill = DOT.s;                      // 반짝이는 섞임
        else if (kind === 'w' && r > 0.83) fill = DOT.t;
        add(fill, 6, Math.round((0.75 + rnd() * 0.25) * 4) / 4, x, y);
      } else {
        const g = Math.max(0, 1 - Math.hypot(u, v) / 1.35);
        if (g < 0.06) continue;
        add("#F4F2EA", 3.8, Math.max(0.03, Math.round(g * 0.32 * 20) / 20), x, y);
      }
    }
  }
  const sparks = [];
  for (let i = 0; i < 26; i++) {
    const x = rnd() * W, y = rnd() * H;
    if (Math.hypot(x - cx, y - cy) < R * 1.15 || (x < 600 && y > 540)) continue;
    sparks.push(`<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(2 + rnd() * 3).toFixed(1)}" fill="#F4F2EA" fill-opacity="${(0.35 + rnd() * 0.5).toFixed(2)}"/>`);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<defs>
<radialGradient id="glow" cx="${cx}" cy="${cy}" r="${R * 1.3}" gradientUnits="userSpaceOnUse">
<stop offset="0" stop-color="#93A97B" stop-opacity="0.22"/><stop offset="1" stop-color="#93A97B" stop-opacity="0"/>
</radialGradient>
<radialGradient id="orb" cx="0.5" cy="0.5" r="0.5">
<stop offset="0" stop-color="#FFFFFA"/><stop offset="0.38" stop-color="#FFFFFA" stop-opacity="0.95"/><stop offset="1" stop-color="#FFFFFA" stop-opacity="0"/>
</radialGradient>
</defs>
<rect width="${W}" height="${H}" fill="#121411"/>
<rect width="${W}" height="${H}" fill="url(#glow)"/>
${Object.entries(groups).map(([k, d]) => { const [fill, w, op] = k.split("|"); return `<path d="${d.join("")}" stroke="${fill}" stroke-width="${w}" stroke-opacity="${op}" stroke-linecap="round" fill="none"/>`; }).join("")}
${sparks.join('')}
<circle cx="${cx + R * 0.95}" cy="${cy - R * 0.72}" r="46" fill="url(#orb)"/>
<g font-family="${font}">
<text x="64" y="104" font-size="26" font-weight="800" fill="#93A97B" letter-spacing="3" font-family="ui-monospace,Consolas,monospace">${label}</text>
<text x="60" y="742" font-size="148" font-weight="900" fill="#F4F2EA" letter-spacing="-6">${big}</text>
<text x="66" y="828" font-size="58" font-weight="800" fill="#F4F2EA" fill-opacity="0.55" letter-spacing="-2">${sub}</text>
</g>
</svg>`;
  return svg;
}

const out = process.argv[2];
const list = [
  ['kb', 'INTERVIEW 01', 'KB', '국민은행 행원의 기록', 11],
  ['cj', 'INTERVIEW 02', 'CJ', '제일제당 마케터의 기록', 5],
  ['snow', 'INTERVIEW 03', 'SNOW', '인턴 6개월의 기록', 7],
];
for (const [name, label, big, sub, seed] of list) {
  const svg = build(name, label, big, sub, seed);
  fs.writeFileSync(path.join(out, `thumb_${name}.svg`), svg);
  fs.writeFileSync(path.join(out, `thumb_${name}.txt`), 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64'));
  console.log(name, svg.length);
}
