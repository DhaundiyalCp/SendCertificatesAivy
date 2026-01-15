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
  try {
   // Get user's current balance and transactions
   const [user, transactions, totalCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { tokens: true }
    }),
    prisma.tokenTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: pageSize,
      skip: (page - 1) * pageSize
    }),
    prisma.tokenTransaction.count({
      where: { userId }
    })
  ]);
   return NextResponse.json({
    currentBalance: user?.tokens ?? 0,
    transactions,
    pagination: {
      total: totalCount,
      pageSize,
      currentPage: page,
      totalPages: Math.ceil(totalCount / pageSize)
    }
  });
 } catch (error) {
   console.error('Error fetching user transactions:', error);
   return NextResponse.json(
     { error: 'Failed to fetch transactions' }, 
     { status: 500 }
   );
 }
}