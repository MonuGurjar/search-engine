export function getSphereMetrics(w: number, h: number) {
  const isMobile = w <= 640
  const isLg = w >= 1024

  // Explicit, deterministic sphere diameter matching 1:1 cropped middle-sphere asset
  const sphereD = isMobile
    ? Math.min(290, Math.max(240, Math.round(w * 0.65)))
    : Math.min(460, Math.max(240, Math.round(Math.min(w * 0.44, h * 0.46))))

  // Top offset
  const sphereTopRatio = isMobile ? 0.09 : w <= 768 ? 0.06 : 0.07
  const sphereTop = Math.round(h * sphereTopRatio)
  const sphereCenterY = Math.round(sphereTop + sphereD / 2)
  const sphereBottom = sphereTop + sphereD

  // Target header capsule dimensions
  const margin = isMobile ? 8 : isLg ? 24 : 16
  const targetWidth = w - 2 * margin
  const targetHeight = isMobile ? 54 : 58
  const targetCenterY = isMobile ? 33 : 37

  return {
    isMobile,
    isLg,
    sphereD,
    sphereTop,
    sphereCenterY,
    sphereBottom,
    targetWidth,
    targetHeight,
    targetCenterY,
  }
}
