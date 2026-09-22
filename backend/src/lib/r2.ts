import { S3Client, DeleteObjectCommand, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { env } from "./env";

let client: S3Client | null = null;
function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: env.R2_ENDPOINT,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return client;
}

const PRESIGNED_URL_TTL_SECONDS = 60 * 5; // 5 minutos para completar o upload

export function isR2Configured(): boolean {
  return Boolean(
    env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET_NAME && env.R2_ENDPOINT
  );
}

interface PresignedUpload {
  uploadUrl: string;
  key: string;
  publicUrl: string;
}

export async function createPresignedUpload(productId: string, fileName: string, contentType: string): Promise<PresignedUpload> {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `products/${productId}/${randomUUID()}-${safeName}`;

  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(getClient(), command, { expiresIn: PRESIGNED_URL_TTL_SECONDS });
  const publicUrl = `${env.R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`;

  return { uploadUrl, key, publicUrl };
}

export async function deleteObject(key: string): Promise<void> {
  await getClient().send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }));
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  const res = await getClient().send(new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }));
  const chunks: Buffer[] = [];
  for await (const chunk of res.Body as AsyncIterable<Buffer>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function putObject(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<{ key: string; publicUrl: string }> {
  await getClient().send(
    new PutObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key, Body: buffer, ContentType: contentType })
  );
  const publicUrl = `${env.R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
  return { key, publicUrl };
}
