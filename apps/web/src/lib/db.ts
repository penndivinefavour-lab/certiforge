// CertiForge Database Client (self-contained)
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

declare global {
  var prisma: PrismaClient | undefined;
}

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://certiforge:certiforge123@localhost:5432/certiforge';

// Prisma v7 requires a driver adapter
const adapter = new PrismaPg({ connectionString: DATABASE_URL });

export const prisma = global.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
