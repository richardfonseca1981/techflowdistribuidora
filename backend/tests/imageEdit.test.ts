import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import sharp from "sharp";
import "./setup";

vi.mock("../src/lib/anthropic", () => ({
  isAnthropicConfigured: () => true,
  interpretEditInstruction: vi.fn(),
}));

vi.mock("../src/lib/r2", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/r2")>();
  return {
    ...actual,
    isR2Configured: () => true,
    getObjectBuffer: vi.fn(),
    putObject: vi.fn(),
    deleteObject: vi.fn(),
  };
});

import { createApp } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { cleanDatabase, generateTestToken } from "./helpers";
import { interpretEditInstruction } from "../src/lib/anthropic";
import { getObjectBuffer, putObject, deleteObject } from "../src/lib/r2";

const app = createApp();
const token = generateTestToken();

async function createFixtures() {
  const category = await prisma.category.create({
    data: { name: "Óleo Bruto", slug: "oleo-bruto", attributeSchema: [] },
  });
  const product = await prisma.product.create({
    data: { name: "Produto com foto", slug: "produto-com-foto", categoryId: category.id, price: 10 },
  });
  const image = await prisma.productImage.create({
    data: {
      productId: product.id,
      url: "http://fake.local/products/x/original.png",
      key: "products/x/original.png",
      position: 0,
    },
  });
  return { product, image };
}

beforeEach(async () => {
  await cleanDatabase();
  vi.clearAllMocks();

  const fakeOriginal = await sharp({ create: { width: 20, height: 20, channels: 3, background: "#ff0000" } })
    .png()
    .toBuffer();
  vi.mocked(getObjectBuffer).mockResolvedValue(fakeOriginal);
  vi.mocked(putObject).mockImplementation(async (key: string) => ({ key, publicUrl: `http://fake.local/${key}` }));
  vi.mocked(deleteObject).mockResolvedValue(undefined);
});

afterAll(async () => {
  await cleanDatabase();
  await prisma.$disconnect();
});

