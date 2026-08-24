import { z } from "zod";

export const requestAiEditSchema = z.object({
  instruction: z.string().trim().min(3).max(300),
});

// Sem range definido pelo cliente para resize/crop custom — 8-6000px por
// dimensão é um limite sensato para fotos de produto.
const dim = z.number().int().min(8).max(6000);

// Nota: os membros de um z.discriminatedUnion precisam ser ZodObject puros
// (sem .refine()), então as regras de "campo obrigatório condicional" abaixo
// (resize exige width/height; crop custom exige width e height) são
// aplicadas depois, via .superRefine() no array completo de operações.
const resizeOperationSchema = z.object({
  type: z.literal("resize"),
  width: dim.optional(),
  height: dim.optional(),
});

const cropOperationSchema = z.object({
  type: z.literal("crop"),
  aspectRatio: z.enum(["1:1", "4:3", "16:9", "custom"]),
  width: dim.optional(),
  height: dim.optional(),
});

const brightnessOperationSchema = z.object({
  type: z.literal("brightness"),
  value: z.number().int().min(-100).max(100),
});

const contrastOperationSchema = z.object({
  type: z.literal("contrast"),
  value: z.number().int().min(-100).max(100),
});

const sharpenOperationSchema = z.object({
  type: z.literal("sharpen"),
  intensity: z.enum(["leve", "médio", "forte"]),
});

const rotateOperationSchema = z.object({
  type: z.literal("rotate"),
  degrees: z.union([z.literal(90), z.literal(180), z.literal(270)]),
});

const compressOperationSchema = z.object({
  type: z.literal("compress"),
  quality: z.number().int().min(1).max(100),
});

const convertFormatOperationSchema = z.object({
  type: z.literal("convertFormat"),
  format: z.enum(["webp", "jpeg", "png"]),
});

export const editOperationSchema = z.discriminatedUnion("type", [
  resizeOperationSchema,
  cropOperationSchema,
  brightnessOperationSchema,
  contrastOperationSchema,
  sharpenOperationSchema,
  rotateOperationSchema,
  compressOperationSchema,
  convertFormatOperationSchema,
]);

export const editOperationsArraySchema = z
  .array(editOperationSchema)
  .min(1)
  .max(8)
  .superRefine((operations, ctx) => {
    operations.forEach((op, index) => {
      if (op.type === "resize" && op.width === undefined && op.height === undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "resize exige width e/ou height", path: [index] });
      }
      if (op.type === "crop" && op.aspectRatio === "custom" && (op.width === undefined || op.height === undefined)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "crop com aspectRatio=custom exige width e height",
          path: [index],
        });
      }
    });
  });

// Revalidação obrigatória da resposta da IA: a lista fechada de operações e
// os ranges numéricos acima são a única fonte de verdade sobre o que pode
// ser executado — a IA nunca é confiada cegamente.
export const interpretResultSchema = z.discriminatedUnion("unclear", [
  z.object({ unclear: z.literal(true), suggestion: z.string().trim().min(1) }),
  z.object({ unclear: z.literal(false), operations: editOperationsArraySchema }),
]);

export type EditOperation = z.infer<typeof editOperationSchema>;
