"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

const errorMessages: Record<string, string> = {
  handoff_failed: "Authentication handshake failed. Please try again.",
  missing_nonce: "Authentication token was not provided.",
  invalid_nonce: "The authentication token is invalid or has expired.",
  replay_detected: "This token has already been used. Please request a new one.",
  rate_limited: "Too many requests. Please wait a moment and try again.",
  invalid_token: "The authentication token is malformed.",
  user_not_found: "User account not found.",
  account_deactivated: "This account has been deactivated. Contact your administrator.",
  session_invalid: "Your session is no longer valid. Please login again.",
};

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code") || "unknown";
  const message = searchParams.get("message") || errorMessages[code] || "An unexpected error occurred.";

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl text-destructive">Authentication Error</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="error">{message}</Alert>
        <p className="text-center text-sm text-muted-foreground">
          Please close this screen and try again from the app.
        </p>
      </CardContent>
    </Card>
  );
}

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <div className="w-full max-w-sm px-4">
        <Suspense fallback={
          <Card>
            <CardHeader className="text-center">
              <Skeleton className="h-8 w-48 mx-auto" />
            </CardHeader>
            <CardContent className="text-center py-8 space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4 mx-auto" />
            </CardContent>
          </Card>
        }>
          <AuthErrorContent />
        </Suspense>
      </div>
    </div>
  );
}
