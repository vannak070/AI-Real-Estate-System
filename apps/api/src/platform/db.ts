import { PrismaClient } from '@prisma/client';

// One client for the monolith. After a split, each service keeps its own
// PrismaClient pointed at its own DATABASE_URL and only its own *.prisma models.
let client: PrismaClient | undefined;

export function getPrisma(): PrismaClient {
  client ??= new PrismaClient();
  return client;
}

export type Db = PrismaClient;
