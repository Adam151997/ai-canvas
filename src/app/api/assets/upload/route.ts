import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { put } from "@vercel/blob";
import { db } from "@/lib/db";
import { nanoid } from "nanoid";

// Allowed file types
const ALLOWED_TYPES = [
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  // Documents
  "application/pdf",
  "text/plain",
  "text/markdown",
  // Data
  "application/json",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const canvasId = formData.get("canvasId") as string | null;

    console.log("[Asset Upload] Received request", {
      hasFile: !!file,
      fileName: file?.name,
      fileType: file?.type,
      fileSize: file?.size,
      canvasId,
    });

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!canvasId) {
      return NextResponse.json({ error: "Canvas ID required" }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `File type not allowed: ${file.type}` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Check canvas access
    const canvas = await db.canvas.findUnique({
      where: { id: canvasId },
      select: {
        ownerId: true,
        members: { select: { userId: true, role: true } },
      },
    });

    if (!canvas) {
      return NextResponse.json({ error: "Canvas not found" }, { status: 404 });
    }

    const canUpload =
      canvas.ownerId === user.id ||
      canvas.members.some(
        (m) => m.userId === user.id && ["EDITOR", "ADMIN"].includes(m.role)
      );

    if (!canUpload) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // Ensure user exists in database
    await db.user.upsert({
      where: { id: user.id },
      update: {
        email: user.emailAddresses[0]?.emailAddress || "",
        name: user.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : user.username || "User",
        avatarUrl: user.imageUrl,
      },
      create: {
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress || "",
        name: user.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : user.username || "User",
        avatarUrl: user.imageUrl,
      },
    });

    // Generate unique filename
    const ext = file.name.split(".").pop() || "";
    const uniqueFilename = `${canvasId}/${nanoid()}.${ext}`;

    // Upload to Vercel Blob
    const blob = await put(uniqueFilename, file, {
      access: "public",
      addRandomSuffix: false,
    });

    console.log("[Asset Upload] Blob created", { url: blob.url });

    // Create asset record in database
    const asset = await db.asset.create({
      data: {
        canvasId,
        uploaderId: user.id,
        filename: file.name,
        mimeType: file.type,
        size: file.size,
        url: blob.url,
        status: "PENDING", // Will be processed by background job
      },
    });

    console.log("[Asset Upload] Asset created", { assetId: asset.id });

    // Log activity
    try {
      await db.activity.create({
        data: {
          canvasId,
          userId: user.id,
          type: "ASSET_UPLOADED",
          data: { assetId: asset.id, filename: file.name },
        },
      });
    } catch (e) {
      console.warn("[Asset Upload] Failed to log activity:", e);
    }

    return NextResponse.json({
      id: asset.id,
      url: blob.url,
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      status: "PENDING",
    });
  } catch (error) {
    console.error("[Asset Upload Error]", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
