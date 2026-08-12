import type { BeautyFilterParams } from './types';

// ── Skin-tone detection ──────────────────────────────────────────
// Detects pixels that fall within a typical skin-tone range in YCbCr space.
function isSkinPixel(r: number, g: number, b: number): boolean {
  // YCbCr conversion — skin detection works better in this color space
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

  // Standard skin-tone ranges
  return cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173 && y > 40;
}

// ── Bilateral-approximation skin smoothing ────────────────────────
// Blends each skin pixel toward a box-blurred neighborhood average,
// weighted by both skin mask and color similarity to preserve edges.
function applySkinSmoothing(
  src: Uint8ClampedArray,
  width: number,
  height: number,
  intensity: number,
): Uint8ClampedArray {
  if (intensity <= 0) return src;

  const radius = 3;
  const result = new Uint8ClampedArray(src);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = src[idx];
      const g = src[idx + 1];
      const b = src[idx + 2];

      if (!isSkinPixel(r, g, b)) continue;

      let sumR = 0, sumG = 0, sumB = 0, count = 0;

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

          const nIdx = (ny * width + nx) * 4;
          const nr = src[nIdx];
          const ng = src[nIdx + 1];
          const nb = src[nIdx + 2];

          // Only blend with similar-colored pixels (edge-preserving)
          const colorDiff = Math.abs(nr - r) + Math.abs(ng - g) + Math.abs(nb - b);
          if (colorDiff < 60) {
            sumR += nr;
            sumG += ng;
            sumB += nb;
            count++;
          }
        }
      }

      if (count > 0) {
        const blend = intensity;
        result[idx] = Math.round(r * (1 - blend) + (sumR / count) * blend);
        result[idx + 1] = Math.round(g * (1 - blend) + (sumG / count) * blend);
        result[idx + 2] = Math.round(b * (1 - blend) + (sumB / count) * blend);
      }
    }
  }

  return result;
}

// ── Soft glow ────────────────────────────────────────────────────
// Adds a brightened, blurred copy of the image on top (screen blend)
// to create a luminous, radiant look on highlights.
function applyGlow(
  src: Uint8ClampedArray,
  width: number,
  height: number,
  intensity: number,
): Uint8ClampedArray {
  if (intensity <= 0) return src;

  // Simple downscale-blur for the glow layer
  const glowR = new Float32Array(width * height);
  const glowG = new Float32Array(width * height);
  const glowB = new Float32Array(width * height);

  const radius = 4;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, count = 0;
      for (let dy = -radius; dy <= radius; dy += 2) {
        for (let dx = -radius; dx <= radius; dx += 2) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const nIdx = (ny * width + nx) * 4;
          r += src[nIdx];
          g += src[nIdx + 1];
          b += src[nIdx + 2];
          count++;
        }
      }
      const i = y * width + x;
      glowR[i] = (r / count) * 1.3;
      glowG[i] = (g / count) * 1.3;
      glowB[i] = (b / count) * 1.3;
    }
  }

  // Screen blend: result = 1 - (1-a)*(1-b)
  const result = new Uint8ClampedArray(src);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const sr = glowR[i] / 255;
    const sg = glowG[i] / 255;
    const sb = glowB[i] / 255;
    result[idx] = Math.min(255, Math.round((1 - (1 - src[idx] / 255) * (1 - sr)) * 255 * intensity + src[idx] * (1 - intensity)));
    result[idx + 1] = Math.min(255, Math.round((1 - (1 - src[idx + 1] / 255) * (1 - sg)) * 255 * intensity + src[idx + 1] * (1 - intensity)));
    result[idx + 2] = Math.min(255, Math.round((1 - (1 - src[idx + 2] / 255) * (1 - sb)) * 255 * intensity + src[idx + 2] * (1 - intensity)));
  }

  return result;
}

// ── Vignette ─────────────────────────────────────────────────────
// Darkens the edges of the frame for a focused, dramatic look.
function applyVignette(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  intensity: number,
): void {
  if (intensity <= 0) return;

  const cx = width / 2;
  const cy = height / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const normalized = dist / maxDist;
      const factor = 1 - Math.pow(normalized, 2) * intensity;

      const idx = (y * width + x) * 4;
      data[idx] = Math.round(data[idx] * factor);
      data[idx + 1] = Math.round(data[idx + 1] * factor);
      data[idx + 2] = Math.round(data[idx + 2] * factor);
    }
  }
}

// ── Color grading ─────────────────────────────────────────────────
// Applies brightness, contrast, saturation, and warmth adjustments.
function applyColorGrading(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  params: BeautyFilterParams,
): void {
  const { brightness, contrast, saturation, warmth } = params;

  const contrastFactor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Brightness
    r = r * brightness;
    g = g * brightness;
    b = b * brightness;

    // Contrast
    r = contrastFactor * (r - 128) + 128;
    g = contrastFactor * (g - 128) + 128;
    b = contrastFactor * (b - 128) + 128;

    // Saturation
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    r = gray + (r - gray) * saturation;
    g = gray + (g - gray) * saturation;
    b = gray + (b - gray) * saturation;

    // Warmth: shift toward red/yellow (positive) or blue (negative)
    r = r + warmth * 30;
    b = b - warmth * 30;

    data[i] = Math.max(0, Math.min(255, r));
    data[i + 1] = Math.max(0, Math.min(255, g));
    data[i + 2] = Math.max(0, Math.min(255, b));
  }
}

// ── Main beauty filter function ───────────────────────────────────
// Applies all beauty processing steps to a canvas in-place.
// This is called per-frame during video recording and preview.
export function applyBeautyFilter(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  width: number,
  height: number,
  params: BeautyFilterParams,
): void {
  // First draw the source frame
  ctx.filter = params.blur > 0 ? `blur(${params.blur}px)` : 'none';
  ctx.drawImage(source, 0, 0, width, height);
  ctx.filter = 'none';

  // Get pixel data for processing
  const imageData = ctx.getImageData(0, 0, width, height);
  let data = imageData.data;

  // Step 1: Skin smoothing (edge-preserving)
  data = applySkinSmoothing(data, width, height, params.skinSmooth);

  // Step 2: Glow (screen blend of brightened blur)
  data = applyGlow(data, width, height, params.glow);

  // Step 3: Color grading (brightness, contrast, saturation, warmth)
  applyColorGrading(data, width, height, params);

  // Step 4: Vignette
  applyVignette(data, width, height, params.vignette);

  // Write processed pixels back
  ctx.putImageData(new ImageData(data, width, height), 0, 0);
}
