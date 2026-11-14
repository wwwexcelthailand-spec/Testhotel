import { PrismaClient } from "@prisma/client";

function getNormalizedDatabaseUrl(): string | undefined {
  let rawUrl =
    process.env.DATABASE_URL?.trim() ||
    process.env.SUPABASE_DATABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_DATABASE_URL?.trim();

  if (!rawUrl) return undefined;

  if (rawUrl.startsWith("postgres://") || rawUrl.startsWith("postgresql://")) {
    try {
      const parsed = new URL(rawUrl);
      // Always enable pgbouncer mode for Supabase / serverless PostgreSQL to prevent
      // PostgresError 42P05: prepared statement "s..." already exists
      if (!parsed.searchParams.has("pgbouncer")) {
        parsed.searchParams.set("pgbouncer", "true");
      }
      if (!parsed.searchParams.has("connection_limit")) {
        parsed.searchParams.set("connection_limit", "5");
      }
      if (!parsed.searchParams.has("pool_timeout")) {
        parsed.searchParams.set("pool_timeout", "20");
      }
      rawUrl = parsed.toString();
    } catch {
      const sep = rawUrl.includes("?") ? "&" : "?";
      if (!rawUrl.includes("pgbouncer=true")) {
        rawUrl = `${rawUrl}${sep}pgbouncer=true&connection_limit=5&pool_timeout=20`;
      }
    }
  }

  process.env.DATABASE_URL = rawUrl;
  return rawUrl;
}

const dbUrl = getNormalizedDatabaseUrl();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const client = dbUrl
    ? new PrismaClient({
        datasources: {
          db: { url: dbUrl },
        },
        log: ["error"],
      })
    : new PrismaClient({
        log: ["error"],
      });

  client.$use(async (params, next) => {
    try {
      return await next(params);
    } catch (error: any) {
      const msg = error?.message || String(error);
      if (
        msg.includes("42P05") ||
        msg.includes("prepared statement") ||
        msg.includes("Server has closed the connection") ||
        msg.includes("Can't reach database server")
      ) {
        try {
          await client.$disconnect();
        } catch {
          // ignore disconnect error
        }
        return await next(params);
      }
      throw error;
    }
  });

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;
