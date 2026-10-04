// A real phone gets the app full screen instead of the framed iPhone mock-up shown on desktop.
export const isMobile = typeof window !== "undefined" && window.matchMedia("(pointer: coarse) and (max-width: 600px)").matches
