import React from "react";
import { PageHeader } from "@/components/ui/page-header";
import { CopilotChatWorkspace } from "@/components/copilot/copilot-chat-workspace";

export const metadata = {
  title: "AI Copilot Swarm Workspace | ThaibaHive Enterprise",
  description: "Autonomous Multi-Agent Copilot Swarm & Decision Support Workspace",
};

export default function AICopilotsPage() {
  return (
    <div className="container mx-auto space-y-6 p-6">
      <PageHeader
        title="Autonomous AI Copilot Swarm Workspace"
        description="Contextual AI copilots providing decision support across Academic, Financial Controller, and Compliance Auditor domains."
      />
      <CopilotChatWorkspace />
    </div>
  );
}
