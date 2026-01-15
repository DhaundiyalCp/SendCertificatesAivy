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

// Get current token balance
export async function GET(request: Request) {
  const userId = await getUserIdFromRequest();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tokens: true }
  });

  return NextResponse.json({ tokens: user?.tokens ?? 0 });
}

// Add tokens to a user (admin only)
export async function POST(request: Request) {
  const userId = await getUserIdFromRequest();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = await prisma.user.findUnique({
    where: { id: userId },
    select: { is_admin: true }
  });

  if (!admin?.is_admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { email, amount } = await request.json();

  const transaction = await prisma.tokenTransaction.create({
    data: {
      userId,
      amount,
      type: 'ADD',
      reason: 'admin_add',
      email
    }
  });

  const updatedUser = await prisma.user.update({
    where: { email },
    data: {
      tokens: {
        increment: amount
      }
    }
  });

  return NextResponse.json({ success: true, tokens: updatedUser.tokens });
}

