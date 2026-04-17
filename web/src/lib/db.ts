import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";
import path from "path";

// ---------------------------------------------------------------------------
// Resolve database URL — @libsql/client needs absolute file: paths
// ---------------------------------------------------------------------------
function resolveDatabaseUrl(): string {
    const raw = process.env.DATABASE_URL || "file:./prisma/dev.db";

    // If it's a remote URL (libsql://, https://) or already absolute, use as-is
    if (!raw.startsWith("file:")) return raw;

    // Strip the "file:" prefix, resolve relative to cwd, then re-add prefix
    const filePath = raw.slice("file:".length);
    if (path.isAbsolute(filePath)) return raw;

    return `file:${path.resolve(process.cwd(), filePath)}`;
}

// ---------------------------------------------------------------------------
// Singleton Prisma client — use a unique Symbol key to avoid stale globals
// from previous hot-reload cycles.
// ---------------------------------------------------------------------------
const PRISMA_KEY = Symbol.for("__prisma_client_v1__");

const g = globalThis as unknown as Record<symbol, PrismaClient | undefined>;

function createPrismaClient(): PrismaClient {
    const dbUrl = resolveDatabaseUrl();
    console.log("[db] Creating PrismaClient with URL:", dbUrl);
    console.log("[db] Real Node process.env.DATABASE_URL:", globalThis.process?.env?.DATABASE_URL);

    const config = { url: dbUrl };
    const adapter = new PrismaLibSql(config);

    process.env.DATABASE_URL = dbUrl;

    return new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
}

export const prisma: PrismaClient = g[PRISMA_KEY] ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
    g[PRISMA_KEY] = prisma;
}
