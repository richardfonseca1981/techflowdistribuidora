import { randomUUID } from "crypto";
import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../middleware/errorHandler";
import { confirmImageSchema, presignImageSchema, reorderImagesSchema } from "../schemas/product.schema";
import { requestAiEditSchema, interpretResultSchema } from "../schemas/imageEdit.schema";
import { createPresignedUpload, deleteObject, getObjectBuffer, putObject, isR2Configured } from "../lib/r2";
import { interpretEditInstruction, isAnthropicConfigured } from "../lib/anthropic";
import { applyOperations } from "../lib/imageProcessor";

export const imageRouter = Router({ mergeParams: true });

imageRouter.use(requireAuth);

async function ensureProductExists(productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new HttpError(404, "Produto não encontrado");
  return product;
}

async function ensureImageExists(productId: string, imageId: string) {
  const image = await prisma.productImage.findUnique({ where: { id: imageId } });
  if (!image || image.productId !== productId) {
    throw new HttpError(404, "Imagem não encontrada");
  }
  return image;
}

// Passo 1: gera uma URL assinada para o frontend enviar o arquivo direto ao R2
imageRouter.post(
  "/presign",
  asyncHandler(async (req, res) => {
    const { productId } = req.params as { productId: string };
    await ensureProductExists(productId);

    if (!isR2Configured()) {
      throw new HttpError(503, "Upload de imagens não configurado (variáveis R2 ausentes)");
    }

    const { fileName, contentType } = presignImageSchema.parse(req.body);
    const presigned = await createPresignedUpload(productId, fileName, contentType);
    res.json(presigned);
  })
);

// Passo 2: depois do upload direto ao R2 ter sucesso, o frontend confirma
// criando o registro ProductImage com a posição seguinte disponível
imageRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { productId } = req.params as { productId: string };
    await ensureProductExists(productId);

    const { url, key } = confirmImageSchema.parse(req.body);

    const lastImage = await prisma.productImage.findFirst({
      where: { productId },
      orderBy: { position: "desc" },
    });

    const image = await prisma.productImage.create({
      data: { productId, url, key, position: (lastImage?.position ?? -1) + 1 },
    });

    res.status(201).json(image);
  })
);

imageRouter.patch(
  "/reorder",
  asyncHandler(async (req, res) => {
    const { productId } = req.params as { productId: string };
    await ensureProductExists(productId);

    const { order } = reorderImagesSchema.parse(req.body);

    const existing = await prisma.productImage.findMany({
      where: { productId, id: { in: order } },
      select: { id: true },
    });
    if (existing.length !== order.length) {
      throw new HttpError(400, "Lista de imagens inválida para este produto");
    }

    await prisma.$transaction(
      order.map((imageId, index) =>
        prisma.productImage.update({
          where: { id: imageId },
          data: { position: index },
        })
      )
    );

    const images = await prisma.productImage.findMany({
      where: { productId },
      orderBy: { position: "asc" },
    });
    res.json(images);
  })
);

imageRouter.delete(
  "/:imageId",
  asyncHandler(async (req, res) => {
    const { productId, imageId } = req.params as { productId: string; imageId: string };
    await ensureProductExists(productId);
    const image = await ensureImageExists(productId, imageId);

    if (isR2Configured()) {
      await deleteObject(image.key);
      if (image.previousKey) await deleteObject(image.previousKey);

      const pendingEdits = await prisma.productImageEdit.findMany({
        where: { productImageId: imageId, status: "PENDING" },
      });
      for (const edit of pendingEdits) {
        await deleteObject(edit.previewKey);
      }
    }
    await prisma.productImage.delete({ where: { id: imageId } });

    res.status(204).send();
  })
);

