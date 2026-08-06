import { useRef, useState } from "react";
import { api, uploadImageToR2 } from "../lib/api";
import type { ProductImage } from "../types";

interface ImageManagerProps {
  productId: string;
  images: ProductImage[];
  onChange: (images: ProductImage[]) => void;
}

export function ImageManager({ productId, images, onChange }: ImageManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const image = await uploadImageToR2(productId, file);
      onChange([...images, image].sort((a, b) => a.position - b.position));
    } catch {
      setError("Não foi possível enviar a imagem. Verifique a configuração do R2.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const reordered = [...images];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    onChange(reordered);

    await api.reorderImages(
      productId,
      reordered.map((img) => img.id)
    );
  }

  async function handleDelete(imageId: string) {
    await api.deleteImage(productId, imageId);
    onChange(images.filter((img) => img.id !== imageId));
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-3">
        {images.map((image, index) => (
          <div key={image.id} className="relative w-32 rounded border bg-white p-1 shadow-sm">
            <img src={image.url} alt="" className="h-24 w-full rounded object-cover" />
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => handleMove(index, -1)}
                className="disabled:opacity-30"
              >
                ↑
              </button>
              <button type="button" onClick={() => handleDelete(image.id)} className="text-red-500">
                remover
              </button>
              <button
                type="button"
                disabled={index === images.length - 1}
                onClick={() => handleMove(index, 1)}
                className="disabled:opacity-30"
              >
                ↓
              </button>
            </div>
          </div>
        ))}
      </div>

      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelected}
        disabled={uploading}
        className="text-sm"
      />
      {uploading && <span className="ml-2 text-sm text-slate-500">Enviando...</span>}
    </div>
  );
}
