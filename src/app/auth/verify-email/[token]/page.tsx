"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MailCheck, AlertCircle, Loader2 } from "lucide-react";

export default function VerifyEmailPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [error, setError] = useState("");
  const attempted = useRef(false);

  useEffect(() => {
    if (!token || attempted.current) return;
    attempted.current = true;

    fetch(`/api/auth/verify-email/${token}`, { method: "POST" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Invalid or expired verification token");
          setStatus("error");
          return;
        }
        setStatus("success");
      })
      .catch(() => {
        setError("An unexpected error occurred. Please try again.");
        setStatus("error");
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MailCheck className="h-5 w-5" />
            Email Verification
          </CardTitle>
        </CardHeader>
        <CardContent>
          {status === "verifying" && (
            <div className="flex flex-col items-center py-6 space-y-3" role="status" aria-live="polite">
              <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">Verifying your email...</p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center py-6 space-y-4 text-center" role="status" aria-live="polite">
              <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-500">
                <MailCheck className="w-6 h-6" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-semibold">Email Verified</h2>
                <p className="text-sm text-muted-foreground">
                  Your email is verified. You can now sign in to your account.
                </p>
              </div>
              <Button onClick={() => router.push("/auth/login")}>Go to Sign In</Button>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center py-6 space-y-4 text-center" role="alert">
              <div className="w-12 h-12 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
                <AlertCircle className="w-6 h-6" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-semibold">Verification Failed</h2>
                <p className="text-sm text-muted-foreground">{error}</p>
                <p className="text-xs text-muted-foreground">
                  Sign in to request a new verification link, or contact your administrator.
                </p>
              </div>
              <Button onClick={() => router.push("/auth/login")}>Go to Sign In</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
