// The shared #liquid-glass filter works in objectBoundingBox units, so its refraction scales with the element:
// the wide tab pill bends ~20px at its ends while a 54px circle bends ~4px and reads as flat frost.
// Every other .glass element gets its own displacement map, built in pixels from its size and corner radius,
// so circles and small pills refract their edges as strongly as the end caps of the tab pill.

// Chromium renders SVG filters inside backdrop-filter; WebKit doesn't.
export const refracts = /Chrome\//.test(navigator.userAgent)

const NS = "http://www.w3.org/2000/svg"
const filters = new Map<string, string>()
let defs: SVGSVGElement | null = null

// How far the lens pulls the sample under a point (px, py from the centre of a w×h box with corner radius r), as a
// fraction of its strongest pull: steep at the rim, easing to nothing at the inner edge of the bezel, always inward.
function bend(px: number, py: number, hx: number, hy: number, r: number, band: number): [number, number] {
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
  const t = Math.min(Math.max(depth / band, 0), 1)
  const strength = Math.pow(1 - t, 2.2) * 0.5
  return [nx * strength, ny * strength]
}

// The lens's reach for an element: the bezel it bends in and the most it shifts a sample, in px.
function lensSize(w: number, h: number, radius: number) {
  const r = Math.min(radius, w / 2, h / 2)
  const band = Math.max(Math.min(r, 30), 8)
  return { r, band, max: Math.min(12, band * 0.4) }
}

function lensMap(w: number, h: number, r: number, band: number, max: number) {
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")!
  const image = ctx.createImageData(w, h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [bx, by] = bend(x + 0.5 - w / 2, y + 0.5 - h / 2, w / 2, h / 2, r, band)
      const i = (y * w + x) * 4
      image.data[i] = Math.round((0.5 - bx) * 255)
      image.data[i + 1] = Math.round((0.5 - by) * 255)
      image.data[i + 2] = 128
      image.data[i + 3] = 255
    }
  }
  ctx.putImageData(image, 0, 0)
  return { href: canvas.toDataURL(), scale: max * 2 }
}

function filterFor(w: number, h: number, radius: number) {
  const { r, band, max } = lensSize(w, h, radius)
  const key = `${w}x${h}r${Math.round(r * 2) / 2}`
  const known = filters.get(key)
  if (known) return known
  const { href, scale } = lensMap(w, h, r, band, max)
  const id = `lg-${filters.size}`
  const filter = node("filter", { id, x: 0, y: 0, width: w, height: h, filterUnits: "userSpaceOnUse", primitiveUnits: "userSpaceOnUse", "color-interpolation-filters": "sRGB" })
  const lens = node("feImage", { href, x: 0, y: 0, width: w, height: h, preserveAspectRatio: "none", result: "lens" })
  const shift = node("feDisplacementMap", { in: "SourceGraphic", in2: "lens", scale, xChannelSelector: "R", yChannelSelector: "G" })
  filter.append(lens, shift)
  defsRoot().append(filter)
  filters.set(key, id)
  return id
}

function node(name: string, attrs: Record<string, string | number>) {
  const el = document.createElementNS(NS, name)
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value))
  return el
}

function defsRoot() {
  if (!defs) {
    defs = node("svg", { width: 0, height: 0, "aria-hidden": "true" }) as SVGSVGElement
    defs.style.position = "absolute"
    document.body.prepend(defs)
  }
  return defs
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

/* ─────────────────────────────────────────────────────────
 * WebKit can't run an SVG filter inside `backdrop-filter`, and as a plain `filter` it draws only the first element
 * that uses one, so there the glass can't bend what's behind it. Over the map it draws its own backdrop instead:
 * every frame each glass element copies the map pixels behind it, bends them through the same lens Chromium uses, and
 * shows them in a canvas laid under its own surface with the same frost. Over anything else (the drawer, a list, a
 * page) it keeps the plain frosted backdrop-filter.
 * ───────────────────────────────────────────────────────── */

// The copy reaches this far past the element on every side, so the frost blurs real pixels in at its edge rather
// than transparency. Matches the .glass-mirror inset in index.css.
const BLEED = 8

type Mirror = {
  canvas: HTMLCanvasElement
  coat: HTMLElement
  ctx: CanvasRenderingContext2D
  // The map region is drawn here, then read back and remapped through `from` into `out`.
  grab: CanvasRenderingContext2D
  out: ImageData | null
  from: Int32Array
  w: number
  h: number
}

function sizeMirror(el: HTMLElement, mirror: Mirror) {
  const w = el.offsetWidth
  const h = el.offsetHeight
  if (!w || !h || (w === mirror.w && h === mirror.h)) return
  const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0
  // The frost blurs it anyway, so it never needs more than 2 pixels per point.
  const d = Math.min(window.devicePixelRatio || 1, 2)
  const cw = Math.round((w + BLEED * 2) * d)
  const ch = Math.round((h + BLEED * 2) * d)
  Object.assign(mirror, { w, h, out: mirror.ctx.createImageData(cw, ch), from: new Int32Array(cw * ch) })
  mirror.canvas.width = mirror.grab.canvas.width = cw
  mirror.canvas.height = mirror.grab.canvas.height = ch
  el.style.setProperty("--glass-r", `${Math.min(radius, w / 2, h / 2)}px`)
  // For each pixel, the pixel it shows: its own, shifted inward by the lens at the rim (as feDisplacementMap does).
  const { r, band, max } = lensSize(w, h, radius)
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const px = (x + 0.5) / d - BLEED - w / 2
      const py = (y + 0.5) / d - BLEED - h / 2
      const inside = Math.abs(px) < w / 2 && Math.abs(py) < h / 2
      const [bx, by] = inside ? bend(px, py, w / 2, h / 2, r, band) : [0, 0]
      const sx = Math.min(Math.max(Math.round(x - bx * max * 2 * d), 0), cw - 1)
      const sy = Math.min(Math.max(Math.round(y - by * max * 2 * d), 0), ch - 1)
      mirror.from[y * cw + x] = sy * cw + sx
    }
  }
}

