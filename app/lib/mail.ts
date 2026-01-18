import nodemailer from 'nodemailer';
import { getVerificationEmailTemplate, getResetPasswordEmailTemplate } from './email-templates';

export async function sendVerificationEmail(email: string, name: string, token: string) {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    const confirmLink = `${process.env.NEXT_PUBLIC_BASE_URL}/verify-email?token=${token}`;
    const html = getVerificationEmailTemplate(name, confirmLink);

    await transporter.sendMail({
        from: `"Aivy Cloud" <${process.env.EMAIL_FROM}>`,
        to: email,
        subject: `Verify your email, ${name}`,
        html: html,
    });
}

export async function sendPasswordResetEmail(email: string, name: string, token: string) {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?token=${token}`;
    const html = getResetPasswordEmailTemplate(name, resetLink);

    await transporter.sendMail({
        from: `"Aivy Cloud" <${process.env.EMAIL_FROM}>`,
        to: email,
        subject: `Reset your password, ${name}`,
        html: html,
    });
}
