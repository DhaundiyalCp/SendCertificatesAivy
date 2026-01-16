import { NextRequest, NextResponse } from 'next/server';
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

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ batchId: string }> }
  ) {
    // Await the params
    const { batchId } = await context.params;
    
    const userId = await getUserIdFromRequest();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  
    try {
      const invalidEmails = await prisma.invalidEmail.findMany({
        where: {
          batchId: batchId,
          batch: {
            creatorId: userId,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
  
      return NextResponse.json({ invalidEmails });
    } catch (error) {
      console.error('Failed to fetch invalid emails:', error);
      return NextResponse.json(
        { error: 'Failed to fetch invalid emails' },
        { status: 500 }
      );
    }
  }