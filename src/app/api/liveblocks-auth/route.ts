import { Liveblocks } from "@liveblocks/node";
import { getCurrentUser } from "@/lib/auth-utils";
import { NextRequest, NextResponse } from "next/server";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export async function POST(request: NextRequest) {
  // Get the current user from Clerk
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized - Please sign in" },
      { status: 401 }
    );
  }

  // Generate a consistent color based on user ID
  const userColor = generateUserColor(user.id);

  // Prepare the Liveblocks session
  const session = liveblocks.prepareSession(user.id, {
    userInfo: {
      name: user.firstName || user.username || "Anonymous",
      email: user.emailAddresses[0]?.emailAddress || "",
      avatar: user.imageUrl || "",
      color: userColor,
    },
  });

  // Parse the request body to get the room ID
  const { room } = await request.json();

  if (room) {
    // Grant full access to the requested room
    // In production, you'd want to check if the user has permission to access this room
    session.allow(room, session.FULL_ACCESS);
  }

  // Authorize the session and return the result
  const { status, body } = await session.authorize();

  return new NextResponse(body, { 
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

// Generate a consistent color based on user ID
function generateUserColor(userId: string): string {
  const colors = [
    "#3b82f6", // blue
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#f59e0b", // amber
    "#10b981", // emerald
    "#06b6d4", // cyan
    "#f43f5e", // rose
    "#84cc16", // lime
    "#6366f1", // indigo
    "#14b8a6", // teal
  ];

  // Create a hash from the user ID
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}
