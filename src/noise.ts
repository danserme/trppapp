// Stamp grain, rebuilt from the Figma "noise-stamps" effect style (two MULTITONE noise effects, normal blend):
//   fine   — noiseSize 0.166px, opacity 25%: hard per-grain speckle, independent random R/G/B per grain
//   coarse — noiseSize 3.19px,  opacity 10%: the same random colours, but smooth, soft colour mottling
// Sizes are in the stamp's own space (the Figma stamp is 64.8px wide), so CSS lays the tiles out in cqw of
// .stamp-art and the grain scales with the stamp exactly as it would in the design.

function canvasTile(size: number, paint: (data: Uint8ClampedArray) => void) {
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")!
  const image = ctx.createImageData(size, size)
  paint(image.data)
  ctx.putImageData(image, 0, 0)
  return new Promise<string>((resolve) => canvas.toBlob((blob) => resolve(blob ? URL.createObjectURL(blob) : ""), "image/png"))
}

// One random colour per grain; the browser averages grains that are smaller than a device pixel, like Figma does.
function fineTile(cells: number) {
  return canvasTile(cells, (data) => {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.random() * 256
      data[i + 1] = Math.random() * 256
      data[i + 2] = Math.random() * 256
      data[i + 3] = 255
    }
  })
}

// Random colours on a wrapping lattice of grains, smoothstep-interpolated so the blobs have no visible cell edges.
function coarseTile(cells: number, pxPerCell: number) {
  const lattice = Array.from({ length: cells * cells }, () => [Math.random() * 256, Math.random() * 256, Math.random() * 256])
  const at = (x: number, y: number) => lattice[((y + cells) % cells) * cells + ((x + cells) % cells)]
  const ease = (t: number) => t * t * (3 - 2 * t)
  const size = cells * pxPerCell
  return canvasTile(size, (data) => {
    for (let y = 0; y < size; y++) {
      const gy = y / pxPerCell
      const y0 = Math.floor(gy)
      const ty = ease(gy - y0)
      for (let x = 0; x < size; x++) {
        const gx = x / pxPerCell
        const x0 = Math.floor(gx)
        const tx = ease(gx - x0)
        const a = at(x0, y0)
        const b = at(x0 + 1, y0)
        const c = at(x0, y0 + 1)
        const d = at(x0 + 1, y0 + 1)
        const i = (y * size + x) * 4
        for (let k = 0; k < 3; k++) {
          const top = a[k] + (b[k] - a[k]) * tx
          const bottom = c[k] + (d[k] - c[k]) * tx
          data[i + k] = top + (bottom - top) * ty
        }
        data[i + 3] = 255
      }
    }
  })
}

export async function startStampNoise() {
  const [fine, coarse] = await Promise.all([fineTile(256), coarseTile(48, 8)])
  const root = document.documentElement.style
  if (fine) root.setProperty("--noise-fine", `url(${fine})`)
  if (coarse) root.setProperty("--noise-coarse", `url(${coarse})`)
}
