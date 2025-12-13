import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { deleteCanvasVectors } from "@/lib/pinecone";

// GET /api/canvas/[canvasId] - Get canvas details
export async function GET(
  req: Request,
  { params }: { params: Promise<{ canvasId: string }> }
) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { canvasId } = await params;

  try {
    const canvas = await db.canvas.findUnique({
      where: { id: canvasId },
      include: {
        owner: {
          select: { id: true, name: true, avatarUrl: true, email: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, avatarUrl: true },
            },
          },
        },
        regions: {
          orderBy: { updatedAt: "desc" },
        },
        _count: {
          select: { comments: true, assets: true, activities: true },
        },
      },
    });

    if (!canvas) {
      return NextResponse.json({ error: "Canvas not found" }, { status: 404 });
    }

    // Check access
    const hasAccess =
      canvas.ownerId === user.id ||
      canvas.isPublic ||
      canvas.members.some((m) => m.userId === user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Update last accessed time
    await db.canvas.update({
      where: { id: canvasId },
      data: { lastAccessedAt: new Date() },
    });

    return NextResponse.json({ canvas });
  } catch (error) {
    console.error("[Canvas Get Error]", error);
    return NextResponse.json(
      { error: "Failed to fetch canvas" },
      { status: 500 }
    );
  }
}

// PATCH /api/canvas/[canvasId] - Update canvas
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ canvasId: string }> }
) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { canvasId } = await params;

  try {
    // Check ownership
    const canvas = await db.canvas.findUnique({
      where: { id: canvasId },
      select: { ownerId: true, members: { where: { role: "ADMIN" } } },
    });

    if (!canvas) {
      return NextResponse.json({ error: "Canvas not found" }, { status: 404 });
    }

    const isOwner = canvas.ownerId === user.id;
    const isAdmin = canvas.members.some((m) => m.userId === user.id);

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, isPublic, snapshotData } = body;

    const updatedCanvas = await db.canvas.update({
      where: { id: canvasId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(isPublic !== undefined && { isPublic }),
        ...(snapshotData !== undefined && {
          snapshotData,
          snapshotAt: new Date(),
        }),
        updatedAt: new Date(),
      },
    });

    // Log activity if name changed
    if (name !== undefined) {
      await db.activity.create({
        data: {
          canvasId,
          userId: user.id,
          type: "CANVAS_RENAMED",
          data: { newName: name },
        },
      });
    }

    return NextResponse.json({ canvas: updatedCanvas });
  } catch (error) {
    console.error("[Canvas Update Error]", error);
    return NextResponse.json(
      { error: "Failed to update canvas" },
      { status: 500 }
    );
  }
}

// DELETE /api/canvas/[canvasId] - Delete canvas
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ canvasId: string }> }
) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { canvasId } = await params;

  try {
    // Check ownership (only owner can delete)
    const canvas = await db.canvas.findUnique({
      where: { id: canvasId },
      select: { ownerId: true },
    });

    if (!canvas) {
      return NextResponse.json({ error: "Canvas not found" }, { status: 404 });
    }

    if (canvas.ownerId !== user.id) {
      return NextResponse.json(
        { error: "Only the owner can delete a canvas" },
        { status: 403 }
      );
    }

    // Delete vectors from Pinecone
    try {
      await deleteCanvasVectors(canvasId);
    } catch (e) {
      console.error("Failed to delete vectors:", e);
    }

    // Delete canvas (cascades to related records)
    await db.canvas.delete({
      where: { id: canvasId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Canvas Delete Error]", error);
    return NextResponse.json(
      { error: "Failed to delete canvas" },
      { status: 500 }
    );
  }
}
