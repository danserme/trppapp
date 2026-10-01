export function bezier(x1: number, y1: number, x2: number, y2: number) {
  const at = (a: number, b: number, t: number) => 3 * a * (1 - t) ** 2 * t + 3 * b * (1 - t) * t * t + t ** 3
  return (x: number) => {
    let [lo, hi] = [0, 1]
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2
      if (at(x1, x2, mid) < x) lo = mid
      else hi = mid
    }
    return at(y1, y2, (lo + hi) / 2)
  }
}

export const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)"
export const POP = "cubic-bezier(0.34, 1.4, 0.64, 1)"
export const easeOut = bezier(0.23, 1, 0.32, 1)
export const pop = bezier(0.34, 1.4, 0.64, 1)

export const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches

export function tween(from: number, to: number, ms: number, ease: (t: number) => number, frame: (value: number) => void) {
  let start = 0
  let id = requestAnimationFrame(function step(now) {
    start ||= now
    const t = Math.min((now - start) / ms, 1)
    frame(from + (to - from) * ease(t))
    if (t < 1) id = requestAnimationFrame(step)
  })
  return () => cancelAnimationFrame(id)
}
