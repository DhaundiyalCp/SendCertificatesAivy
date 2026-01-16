import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { uploadToS3 } from '@/app/lib/s3';
import jwt from 'jsonwebtoken';
import { createCanvas, loadImage, registerFont } from 'canvas';
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

export async function GET() {
  const userId = await getUserIdFromRequest();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const templates = await prisma.template.findMany({
    where: { creatorId: userId },
    select: { 
      id: true, 
      name: true, 
      imageUrl: true, 
      placeholders: true,
      signatures: true,
      qrPlaceholders: true
    },
  });

  return NextResponse.json(templates);
}

export async function POST(request: Request) {
  const userId = await getUserIdFromRequest();
  try {
    const body = await request.json();
    console.log("Parsed request body:", body);

    if (!body.name || !body.imageUrl) {
      return NextResponse.json(
        { error: "Missing required fields: 'name' and 'imageUrl'" },
        { status: 400 }
      );
    }

    let image;
    try {
      image = await loadImage(body.imageUrl);
    } catch (error) {
      console.error("Error loading image:", error);
      return NextResponse.json(
        { error: "Failed to load image from the provided URL" },
        { status: 400 }
      );
    }

    if (!image.width || !image.height) {
      return NextResponse.json(
        { error: "Invalid image dimensions: width and height are required" },
        { status: 400 }
      );
    }

    // Validate signatures array if present
    if (body.signatures) {
      if (!Array.isArray(body.signatures)) {
        return NextResponse.json(
          { error: "Signatures must be an array" },
          { status: 400 }
        );
      }

      for (const signature of body.signatures) {
        if (!signature.name || !signature.position || !signature.style) {
          return NextResponse.json(
            { error: "Each signature must have name, position, and style properties" },
            { status: 400 }
          );
        }
      }
    }

    if (body.qrPlaceholders) {
      if (!Array.isArray(body.qrPlaceholders)) {
        return NextResponse.json(
          { error: "QR placeholders must be an array" },
          { status: 400 }
        );
      }
    }

    const template = await prisma.template.create({
      data: {
        name: body.name,
        imageUrl: body.imageUrl,
        width: image.width,
        height: image.height,
        placeholders: body.placeholders || [],
        signatures: body.signatures || [], 
        qrPlaceholders: body.qrPlaceholders || [],
        creatorId: userId!,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("Error creating template:", error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === "string"
        ? error
        : "Unknown error";

    return NextResponse.json(
      { error: `Server error: ${errorMessage}` },
      { status: 500 }
    );
  }
}