// Only a map that keeps its pixels between frames can be copied; any other canvas reads back blank.
const keeps = new WeakMap<HTMLCanvasElement, boolean>()
function readable(canvas: HTMLCanvasElement) {
  let known = keeps.get(canvas)
  if (known === undefined) {
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl")
    known = !!gl?.getContextAttributes()?.preserveDrawingBuffer
    keeps.set(canvas, known)
  }
  return known
}

// Wrappers that paint nothing (the tab bar's row, the map's container) don't hide the map.
function clear(hit: Element) {
  const style = getComputedStyle(hit)
  return style.backgroundImage === "none" && /^(transparent|rgba\(.*,\s*0\))$/.test(style.backgroundColor)
}

// The map canvas the element sits on, if it is the map all the way across; anything painted in between (the drawer,
// a sheet) means the glass is over the page, not the map.
function canvasUnder(el: HTMLElement, box: DOMRect) {
  let found: HTMLCanvasElement | null = null
  const y = box.top + box.height / 2
  for (const x of [box.left + 4, box.left + box.width / 2, box.right - 4]) {
    const under = document.elementsFromPoint(x, y).find((hit) => !el.contains(hit) && (hit instanceof HTMLCanvasElement || !clear(hit)))
    if (!(under instanceof HTMLCanvasElement) || (found && under !== found) || !readable(under)) return null
    found = under
  }
  return found
}

function paint(el: HTMLElement, mirror: Mirror) {
  const box = el.getBoundingClientRect()
  const source = mirror.out && box.width ? canvasUnder(el, box) : null
  el.toggleAttribute("data-mirror", !!source)
  if (!source || !mirror.out) return
  const from = source.getBoundingClientRect()
  // The element may be scaled (pressed); its box on screen covers that much of the map.
  const k = box.width / mirror.w
  const sx = source.width / from.width
  const sy = source.height / from.height
  const { canvas, grab, out } = mirror
  grab.clearRect(0, 0, canvas.width, canvas.height)
  grab.drawImage(
    source,
    (box.left - BLEED * k - from.left) * sx,
    (box.top - BLEED * k - from.top) * sy,
    (box.width + BLEED * 2 * k) * sx,
    (box.height + BLEED * 2 * k) * sy,
    0,
    0,
    canvas.width,
    canvas.height,
  )
  const pixels = new Uint32Array(grab.getImageData(0, 0, canvas.width, canvas.height).data.buffer)
  const bent = new Uint32Array(out.data.buffer)
  const map = mirror.from
  for (let i = 0; i < map.length; i++) bent[i] = pixels[map[i]]
  mirror.ctx.putImageData(out, 0, 0)
}

export function startMirrorGlass() {
  const mirrors = new Map<HTMLElement, Mirror>()
  const sizes = new ResizeObserver((entries) =>
    entries.forEach((entry) => {
      const mirror = mirrors.get(entry.target as HTMLElement)
      if (mirror) sizeMirror(entry.target as HTMLElement, mirror)
    }),
  )
  const scan = () => {
    for (const el of document.querySelectorAll<HTMLElement>(".glass")) {
      if (mirrors.has(el)) continue
      const canvas = document.createElement("canvas")
      canvas.className = "glass-mirror"
      canvas.setAttribute("aria-hidden", "true")
      const coat = document.createElement("span")
      coat.className = "glass-coat"
      el.prepend(canvas, coat)
      if (getComputedStyle(el).position === "static") el.style.position = "relative"
      const grab = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!
      mirrors.set(el, { canvas, coat, ctx: canvas.getContext("2d")!, grab, out: null, from: new Int32Array(0), w: 0, h: 0 })
      sizes.observe(el)
    }
  }
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] })
  scan()
  const frame = () => {
    for (const [el, mirror] of mirrors) {
      if (!el.isConnected) {
        mirrors.delete(el)
        sizes.unobserve(el)
      } else {
        // React rewrites a text-only element's children wholesale, taking the mirror with them.
        if (mirror.canvas.parentNode !== el) el.prepend(mirror.canvas, mirror.coat)
        paint(el, mirror)
      }
    }
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}