describe("Image edit routes (tratamento de foto por IA)", () => {
  it("happy path: gera preview e confirma a edição", async () => {
    const { product, image } = await createFixtures();

    vi.mocked(interpretEditInstruction).mockResolvedValue({
      unclear: false,
      operations: [{ type: "sharpen", intensity: "médio" }],
    });

    const editRes = await request(app)
      .post(`/api/products/${product.id}/images/${image.id}/edit`)
      .set("Authorization", `Bearer ${token}`)
      .send({ instruction: "deixa mais nítida" });

    expect(editRes.status).toBe(201);
    expect(editRes.body.unclear).toBe(false);
    expect(editRes.body.previewUrl).toBeTruthy();
    expect(getObjectBuffer).toHaveBeenCalledWith(image.key);
    expect(putObject).toHaveBeenCalledTimes(1);

    const confirmRes = await request(app)
      .post(`/api/products/${product.id}/images/${image.id}/edit/${editRes.body.editId}/confirm`)
      .set("Authorization", `Bearer ${token}`);

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.previousUrl).toBe(image.url);
    expect(confirmRes.body.previousKey).toBe(image.key);
    expect(confirmRes.body.url).toBe(editRes.body.previewUrl);
  });

  it("pedido ambíguo devolve unclear e não cria linha no banco", async () => {
    const { product, image } = await createFixtures();

    vi.mocked(interpretEditInstruction).mockResolvedValue({
      unclear: true,
      suggestion: "Tente algo como 'deixa mais nítida' ou 'corta quadrado'",
    });

    const res = await request(app)
      .post(`/api/products/${product.id}/images/${image.id}/edit`)
      .set("Authorization", `Bearer ${token}`)
      .send({ instruction: "faz ela ficar mais bonita" });

    expect(res.status).toBe(200);
    expect(res.body.unclear).toBe(true);
    expect(res.body.suggestion).toBeTruthy();
    expect(putObject).not.toHaveBeenCalled();

    const edits = await prisma.productImageEdit.findMany({ where: { productImageId: image.id } });
    expect(edits).toHaveLength(0);
  });

  it("operação fora do range/lista fechada é rejeitada sem execução parcial", async () => {
    const { product, image } = await createFixtures();

    vi.mocked(interpretEditInstruction).mockResolvedValue({
      unclear: false,
      operations: [{ type: "brightness", value: 500 }],
    });

    const res = await request(app)
      .post(`/api/products/${product.id}/images/${image.id}/edit`)
      .set("Authorization", `Bearer ${token}`)
      .send({ instruction: "clareia bastante" });

    expect(res.status).toBe(400);
    expect(putObject).not.toHaveBeenCalled();

    const edits = await prisma.productImageEdit.findMany({ where: { productImageId: image.id } });
    expect(edits).toHaveLength(0);
  });

  it("descarta uma edição pendente", async () => {
    const { product, image } = await createFixtures();

    vi.mocked(interpretEditInstruction).mockResolvedValue({
      unclear: false,
      operations: [{ type: "rotate", degrees: 90 }],
    });

    const editRes = await request(app)
      .post(`/api/products/${product.id}/images/${image.id}/edit`)
      .set("Authorization", `Bearer ${token}`)
      .send({ instruction: "gira 90 graus" });

    const editRow = await prisma.productImageEdit.findUniqueOrThrow({ where: { id: editRes.body.editId } });

    const discardRes = await request(app)
      .post(`/api/products/${product.id}/images/${image.id}/edit/${editRes.body.editId}/discard`)
      .set("Authorization", `Bearer ${token}`);

    expect(discardRes.status).toBe(200);
    expect(discardRes.body.status).toBe("DISCARDED");
    expect(deleteObject).toHaveBeenCalledWith(editRow.previewKey);

    const updatedImage = await prisma.productImage.findUnique({ where: { id: image.id } });
    expect(updatedImage?.url).toBe(image.url);
  });

  it("reverte para a versão anterior e alterna com um novo revert", async () => {
    const { product, image } = await createFixtures();

    vi.mocked(interpretEditInstruction).mockResolvedValue({
      unclear: false,
      operations: [{ type: "contrast", value: 20 }],
    });

    const editRes = await request(app)
      .post(`/api/products/${product.id}/images/${image.id}/edit`)
      .set("Authorization", `Bearer ${token}`)
      .send({ instruction: "mais contraste" });

    await request(app)
      .post(`/api/products/${product.id}/images/${image.id}/edit/${editRes.body.editId}/confirm`)
      .set("Authorization", `Bearer ${token}`);

    const revertRes = await request(app)
      .post(`/api/products/${product.id}/images/${image.id}/revert`)
      .set("Authorization", `Bearer ${token}`);

    expect(revertRes.status).toBe(200);
    expect(revertRes.body.url).toBe(image.url);
    expect(revertRes.body.previousUrl).toBe(editRes.body.previewUrl);

    const revertAgainRes = await request(app)
      .post(`/api/products/${product.id}/images/${image.id}/revert`)
      .set("Authorization", `Bearer ${token}`);

    expect(revertAgainRes.status).toBe(200);
    expect(revertAgainRes.body.url).toBe(editRes.body.previewUrl);
  });

  it("revert sem versão anterior devolve 400", async () => {
    const { product, image } = await createFixtures();

    const res = await request(app)
      .post(`/api/products/${product.id}/images/${image.id}/revert`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it("confirmar ou descartar uma edição já processada devolve 409", async () => {
    const { product, image } = await createFixtures();

    vi.mocked(interpretEditInstruction).mockResolvedValue({
      unclear: false,
      operations: [{ type: "compress", quality: 60 }],
    });

    const editRes = await request(app)
      .post(`/api/products/${product.id}/images/${image.id}/edit`)
      .set("Authorization", `Bearer ${token}`)
      .send({ instruction: "comprime" });

    await request(app)
      .post(`/api/products/${product.id}/images/${image.id}/edit/${editRes.body.editId}/confirm`)
      .set("Authorization", `Bearer ${token}`);

    const secondConfirm = await request(app)
      .post(`/api/products/${product.id}/images/${image.id}/edit/${editRes.body.editId}/confirm`)
      .set("Authorization", `Bearer ${token}`);
    expect(secondConfirm.status).toBe(409);

    const discardAfterConfirm = await request(app)
      .post(`/api/products/${product.id}/images/${image.id}/edit/${editRes.body.editId}/discard`)
      .set("Authorization", `Bearer ${token}`);
    expect(discardAfterConfirm.status).toBe(409);
  });

  it("uma segunda edição confirmada apaga o objeto 'previous' anterior no R2", async () => {
    const { product, image } = await createFixtures();

    vi.mocked(interpretEditInstruction).mockResolvedValue({
      unclear: false,
      operations: [{ type: "sharpen", intensity: "leve" }],
    });

    const firstEdit = await request(app)
      .post(`/api/products/${product.id}/images/${image.id}/edit`)
      .set("Authorization", `Bearer ${token}`)
      .send({ instruction: "primeira edição" });
    await request(app)
      .post(`/api/products/${product.id}/images/${image.id}/edit/${firstEdit.body.editId}/confirm`)
      .set("Authorization", `Bearer ${token}`);

    const secondEdit = await request(app)
      .post(`/api/products/${product.id}/images/${image.id}/edit`)
      .set("Authorization", `Bearer ${token}`)
      .send({ instruction: "segunda edição" });

    vi.mocked(deleteObject).mockClear();

    const secondConfirmRes = await request(app)
      .post(`/api/products/${product.id}/images/${image.id}/edit/${secondEdit.body.editId}/confirm`)
      .set("Authorization", `Bearer ${token}`);

    expect(secondConfirmRes.status).toBe(200);
    // A imagem original (que virou previousKey após a 1ª confirmação) precisa
    // ser apagada antes de ser substituída pela 2ª — senão fica órfã no R2.
    expect(deleteObject).toHaveBeenCalledWith(image.key);
  });

  it("DELETE apaga key, previousKey e previews pendentes no R2", async () => {
    const { product, image } = await createFixtures();

    vi.mocked(interpretEditInstruction).mockResolvedValue({
      unclear: false,
      operations: [{ type: "sharpen", intensity: "leve" }],
    });

    const confirmedEdit = await request(app)
      .post(`/api/products/${product.id}/images/${image.id}/edit`)
      .set("Authorization", `Bearer ${token}`)
      .send({ instruction: "primeira edição" });
    await request(app)
      .post(`/api/products/${product.id}/images/${image.id}/edit/${confirmedEdit.body.editId}/confirm`)
      .set("Authorization", `Bearer ${token}`);

    const pendingEditRes = await request(app)
      .post(`/api/products/${product.id}/images/${image.id}/edit`)
      .set("Authorization", `Bearer ${token}`)
      .send({ instruction: "segunda edição, nunca confirmada" });

    const finalImage = await prisma.productImage.findUniqueOrThrow({ where: { id: image.id } });
    const pendingEdit = await prisma.productImageEdit.findUniqueOrThrow({
      where: { id: pendingEditRes.body.editId },
    });

    vi.mocked(deleteObject).mockClear();

    const deleteRes = await request(app)
      .delete(`/api/products/${product.id}/images/${image.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(deleteRes.status).toBe(204);
    expect(deleteObject).toHaveBeenCalledWith(finalImage.key);
    expect(deleteObject).toHaveBeenCalledWith(finalImage.previousKey);
    expect(deleteObject).toHaveBeenCalledWith(pendingEdit.previewKey);
    expect(deleteObject).toHaveBeenCalledTimes(3);
  });
});
