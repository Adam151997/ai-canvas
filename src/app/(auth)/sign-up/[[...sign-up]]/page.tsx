import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <SignUp 
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
