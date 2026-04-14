import { auth } from "@/lib/auth-instance";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

// Server-side auth functions
export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      emailVerified: true,
      createdAt: true,
    },
  });

  return user;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

// Client-side auth helper (for use in components)
export async function getSession() {
  return await auth();
}

// Password utilities
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// User management
export async function createUser(email: string, password: string, name?: string) {
  const existingUser = await db.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error("User already exists");
  }

  const passwordHash = await hashPassword(password);

  const user = await db.user.create({
    data: {
      email,
      name,
      passwordHash,
    },
  });

  return user;
}

export async function updateUserPassword(userId: string, newPassword: string) {
  const passwordHash = await hashPassword(newPassword);
  
  await db.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}