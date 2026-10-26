import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function createPng(size) {
  const width = size
  const height = size
  const rawData = Buffer.alloc((width * 4 + 1) * height)

  // Gradient colors
  const color1 = [255, 0, 122]   // #FF007A
  const color2 = [121, 40, 202]  // #7928CA
  const color3 = [0, 112, 243]   // #0070F3

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (width * 4 + 1)
    rawData[rowOffset] = 0 // filter type 0

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4
      const nx = x / (width - 1 || 1)
      const ny = y / (height - 1 || 1)
      const t = (nx + ny) / 2

      // Check distance from center for play triangle or rounded badge
      const cx = x - width / 2
      const cy = y - height / 2
      const r = Math.sqrt(cx * cx + cy * cy)
      const maxR = width * 0.46

      // Rounded rect boundary
      const cornerRadius = width * 0.22
      const inBoxX = Math.abs(cx) <= (width / 2 - cornerRadius)
      const inBoxY = Math.abs(cy) <= (height / 2 - cornerRadius)
      const inCorner = Math.hypot(
        Math.max(0, Math.abs(cx) - (width / 2 - cornerRadius)),
        Math.max(0, Math.abs(cy) - (height / 2 - cornerRadius))
      ) <= cornerRadius

      const insideCard = (inBoxX || inBoxY || inCorner)

      if (!insideCard) {
        // Transparent
        rawData[pixelOffset] = 0
        rawData[pixelOffset + 1] = 0
        rawData[pixelOffset + 2] = 0
        rawData[pixelOffset + 3] = 0
        continue
      }

      // Check if inside play triangle
      // Triangle points: (-0.15w, -0.22h), (-0.15w, 0.22h), (0.22w, 0)
      const px = cx / width
      const py = cy / height
      const inPlay = (px >= -0.14) && (px <= 0.20) && (Math.abs(py) <= (0.20 - px) * 0.7)

      if (inPlay) {
        // White play button
        rawData[pixelOffset] = 255
        rawData[pixelOffset + 1] = 255
        rawData[pixelOffset + 2] = 255
        rawData[pixelOffset + 3] = 255
      } else {
        // Background gradient
        let rVal, gVal, bVal
        if (t < 0.5) {
          const factor = t * 2
          rVal = Math.round(color1[0] * (1 - factor) + color2[0] * factor)
          gVal = Math.round(color1[1] * (1 - factor) + color2[1] * factor)
          bVal = Math.round(color1[2] * (1 - factor) + color2[2] * factor)
        } else {
          const factor = (t - 0.5) * 2
          rVal = Math.round(color2[0] * (1 - factor) + color3[0] * factor)
          gVal = Math.round(color2[1] * (1 - factor) + color3[1] * factor)
          bVal = Math.round(color2[2] * (1 - factor) + color3[2] * factor)
        }

        rawData[pixelOffset] = rVal
        rawData[pixelOffset + 1] = gVal
        rawData[pixelOffset + 2] = bVal
        rawData[pixelOffset + 3] = 255
      }
    }
  }

  const deflated = zlib.deflateSync(rawData)

  function writeChunk(type, data) {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length, 0)

    const typeBuf = Buffer.from(type, 'binary')
    const body = Buffer.concat([typeBuf, data])

    // CRC32
    let crc = 0xFFFFFFFF
    for (let i = 0; i < body.length; i++) {
      crc ^= body[i]
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0)
      }
    }
    crc = (crc ^ 0xFFFFFFFF) >>> 0

    const crcBuf = Buffer.alloc(4)
    crcBuf.writeUInt32BE(crc, 0)

    return Buffer.concat([len, body, crcBuf])
  }

  // PNG Header
  const sig = Buffer.from([137, 80, 78, 72, 13, 10, 26, 10])

  // IHDR Chunk
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type (RGBA)
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace

  const ihdrChunk = writeChunk('IHDR', ihdr)
  const idatChunk = writeChunk('IDAT', deflated)
  const iendChunk = writeChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk])
}

const iconsDir = path.resolve(__dirname, '../icons')
fs.mkdirSync(iconsDir, { recursive: true })

for (const size of [16, 32, 48, 128]) {
  const png = createPng(size)
  const outPath = path.join(iconsDir, `icon${size}.png`)
  fs.writeFileSync(outPath, png)
  console.log(`Generated ${outPath}`)
}

// Generate SVG
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF007A"/>
      <stop offset="50%" stop-color="#7928CA"/>
      <stop offset="100%" stop-color="#0070F3"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="28" fill="url(#g)"/>
  <polygon points="50,38 92,64 50,90" fill="#FFFFFF"/>
</svg>`
fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgContent)
console.log('Generated icon.svg')
