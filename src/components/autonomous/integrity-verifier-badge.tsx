"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";

export function IntegrityVerifierBadge({ status }: { status: "VALIDATED" | "TAMPER_DETECTED" | "CHECKING" }) {
  if (status === "CHECKING") {
    return <Badge variant="secondary">Checking Chain Integrity...</Badge>;
  }

  if (status === "VALIDATED") {
    return <Badge variant="success">VAULT SECURE — HASH CHAIN VALIDATED</Badge>;
  }

  return <Badge variant="destructive">TAMPER DETECTED — INTEGRITY BREACH</Badge>;
}
