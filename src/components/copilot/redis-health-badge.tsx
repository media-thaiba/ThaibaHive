"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";

export interface RedisHealthBadgeProps {
  redisStatus: "CONNECTED" | "IN_MEMORY_FALLBACK";
  mode: string;
}

export function RedisHealthBadge({ redisStatus, mode }: RedisHealthBadgeProps) {
  const isConnected = redisStatus === "CONNECTED";
  return (
    <div className="flex items-center space-x-2 rounded-md border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-300">
      <span className="font-medium">Redis Cluster State:</span>
      <Badge variant={isConnected ? "success" : "warning"}>
        {isConnected ? "CONNECTED (Redis Stack)" : "IN-MEMORY FALLBACK"}
      </Badge>
      <span className="text-slate-500">({mode})</span>
    </div>
  );
}
