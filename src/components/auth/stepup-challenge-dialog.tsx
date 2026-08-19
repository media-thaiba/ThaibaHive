"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Props {
  isOpen: boolean;
  onSuccess: (sessionToken?: string) => void;
  onFailure: () => void;
  riskLevel: "low" | "medium" | "high" | "critical";
  challengeId?: string;
  challenge?: string;
  stepUpToken?: string;
  staffId?: string;
}

export function StepupChallengeDialog({
  isOpen,
  onSuccess,
  onFailure,
  riskLevel,
  challengeId: initialChallengeId,
  challenge: initialChallengeStr,
  stepUpToken,
  staffId,
}: Props) {
  const [method, setMethod] = useState<"webauthn" | "otp" | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (stepUpToken) {
      headers["Authorization"] = `Bearer ${stepUpToken}`;
    }
    return headers;
  };

  const startWebAuthn = async () => {
    setLoading(true);
    setError(null);
    try {
      let activeChallengeId = initialChallengeId;
      let activeChallengeStr = initialChallengeStr;

      if (!activeChallengeId || !activeChallengeStr) {
        const res = await fetch("/api/auth/webauthn/challenge", {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({ staffId, stepUpToken }),
        });
        if (!res.ok) throw new Error("Failed to start WebAuthn challenge");
        const data = await res.json();
        activeChallengeId = data.challengeId;
        activeChallengeStr = data.challenge;
      }

      let assertionResponse: any;

      if (typeof window !== "undefined" && window.navigator && "credentials" in window.navigator && activeChallengeStr) {
        try {
          const rawChallenge = atob(activeChallengeStr.replace(/-/g, "+").replace(/_/g, "/"));
          const challengeBuffer = Uint8Array.from(rawChallenge, (c) => c.charCodeAt(0));
          const cred = (await navigator.credentials.get({
            publicKey: {
              challenge: challengeBuffer,
              timeout: 60000,
              userVerification: "preferred",
            },
          })) as PublicKeyCredential;

          if (cred) {
            const rawResponse = cred.response as AuthenticatorAssertionResponse;
            const toBase64Url = (buf: ArrayBuffer) =>
              btoa(String.fromCharCode(...new Uint8Array(buf)))
                .replace(/\+/g, "-")
                .replace(/\//g, "_")
                .replace(/=/g, "");

            assertionResponse = {
              clientDataJSON: toBase64Url(rawResponse.clientDataJSON),
              authenticatorData: toBase64Url(rawResponse.authenticatorData),
              signature: toBase64Url(rawResponse.signature),
            };
          }
        } catch {
          // Fallback if browser WebAuthn prompt fails
        }
      }

      if (!assertionResponse || !assertionResponse.signature) {
        // No hardware/platform passkey credential available on this device; automatically transition to OTP
        await startOtp();
        return;
      }

      const verifyRes = await fetch("/api/auth/webauthn/verify", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          challengeId: activeChallengeId,
          type: "webauthn",
          response: assertionResponse,
          stepUpToken,
          staffId,
        }),
      });

      const verifyData = await verifyRes.json();
      if (verifyRes.ok && verifyData.success) {
        onSuccess(verifyData.sessionToken);
      } else {
        throw new Error(verifyData.error || "WebAuthn verification failed");
      }
    } catch (e: any) {
      setError(e.message);
      onFailure();
    } finally {
      setLoading(false);
    }
  };

  const startOtp = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/stepup/otp", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ staffId, stepUpToken }),
      });
      if (res.ok) {
        setMethod("otp");
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to send OTP");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setLoading(true);
    setError(null);
    try {
      const verifyRes = await fetch("/api/auth/webauthn/verify", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          challengeId: initialChallengeId,
          type: "otp",
          response: otpCode,
          stepUpToken,
          staffId,
        }),
      });

      const verifyData = await verifyRes.json();
      if (verifyRes.ok && verifyData.success) {
        onSuccess(verifyData.sessionToken);
      } else {
        throw new Error(verifyData.error || "Invalid or expired OTP");
      }
    } catch (e: any) {
      setError(e.message);
      onFailure();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onFailure()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Security Verification Required</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-zinc-400">
            Risk level:{" "}
            <Badge variant={riskLevel === "critical" ? "destructive" : "warning"}>{riskLevel}</Badge>
          </p>

          {error && <p className="text-sm text-red-500">{error}</p>}

          {!method && (
            <div className="flex flex-col gap-2">
              <Button onClick={startWebAuthn} disabled={loading}>
                Use Security Key (WebAuthn)
              </Button>
              <Button variant="outline" onClick={startOtp} disabled={loading}>
                Send OTP Code
              </Button>
            </div>
          )}

          {method === "otp" && (
            <div className="flex flex-col gap-2">
              <Input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
              />
              <Button onClick={verifyOtp} disabled={loading || !otpCode}>
                Verify OTP
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export const StepUpChallengeDialog = StepupChallengeDialog;
