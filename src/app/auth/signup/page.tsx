"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/auth/login?mode=signup");
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-muted-foreground text-xs font-medium uppercase tracking-wider animate-pulse-subtle">
        Redirecting to enroll secure node...
      </div>
    </div>
  );
}
