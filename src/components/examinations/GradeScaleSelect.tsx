"use client";

import React from "react";
import { Select } from "@/components/ui/select";

interface GradeScaleSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function GradeScaleSelect({ value, onChange }: GradeScaleSelectProps) {
  const options = [
    { value: "gs_10point_standard", label: "Standard 10-Point Grading Scale (O, A+, A, B+, B, C, F)" },
    { value: "gs_letter_us", label: "US Letter Grade Scale (A, B, C, D, F)" },
    { value: "gs_percentage_simple", label: "Simple Percentage Pass/Fail Scale (>=40% Pass)" },
  ];

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-foreground">Grading Scale Matrix</label>
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
