import { PrismaClient } from '@prisma/client'

// The cache key is versioned: bump it after schema migrations so a running
// dev server (which keeps `globalThis` across hot reloads) picks up the
// regenerated Prisma Client instead of reusing the pre-migration instance.
const PRISMA_CACHE_KEY = 'prisma-dev-v3'

const globalForPrisma = globalThis as unknown as {
  __prismaCaches?: Record<string, PrismaClient | undefined>
}

globalForPrisma.__prismaCaches ??= {}
// Drop stale cached clients (different version key) so they get GC'd.
for (const key of Object.keys(globalForPrisma.__prismaCaches)) {
  if (key !== PRISMA_CACHE_KEY) delete globalForPrisma.__prismaCaches[key]
}

export const db =
  globalForPrisma.__prismaCaches[PRISMA_CACHE_KEY] ??
  new PrismaClient({
    log: ['warn', 'error'],
  })

globalForPrisma.__prismaCaches[PRISMA_CACHE_KEY] = db
