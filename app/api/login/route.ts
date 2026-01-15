import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Ensure default owner account always has full admin + API access
    let effectiveUser = user;
    if (user.email === 'cpdhaundiyal.87@gmail.com' && (!user.is_admin || !user.is_api_enabled)) {
      effectiveUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          is_admin: true,
          is_api_enabled: true,
        },
      });
    }

    const token = jwt.sign({ userId: effectiveUser.id }, JWT_SECRET, { expiresIn: '7d' });
    const response = NextResponse.json({ 
      message: 'Login successful',
      is_admin: effectiveUser.is_admin,
      user: {
        id: effectiveUser.id,
        name: effectiveUser.name,
        email: effectiveUser.email,
        is_admin: effectiveUser.is_admin,
        is_api_enabled: effectiveUser.is_api_enabled
      }
    });
    response.cookies.set('token', token, { httpOnly: true, maxAge: 604800 });

    return response;
  } catch (error) {
    console.error('Error logging in:', error);
    return NextResponse.json({ error: 'Failed to login' }, { status: 500 });
  }
}
