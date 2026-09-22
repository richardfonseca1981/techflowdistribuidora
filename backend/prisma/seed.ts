import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminUsername = process.env.SEED_ADMIN_USERNAME ?? "admin";
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@site-vendas-oleo.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin123";

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.adminUser.upsert({
    where: { username: adminUsername },
    update: {},
    create: { username: adminUsername, email: adminEmail, passwordHash, role: "admin" },
  });
  console.log(`Admin criado/existente: ${adminUsername} (senha padrão: ${adminPassword})`);

  const oleoBruto = await prisma.category.upsert({
    where: { slug: "oleo-bruto" },
    update: {},
    create: {
      name: "Óleo Bruto",
      slug: "oleo-bruto",
      attributeSchema: [
        { key: "origin", label: "Origem", type: "text" },
        { key: "density", label: "Densidade (API)", type: "number" },
        { key: "sulfurContent", label: "Teor de enxofre (%)", type: "number" },
      ],
    },
  });

  const lubrificante = await prisma.category.upsert({
    where: { slug: "lubrificante-automotivo" },
    update: {},
    create: {
      name: "Lubrificante Automotivo",
      slug: "lubrificante-automotivo",
      attributeSchema: [
        { key: "viscosity", label: "Viscosidade", type: "text" },
        { key: "apiGrade", label: "Grau API", type: "text" },
        { key: "synthetic", label: "Sintético", type: "boolean" },
        { key: "volumeLiters", label: "Volume (litros)", type: "number" },
      ],
    },
  });

  await prisma.product.upsert({
    where: { slug: "oleo-bruto-tipo-brent" },
    update: {},
    create: {
      name: "Óleo Bruto Tipo Brent",
      slug: "oleo-bruto-tipo-brent",
      description: "Óleo bruto de referência internacional, extraído do Mar do Norte.",
      categoryId: oleoBruto.id,
      price: 350.0,
      sku: "OB-BRENT-001",
      trackStock: false,
      attributes: { origin: "Mar do Norte", density: 38.06, sulfurContent: 0.37 },
    },
  });

  await prisma.product.upsert({
    where: { slug: "lubrificante-5w30-sintetico" },
    update: {},
    create: {
      name: "Lubrificante 5W30 Sintético",
      slug: "lubrificante-5w30-sintetico",
      description: "Óleo lubrificante automotivo sintético para motores flex.",
      categoryId: lubrificante.id,
      price: 42.9,
      sku: "LUB-5W30-001",
      trackStock: true,
      stockQty: 120,
      attributes: { viscosity: "5W30", apiGrade: "SN", synthetic: true, volumeLiters: 1 },
    },
  });

  console.log("Categorias e produtos de exemplo criados.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
