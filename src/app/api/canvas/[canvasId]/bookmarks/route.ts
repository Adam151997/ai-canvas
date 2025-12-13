import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// For now, store bookmarks in Activity table with a special type
// In production, you might want a separate Bookmark model

// GET /api/canvas/[canvasId]/bookmarks - Get canvas bookmarks
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
    // Get activities that are bookmarked (stored in data.bookmarked = true)
    const activities = await db.activity.findMany({
      where: {
        canvasId,
        data: {
          path: ["bookmarked"],
          equals: true,
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    const bookmarks = activities.map((activity) => ({
      id: activity.id,
      timestamp: activity.createdAt.toISOString(),
      userId: activity.userId,
      userName: activity.user?.name || "Unknown",
      description: (activity.data as any)?.description || "Keyframe",
      snapshot: activity.snapshotAfter,
    }));

    return NextResponse.json({ bookmarks });
  } catch (error) {
    console.error("[Bookmarks Get Error]", error);
    return NextResponse.json(
      { error: "Failed to fetch bookmarks" },
      { status: 500 }
    );
  }
}

// POST /api/canvas/[canvasId]/bookmarks - Create a bookmark (keyframe)
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
    const { description, snapshot, activityId } = body;

    // If activityId provided, mark that activity as bookmarked
    if (activityId) {
      const activity = await db.activity.findUnique({
        where: { id: activityId },
      });

      if (!activity) {
        return NextResponse.json({ error: "Activity not found" }, { status: 404 });
      }

      const updatedActivity = await db.activity.update({
        where: { id: activityId },
        data: {
          data: {
            ...(activity.data as object || {}),
            bookmarked: true,
            bookmarkDescription: description,
            bookmarkedBy: user.id,
            bookmarkedAt: new Date().toISOString(),
          },
        },
      });

      return NextResponse.json({
        bookmark: {
          id: updatedActivity.id,
          timestamp: updatedActivity.createdAt.toISOString(),
          description,
        },
      });
    }

    // Create a new bookmark activity
    const activity = await db.activity.create({
      data: {
        canvasId,
        userId: user.id,
        type: "SHAPE_UPDATED", // Using as "BOOKMARK_CREATED"
        data: {
          bookmarked: true,
          description: description || "Keyframe",
          action: "bookmark_created",
        },
        snapshotAfter: snapshot,
      },
    });

    return NextResponse.json({
      bookmark: {
        id: activity.id,
        timestamp: activity.createdAt.toISOString(),
        description,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("[Bookmark Create Error]", error);
    return NextResponse.json(
      { error: "Failed to create bookmark" },
      { status: 500 }
    );
  }
}

// DELETE /api/canvas/[canvasId]/bookmarks - Remove a bookmark
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ canvasId: string }> }
) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { canvasId } = await params;
  const { searchParams } = new URL(req.url);
  const activityId = searchParams.get("activityId");

  if (!activityId) {
    return NextResponse.json({ error: "Activity ID required" }, { status: 400 });
  }

  try {
    const activity = await db.activity.findUnique({
      where: { id: activityId, canvasId },
    });

    if (!activity) {
      return NextResponse.json({ error: "Bookmark not found" }, { status: 404 });
    }

    // Remove bookmark flag
    await db.activity.update({
      where: { id: activityId },
      data: {
        data: {
          ...(activity.data as object || {}),
          bookmarked: false,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Bookmark Delete Error]", error);
    return NextResponse.json(
      { error: "Failed to delete bookmark" },
      { status: 500 }
    );
  }
}
