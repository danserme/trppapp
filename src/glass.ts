// The shared #liquid-glass filter works in objectBoundingBox units, so its refraction scales with the element:
// the wide tab pill bends ~20px at its ends while a 54px circle bends ~4px and reads as flat frost.
// Every other .glass element gets its own displacement map, built in pixels from its size and corner radius,
// so circles and small pills refract their edges as strongly as the end caps of the tab pill.

const NS = "http://www.w3.org/2000/svg"
const filters = new Map<string, string>()
let defs: SVGSVGElement | null = null

function lensMap(w: number, h: number, r: number, band: number, max: number) {
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")!
  const image = ctx.createImageData(w, h)
  const hx = w / 2
  const hy = h / 2
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x + 0.5 - hx
      const py = y + 0.5 - hy
      const qx = Math.abs(px) - (hx - r)
      const qy = Math.abs(py) - (hy - r)
      const ox = Math.max(qx, 0)
      const oy = Math.max(qy, 0)
      const depth = r - Math.hypot(ox, oy) - Math.min(Math.max(qx, qy), 0)
      let nx = 0
      let ny = 0
      if (qx > 0 && qy > 0) {
        const len = Math.hypot(qx, qy)
        nx = (qx / len) * Math.sign(px)
        ny = (qy / len) * Math.sign(py)
      } else if (qx > qy) nx = Math.sign(px)
      else ny = Math.sign(py)
      // Steep at the rim, easing to nothing at the inner edge of the bezel; samples are pulled inward.
      const t = Math.min(Math.max(depth / band, 0), 1)
      const strength = Math.pow(1 - t, 2.2) * 0.5
      const i = (y * w + x) * 4
      image.data[i] = Math.round((0.5 - nx * strength) * 255)
      image.data[i + 1] = Math.round((0.5 - ny * strength) * 255)
      image.data[i + 2] = 128
      image.data[i + 3] = 255
    }
  }
  ctx.putImageData(image, 0, 0)
  return { href: canvas.toDataURL(), scale: max * 2 }
}

function filterFor(w: number, h: number, radius: number) {
  const r = Math.min(radius, w / 2, h / 2)
  const key = `${w}x${h}r${Math.round(r * 2) / 2}`
  const known = filters.get(key)
  if (known) return known
  const band = Math.max(Math.min(r, 30), 8)
  const { href, scale } = lensMap(w, h, r, band, Math.min(12, band * 0.4))
  const id = `lg-${filters.size}`
  if (!defs) {
    defs = document.createElementNS(NS, "svg")
    defs.setAttribute("width", "0")
    defs.setAttribute("height", "0")
    defs.setAttribute("aria-hidden", "true")
    defs.style.position = "absolute"
    document.body.prepend(defs)
  }
  const filter = document.createElementNS(NS, "filter")
  filter.id = id
  for (const [name, value] of Object.entries({ x: 0, y: 0, width: w, height: h, filterUnits: "userSpaceOnUse", primitiveUnits: "userSpaceOnUse", "color-interpolation-filters": "sRGB" })) filter.setAttribute(name, String(value))
  const lens = document.createElementNS(NS, "feImage")
  for (const [name, value] of Object.entries({ href, x: 0, y: 0, width: w, height: h, preserveAspectRatio: "none", result: "lens" })) lens.setAttribute(name, String(value))
  const shift = document.createElementNS(NS, "feDisplacementMap")
  for (const [name, value] of Object.entries({ in: "SourceGraphic", in2: "lens", scale, xChannelSelector: "R", yChannelSelector: "G" })) shift.setAttribute(name, String(value))
  filter.append(lens, shift)
  defs.append(filter)
  filters.set(key, id)
  return id
}

function fit(el: HTMLElement) {
  // offsetWidth ignores transforms, so the press-scale on :active doesn't rebuild the map.
  const w = el.offsetWidth
  const h = el.offsetHeight
  if (!w || !h) return
  const id = filterFor(w, h, parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0)
  el.style.setProperty("--glass-lens", `url(#${id})`)
}

export function startGlass() {
  const sizes = new ResizeObserver((entries) => entries.forEach((entry) => fit(entry.target as HTMLElement)))
  const seen = new WeakSet<Element>()
  const scan = () => {
    for (const el of document.querySelectorAll<HTMLElement>(".glass:not(.tab-pill)")) {
      if (seen.has(el)) continue
      seen.add(el)
      sizes.observe(el)
    }
  }
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] })
  scan()
}
