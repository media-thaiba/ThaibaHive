"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api/client";
import { ensureArray } from "@/lib/utils";
import { toast } from "sonner";
import { Users, UtensilsCrossed, Search } from "lucide-react";

type MealType = "breakfast" | "lunch" | "dinner";
type MealStatus = "eating" | "skip" | "bring_guest";

type MealNotification = {
  id: string;
  staffId: string;
  date: string;
  mealType: string;
  status: string;
  guestCount: number | null;
  notes: string | null;
  staffName: string | null;
  staffLastName: string | null;
};

type MealSummary = {
  skip: number;
  guests: number;
};

type CanteenData = {
  notifications: MealNotification[];
  summary: {
    breakfast: MealSummary;
    lunch: MealSummary;
    dinner: MealSummary;
  };
};

const MEAL_CONFIG: Record<MealType, { label: string; icon: string }> = {
  breakfast: { label: "Breakfast", icon: "\u2615" },
  lunch: { label: "Lunch", icon: "\uD83C\uDF5D" },
  dinner: { label: "Dinner", icon: "\uD83C\uDF7D\uFE0F" },
};

const statusBadgeVariant: Record<MealStatus, "success" | "destructive" | "warning" | "secondary"> = {
  eating: "success",
  skip: "destructive",
  bring_guest: "warning",
};

const statusLabels: Record<MealStatus, string> = {
  eating: "Eating",
  skip: "Skip",
  bring_guest: "Guests",
};

function today() {
  return new Date().toISOString().split("T")[0];
}

