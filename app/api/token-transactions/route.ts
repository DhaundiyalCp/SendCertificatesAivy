import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

async function getUserIdFromRequest(): Promise<string | null> {
  const token = (await cookies()).get('token')?.value;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded.userId;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const userId = await getUserIdFromRequest();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  
  const pageSize = 10;

  // Check if user is admin
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { is_admin: true }
  });

  if (!user?.is_admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const [transactions, totalCount] = await Promise.all([
    prisma.tokenTransaction.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: pageSize,
      skip: (page - 1) * pageSize
    }),
    prisma.tokenTransaction.count()
  ]);
   return NextResponse.json({
    transactions,
    pagination: {
      total: totalCount,
      pageSize,
      currentPage: page,
      totalPages: Math.ceil(totalCount / pageSize)
    }
  });
}