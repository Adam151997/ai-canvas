import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { del } from "@vercel/blob";
import { db } from "@/lib/db";

// GET /api/assets - List assets for a canvas
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const canvasId = searchParams.get("canvasId");

  if (!canvasId) {
    return NextResponse.json({ error: "Canvas ID required" }, { status: 400 });
  }

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

    // Fetch assets without the problematic relation
    const assets = await db.asset.findMany({
      where: { canvasId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        size: true,
        url: true,
        thumbnailUrl: true,
        status: true,
        createdAt: true,
        uploaderId: true,
      },
    });

    // Fetch uploader info separately
    const uploaderIds = [...new Set(assets.map((a) => a.uploaderId))];
    const uploaders = await db.user.findMany({
      where: { id: { in: uploaderIds } },
      select: { id: true, name: true, avatarUrl: true },
    });

    const uploaderMap = new Map(uploaders.map((u) => [u.id, u]));

    // Merge uploader info
    const assetsWithUploaders = assets.map((asset) => ({
      ...asset,
      uploader: uploaderMap.get(asset.uploaderId) || null,
    }));

    return NextResponse.json({ assets: assetsWithUploaders });
  } catch (error) {
    console.error("[Assets List Error]", error);
    return NextResponse.json(
      { error: "Failed to fetch assets" },
      { status: 500 }
    );
  }
}

// DELETE /api/assets - Delete an asset
export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const assetId = searchParams.get("id");

  if (!assetId) {
    return NextResponse.json({ error: "Asset ID required" }, { status: 400 });
  }

  try {
    // Get asset with canvas info
    const asset = await db.asset.findUnique({
      where: { id: assetId },
      select: {
        id: true,
        url: true,
        thumbnailUrl: true,
        uploaderId: true,
        canvasId: true,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Get canvas for permission check
    const canvas = await db.canvas.findUnique({
      where: { id: asset.canvasId },
      select: {
        ownerId: true,
        members: { select: { userId: true, role: true } },
      },
    });

    if (!canvas) {
      return NextResponse.json({ error: "Canvas not found" }, { status: 404 });
    }

    // Check permission
    const canDelete =
      asset.uploaderId === user.id ||
      canvas.ownerId === user.id ||
      canvas.members.some(
        (m) => m.userId === user.id && m.role === "ADMIN"
      );

    if (!canDelete) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // Vercel Blob has been removed, just log warning
    if (asset.url || asset.thumbnailUrl) {
      console.warn("Vercel Blob storage removed. Files cannot be deleted from storage.");
    }

    // Delete from database
    await db.asset.delete({
      where: { id: assetId },
    });

    // Delete related embeddings
    try {
      await db.embedding.deleteMany({
        where: { sourceType: "ASSET", sourceId: assetId },
      });
    } catch (e) {
      console.warn("Failed to delete embeddings:", e);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Asset Delete Error]", error);
    return NextResponse.json(
      { error: "Failed to delete asset" },
      { status: 500 }
    );
  }
}
