import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import crypto from "crypto";
import "dotenv/config";

const dbUrl = process.env.DATABASE_URL || "file:./prisma/dev.db";
const config = { url: dbUrl };
const adapter = new PrismaLibSql(config);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const userId = 'test-user-id';
  const voiceProfileId = 'test-voice-profile-id';
  const rawKey = 'vc_sk_live_testkey123';
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  // 1. Create User
  const user = await prisma.user.upsert({
    where: { username: 'testuser' },
    update: {},
    create: {
      id: userId,
      username: 'testuser',
      name: 'Test User',
      passwordHash: 'dummy-hash',
      role: 'user',
    },
  });

  // 2. Create Voice Profile
  const voiceProfile = await prisma.voiceProfile.upsert({
    where: { id: voiceProfileId },
    update: {},
    create: {
      id: voiceProfileId,
      userId: user.id,
      name: 'Test Voice',
      fileName: 'test.wav',
      r2Key: 'test-r2-key',
      audioUrl: 'http://example.com/test.wav',
      fileSize: 1024,
    },
  });

  // 3. Create API Key
  const apiKey = await prisma.apiKey.upsert({
    where: { keyHash: keyHash },
    update: { 
      isActive: true,
      scopes: 'usage.read,tts.generate,tts.stream'
    },
    create: {
      userId: user.id,
      voiceProfileId: voiceProfile.id,
      name: 'Test API Key',
      prefix: 'vc_sk_live',
      keyHash: keyHash,
      lastFour: '7b23',
      scopes: 'usage.read,tts.generate,tts.stream',
    },
  });

  console.log('Test User and API Key created/updated successfully.');
  console.log('API Key to use:', rawKey);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
