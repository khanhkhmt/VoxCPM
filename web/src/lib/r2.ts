import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

// ---------------------------------------------------------------------------
// R2 Configuration
// ---------------------------------------------------------------------------
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

// ---------------------------------------------------------------------------
// S3-compatible client pointing to Cloudflare R2
// ---------------------------------------------------------------------------
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// ---------------------------------------------------------------------------
// Upload a file buffer to R2
// ---------------------------------------------------------------------------
export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string = "audio/wav",
): Promise<{ r2Key: string; r2Url: string }> {
  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );

  const r2Url = R2_PUBLIC_URL
    ? `${R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`
    : `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${key}`;

  return { r2Key: key, r2Url };
}

// ---------------------------------------------------------------------------
// Delete a file from R2
// ---------------------------------------------------------------------------
export async function deleteFromR2(key: string): Promise<void> {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    }),
  );
}

// ---------------------------------------------------------------------------
// Get a readable stream from R2 (for proxying audio)
// ---------------------------------------------------------------------------
export async function getFromR2(key: string) {
  const response = await s3.send(
    new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    }),
  );
  return response;
}
