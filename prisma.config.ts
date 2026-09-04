// Prisma config for Prisma v7
import { defineConfig } from 'prisma';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL || 'postgresql://certiforge:certiforge123@localhost:5432/certiforge',
  },
});
