import sharp from "sharp";
import type { EditOperation } from "../schemas/imageEdit.schema";

export interface AppliedImageResult {
  buffer: Buffer;
  contentType: string;
  extension: string;
}

const SHARPEN_SIGMA: Record<"leve" | "médio" | "forte", number> = {
  leve: 1,
  "médio": 2,
  forte: 3.5,
};

const ASPECT_RATIOS: Record<"1:1" | "4:3" | "16:9", number> = {
  "1:1": 1,
  "4:3": 4 / 3,
  "16:9": 16 / 9,
};

function byType<T extends EditOperation["type"]>(operations: EditOperation[], type: T) {
  return operations.find((o) => o.type === type) as Extract<EditOperation, { type: T }> | undefined;
}

function computeCropBox(
  sourceWidth: number,
  sourceHeight: number,
  op: Extract<EditOperation, { type: "crop" }>
): { left: number; top: number; width: number; height: number } {
  if (op.aspectRatio === "custom") {
    const width = Math.min(op.width!, sourceWidth);
    const height = Math.min(op.height!, sourceHeight);
    return {
      left: Math.floor((sourceWidth - width) / 2),
      top: Math.floor((sourceHeight - height) / 2),
      width,
      height,
    };
  }

  const ratio = ASPECT_RATIOS[op.aspectRatio];
  let width = sourceWidth;
  let height = Math.round(width / ratio);
  if (height > sourceHeight) {
    height = sourceHeight;
    width = Math.round(height * ratio);
  }
  return {
    left: Math.floor((sourceWidth - width) / 2),
    top: Math.floor((sourceHeight - height) / 2),
    width,
    height,
  };
}

// Aplica as operações validadas numa ordem canônica fixa (independente da
// ordem devolvida pela IA), para resultado determinístico: rotacionar,
// cortar, redimensionar, ajustar brilho/contraste, nitidez, e por fim
// formato/qualidade no encode.
export async function applyOperations(original: Buffer, operations: EditOperation[]): Promise<AppliedImageResult> {
  const meta = await sharp(original).metadata();
  let img = sharp(original);

  const rotate = byType(operations, "rotate");
  let currentWidth = meta.width ?? 0;
  let currentHeight = meta.height ?? 0;
  if (rotate) {
    img = img.rotate(rotate.degrees);
    if (rotate.degrees === 90 || rotate.degrees === 270) {
      [currentWidth, currentHeight] = [currentHeight, currentWidth];
    }
  }

  const crop = byType(operations, "crop");
  if (crop) {
    const box = computeCropBox(currentWidth, currentHeight, crop);
    img = img.extract(box);
    currentWidth = box.width;
    currentHeight = box.height;
  }

  const resize = byType(operations, "resize");
  if (resize) {
    img = img.resize(resize.width, resize.height, { fit: "inside" });
  }

  const brightness = byType(operations, "brightness");
  const contrast = byType(operations, "contrast");
  if (brightness || contrast) {
    if (brightness) {
      img = img.modulate({ brightness: 1 + brightness.value / 100 });
    }
    if (contrast) {
      const a = Math.max(0.01, (100 + contrast.value) / 100);
      img = img.linear(a, 128 * (1 - a));
    }
  }

  const sharpen = byType(operations, "sharpen");
  if (sharpen) {
    img = img.sharpen({ sigma: SHARPEN_SIGMA[sharpen.intensity] });
  }

  const convertFormat = byType(operations, "convertFormat");
  const compress = byType(operations, "compress");
  const format = convertFormat?.format ?? (meta.format as "jpeg" | "png" | "webp" | undefined) ?? "jpeg";
  const quality = compress?.quality;

  const buffer = await img.toFormat(format, quality ? { quality } : undefined).toBuffer();
  const contentType = format === "jpeg" ? "image/jpeg" : `image/${format}`;
  const extension = format === "jpeg" ? "jpg" : format;

  return { buffer, contentType, extension };
}
