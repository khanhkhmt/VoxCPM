import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
dotenv.config({ path: "/root/VoxCPM/web/.env.local" });

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function listFiles() {
  const result = await s3.send(new ListObjectsV2Command({
    Bucket: process.env.R2_BUCKET_NAME,
  }));

  if (!result.Contents || result.Contents.length === 0) {
    console.log("📭 Bucket trống — chưa có file nào trên R2.");
    return;
  }

  console.log(`📦 R2 Bucket "${process.env.R2_BUCKET_NAME}" — ${result.Contents.length} file(s):\n`);

  result.Contents.forEach((obj, i) => {
    const sizeKB = ((obj.Size || 0) / 1024).toFixed(1);
    const date = obj.LastModified ? obj.LastModified.toISOString().slice(0, 19) : "?";
    const url = `${process.env.R2_PUBLIC_URL}/${obj.Key}`;
    console.log(`${i + 1}. ${obj.Key}  |  ${sizeKB} KB  |  ${date}  |  ${url}`);
  });
}

listFiles().catch(err => console.error("❌ Error:", err.message));
