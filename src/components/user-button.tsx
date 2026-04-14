"use client";

import { useState, useRef, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { LogOut, User, Settings, Mail } from "lucide-react";

export function UserButton() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/");
    router.refresh();
  };

  if (!session?.user) {
    return null;
  }

  const user = session.user;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        aria-label="User menu"
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name || "User"}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-medium text-sm">
              {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
            </span>
          </div>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-lg shadow-lg z-50 py-2">
          <div className="px-4 py-3 border-b border-border">
            <p className="font-medium text-foreground truncate">
              {user.name || "User"}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              {user.email}
            </p>
            {!user.emailVerified && (
              <div className="mt-2 flex items-center gap-2 text-xs text-amber-600">
                <Mail className="h-3 w-3" />
                <span>Email not verified</span>
              </div>
            )}
          </div>

          <div className="py-2">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push("/profile");
              }}
              className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-accent flex items-center gap-3 transition-colors"
            >
              <User className="h-4 w-4" />
              Profile
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                router.push("/settings");
              }}
              className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-accent flex items-center gap-3 transition-colors"
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>

            <button
              onClick={handleSignOut}
              className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-destructive/10 flex items-center gap-3 transition-colors mt-2"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}