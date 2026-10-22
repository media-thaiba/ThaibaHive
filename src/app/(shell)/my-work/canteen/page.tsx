"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api/client";
import { ensureArray } from "@/lib/utils";
import { toast } from "sonner";
import { UtensilsCrossed, Search, Settings2, Clock } from "lucide-react";

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

type UserPreferences = {
  defaultBreakfast: "eating" | "skip";
  defaultLunch: "eating" | "skip";
  defaultDinner: "eating" | "skip";
  skipStartDate: string | null;
  skipEndDate: string | null;
  recurringSkipDays: number[];
};

type CanteenData = {
  notifications: MealNotification[];
  summary: {
    breakfast: MealSummary;
    lunch: MealSummary;
    dinner: MealSummary;
  };
  userPreferences?: UserPreferences | null;
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

const DAYS_OF_WEEK = [
  { day: 0, label: "Sun" },
  { day: 1, label: "Mon" },
  { day: 2, label: "Tue" },
  { day: 3, label: "Wed" },
  { day: 4, label: "Thu" },
  { day: 5, label: "Fri" },
  { day: 6, label: "Sat" },
];

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
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);

  const [teamSearch, setTeamSearch] = useState("");
  const [filterMealType, setFilterMealType] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  const [userPrefs, setUserPrefs] = useState<UserPreferences>({
    defaultBreakfast: "eating",
    defaultLunch: "eating",
    defaultDinner: "eating",
    skipStartDate: null,
    skipEndDate: null,
    recurringSkipDays: [],
  });

  const [prefForm, setPrefForm] = useState<UserPreferences>({
    defaultBreakfast: "eating",
    defaultLunch: "eating",
    defaultDinner: "eating",
    skipStartDate: null,
    skipEndDate: null,
    recurringSkipDays: [],
  });

  const [preferences, setPreferences] = useState<
    Record<MealType, { status: MealStatus; guestCount: number; notes: string }>
  >({
    breakfast: { status: "eating", guestCount: 0, notes: "" },
    lunch: { status: "eating", guestCount: 0, notes: "" },
    dinner: { status: "eating", guestCount: 0, notes: "" },
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
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

        const activePrefs: UserPreferences = d.userPreferences || {
          defaultBreakfast: "eating",
          defaultLunch: "eating",
          defaultDinner: "eating",
          skipStartDate: null,
          skipEndDate: null,
          recurringSkipDays: [],
        };
        setUserPrefs(activePrefs);
        setPrefForm(activePrefs);

        const myNotifs = notifications.filter((n) => n.staffId === staff?.id);

        // Compute effective defaults for the selected date
        const dayOfWeek = new Date(selectedDate).getDay();
        const isInSkipPeriod = Boolean(
          activePrefs.skipStartDate &&
          activePrefs.skipEndDate &&
          selectedDate >= activePrefs.skipStartDate &&
          selectedDate <= activePrefs.skipEndDate
        );
        const isRecurringSkipDay = activePrefs.recurringSkipDays.includes(dayOfWeek);

        setPreferences((prev) => {
          const merged = { ...prev };
          (["breakfast", "lunch", "dinner"] as MealType[]).forEach((m) => {
            const notif = myNotifs.find((n) => n.mealType === m);
            if (notif) {
              merged[m] = {
                status: notif.status as MealStatus,
                guestCount: notif.guestCount || 0,
                notes: notif.notes || "",
              };
            } else {
              // Apply defaults
              let defaultStatus: MealStatus = "eating";
              let defaultNotes = "";

              if (isInSkipPeriod) {
                defaultStatus = "skip";
                defaultNotes = "Scheduled Period Skip";
              } else if (isRecurringSkipDay) {
                defaultStatus = "skip";
                defaultNotes = "Regular Weekly Skip";
              } else {
                const key = m === "breakfast" ? "defaultBreakfast" : m === "lunch" ? "defaultLunch" : "defaultDinner";
                defaultStatus = activePrefs[key] || "eating";
                if (defaultStatus === "skip") {
                  defaultNotes = "Default: Skip Meal";
                }
              }

              merged[m] = {
                status: defaultStatus,
                guestCount: 0,
                notes: defaultNotes,
              };
            }
          });
          return merged;
        });
      }
    } catch {
      toast.error("Failed to load canteen & meal data");
    } finally {
      setLoading(false);
    }
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
    try {
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
      } else {
        toast.error(res.error || "Failed to save meal preference");
      }
    } catch {
      toast.error("Failed to save meal preference");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveSchedulePreferences() {
    setSavingSchedule(true);
    try {
      const res = await api.put("/api/canteen/preferences", prefForm);
      if (res.ok) {
        toast.success("Meal defaults & schedule saved");
        setScheduleModalOpen(false);
        fetchData();
      } else {
        toast.error(res.error || "Failed to save preferences");
      }
    } catch {
      toast.error("Failed to save preferences");
    } finally {
      setSavingSchedule(false);
    }
  }

  function toggleRecurringDay(day: number) {
    setPrefForm((prev) => {
      const exists = prev.recurringSkipDays.includes(day);
      const nextDays = exists
        ? prev.recurringSkipDays.filter((d) => d !== day)
        : [...prev.recurringSkipDays, day].sort();
      return { ...prev, recurringSkipDays: nextDays };
    });
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

  const activeDayOfWeek = new Date(selectedDate).getDay();
  const isSelectedDateInSkipPeriod = Boolean(
    userPrefs.skipStartDate &&
    userPrefs.skipEndDate &&
    selectedDate >= userPrefs.skipStartDate &&
    selectedDate <= userPrefs.skipEndDate
  );
  const isSelectedDateRecurringSkip = userPrefs.recurringSkipDays.includes(activeDayOfWeek);

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Canteen & Meals"
        description="Manage your daily meal preferences, regular schedule, and kitchen headcount."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPrefForm(userPrefs);
                setScheduleModalOpen(true);
              }}
              className="gap-1.5 text-xs h-9"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Schedule & Defaults
            </Button>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto max-w-[150px] h-9"
            />
          </div>
        }
      />

      {/* Schedule Banner if Active on Selected Date */}
      {(isSelectedDateInSkipPeriod || isSelectedDateRecurringSkip) && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-300">
          <Clock className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            {isSelectedDateInSkipPeriod
              ? `Scheduled Skip Window Active (${userPrefs.skipStartDate} to ${userPrefs.skipEndDate})`
              : "Recurring Weekly Skip Active for this day"}
            . Daily meals default to <strong>Skip</strong> unless overridden below.
          </span>
        </div>
      )}

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
            const explicit = notifications.find((n) => n.staffId === staff?.id && n.mealType === meal);
            return (
              <Card key={meal} className="animate-slide-up">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {MEAL_CONFIG[meal].icon} {MEAL_CONFIG[meal].label}
                    </CardTitle>
                    {!explicit && pref.notes && (
                      <Badge variant="secondary" className="text-[11px] font-normal">
                        {pref.notes}
                      </Badge>
                    )}
                    {explicit?.notes?.startsWith("Auto-skipped") && (
                      <Badge variant="warning" className="text-[11px] font-normal">
                        {explicit.notes}
                      </Badge>
                    )}
                  </div>
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
                      {"\u274C"} Skip Meal
                    </Button>
                    <Button
                      variant={pref.status === "bring_guest" ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => updatePreference(meal, "status", "bring_guest")}
                    >
                      {"\uD83D\uDC65"} Bring Guest(s)
                    </Button>
                  </div>

                  {pref.status === "bring_guest" && (
                    <div className="mb-4 max-w-xs">
                      <label className="text-xs font-medium mb-1 block">Number of Guests</label>
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        value={pref.guestCount || 1}
                        onChange={(e) =>
                          updatePreference(meal, "guestCount", parseInt(e.target.value) || 1)
                        }
                      />
                    </div>
                  )}

                  <div className="mb-4">
                    <label className="text-xs font-medium mb-1 block">Notes (optional)</label>
                    <Input
                      placeholder="e.g. Dietary requirement, coming late..."
                      value={pref.notes}
                      onChange={(e) => updatePreference(meal, "notes", e.target.value)}
                    />
                  </div>

                  <Button
                    size="sm"
                    onClick={() => submitPreference(meal)}
                    disabled={submitting}
                  >
                    {submitting ? "Saving..." : "Save for this date"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Kitchen Summary Tab */}
      {activeTab === "team" && canViewTeam && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-base">Kitchen Summary & Roster</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalStaff} staff with recorded responses for {selectedDate}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search staff..."
                    value={teamSearch}
                    onChange={(e) => setTeamSearch(e.target.value)}
                    className="pl-8 w-44 h-9 text-xs"
                  />
                </div>
                <Select
                  value={filterMealType}
                  onChange={(e) => setFilterMealType(e.target.value)}
                  className="w-32 h-9 text-xs"
                >
                  <SelectItem value="">All Meals</SelectItem>
                  <SelectItem value="breakfast">Breakfast</SelectItem>
                  <SelectItem value="lunch">Lunch</SelectItem>
                  <SelectItem value="dinner">Dinner</SelectItem>
                </Select>
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-32 h-9 text-xs"
                >
                  <SelectItem value="">All Statuses</SelectItem>
                  <SelectItem value="eating">Eating</SelectItem>
                  <SelectItem value="skip">Skip</SelectItem>
                  <SelectItem value="bring_guest">Guests</SelectItem>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredTeamNotifications.length === 0 ? (
              <EmptyState
                icon={<UtensilsCrossed className="h-10 w-10 text-muted-foreground/40" />}
                title="No meal notifications found"
                description={
                  teamSearch || filterMealType || filterStatus
                    ? "Try adjusting your filters"
                    : "No staff responses recorded for this date"
                }
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

      {/* Schedule & Defaults Dialog */}
      <Dialog open={scheduleModalOpen} onOpenChange={setScheduleModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Meal Preferences & Schedule</DialogTitle>
            <DialogDescription>
              Configure your default meal attendance, schedule recurring skip days, or set a temporary skip period.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* 1. Permanent Defaults */}
            <div>
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                1. Default Daily Preference
              </h4>
              <p className="text-xs text-muted-foreground mb-3">
                Choose your default status if you don&apos;t manually change it every day.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(["breakfast", "lunch", "dinner"] as MealType[]).map((meal) => {
                  const key = meal === "breakfast" ? "defaultBreakfast" : meal === "lunch" ? "defaultLunch" : "defaultDinner";
                  const val = prefForm[key];
                  return (
                    <div key={meal} className="rounded-lg border p-2 space-y-1">
                      <div className="text-xs font-medium">
                        {MEAL_CONFIG[meal].icon} {MEAL_CONFIG[meal].label}
                      </div>
                      <Select
                        value={val}
                        onChange={(e) =>
                          setPrefForm((p) => ({
                            ...p,
                            [key]: e.target.value as "eating" | "skip",
                          }))
                        }
                        className="text-xs h-8"
                      >
                        <SelectItem value="eating">Eating</SelectItem>
                        <SelectItem value="skip">Skip Meal</SelectItem>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Recurring Weekly Skips */}
            <div>
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                2. Regular Weekly Skips
              </h4>
              <p className="text-xs text-muted-foreground mb-2">
                Automatically mark all meals as &quot;Skip&quot; on selected days every week.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {DAYS_OF_WEEK.map(({ day, label }) => {
                  const selected = prefForm.recurringSkipDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleRecurringDay(day)}
                      className={`px-3 py-1 text-xs rounded-md border font-medium transition-colors ${
                        selected
                          ? "bg-destructive/10 border-destructive text-destructive font-semibold"
                          : "bg-card border-border/70 hover:bg-muted text-foreground/80"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Date Range Temporary Skip */}
            <div>
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                3. Skip for a Period of Time
              </h4>
              <p className="text-xs text-muted-foreground mb-2">
                Set a specific date window where you will not be dining.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">From Date</label>
                  <Input
                    type="date"
                    value={prefForm.skipStartDate || ""}
                    onChange={(e) =>
                      setPrefForm((p) => ({
                        ...p,
                        skipStartDate: e.target.value || null,
                      }))
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">To Date</label>
                  <Input
                    type="date"
                    value={prefForm.skipEndDate || ""}
                    onChange={(e) =>
                      setPrefForm((p) => ({
                        ...p,
                        skipEndDate: e.target.value || null,
                      }))
                    }
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              {(prefForm.skipStartDate || prefForm.skipEndDate) && (
                <button
                  type="button"
                  onClick={() =>
                    setPrefForm((p) => ({
                      ...p,
                      skipStartDate: null,
                      skipEndDate: null,
                    }))
                  }
                  className="text-[11px] text-destructive hover:underline mt-1.5"
                >
                  Clear date window
                </button>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setScheduleModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveSchedulePreferences}
              disabled={savingSchedule}
            >
              {savingSchedule ? "Saving..." : "Save Preferences"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
