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
}

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
  admin: { id: string; email: string; role: string };
}
