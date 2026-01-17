import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import crypto from 'crypto';
import { sendVerificationEmail } from '@/app/lib/mail';

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (user.emailVerified) {
            return NextResponse.json({ error: 'Email already verified' }, { status: 400 });
        }

        // Generate new token
        const verificationToken = crypto.randomBytes(32).toString('hex');

        await prisma.user.update({
            where: { id: user.id },
            data: { verificationToken },
        });

        await sendVerificationEmail(email, user.name, verificationToken);

        return NextResponse.json({ message: 'Verification email resent' });
    } catch (error) {
        console.error('Error resending verification email:', error);
        return NextResponse.json({ error: 'Failed to resend email' }, { status: 500 });
    }
}
