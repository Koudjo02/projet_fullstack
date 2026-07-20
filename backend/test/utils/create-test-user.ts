import * as jwt from 'jsonwebtoken';
import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Même principe que dans prisma.service.ts : Prisma 7 exige un adapter
// explicite pour la connexion PostgreSQL, même dans les tests
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});

export const prisma = new PrismaClient({ adapter });

export async function createTestUser(email?: string) {
  const uniqueId = Date.now() + Math.floor(Math.random() * 100000);

  const user = await prisma.user.create({
    data: {
      email: email ?? `test-${uniqueId}@example.com`,
      name: `Test User ${uniqueId}`,
    },
  });

  const token = jwt.sign(
    { sub: user.id, email: user.email },
    process.env.JWT_SECRET as string,
    { expiresIn: '1h' },
  );

  return { user, token };
}
