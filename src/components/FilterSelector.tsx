import { useRef, useEffect, useCallback } from 'react';
import { FILTERS } from '@/lib/constants';
import type { FilterPreset } from '@/lib/types';

interface FilterSelectorProps {
  selectedFilter: FilterPreset;
  onSelect: (filter: FilterPreset) => void;
}

// A small live-preview thumbnail for each filter, rendered via canvas
// so beauty filters show their actual visual effect.
function FilterThumbnail({ filter, isActive }: { filter: FilterPreset; isActive: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const startPreview = useCallback(async () => {
    try {
      if (!streamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 128 }, height: { ideal: 128 } },
          audio: false,
        });
        streamRef.current = stream;
        const video = document.createElement('video');
        video.srcObject = stream;
        video.playsInline = true;
        video.muted = true;
        await video.play().catch(() => {});
        videoRef.current = video;
      }

      const draw = () => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video || video.videoWidth === 0) {
          rafRef.current = requestAnimationFrame(draw);
          return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const size = 56;
        canvas.width = size;
        canvas.height = size;

        // Center-crop the video to a square
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const side = Math.min(vw, vh);
        const sx = (vw - side) / 2;
        const sy = (vh - side) / 2;

        if (filter.beauty) {
          // Draw cropped frame then apply beauty processing
          ctx.drawImage(video, sx, sy, side, side, 0, 0, size, size);
          const imageData = ctx.getImageData(0, 0, size, size);
          // Lightweight beauty preview: just color grading + vignette (skin smoothing
          // is too slow for 8+ thumbnails at once, so we approximate the look)
          const data = imageData.data;
          const { brightness, contrast, saturation, warmth, vignette } = filter.beauty;
          const contrastFactor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
          for (let i = 0; i < data.length; i += 4) {
            let r = data[i] * brightness;
            let g = data[i + 1] * brightness;
            let b = data[i + 2] * brightness;
            r = contrastFactor * (r - 128) + 128;
            g = contrastFactor * (g - 128) + 128;
            b = contrastFactor * (b - 128) + 128;
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            r = gray + (r - gray) * saturation + warmth * 30;
            g = gray + (g - gray) * saturation;
            b = gray + (b - gray) * saturation - warmth * 30;
            if (vignette > 0) {
              const px = (i / 4) % size;
              const py = Math.floor((i / 4) / size);
              const cx = size / 2;
              const cy = size / 2;
              const dist = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2) / (size / 2);
              const factor = 1 - Math.pow(dist, 2) * vignette;
              r *= factor;
              g *= factor;
              b *= factor;
            }
            data[i] = Math.max(0, Math.min(255, r));
            data[i + 1] = Math.max(0, Math.min(255, g));
            data[i + 2] = Math.max(0, Math.min(255, b));
          }
          ctx.putImageData(imageData, 0, 0);
        } else if (filter.cssFilter !== 'none') {
          ctx.filter = filter.cssFilter;
          ctx.drawImage(video, sx, sy, side, side, 0, 0, size, size);
          ctx.filter = 'none';
        } else {
          ctx.drawImage(video, sx, sy, side, side, 0, 0, size, size);
        }

        rafRef.current = requestAnimationFrame(draw);
      };
      draw();
    } catch {
      // Camera not available — show gradient fallback
    }
  }, [filter]);

  const stopPreview = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    videoRef.current = null;
  }, []);

  useEffect(() => {
    // Only run the camera preview for the active filter to save resources
    if (isActive) {
      startPreview();
    } else {
      stopPreview();
    }
    return () => {
      if (isActive) stopPreview();
    };
  }, [isActive, startPreview, stopPreview]);

  return (
    <div
      className={`w-14 h-14 rounded-full overflow-hidden flex items-center justify-center border-2 transition-all ${
        isActive
          ? 'border-amber-400 shadow-lg shadow-amber-400/20'
          : 'border-white/10'
      }`}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover"
        style={{ display: 'block' }}
      />
      {!isActive && (
        <div className={`absolute w-14 h-14 rounded-full bg-gradient-to-br ${filter.thumbnailGradient} flex items-center justify-center`}>
          <span className="text-xs font-medium text-white/90">{filter.name.charAt(0)}</span>
        </div>
      )}
    </div>
  );
}

export function FilterSelector({ selectedFilter, onSelect }: FilterSelectorProps) {
  return (
    <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
      {FILTERS.map((filter) => {
        const isActive = filter.id === selectedFilter.id;
        return (
          <button
            key={filter.id}
            onClick={() => onSelect(filter)}
            className={`flex-shrink-0 flex flex-col items-center gap-1.5 transition-all duration-200 ${
              isActive ? 'scale-105' : 'opacity-60 hover:opacity-90'
            }`}
          >
            <FilterThumbnail filter={filter} isActive={isActive} />
            <span className={`text-[10px] font-medium tracking-wide ${
              isActive ? 'text-amber-400' : 'text-white/50'
            }`}>
              {filter.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
