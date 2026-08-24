import Anthropic from "@anthropic-ai/sdk";
import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import { env } from "./env";
import { HttpError } from "../middleware/errorHandler";

const MODEL_ID = "claude-haiku-4-5-20251001";
const TOOL_NAME = "interpret_edit_instruction";

export function isAnthropicConfigured(): boolean {
  return Boolean(env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return client;
}

const SYSTEM_PROMPT = `Você interpreta pedidos em português de um administrador de loja
que quer editar uma foto de produto (óleo automotivo/lubrificante). Sua única tarefa é
traduzir o pedido em uma lista de operações de edição, escolhidas exclusivamente entre
as 8 abaixo. Você NUNCA executa nada — apenas decide "o quê" fazer; a execução real é
feita por outro sistema.

Operações permitidas (nenhuma outra existe):
- resize: { width?, height? } — redimensionar mantendo proporção
- crop: { aspectRatio: "1:1" | "4:3" | "16:9" | "custom", width?, height? } — width/height
  só quando aspectRatio="custom"
- brightness: { value: -100..100 } — negativo escurece, positivo clareia
- contrast: { value: -100..100 }
- sharpen: { intensity: "leve" | "médio" | "forte" } — nitidez
- rotate: { degrees: 90 | 180 | 270 }
- compress: { quality: 1..100 } — qualidade de compressão
- convertFormat: { format: "webp" | "jpeg" | "png" }

Regras obrigatórias:
1. Use SOMENTE essas operações, com esses nomes de campo exatos. Nunca invente uma
   operação, campo ou valor fora do que está descrito acima.
2. Se o pedido do usuário não mapear claramente para uma ou mais dessas operações —
   for vago demais, pedir algo fora da lista (ex: remover fundo, adicionar objetos,
   generative fill) — responda com unclear=true e uma sugestão curta e específica de
   como o usuário poderia reformular o pedido usando termos que mapeiem para a lista
   acima. Nunca tente adivinhar.
3. Quando o pedido for claro, responda com unclear=false e a lista de operações, na
   ordem que fizer sentido para o pedido (a ordem final de aplicação é decidida por
   outro sistema).
4. Prefira o valor mais moderado dentro do range quando o pedido for qualitativo (ex:
   "mais nítida" → sharpen intensity "médio", não "forte").`;

const EDIT_TOOL_DEFINITION: Tool = {
  name: TOOL_NAME,
  description:
    "Registra a interpretação estruturada de um pedido de edição de foto, ou sinaliza que o pedido não é claro.",
  input_schema: {
    type: "object",
    properties: {
      unclear: {
        type: "boolean",
        description: "true se o pedido não mapear claramente para as operações permitidas",
      },
      suggestion: {
        type: "string",
        description: "Sugestão de como reformular o pedido, obrigatória quando unclear=true",
      },
      operations: {
        type: "array",
        description: "Lista de operações a aplicar, obrigatória quando unclear=false",
        items: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["resize", "crop", "brightness", "contrast", "sharpen", "rotate", "compress", "convertFormat"],
            },
            width: { type: "number" },
            height: { type: "number" },
            aspectRatio: { type: "string", enum: ["1:1", "4:3", "16:9", "custom"] },
            value: { type: "number" },
            intensity: { type: "string", enum: ["leve", "médio", "forte"] },
            degrees: { type: "number", enum: [90, 180, 270] },
            quality: { type: "number" },
            format: { type: "string", enum: ["webp", "jpeg", "png"] },
          },
          required: ["type"],
        },
      },
    },
    required: ["unclear"],
  },
};

export type InterpretEditResult = { unclear: true; suggestion: string } | { unclear: false; operations: unknown[] };

// Devolve o JSON cru da tool call — NÃO validado aqui de propósito. A
// revalidação obrigatória (lista fechada + ranges) acontece via
// interpretResultSchema na rota, que nunca confia cegamente nesta resposta.
export async function interpretEditInstruction(instruction: string): Promise<InterpretEditResult> {
  let response;
  try {
    response = await getClient().messages.create({
      model: MODEL_ID,
      max_tokens: 1024,
      temperature: 0,
      system: SYSTEM_PROMPT,
      tool_choice: { type: "tool", name: TOOL_NAME },
      tools: [EDIT_TOOL_DEFINITION],
      messages: [{ role: "user", content: instruction }],
    });
  } catch {
    throw new HttpError(502, "Não foi possível interpretar a instrução (serviço de IA indisponível)");
  }

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new HttpError(502, "A IA não retornou uma resposta estruturada válida");
  }
  return toolUse.input as InterpretEditResult;
}
