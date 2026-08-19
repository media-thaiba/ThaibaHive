"use client";

import React, { useState } from "react";
import { CycleManager } from "./_components/cycle-manager";
import { FrameworkBuilder } from "./_components/framework-builder";
import { FormTemplateModal } from "./_components/form-template-modal";
import { Button } from "@/components/ui/button";

export default function AdminPerformancePage() {
  const [openModal, setOpenModal] = useState(false);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Performance Reviews Administration</h1>
          <p className="text-muted-foreground text-sm">
            Configure competency frameworks, review cycles, and evaluation form templates.
          </p>
        </div>
        <Button onClick={() => setOpenModal(true)}>+ Create Form Template</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CycleManager />
        <FrameworkBuilder />
      </div>

      <FormTemplateModal open={openModal} onOpenChange={setOpenModal} onSuccess={() => {}} />
    </div>
  );
}
