import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <SignIn 
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-[var(--color-canvas-surface)] border border-[var(--color-canvas-border)]",
          },
        }}
      />
    </div>
  );
}
