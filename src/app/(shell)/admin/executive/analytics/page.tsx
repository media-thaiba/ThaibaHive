import { Metadata } from "next";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const ExecutiveAnalyticsDashboard = dynamic(
  () => import("@/components/admin/executive-analytics-dashboard").then((m) => m.ExecutiveAnalyticsDashboard),
  {
    loading: () => <Skeleton className="h-[500px] w-full" />,
  }
);

export const metadata: Metadata = {
  title: "Executive Analytics | ThaibaHive",
  description: "Unified executive intelligence dashboard for federated governance and operational resilience.",
};

export default function ExecutiveAnalyticsPage() {
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <ExecutiveAnalyticsDashboard />
    </div>
  );
}
