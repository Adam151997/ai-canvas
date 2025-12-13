import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET /api/canvas/[canvasId]/snapshot - Get canvas snapshot
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
      select: {
        id: true,
        snapshotData: true,
        snapshotAt: true,
        ownerId: true,
        isPublic: true,
        members: { select: { userId: true } },
      },
    });

    if (!canvas) {
      return NextResponse.json({ error: "Canvas not found" }, { status: 404 });
    }

    const hasAccess =
      canvas.ownerId === user.id ||
      canvas.isPublic ||
      canvas.members.some((m) => m.userId === user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({
      snapshot: canvas.snapshotData,
      snapshotAt: canvas.snapshotAt,
    });
  } catch (error) {
    console.error("[Snapshot Get Error]", error);
    return NextResponse.json(
      { error: "Failed to fetch snapshot" },
      { status: 500 }
    );
  }
}

// POST /api/canvas/[canvasId]/snapshot - Save canvas snapshot
export async function POST(
  req: Request,
  { params }: { params: Promise<{ canvasId: string }> }
) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { canvasId } = await params;

  try {
    const body = await req.json();
    const { snapshot, description } = body;

    if (!snapshot) {
      return NextResponse.json({ error: "Snapshot data is required" }, { status: 400 });
    }

    // Check access
    const canvas = await db.canvas.findUnique({
      where: { id: canvasId },
      select: {
        ownerId: true,
        members: { where: { role: { in: ["EDITOR", "ADMIN"] } } },
      },
    });

    if (!canvas) {
      return NextResponse.json({ error: "Canvas not found" }, { status: 404 });
    }

    const canEdit =
      canvas.ownerId === user.id ||
      canvas.members.some((m) => m.userId === user.id);

    if (!canEdit) {
      return NextResponse.json({ error: "Edit access required" }, { status: 403 });
    }

    // Update canvas with snapshot
    const updatedCanvas = await db.canvas.update({
      where: { id: canvasId },
      data: {
        snapshotData: snapshot,
        snapshotAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Log activity
    await db.activity.create({
      data: {
        canvasId,
        userId: user.id,
        type: "SHAPE_UPDATED", // Using as "SNAPSHOT_SAVED"
        data: {
          action: "snapshot_saved",
          description: description || "Canvas snapshot saved",
        },
        snapshotAfter: snapshot,
      },
    });

    return NextResponse.json({
      success: true,
      snapshotAt: updatedCanvas.snapshotAt,
    });
  } catch (error) {
    console.error("[Snapshot Post Error]", error);
    return NextResponse.json(
      { error: "Failed to save snapshot" },
      { status: 500 }
    );
  }
}

// PUT /api/canvas/[canvasId]/snapshot - Restore from snapshot (time travel)
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ canvasId: string }> }
) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { canvasId } = await params;

  try {
    const body = await req.json();
    const { activityId, timestamp } = body;

    // Check access
    const canvas = await db.canvas.findUnique({
      where: { id: canvasId },
      select: {
        ownerId: true,
        snapshotData: true,
        members: { where: { role: { in: ["EDITOR", "ADMIN"] } } },
      },
    });

    if (!canvas) {
      return NextResponse.json({ error: "Canvas not found" }, { status: 404 });
    }

    const canEdit =
      canvas.ownerId === user.id ||
      canvas.members.some((m) => m.userId === user.id);

    if (!canEdit) {
      return NextResponse.json({ error: "Edit access required" }, { status: 403 });
    }

    // If activityId provided, restore to that point
    let targetSnapshot = null;

    if (activityId) {
      const activity = await db.activity.findUnique({
        where: { id: activityId },
        select: { snapshotAfter: true },
      });

      if (activity?.snapshotAfter) {
        targetSnapshot = activity.snapshotAfter;
      }
    }

    if (!targetSnapshot) {
      return NextResponse.json(
        { error: "No snapshot found for this point in time" },
        { status: 404 }
      );
    }

    // Save current state before time travel
    await db.activity.create({
      data: {
        canvasId,
        userId: user.id,
        type: "SHAPE_UPDATED",
        data: {
          action: "time_travel",
          description: "Reverted to previous state",
          targetActivityId: activityId,
        },
        snapshotBefore: canvas.snapshotData,
        snapshotAfter: targetSnapshot,
      },
    });

    // Update canvas to restored state
    await db.canvas.update({
      where: { id: canvasId },
      data: {
        snapshotData: targetSnapshot,
        snapshotAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Canvas restored to selected point in time",
      snapshot: targetSnapshot,
    });
  } catch (error) {
    console.error("[Snapshot Restore Error]", error);
    return NextResponse.json(
      { error: "Failed to restore snapshot" },
      { status: 500 }
    );
  }
}
