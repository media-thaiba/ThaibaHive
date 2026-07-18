"use client";

import { useState, useEffect, useCallback } from "react";
import { ChatLayout } from "@/components/chat/chat-layout";
import { Skeleton } from "@/components/ui/skeleton";

type StaffMember = {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: string;
};

export default function ChatPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const staffData = await fetch("/api/staff").then((r) => r.json());
      setStaff(Array.isArray(staffData.staff) ? staffData.staff : []);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] gap-4 p-4">
        <Skeleton className="w-80 h-full" />
        <Skeleton className="flex-1 h-full" />
      </div>
    );
  }

  return <ChatLayout staff={staff} />;
}
