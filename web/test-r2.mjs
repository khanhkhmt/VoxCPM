import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

console.log("Config:", { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID: R2_ACCESS_KEY_ID?.slice(0,8)+"...", R2_BUCKET_NAME, R2_PUBLIC_URL });

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

async function test() {
  const testKey = "test/hello.txt";
  const body = Buffer.from("Hello from VoxCPM test!");

  console.log("\n1) Uploading test file to R2...");
  try {
    await s3.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: testKey,
      Body: body,
      ContentType: "text/plain",
    }));
    const url = `${R2_PUBLIC_URL}/${testKey}`;
    console.log("✅ Upload SUCCESS! URL:", url);

    console.log("\n2) Cleaning up test file...");
    await s3.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: testKey }));
    console.log("✅ Delete SUCCESS!");
  } catch (err) {
    console.error("❌ FAILED:", err.message);
    console.error("Full error:", err);
  }
}

test();
