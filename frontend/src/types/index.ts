export type AttributeFieldType = "text" | "number" | "boolean" | "select";

export interface AttributeSchemaField {
  key: string;
  label: string;
  type: AttributeFieldType;
  options?: string[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  attributeSchema: AttributeSchemaField[];
  active: boolean;
}

export interface ProductImage {
  id: string;
  url: string;
  key: string;
  position: number;
  previousUrl?: string | null;
  previousKey?: string | null;
}

export type AiEditOperation =
  | { type: "resize"; width?: number; height?: number }
  | { type: "crop"; aspectRatio: "1:1" | "4:3" | "16:9" | "custom"; width?: number; height?: number }
  | { type: "brightness"; value: number }
  | { type: "contrast"; value: number }
  | { type: "sharpen"; intensity: "leve" | "médio" | "forte" }
  | { type: "rotate"; degrees: 90 | 180 | 270 }
  | { type: "compress"; quality: number }
  | { type: "convertFormat"; format: "webp" | "jpeg" | "png" };

export type AiEditResponse =
  | { unclear: true; suggestion: string }
  | { unclear: false; editId: string; previewUrl: string; operations: AiEditOperation[]; instruction: string };

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  categoryId: string;
  category: Category;
  price: string;
  sku: string | null;
  trackStock: boolean;
  stockQty: number | null;
  attributes: Record<string, unknown>;
  images: ProductImage[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductListResponse {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminSession {
  token: string;
  admin: { id: string; username: string; role: string };
}
