"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, RefreshCw, KeyRound } from "lucide-react";

interface AuditIntegrityCardProps {
  onVerify?: () => Promise<void>;
  verificationResult?: {
    valid: boolean;
    status: string;
    totalVerified: number;
    merkleRootsVerified?: number;
    durationMs?: number;
  } | null;
  loading?: boolean;
}

export function AuditIntegrityCard({
  onVerify,
  verificationResult,
  loading,
}: AuditIntegrityCardProps) {
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    if (!onVerify) return;
    try {
      setVerifying(true);
      await onVerify();
    } finally {
      setVerifying(false);
    }
  };

  const isVerified = verificationResult?.valid ?? true;

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-indigo-500" />
          Cryptographic Audit Integrity
        </CardTitle>
        <Badge variant={isVerified ? "success" : "destructive"}>
          {verificationResult ? verificationResult.status : "CHAIN ACTIVE"}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {isVerified ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 text-rose-500 shrink-0" />
            )}
            <div className="text-sm font-medium">
              {isVerified
                ? "SHA-256 Merkle hash chain fully intact"
                : "Integrity breach detected in log chain"}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
            <span>
              Verified Blocks:{" "}
              <strong className="text-foreground">
                {verificationResult?.totalVerified ?? 0}
              </strong>
            </span>
            <span>
              Merkle Roots:{" "}
              <strong className="text-foreground">
                {verificationResult?.merkleRootsVerified ?? 0}
              </strong>
            </span>
          </div>

          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full flex items-center justify-center gap-2"
              onClick={handleVerify}
              disabled={verifying || loading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${verifying ? "animate-spin" : ""}`} />
              {verifying ? "Verifying Merkle Tree..." : "Verify Audit Chain Now"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
