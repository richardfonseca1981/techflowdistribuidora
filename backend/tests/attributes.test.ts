import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import "./setup";
import { createApp } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { cleanDatabase, generateTestToken } from "./helpers";

const app = createApp();
const token = generateTestToken();

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await cleanDatabase();
  await prisma.$disconnect();
});

describe("Flexible product attributes across categories", () => {
  it("allows different categories to accept entirely different attribute keys without a migration", async () => {
    const oleoBruto = await prisma.category.create({
      data: {
        name: "Óleo Bruto",
        slug: "oleo-bruto",
        attributeSchema: [
          { key: "origin", label: "Origem", type: "text" },
          { key: "density", label: "Densidade (API)", type: "number" },
        ],
      },
    });

    const lubrificante = await prisma.category.create({
      data: {
        name: "Lubrificante Automotivo",
        slug: "lubrificante-automotivo",
        attributeSchema: [
          { key: "viscosity", label: "Viscosidade", type: "text" },
          { key: "synthetic", label: "Sintético", type: "boolean" },
        ],
      },
    });

    const crudeRes = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Óleo Bruto Tipo Brent",
        slug: "oleo-bruto-brent",
        categoryId: oleoBruto.id,
        price: 350,
        attributes: { origin: "Mar do Norte", density: 38.06 },
      });

    const lubricantRes = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Lubrificante 5W30",
        slug: "lubrificante-5w30",
        categoryId: lubrificante.id,
        price: 42.9,
        attributes: { viscosity: "5W30", synthetic: true },
      });

    expect(crudeRes.status).toBe(201);
    expect(lubricantRes.status).toBe(201);

    expect(crudeRes.body.attributes).toEqual({ origin: "Mar do Norte", density: 38.06 });
    expect(lubricantRes.body.attributes).toEqual({ viscosity: "5W30", synthetic: true });

    // Um terceiro tipo de óleo, com atributos totalmente novos, também deve
    // funcionar sem qualquer alteração de schema — só criando a categoria.
    const graxa = await prisma.category.create({
      data: {
        name: "Graxa Industrial",
        slug: "graxa-industrial",
        attributeSchema: [{ key: "nlgiGrade", label: "Grau NLGI", type: "text" }],
      },
    });

    const graxaRes = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Graxa Industrial NLGI 2",
        slug: "graxa-industrial-nlgi-2",
        categoryId: graxa.id,
        price: 89.9,
        attributes: { nlgiGrade: "2" },
      });

    expect(graxaRes.status).toBe(201);
    expect(graxaRes.body.attributes).toEqual({ nlgiGrade: "2" });
  });

  it("stores category.attributeSchema as a soft hint, not an enforced constraint", async () => {
    const category = await prisma.category.create({
      data: {
        name: "Óleo Especial",
        slug: "oleo-especial",
        attributeSchema: [{ key: "viscosity", label: "Viscosidade", type: "text" }],
      },
    });

    // Envia um atributo que não está no attributeSchema declarado — deve
    // ser aceito mesmo assim, já que a validação é apenas orientativa para a UI.
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Óleo Especial Experimental",
        slug: "oleo-especial-experimental",
        categoryId: category.id,
        price: 199.9,
        attributes: { customField: "valor não previsto no schema" },
      });

    expect(res.status).toBe(201);
    expect(res.body.attributes).toEqual({ customField: "valor não previsto no schema" });
  });
});
