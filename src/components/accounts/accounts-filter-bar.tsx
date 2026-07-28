"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Filter, Download } from "lucide-react";

type Institution = { id: string; name: string };

type Props = {
  institutions: Institution[];
  selectedInst: string;
  fromDate: string;
  toDate: string;
  onInstChange: (v: string) => void;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  onApply: () => void;
  onExport: () => void;
};

export function AccountsFilterBar({ institutions, selectedInst, fromDate, toDate, onInstChange, onFromChange, onToChange, onApply, onExport }: Props) {
  return (
    <Card className="hover:shadow-xs transition-shadow">
      <CardContent className="p-4 flex flex-wrap gap-4 items-end">
        <div className="space-y-1.5 min-w-[200px] flex-1">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Institution</label>
          <Select value={selectedInst} onChange={(e) => onInstChange(e.target.value)}>
            <option value="">All Institutions</option>
            {institutions.map(inst => <option key={inst.id} value={inst.id}>{inst.name}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5 min-w-[140px]">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">From Date</label>
          <Input type="date" value={fromDate} onChange={(e) => onFromChange(e.target.value)} />
        </div>
        <div className="space-y-1.5 min-w-[140px]">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">To Date</label>
          <Input type="date" value={toDate} onChange={(e) => onToChange(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onApply} className="gap-1.5">
            <Filter className="h-4 w-4" /> Filter
          </Button>
          <Button variant="outline" onClick={onExport} className="gap-1.5">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
