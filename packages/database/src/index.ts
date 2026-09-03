// Export all database modules
export * from './client';
export * from './auth';
export * from './organizations';
export * from './recipients';
export * from './certificates';
export * from './generation';

// Re-export PrismaClient for direct use
export { prisma } from './client';
export type { default as PrismaClient } from '@prisma/client';