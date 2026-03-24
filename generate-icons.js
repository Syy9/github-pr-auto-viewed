/**
 * アイコン生成スクリプト
 * Node.js の Canvas API を使用してPNGアイコンを生成する
 *
 * 使い方:
 *   npm install canvas
 *   node generate-icons.js
 *
 * canvas パッケージが使えない場合はフォールバックとして
 * base64エンコードされた最小PNGを書き出す
 */

const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir);

// canvas パッケージを試みる
let createCanvas;
try {
  ({ createCanvas } = require('canvas'));
} catch (_) {
  createCanvas = null;
}

if (createCanvas) {
  // canvas パッケージを使ってアイコンを描画
  generateWithCanvas();
} else {
  // フォールバック: 最小PNGを直接書き出す
  console.log('canvas パッケージが見つかりません。最小PNGで代替します。');
  generateMinimalPNG();
}

function generateWithCanvas() {
  const sizes = [16, 48, 128];

  for (const size of sizes) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // 背景（GitHub グリーン）
    ctx.fillStyle = '#1a7f37';
    roundRect(ctx, 0, 0, size, size, size * 0.2);
    ctx.fill();

    // チェックマーク（白）
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = size * 0.12;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const pad = size * 0.22;
    const mid = size * 0.52;
    const checkX1 = pad;
    const checkY1 = mid;
    const checkX2 = size * 0.42;
    const checkY2 = size - pad;
    const checkX3 = size - pad;
    const checkY3 = pad;

    ctx.beginPath();
    ctx.moveTo(checkX1, checkY1);
    ctx.lineTo(checkX2, checkY2);
    ctx.lineTo(checkX3, checkY3);
    ctx.stroke();

    const buffer = canvas.toBuffer('image/png');
    const outPath = path.join(iconsDir, `icon${size}.png`);
    fs.writeFileSync(outPath, buffer);
    console.log(`生成: ${outPath}`);
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function generateMinimalPNG() {
  // 最小の緑色 1x1 PNG を各サイズに書き出す（プレースホルダー）
  // 実際の 16x16, 48x48, 128x128 の緑色単色PNG（base64）
  // これらは Python や ImageMagick で生成した最小サイズのPNGです

  // 16x16 緑色PNG (base64)
  const png16 = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAA' +
    'TUlEQVQ4y2NgGAVkAkYGBgYmpv8kGsDIQKoBjAwMDExkGcDIQJoBjAwMDIxkGMDIQJoB' +
    'jAwMDIxkGMDIQJoBjAwMDIxkGMDIQJoBjF8AAJR2AwAW8FutAAAAAElFTkSuQmCC',
    'base64'
  );

  // シンプルな緑の正方形PNGをNode.jsで生成
  writeSolidColorPNG(16, path.join(iconsDir, 'icon16.png'));
  writeSolidColorPNG(48, path.join(iconsDir, 'icon48.png'));
  writeSolidColorPNG(128, path.join(iconsDir, 'icon128.png'));
}

// 指定サイズの緑色PNGをバイナリで書き出す
function writeSolidColorPNG(size, outPath) {
  const png = createSolidPNG(size, size, 26, 127, 55); // #1a7f37
  fs.writeFileSync(outPath, png);
  console.log(`生成（最小PNG）: ${outPath}`);
}

// 純粋なNode.jsでPNGバイナリを生成
function createSolidPNG(width, height, r, g, b) {
  const zlib = require('zlib');

  // PNGシグネチャ
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDRチャンク
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 2;  // color type: RGB
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = makeChunk('IHDR', ihdrData);

  // IDATチャンク（画像データ）
  const rawData = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    const offset = y * (1 + width * 3);
    rawData[offset] = 0; // filter type: None
    for (let x = 0; x < width; x++) {
      rawData[offset + 1 + x * 3 + 0] = r;
      rawData[offset + 1 + x * 3 + 1] = g;
      rawData[offset + 1 + x * 3 + 2] = b;
    }
  }
  const compressed = zlib.deflateSync(rawData);
  const idat = makeChunk('IDAT', compressed);

  // IENDチャンク
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

function makeChunk(type, data) {
  const crc32 = require('zlib').crc32;
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, 'ascii');

  // CRC32計算
  let crc = crc32(typeBuffer);
  crc = crc32(data, crc);

  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc >>> 0, 0);

  return Buffer.concat([len, typeBuffer, data, crcBuffer]);
}