// Tratamento de foto sob demanda: o admin descreve em texto o que quer
// fazer, a IA (Claude Haiku 4.5) traduz para uma lista fechada de
// operações, o backend revalida e aplica via Sharp gerando um preview —
// nada aqui sobrescreve a imagem em produção sem confirmação explícita.
imageRouter.post(
  "/:imageId/edit",
  asyncHandler(async (req, res) => {
    const { productId, imageId } = req.params as { productId: string; imageId: string };
    await ensureProductExists(productId);
    const image = await ensureImageExists(productId, imageId);

    if (!isAnthropicConfigured()) {
      throw new HttpError(503, "Edição de imagem por IA não configurada (ANTHROPIC_API_KEY ausente)");
    }
    if (!isR2Configured()) {
      throw new HttpError(503, "Upload de imagens não configurado (variáveis R2 ausentes)");
    }

    const { instruction } = requestAiEditSchema.parse(req.body);

    // Só uma preview ativa por vez: descarta qualquer edição pendente
    // anterior desta imagem antes de gerar uma nova.
    const existingPending = await prisma.productImageEdit.findMany({
      where: { productImageId: imageId, status: "PENDING" },
    });
    for (const old of existingPending) {
      await deleteObject(old.previewKey);
      await prisma.productImageEdit.update({ where: { id: old.id }, data: { status: "DISCARDED" } });
    }

    const raw = await interpretEditInstruction(instruction);
    const result = interpretResultSchema.parse(raw);

    if (result.unclear) {
      return res.json({ unclear: true, suggestion: result.suggestion });
    }

    const originalBuffer = await getObjectBuffer(image.key);
    const applied = await applyOperations(originalBuffer, result.operations);
    const previewKey = `products/${productId}/edits/${randomUUID()}.${applied.extension}`;
    const { publicUrl } = await putObject(previewKey, applied.buffer, applied.contentType);

    const edit = await prisma.productImageEdit.create({
      data: {
        productImageId: imageId,
        instruction,
        operations: result.operations,
        previewUrl: publicUrl,
        previewKey,
        status: "PENDING",
      },
    });

    res.status(201).json({
      unclear: false,
      editId: edit.id,
      previewUrl: edit.previewUrl,
      operations: result.operations,
      instruction,
    });
  })
);

imageRouter.post(
  "/:imageId/edit/:editId/confirm",
  asyncHandler(async (req, res) => {
    const { productId, imageId, editId } = req.params as { productId: string; imageId: string; editId: string };
    await ensureProductExists(productId);
    const image = await ensureImageExists(productId, imageId);

    const edit = await prisma.productImageEdit.findUnique({ where: { id: editId } });
    if (!edit || edit.productImageId !== imageId) {
      throw new HttpError(404, "Edição não encontrada");
    }
    if (edit.status !== "PENDING") {
      throw new HttpError(409, "Esta edição já foi confirmada ou descartada");
    }

    // Só existe undo de 1 nível: se já havia uma versão anterior guardada,
    // ela seria substituída agora, então o objeto dela no R2 precisa ser
    // apagado para não ficar órfão.
    if (image.previousKey) {
      await deleteObject(image.previousKey);
    }

    const [updatedImage] = await prisma.$transaction([
      prisma.productImage.update({
        where: { id: imageId },
        data: { previousUrl: image.url, previousKey: image.key, url: edit.previewUrl, key: edit.previewKey },
      }),
      prisma.productImageEdit.update({ where: { id: editId }, data: { status: "CONFIRMED" } }),
    ]);

    res.json(updatedImage);
  })
);

imageRouter.post(
  "/:imageId/edit/:editId/discard",
  asyncHandler(async (req, res) => {
    const { productId, imageId, editId } = req.params as { productId: string; imageId: string; editId: string };
    await ensureProductExists(productId);
    await ensureImageExists(productId, imageId);

    const edit = await prisma.productImageEdit.findUnique({ where: { id: editId } });
    if (!edit || edit.productImageId !== imageId) {
      throw new HttpError(404, "Edição não encontrada");
    }
    if (edit.status !== "PENDING") {
      throw new HttpError(409, "Esta edição já foi confirmada ou descartada");
    }

    await deleteObject(edit.previewKey);
    const updated = await prisma.productImageEdit.update({ where: { id: editId }, data: { status: "DISCARDED" } });

    res.json(updated);
  })
);

imageRouter.post(
  "/:imageId/revert",
  asyncHandler(async (req, res) => {
    const { productId, imageId } = req.params as { productId: string; imageId: string };
    await ensureProductExists(productId);
    const image = await ensureImageExists(productId, imageId);

    if (!image.previousUrl || !image.previousKey) {
      throw new HttpError(400, "Não há versão anterior para reverter");
    }

    // Swap simétrico: reverter de novo desfaz o revert. Nenhum objeto R2 é
    // apagado, pois os dois já existem no bucket.
    const updated = await prisma.productImage.update({
      where: { id: imageId },
      data: { url: image.previousUrl, key: image.previousKey, previousUrl: image.url, previousKey: image.key },
    });

    res.json(updated);
  })
);
