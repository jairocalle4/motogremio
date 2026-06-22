export function generateColorShades(baseHex: string) {
  const hexToRgb = (hex: string) => {
    let r = 0, g = 0, b = 0
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16)
      g = parseInt(hex[2] + hex[2], 16)
      b = parseInt(hex[3] + hex[3], 16)
    } else if (hex.length === 7) {
      r = parseInt(hex.substring(1, 3), 16)
      g = parseInt(hex.substring(3, 5), 16)
      b = parseInt(hex.substring(5, 7), 16)
    }
    return [r, g, b]
  }

  const mix = (color1: number[], color2: number[], weight: number) => {
    return color1.map((c1, i) => Math.round(c1 + (color2[i] - c1) * weight))
  }

  const base = hexToRgb(baseHex)
  const white = [255, 255, 255]
  const black = [0, 0, 0]

  return {
    50: mix(white, base, 0.1),
    100: mix(white, base, 0.2),
    200: mix(white, base, 0.4),
    300: mix(white, base, 0.6),
    400: mix(white, base, 0.8),
    500: base,
    600: mix(black, base, 0.2),
    700: mix(black, base, 0.4),
    800: mix(black, base, 0.6),
    900: mix(black, base, 0.8),
    950: mix(black, base, 0.9),
  }
}
