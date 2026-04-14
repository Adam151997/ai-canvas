// Email functionality has been removed
// This file is kept as a placeholder for future email implementation

export async function sendVerificationEmail(email: string): Promise<void> {
  console.warn("Email verification is disabled.");
  console.log(`Would send verification email to: ${email}`);
}

export async function sendPasswordResetEmail(email: string): Promise<void> {
  console.warn("Password reset emails are disabled.");
  console.log(`Would send password reset email to: ${email}`);
}

export async function verifyToken(token: string) {
  console.warn("Token verification is disabled.");
  return null;
}

export async function deleteToken(token: string) {
  console.warn("Token deletion is disabled.");
}