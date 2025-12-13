import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET /api/canvas/[canvasId]/history - Get canvas activity history
export async function GET(
  req: Request,
  { params }: { params: Promise<{ canvasId: string }> }
) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { canvasId } = await params;
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "50");
  const before = searchParams.get("before"); // Cursor for pagination
  const shapeId = searchParams.get("shapeId"); // Filter by shape

  try {
    // Check canvas access
    const canvas = await db.canvas.findUnique({
      where: { id: canvasId },
      select: {
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

    // Build query
    const whereClause: any = { canvasId };
    
    if (before) {
      whereClause.createdAt = { lt: new Date(before) };
    }
    
    if (shapeId) {
      whereClause.shapeId = shapeId;
    }

    // Fetch activities
    const activities = await db.activity.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Format response
    const history = activities.map((activity) => ({
      id: activity.id,
      timestamp: activity.createdAt.toISOString(),
      userId: activity.userId,
      userName: activity.user?.name || "Unknown",
      userAvatar: activity.user?.avatarUrl,
      type: activity.type,
      shapeId: activity.shapeId,
      data: activity.data,
      snapshotBefore: activity.snapshotBefore,
      snapshotAfter: activity.snapshotAfter,
    }));

    // Get cursor for next page
    const nextCursor =
      activities.length === limit
        ? activities[activities.length - 1].createdAt.toISOString()
        : null;

    return NextResponse.json({
      history,
      nextCursor,
      total: activities.length,
    });
  } catch (error) {
    console.error("[History Get Error]", error);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}

// POST /api/canvas/[canvasId]/history - Log an activity
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
    const { type, shapeId, data, snapshotBefore, snapshotAfter } = body;

    // Validate type
    const validTypes = [
      "SHAPE_CREATED",
      "SHAPE_UPDATED",
      "SHAPE_DELETED",
      "COMMENT_ADDED",
      "COMMENT_RESOLVED",
      "ASSET_UPLOADED",
      "AI_SYNTHESIS",
      "CANVAS_RENAMED",
      "MEMBER_ADDED",
      "MEMBER_REMOVED",
    ];

    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid activity type" }, { status: 400 });
    }

    // Create activity
    const activity = await db.activity.create({
      data: {
        canvasId,
        userId: user.id,
        type,
        shapeId,
        data,
        snapshotBefore,
        snapshotAfter,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    return NextResponse.json({ activity }, { status: 201 });
  } catch (error) {
    console.error("[History Post Error]", error);
    return NextResponse.json(
      { error: "Failed to log activity" },
      { status: 500 }
    );
  }
}
