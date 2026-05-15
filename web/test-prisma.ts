import path from "path";
const dbUrl = "file:./prisma/dev.db";
process.env.DATABASE_URL = dbUrl;

import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

console.log("Testing with URL:", dbUrl);

const config = { url: dbUrl };
const adapter = new PrismaLibSql(config);

const prisma = new PrismaClient({ adapter } as any);

async function main() {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                name: true,
                email: true,
                role: true,
                createdAt: true
            }
        });
        console.log("Success! Users list:");
        console.table(users);
    } catch (e) {
        console.error("Failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
