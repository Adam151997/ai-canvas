import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { nanoid } from "nanoid";

// GET /api/canvas - List user's canvases
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Ensure user exists in database
    await db.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress || "",
        name: user.firstName || user.username || "Anonymous",
        avatarUrl: user.imageUrl,
      },
      update: {
        name: user.firstName || user.username || "Anonymous",
        avatarUrl: user.imageUrl,
      },
    });

    // Get user's canvases (owned or member)
    const canvases = await db.canvas.findMany({
      where: {
        OR: [
          { ownerId: user.id },
          { members: { some: { userId: user.id } } },
        ],
      },
      include: {
        owner: {
          select: { id: true, name: true, avatarUrl: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, avatarUrl: true },
            },
          },
        },
        _count: {
          select: { comments: true, assets: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ canvases });
  } catch (error) {
    console.error("[Canvas List Error]", error);
    return NextResponse.json(
      { error: "Failed to fetch canvases" },
      { status: 500 }
    );
  }
}

// POST /api/canvas - Create new canvas
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name = "Untitled Canvas", description, id } = body;

    // Ensure user exists
    await db.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress || "",
        name: user.firstName || user.username || "Anonymous",
        avatarUrl: user.imageUrl,
      },
      update: {},
    });

    // Use provided ID or generate new one
    const canvasId = id || nanoid(10);

    // Check if canvas with this ID already exists
    const existing = await db.canvas.findUnique({
      where: { id: canvasId },
      include: {
        owner: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    if (existing) {
      // Return existing canvas if user has access
      if (existing.ownerId === user.id) {
        return NextResponse.json({ canvas: existing });
      }
      // Otherwise generate a new ID
      const newId = nanoid(10);
      const canvas = await db.canvas.create({
        data: {
          id: newId,
          name,
          description,
          roomId: `canvas-${newId}`,
          ownerId: user.id,
        },
        include: {
          owner: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
      });
      return NextResponse.json({ canvas }, { status: 201 });
    }

    const canvas = await db.canvas.create({
      data: {
        id: canvasId,
        name,
        description,
        roomId: `canvas-${canvasId}`,
        ownerId: user.id,
      },
      include: {
        owner: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    // Log activity
    await db.activity.create({
      data: {
        canvasId: canvas.id,
        userId: user.id,
        type: "SHAPE_CREATED", // Using as "CANVAS_CREATED"
        data: { action: "created", canvasName: name },
      },
    });

    return NextResponse.json({ canvas }, { status: 201 });
  } catch (error) {
    console.error("[Canvas Create Error]", error);
    return NextResponse.json(
      { error: "Failed to create canvas" },
      { status: 500 }
    );
  }
}