export default function CanteenPage() {
  const { staff } = useAuth();
  const canViewTeam = staff && ["super_admin", "admin", "principal", "hod"].includes(staff.role);

  const [activeTab, setActiveTab] = useState<"my" | "team">("my");
  const [selectedDate, setSelectedDate] = useState(today());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CanteenData | null>(null);

  const [submitting, setSubmitting] = useState(false);

  const [teamSearch, setTeamSearch] = useState("");
  const [filterMealType, setFilterMealType] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  const [preferences, setPreferences] = useState<
    Record<MealType, { status: MealStatus; guestCount: number; notes: string }>
  >({
    breakfast: { status: "eating", guestCount: 0, notes: "" },
    lunch: { status: "eating", guestCount: 0, notes: "" },
    dinner: { status: "eating", guestCount: 0, notes: "" },
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await api.get<CanteenData>("/api/canteen", {
      params: { date: selectedDate },
      toast: false,
    });
    if (res.ok && res.data) {
      const d = res.data;
      const notifications = ensureArray<MealNotification>(d.notifications);
      setData({
        notifications,
        summary: d.summary || {
          breakfast: { skip: 0, guests: 0 },
          lunch: { skip: 0, guests: 0 },
          dinner: { skip: 0, guests: 0 },
        },
      });
      const myNotifs = notifications.filter((n) => n.staffId === staff?.id);
      setPreferences((prev) => {
        const merged = { ...prev };
        for (const n of myNotifs) {
          merged[n.mealType as MealType] = {
            status: n.status as MealStatus,
            guestCount: n.guestCount || 0,
            notes: n.notes || "",
          };
        }
        return merged;
      });
    }
    setLoading(false);
  }, [selectedDate, staff?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function updatePreference(meal: MealType, field: string, value: string | number) {
    setPreferences((prev) => ({
      ...prev,
      [meal]: { ...prev[meal], [field]: value },
    }));
  }

  async function submitPreference(meal: MealType) {
    setSubmitting(true);
    const pref = preferences[meal];
    const res = await api.post("/api/canteen", {
      date: selectedDate,
      mealType: meal,
      status: pref.status,
      guestCount: pref.status === "bring_guest" ? pref.guestCount : 0,
      notes: pref.notes || undefined,
    });
    if (res.ok) {
      toast.success(`${MEAL_CONFIG[meal].label} preference saved`);
      fetchData();
    }
    setSubmitting(false);
  }

  const notifications = data?.notifications ?? [];
  const filteredTeamNotifications = notifications.filter((n) => {
    if (filterMealType && n.mealType !== filterMealType) return false;
    if (filterStatus && n.status !== filterStatus) return false;
    if (teamSearch) {
      const name = [n.staffName, n.staffLastName].filter(Boolean).join(" ").toLowerCase();
      if (!name.includes(teamSearch.toLowerCase())) return false;
    }
    return true;
  });

  const totalStaff = new Set(notifications.map((n) => n.staffId)).size;

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-6 lg:p-8">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const tabs: { key: "my" | "team"; label: string }[] = [
    { key: "my", label: "My Meals" },
  ];
  if (canViewTeam) tabs.push({ key: "team", label: "Kitchen Summary" });

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Canteen & Meals"
        description="Manage your daily meal preferences and view kitchen summary."
        actions={
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto max-w-[160px]"
            />
          </div>
        }
      />

      {/* Tabs */}
      {tabs.length > 1 && (
        <div className="flex gap-0.5 border-b">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative px-4 py-2.5 text-sm font-medium transition-colors -mb-px ${
                activeTab === tab.key
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Daily Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        {(["breakfast", "lunch", "dinner"] as MealType[]).map((meal) => {
          const summary = data?.summary[meal] || { skip: 0, guests: 0 };
          const mealNotifs = notifications.filter((n) => n.mealType === meal);
          const eatingCount = mealNotifs.filter((n) => n.status === "eating").length;
          const bringingGuests = mealNotifs.filter((n) => n.status === "bring_guest").length;
          const netPrepared = eatingCount + bringingGuests + (summary.guests || 0) - (summary.skip || 0);
          return (
            <Card key={meal} className="animate-slide-up">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">
                    {MEAL_CONFIG[meal].icon} {MEAL_CONFIG[meal].label}
                  </CardTitle>
                  <Badge variant="default">{eatingCount + bringingGuests + (summary.skip || 0)} staff</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Expected</p>
                    <p className="text-lg font-bold">
                      {eatingCount + bringingGuests + (summary.skip || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Skips</p>
                    <p className="text-lg font-bold text-destructive">
                      {summary.skip || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Extra Guests</p>
                    <p className="text-lg font-bold text-warning">
                      {summary.guests || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Net Prepared</p>
                    <p className="text-lg font-bold text-success">
                      {Math.max(0, netPrepared)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* My Meals Tab */}
      {activeTab === "my" && (
        <div className="space-y-4">
          {(["breakfast", "lunch", "dinner"] as MealType[]).map((meal) => {
            const pref = preferences[meal];
            return (
              <Card key={meal} className="animate-slide-up">
                <CardHeader>
                  <CardTitle className="text-base">
                    {MEAL_CONFIG[meal].icon} {MEAL_CONFIG[meal].label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3 mb-4">
                    <Button
                      variant={pref.status === "eating" ? "default" : "outline"}
                      size="sm"
                      onClick={() => updatePreference(meal, "status", "eating")}
                    >
                      {"\uD83C\uDF7D\uFE0F"} Eating
                    </Button>
                    <Button
                      variant={pref.status === "skip" ? "destructive" : "outline"}
                      size="sm"
                      onClick={() => updatePreference(meal, "status", "skip")}
                    >
                      {"\uD83D\uDEAB"} Skip Meal
                    </Button>
                    <Button
                      variant={pref.status === "bring_guest" ? "default" : "outline"}
                      size="sm"
                      onClick={() => updatePreference(meal, "status", "bring_guest")}
                    >
                      {"\uD83D\uDC65"} Bringing Guests
                    </Button>
                  </div>

                  {pref.status === "bring_guest" && (
                    <div className="mb-4 flex items-center gap-3">
                      <label className="text-sm font-medium">Extra guests:</label>
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        value={pref.guestCount || 1}
                        onChange={(e) =>
                          updatePreference(
                            meal,
                            "guestCount",
                            Math.max(1, parseInt(e.target.value) || 1)
                          )
                        }
                        className="w-24"
                      />
                    </div>
                  )}

                  <div className="mb-4">
                    <label className="text-sm font-medium text-muted-foreground">Notes</label>
                    <Input
                      type="text"
                      placeholder="Any special requests..."
                      value={pref.notes}
                      onChange={(e) => updatePreference(meal, "notes", e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <Button
                    onClick={() => submitPreference(meal)}
                    disabled={submitting}
                    size="sm"
                  >
                    {submitting ? "Saving..." : "Save Preference"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Kitchen Summary Tab */}
      {activeTab === "team" && (
        <Card className="animate-slide-up">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-base flex items-center gap-2">
                <UtensilsCrossed className="h-4 w-4" />
                Kitchen Summary — {totalStaff} staff notified
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search staff..."
                    value={teamSearch}
                    onChange={(e) => setTeamSearch(e.target.value)}
                    className="w-full sm:w-56 pl-8"
                  />
                </div>
                <Select
                  value={filterMealType}
                  onChange={(e) => setFilterMealType(e.target.value)}
                  className="w-36"
                >
                  <option value="">All Meals</option>
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                </Select>
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-36"
                >
                  <option value="">All Status</option>
                  <option value="eating">Eating</option>
                  <option value="skip">Skip</option>
                  <option value="bring_guest">Guests</option>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredTeamNotifications.length === 0 ? (
              <EmptyState
                icon={<Users className="h-12 w-12" />}
                title="No notifications"
                description="No meal notifications found for this date."
              />
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                        Staff Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                        Meal
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                        Guests
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTeamNotifications.map((n) => (
                      <tr
                        key={n.id}
                        className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium">
                          {[n.staffName, n.staffLastName].filter(Boolean).join(" ") || "\u2014"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {MEAL_CONFIG[n.mealType as MealType]?.icon}{" "}
                          {MEAL_CONFIG[n.mealType as MealType]?.label}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={statusBadgeVariant[n.status as MealStatus] || "secondary"}
                          >
                            {statusLabels[n.status as MealStatus] || n.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {n.guestCount && n.guestCount > 0 ? (
                            <span className="font-medium text-warning">+{n.guestCount}</span>
                          ) : (
                            "\u2014"
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">
                          {n.notes || "\u2014"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
