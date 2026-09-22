import { useRef, useState } from "react";
import { api, uploadImageToR2 } from "../lib/api";
import type { AiEditOperation, AiEditResponse, ProductImage } from "../types";
import { useToast } from "./Toast";

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

function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={`animate-spin text-[#1B3A6B] ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export function ImageManager({ productId, images, onChange }: ImageManagerProps) {
  const { showToast } = useToast();
  const [uploading, setUploading] = useState(false);
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
    try {
      const image = await uploadImageToR2(productId, file);
      onChange([...images, image].sort((a, b) => a.position - b.position));
      showToast("success", "Imagem enviada com sucesso");
    } catch {
      showToast("error", "Não foi possível enviar a imagem. Verifique a configuração do R2.");
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
    showToast("success", "Imagem removida");
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
      showToast("success", "Edição confirmada");
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
      showToast("success", "Última edição desfeita");
    } catch {
      showToast("error", "Não foi possível desfazer a última edição.");
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
            <div key={image.id} className="relative w-56 rounded-lg border border-[#E2E8F0] bg-white p-2 shadow-sm">
              <img src={image.url} alt="" className="h-32 w-full rounded object-cover" />
              <div className="mt-1 flex items-center justify-between text-xs text-[#64748B]">
                <button type="button" disabled={index === 0} onClick={() => handleMove(index, -1)} className="disabled:opacity-30">
                  ↑
                </button>
                <button type="button" onClick={() => handleDelete(image.id)} className="text-[#EF4444]">
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
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded border border-[#E2E8F0] py-1 text-xs text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-50"
                >
                  {revertingId === image.id ? (
                    <>
                      <Spinner className="h-3.5 w-3.5" /> Desfazendo...
                    </>
                  ) : (
                    "Desfazer última edição"
                  )}
                </button>
              )}

              <div className="mt-2 border-t border-[#E2E8F0] pt-2">
                <label className="mb-1 block text-xs font-medium text-[#1A1A1A]">Editar com IA</label>
                <textarea
                  value={editState.instruction}
                  onChange={(e) => patchEditState(image.id, { instruction: e.target.value })}
                  placeholder='ex: "deixa mais nítida e corta quadrado"'
                  rows={2}
                  className="w-full resize-none rounded border border-[#E2E8F0] p-1 text-xs outline-none focus:border-[#1B3A6B]"
                  disabled={editState.submitting}
                />
                <button
                  type="button"
                  onClick={() => handleRequestEdit(image.id)}
                  disabled={editState.submitting || !editState.instruction.trim()}
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded bg-[#1B3A6B] py-1 text-xs text-white hover:bg-[#152D54] disabled:opacity-50"
                >
                  {editState.submitting ? (
                    <>
                      <Spinner className="h-3.5 w-3.5 text-white" /> Processando...
                    </>
                  ) : (
                    "Aplicar com IA"
                  )}
                </button>

                {editState.error && (
                  <p className="mt-1 rounded border border-[#EF4444] bg-[#FEF2F2] px-1.5 py-1 text-xs text-[#B91C1C]">
                    {editState.error}
                  </p>
                )}

                {editState.result?.unclear && (
                  <p className="mt-1 rounded border border-[#F59E0B] bg-[#FFFBEB] p-1 text-xs text-[#B45309]">
                    Não entendi o pedido. {editState.result.suggestion}
                  </p>
                )}

                {preview && (
                  <div className="mt-2 rounded border border-[#E2E8F0] bg-[#F8FAFC] p-1">
                    <p className="mb-1 text-xs text-[#64748B]">Prévia (original não foi alterada):</p>
                    <img src={preview.previewUrl} alt="Prévia da edição" className="h-24 w-full rounded object-cover" />
                    <p className="mt-1 text-[11px] text-[#64748B]">{preview.operations.map(describeOperation).join(", ")}</p>
                    <div className="mt-1 flex gap-1">
                      <button
                        type="button"
                        disabled={editState.submitting}
                        onClick={() => handleConfirmEdit(image.id, preview.editId)}
                        className="flex-1 rounded bg-[#22C55E] py-1 text-xs text-white hover:opacity-90 disabled:opacity-50"
                      >
                        Confirmar
                      </button>
                      <button
                        type="button"
                        disabled={editState.submitting}
                        onClick={() => handleDiscardEdit(image.id, preview.editId)}
                        className="flex-1 rounded border border-[#E2E8F0] py-1 text-xs text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-50"
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

        {uploading && (
          <div className="flex w-56 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#E2E8F0] bg-[#F8FAFC] p-2">
            <div className="h-32 w-full animate-pulse rounded bg-[#E2E8F0]" />
            <div className="flex items-center gap-2 text-xs text-[#64748B]">
              <Spinner className="h-4 w-4" /> Enviando imagem...
            </div>
          </div>
        )}
      </div>

      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#1A1A1A] hover:bg-[#F8FAFC]">
        {uploading && <Spinner className="h-4 w-4" />}
        <span>{uploading ? "Enviando..." : "Adicionar foto"}</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelected}
          disabled={uploading}
          className="hidden"
        />
      </label>
    </div>
  );
}
