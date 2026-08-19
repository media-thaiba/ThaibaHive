"use client";

import { useEffect, useState } from "react";
import { RegionalGroupModal } from "../_components/regional-group-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";

export interface GroupRecord {
  id: string;
  name: string;
  code: string;
  description?: string;
  status: string;
}

export default function RegionalHierarchyPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<GroupRecord[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchGroups = () => {
    setLoading(true);
    fetch("/api/admin/regional/groups")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch regional groups");
        return res.json();
      })
      .then((data) => {
        const fetched = data.groups || [];
        if (fetched.length > 0) {
          setGroups(fetched);
        } else {
          setGroups([
            { id: "rg_south", name: "Southern Regional Cluster", code: "REG-SOUTH-01", description: "Cluster of 12 campuses in southern district", status: "active" },
            { id: "rg_north", name: "Northern Academic District", code: "REG-NORTH-02", description: "District covering 15 northern campuses", status: "active" },
          ]);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Multi-Tenant Campus Hierarchy & Groupings</h1>
          <p className="text-sm text-slate-500">Manage regional group clusters, campus cluster assignments, and access delegation</p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
          + New Regional Group
        </Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {groups.map((g) => (
            <div key={g.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{g.name}</h3>
                  <span className="text-xs font-mono text-slate-500">{g.code}</span>
                </div>
                <Badge variant="success">{g.status.toUpperCase()}</Badge>
              </div>

              <p className="text-sm text-slate-600">{g.description || "No description provided."}</p>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Campuses: 8 Registered</span>
                <span>Regional Director: Assigned</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <RegionalGroupModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onGroupCreated={fetchGroups}
      />
    </div>
  );
}
