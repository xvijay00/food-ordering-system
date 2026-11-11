import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ICONS_DIR = path.resolve(process.cwd(), "public", "icons");

const SVG_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#ea580c" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)" />
  <circle cx="256" cy="256" r="144" fill="none" stroke="#fff7ed" stroke-width="24" />
  <path d="M256 154c38 42 54 74 54 106a54 54 0 1 1-108 0c0-32 16-64 54-106z" fill="#fff7ed" />
  <path d="M256 218c18 22 24 38 24 54a24 24 0 1 1-48 0c0-16 6-32 24-54z" fill="#ea580c" />
</svg>
`;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([length, typeBuf, data, crc]);
}

function encodePng(width, height, rgbaPixels) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rowBytes = width * 4 + 1;
  const raw = Buffer.alloc(rowBytes * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * rowBytes;
    raw[rowStart] = 0; // filter None
    rgbaPixels.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    signature,
    makeChunk("IHDR", ihdr),
    makeChunk("IDAT", compressed),
    makeChunk("IEND", Buffer.alloc(0)),
  ]);
}

function blendColor(dst, src, alpha) {
  const a = Math.max(0, Math.min(1, alpha));
  return [
    Math.round(dst[0] * (1 - a) + src[0] * a),
    Math.round(dst[1] * (1 - a) + src[1] * a),
    Math.round(dst[2] * (1 - a) + src[2] * a),
    255,
  ];
}

function renderBrandIcon(size, maskable) {
  const buf = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const contentScale = maskable ? 0.72 : 0.88;
  const ringRadius = (size / 2) * contentScale * 0.7;
  const ringHalfThickness = size * 0.025 * contentScale;
  const cornerRadius = maskable ? 0 : size * 0.22;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const idx = (y * size + x) * 4;
      const t = (x + y) / (2 * size);
      // Warm amber -> saffron orange gradient
      let color = [
        Math.round(245 * (1 - t) + 234 * t),
        Math.round(158 * (1 - t) + 88 * t),
        Math.round(11 * (1 - t) + 12 * t),
        255,
      ];

      // Rounded-square alpha clip for non-maskable icons
      if (cornerRadius > 0) {
        const dx = Math.max(0, cornerRadius - x, x - (size - 1 - cornerRadius));
        const dy = Math.max(0, cornerRadius - y, y - (size - 1 - cornerRadius));
        const distCorner = Math.hypot(dx, dy);
        if (distCorner > cornerRadius + 1) {
          buf[idx] = 0;
          buf[idx + 1] = 0;
          buf[idx + 2] = 0;
          buf[idx + 3] = 0;
          continue;
        }
        if (distCorner > cornerRadius - 1) {
          const edgeAlpha = Math.max(
            0,
            Math.min(1, (cornerRadius + 0.5 - distCorner) / 1.5)
          );
          buf[idx] = color[0];
          buf[idx + 1] = color[1];
          buf[idx + 2] = color[2];
          buf[idx + 3] = Math.round(edgeAlpha * 255);
          continue;
        }
      }

      const dist = Math.hypot(x - cx, y - cy);
      const ringDist = Math.abs(dist - ringRadius);
      if (ringDist < ringHalfThickness + 1) {
        const alpha = Math.max(
          0,
          Math.min(1, ringHalfThickness + 0.5 - ringDist)
        );
        color = blendColor(color, [255, 247, 237], alpha);
      }

      // Stylized flame emblem centered inside ring
      const nx = (x - cx) / (size * 0.22 * contentScale);
      const ny = (y - cy) / (size * 0.26 * contentScale);
      const flameEnvelope = ny >= -1.15 && ny <= 1.05
        ? Math.sqrt(Math.max(0, 1 - ny * ny * 0.85)) * (ny < 0 ? 0.65 * (ny + 1.15) : 1.0)
        : 0;
      const outerFlame = Math.abs(nx) - flameEnvelope;
      if (outerFlame < 0.04) {
        const alpha = Math.max(0, Math.min(1, (0.04 - outerFlame) * 12));
        color = blendColor(color, [255, 247, 237], alpha);

        const innerEnvelope = flameEnvelope * 0.45;
        const innerFlame = Math.abs(nx) - innerEnvelope;
        if (ny > -0.15 && innerFlame < 0.04) {
          const innerAlpha = Math.max(0, Math.min(1, (0.04 - innerFlame) * 12));
          color = blendColor(color, [234, 88, 12], innerAlpha);
        }
      }

      buf[idx] = color[0];
      buf[idx + 1] = color[1];
      buf[idx + 2] = color[2];
      buf[idx + 3] = color[3];
    }
  }

  return encodePng(size, size, buf);
}

fs.mkdirSync(ICONS_DIR, { recursive: true });
fs.writeFileSync(path.join(ICONS_DIR, "icon.svg"), SVG_ICON, "utf8");
fs.writeFileSync(path.join(ICONS_DIR, "icon-192.png"), renderBrandIcon(192, false));
fs.writeFileSync(path.join(ICONS_DIR, "icon-512.png"), renderBrandIcon(512, false));
fs.writeFileSync(
  path.join(ICONS_DIR, "icon-maskable-512.png"),
  renderBrandIcon(512, true)
);
fs.writeFileSync(
  path.join(ICONS_DIR, "apple-touch-icon.png"),
  renderBrandIcon(180, true)
);

console.log(`Generated PWA icons in ${ICONS_DIR}`);

