import { useRef, useState } from "react";
import { api, uploadImageToR2 } from "../lib/api";
import type { AiEditOperation, AiEditResponse, ProductImage } from "../types";

interface ImageManagerProps {
  productId: string;
  images: ProductImage[];
  onChange: (images: ProductImage[]) => void;
}

interface EditState {
  instruction: string;
  submitting: boolean;
  error: string | null;
  result: AiEditResponse | null;
}

const EMPTY_EDIT_STATE: EditState = { instruction: "", submitting: false, error: null, result: null };

function describeOperation(op: AiEditOperation): string {
  switch (op.type) {
    case "resize":
      return `redimensionar${op.width ? ` largura ${op.width}px` : ""}${op.height ? ` altura ${op.height}px` : ""}`;
    case "crop":
      return `cortar (${op.aspectRatio}${op.aspectRatio === "custom" ? ` ${op.width}x${op.height}` : ""})`;
    case "brightness":
      return `brilho ${op.value > 0 ? "+" : ""}${op.value}`;
    case "contrast":
      return `contraste ${op.value > 0 ? "+" : ""}${op.value}`;
    case "sharpen":
      return `nitidez ${op.intensity}`;
    case "rotate":
      return `girar ${op.degrees}°`;
    case "compress":
      return `compressão qualidade ${op.quality}`;
    case "convertFormat":
      return `converter para ${op.format}`;
  }
}

export function ImageManager({ productId, images, onChange }: ImageManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editStates, setEditStates] = useState<Record<string, EditState>>({});
  const [revertingId, setRevertingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function getEditState(imageId: string): EditState {
    return editStates[imageId] ?? EMPTY_EDIT_STATE;
  }

  function patchEditState(imageId: string, patch: Partial<EditState>) {
    setEditStates((prev) => ({ ...prev, [imageId]: { ...getEditState(imageId), ...patch } }));
  }

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

  async function handleRequestEdit(imageId: string) {
    const state = getEditState(imageId);
    if (!state.instruction.trim()) return;

    patchEditState(imageId, { submitting: true, error: null, result: null });
    try {
      const result = await api.requestImageEdit(productId, imageId, state.instruction.trim());
      patchEditState(imageId, { submitting: false, result });
    } catch {
      patchEditState(imageId, { submitting: false, error: "Não foi possível interpretar o pedido. Tente novamente." });
    }
  }

  async function handleConfirmEdit(imageId: string, editId: string) {
    patchEditState(imageId, { submitting: true, error: null });
    try {
      const updated = await api.confirmImageEdit(productId, imageId, editId);
      onChange(images.map((img) => (img.id === imageId ? updated : img)));
      setEditStates((prev) => ({ ...prev, [imageId]: EMPTY_EDIT_STATE }));
    } catch {
      patchEditState(imageId, { submitting: false, error: "Não foi possível confirmar a edição." });
    }
  }

  async function handleDiscardEdit(imageId: string, editId: string) {
    patchEditState(imageId, { submitting: true, error: null });
    try {
      await api.discardImageEdit(productId, imageId, editId);
      setEditStates((prev) => ({ ...prev, [imageId]: EMPTY_EDIT_STATE }));
    } catch {
      patchEditState(imageId, { submitting: false, error: "Não foi possível descartar a edição." });
    }
  }

  async function handleRevert(imageId: string) {
    setRevertingId(imageId);
    try {
      const updated = await api.revertImage(productId, imageId);
      onChange(images.map((img) => (img.id === imageId ? updated : img)));
    } catch {
      setError("Não foi possível desfazer a última edição.");
    } finally {
      setRevertingId(null);
    }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-3">
        {images.map((image, index) => {
          const editState = getEditState(image.id);
          const preview = editState.result && !editState.result.unclear ? editState.result : null;

          return (
            <div key={image.id} className="relative w-56 rounded border bg-white p-2 shadow-sm">
              <img src={image.url} alt="" className="h-32 w-full rounded object-cover" />
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

              {image.previousUrl && (
                <button
                  type="button"
                  disabled={revertingId === image.id}
                  onClick={() => handleRevert(image.id)}
                  className="mt-1 w-full rounded border border-slate-300 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  {revertingId === image.id ? "Desfazendo..." : "Desfazer última edição"}
                </button>
              )}

              <div className="mt-2 border-t pt-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Editar com IA</label>
                <textarea
                  value={editState.instruction}
                  onChange={(e) => patchEditState(image.id, { instruction: e.target.value })}
                  placeholder='ex: "deixa mais nítida e corta quadrado"'
                  rows={2}
                  className="w-full resize-none rounded border p-1 text-xs"
                  disabled={editState.submitting}
                />
                <button
                  type="button"
                  onClick={() => handleRequestEdit(image.id)}
                  disabled={editState.submitting || !editState.instruction.trim()}
                  className="mt-1 w-full rounded bg-slate-700 py-1 text-xs text-white disabled:opacity-50"
                >
                  {editState.submitting ? "Processando..." : "Aplicar com IA"}
                </button>

                {editState.error && <p className="mt-1 text-xs text-red-600">{editState.error}</p>}

                {editState.result?.unclear && (
                  <p className="mt-1 rounded bg-amber-50 p-1 text-xs text-amber-700">
                    Não entendi o pedido. {editState.result.suggestion}
                  </p>
                )}

                {preview && (
                  <div className="mt-2 rounded border bg-slate-50 p-1">
                    <p className="mb-1 text-xs text-slate-500">Prévia (original não foi alterada):</p>
                    <img src={preview.previewUrl} alt="Prévia da edição" className="h-24 w-full rounded object-cover" />
                    <p className="mt-1 text-[11px] text-slate-500">
                      {preview.operations.map(describeOperation).join(", ")}
                    </p>
                    <div className="mt-1 flex gap-1">
                      <button
                        type="button"
                        disabled={editState.submitting}
                        onClick={() => handleConfirmEdit(image.id, preview.editId)}
                        className="flex-1 rounded bg-emerald-600 py-1 text-xs text-white disabled:opacity-50"
                      >
                        Confirmar
                      </button>
                      <button
                        type="button"
                        disabled={editState.submitting}
                        onClick={() => handleDiscardEdit(image.id, preview.editId)}
                        className="flex-1 rounded border border-slate-300 py-1 text-xs text-slate-600 disabled:opacity-50"
                      >
                        Descartar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
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
