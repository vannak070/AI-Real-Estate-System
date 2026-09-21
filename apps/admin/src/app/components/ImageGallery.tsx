import { useEffect, useRef, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { ImagePlus, X } from 'lucide-react';
import { Button, Select } from '@era/ui';
import { resolveUploadUrl } from '../../lib/api';

const ASPECT_PRESETS: { label: string; value: number | undefined }[] = [
  { label: 'Standard (4:3)', value: 4 / 3 },
  { label: 'Widescreen (16:9)', value: 16 / 9 },
  { label: 'Square (1:1)', value: 1 },
  { label: 'Free select', value: undefined },
];

/** Long-edge cap on the exported photo — plenty for both admin thumbnails and the customer site later. */
const MAX_OUTPUT_DIMENSION = 1600;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function cropToDataUrl(imageSrc: string, area: Area): Promise<string> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, MAX_OUTPUT_DIMENSION / Math.max(area.width, area.height));
  canvas.width = Math.round(area.width * scale);
  canvas.height = Math.round(area.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas_unsupported');
  ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85);
}

function CropModal({ file, onCancel, onConfirm }: { file: File; onCancel: () => void; onConfirm: (dataUrl: string) => void }) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState<number | undefined>(4 / 3);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result as string);
    reader.readAsDataURL(file);
  }, [file]);

  const confirm = async () => {
    if (!imageSrc || !croppedArea) return;
    setBusy(true);
    try {
      onConfirm(await cropToDataUrl(imageSrc, croppedArea));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-xl rounded-xl bg-white p-4 shadow-2xl">
        <h3 className="mb-3 text-sm font-bold text-[var(--era-navy)]">Crop photo</h3>
        <div className="relative h-80 w-full overflow-hidden rounded-lg bg-gray-900">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_percent, pixels) => setCroppedArea(pixels)}
            />
          )}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Select
            className="w-44"
            value={aspect ?? 'free'}
            onChange={(e) => setAspect(e.target.value === 'free' ? undefined : Number(e.target.value))}
          >
            {ASPECT_PRESETS.map((p) => (
              <option key={p.label} value={p.value ?? 'free'}>
                {p.label}
              </option>
            ))}
          </Select>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1"
            aria-label="Zoom"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={!croppedArea || busy}>
            {busy ? 'Processing…' : 'Use photo'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ImageGallery({
  images,
  canWrite,
  onUpload,
  onRemove,
  emptyHint = 'No photos yet.',
}: {
  images: string[];
  canWrite: boolean;
  onUpload: (dataUrl: string) => void;
  onRemove: (url: string) => void;
  emptyHint?: string;
}) {
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-wrap items-start gap-3">
      {images.map((url) => (
        <div key={url} className="group relative h-24 w-32 flex-shrink-0 overflow-hidden rounded-lg border border-black/5 bg-gray-100">
          <img src={resolveUploadUrl(url)} alt="" className="h-full w-full object-cover" />
          {canWrite && (
            <button
              type="button"
              onClick={() => onRemove(url)}
              className="absolute right-1 top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white group-hover:flex"
              aria-label="Remove photo"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}

      {canWrite ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-24 w-32 flex-shrink-0 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 text-xs text-gray-400 hover:border-[var(--era-navy)] hover:text-[var(--era-navy)]"
        >
          <ImagePlus className="h-5 w-5" />
          Add photo
        </button>
      ) : (
        images.length === 0 && <p className="text-sm text-gray-400">{emptyHint}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) setPendingFile(file);
          e.target.value = '';
        }}
      />

      {pendingFile && (
        <CropModal
          file={pendingFile}
          onCancel={() => setPendingFile(null)}
          onConfirm={(dataUrl) => {
            onUpload(dataUrl);
            setPendingFile(null);
          }}
        />
      )}
    </div>
  );
}
