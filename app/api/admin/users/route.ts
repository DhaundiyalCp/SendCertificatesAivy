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
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = await prisma.user.findUnique({
        where: { id: userId },
        select: { is_admin: true }
    });

    if (!admin?.is_admin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch users with relevant info for dashboard
    // Optimization: Select only necessary fields
    const users = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            organization: true,
            tokens: true,
            is_admin: true,
            createdAt: true,
            emailVerified: true
        },
        orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ users });
}

export async function DELETE(request: Request) {
    const userId = await getUserIdFromRequest();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = await prisma.user.findUnique({
        where: { id: userId },
        select: { is_admin: true }
    });

    if (!admin?.is_admin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('id');

    if (!targetUserId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    if (targetUserId === userId) {
        return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
    }

    try {
        // Transaction to clean up all user data
        await prisma.$transaction(async (tx: any) => {
            // Delete dependencies first
            // Note: Adjust this list based on your actual schema dependencies
            // 1. Token Transactions
            await tx.tokenTransaction.deleteMany({ where: { userId: targetUserId } });

            // 2. Certificates (and their generated images if stored externally? - this just deletes DB record)
            await tx.certificate.deleteMany({ where: { creatorId: targetUserId } });

            // 3. Batches (requires cleaning up InvalidEmails and FailedCertificates first if they reference Batch)
            // Check InvalidEmail relation to Batch
            // We need to find batches by this user first
            const batches = await tx.batch.findMany({ where: { creatorId: targetUserId }, select: { id: true } });
            const batchIds = batches.map((b: { id: string }) => b.id);

            if (batchIds.length > 0) {
                await tx.failedCertificate.deleteMany({ where: { batchId: { in: batchIds } } });
                await tx.invalidEmail.deleteMany({ where: { batchId: { in: batchIds } } });
                // Certificate has batchId too, already deleted above by creatorId? 
                // Let's ensure we catch certificates in those batches even if creatorId is somehow different (unlikely)
                await tx.certificate.deleteMany({ where: { batchId: { in: batchIds } } });

                await tx.batch.deleteMany({ where: { id: { in: batchIds } } });
            }

            // 4. Templates
            await tx.template.deleteMany({ where: { creatorId: targetUserId } });

            // 5. API Keys
            await tx.apiKey.deleteMany({ where: { userId: targetUserId } });

            // 6. Delete EmailConfig
            await tx.emailConfig.deleteMany({ where: { userId: targetUserId } });

            // 7. Delete User
            await tx.user.delete({ where: { id: targetUserId } });
        });

        return NextResponse.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
}
