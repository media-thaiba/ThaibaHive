import React from "react";
import { AutonomousOperationsDashboard } from "@/components/autonomous/autonomous-operations-dashboard";

export const metadata = {
  title: "Autonomous Operations | ThaibaHive Enterprise",
  description: "Self-healing platform engine and automated remediation command center",
};

export default function AutonomousOperationsPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <AutonomousOperationsDashboard />
    </div>
  );
}
