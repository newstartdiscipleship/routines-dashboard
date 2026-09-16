// One-off generator for placeholder app icons. Not part of the app runtime.
"use strict";
var fs = require("fs");
var path = require("path");
var zlib = require("zlib");

function crc32(buf) {
  var table = crc32.table || (crc32.table = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      t[n] = c >>> 0;
    }
    return t;
  })());
  var crc = 0xffffffff;
  for (var i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  var typeBuf = Buffer.from(type, "ascii");
  var lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  var crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgbaPixels) {
  var sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  var ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // raw scanlines, filter byte 0 per row
  var raw = Buffer.alloc((width * 4 + 1) * height);
  var offset = 0;
  for (var y = 0; y < height; y++) {
    raw[offset++] = 0;
    var rowStart = y * width * 4;
    rgbaPixels.copy(raw, offset, rowStart, rowStart + width * 4);
    offset += width * 4;
  }

  var idatData = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idatData),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function hexToRgb(hex) {
  var v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function drawIcon(size) {
  var pixels = Buffer.alloc(size * size * 4);
  var bg = hexToRgb("#3b6ef6");
  var fg = [255, 255, 255];

  var cx = size / 2;
  var cy = size / 2;
  var cornerRadius = size * 0.22;

  function setPixel(x, y, rgb, alpha) {
    var idx = (y * size + x) * 4;
    pixels[idx] = rgb[0];
    pixels[idx + 1] = rgb[1];
    pixels[idx + 2] = rgb[2];
    pixels[idx + 3] = alpha;
  }

  function insideRoundedSquare(x, y) {
    var half = size / 2;
    var dx = Math.abs(x - cx + 0.5);
    var dy = Math.abs(y - cy + 0.5);
    var rx = half - cornerRadius;
    var ry = half - cornerRadius;
    if (dx <= rx || dy <= ry) return true;
    var ex = dx - rx;
    var ey = dy - ry;
    return (ex * ex + ey * ey) <= cornerRadius * cornerRadius;
  }

  // Play-triangle geometry (points right), centered with a slight optical offset.
  var triSize = size * 0.34;
  var triCx = cx + size * 0.03;
  var triCy = cy;
  var p1 = [triCx - triSize * 0.55, triCy - triSize * 0.65];
  var p2 = [triCx - triSize * 0.55, triCy + triSize * 0.65];
  var p3 = [triCx + triSize * 0.75, triCy];

  function sign(p1, p2, p3) {
    return (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1]);
  }

  function insideTriangle(px, py) {
    var pt = [px, py];
    var d1 = sign(pt, p1, p2);
    var d2 = sign(pt, p2, p3);
    var d3 = sign(pt, p3, p1);
    var hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
    var hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
    return !(hasNeg && hasPos);
  }

  for (var y = 0; y < size; y++) {
    for (var x = 0; x < size; x++) {
      if (!insideRoundedSquare(x, y)) {
        setPixel(x, y, bg, 0);
        continue;
      }
      if (insideTriangle(x + 0.5, y + 0.5)) {
        setPixel(x, y, fg, 255);
      } else {
        setPixel(x, y, bg, 255);
      }
    }
  }

  return pixels;
}

var outDir = path.join(__dirname, "..", "icons");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

[192, 512].forEach(function (size) {
  var pixels = drawIcon(size);
  var png = encodePNG(size, size, pixels);
  var outPath = path.join(outDir, "icon-" + size + ".png");
  fs.writeFileSync(outPath, png);
  console.log("wrote " + outPath + " (" + png.length + " bytes)");
});
