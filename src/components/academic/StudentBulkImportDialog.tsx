"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, CheckCircle2, Download } from "lucide-react";

interface ClassOption {
  id: string;
  name: string;
  section?: string | null;
}

interface StudentBulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  institutionId: string;
  classes: ClassOption[];
  onSuccess: () => void;
}

interface ParsedRow {
  admissionNo: string;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  bloodGroup: string;
  className: string;
  classId?: string;
  guardianName: string;
  guardianPhone: string;
  guardianRelation: string;
  isValid: boolean;
  error?: string;
}

export function StudentBulkImportDialog({
  open,
  onOpenChange,
  institutionId,
  classes,
  onSuccess,
}: StudentBulkImportDialogProps) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ successCount: number; failureCount: number } | null>(null);

  const downloadSampleTemplate = () => {
    const csvContent =
      "admissionNo,firstName,lastName,gender,dateOfBirth,phone,email,bloodGroup,className,guardianName,guardianPhone,guardianRelation\n" +
      "TGCIS-2026-001,Ahmad,Hassan,Male,2005-04-12,9876543210,ahmad@example.com,O+,B.Sc Computer Science,Ibrahim Hassan,9876543211,Father\n" +
      "TGCIS-2026-002,Fatima,Zahra,Female,2005-09-21,9876543212,fatima@example.com,B+,B.A English,Mariam Zahra,9876543213,Mother";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "student_bulk_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length <= 1) {
        setError("The uploaded CSV file is empty or missing data rows.");
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const parsed: ParsedRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim());
        if (values.length < 3) continue;

        const rowObj: Record<string, string> = {};
        headers.forEach((h, idx) => {
          rowObj[h] = values[idx] || "";
        });

        const admissionNo = rowObj["admissionno"] || rowObj["admission_no"] || values[0] || "";
        const firstName = rowObj["firstname"] || rowObj["first_name"] || values[1] || "";
        const lastName = rowObj["lastname"] || rowObj["last_name"] || values[2] || "";
        const gender = rowObj["gender"] || "";
        const dateOfBirth = rowObj["dateofbirth"] || rowObj["dob"] || "";
        const phone = rowObj["phone"] || "";
        const email = rowObj["email"] || "";
        const bloodGroup = rowObj["bloodgroup"] || "";
        const className = rowObj["classname"] || rowObj["class"] || "";
        const guardianName = rowObj["guardianname"] || "";
        const guardianPhone = rowObj["guardianphone"] || "";
        const guardianRelation = rowObj["guardianrelation"] || "Parent";

        // Find class ID match if provided
        const matchedClass = classes.find(
          (c) => c.name.toLowerCase() === className.toLowerCase()
        );

        let rowError = "";
        if (!admissionNo) rowError = "Missing Admission No";
        else if (!firstName) rowError = "Missing First Name";
        else if (!lastName) rowError = "Missing Last Name";

        parsed.push({
          admissionNo,
          firstName,
          lastName,
          gender,
          dateOfBirth,
          phone,
          email,
          bloodGroup,
          className,
          classId: matchedClass?.id,
          guardianName,
          guardianPhone,
          guardianRelation,
          isValid: !rowError,
          error: rowError || undefined,
        });
      }

      setRows(parsed);
    };

    reader.readAsText(file);
  };

  const handleImportSubmit = async () => {
    const validRows = rows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      setError("No valid student records found to import.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/academic/students/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId,
          rows: validRows.map((r) => ({
            admissionNo: r.admissionNo,
            firstName: r.firstName,
            lastName: r.lastName,
            gender: r.gender,
            dateOfBirth: r.dateOfBirth,
            phone: r.phone,
            email: r.email,
            bloodGroup: r.bloodGroup,
            classId: r.classId,
            guardianName: r.guardianName,
            guardianPhone: r.guardianPhone,
            guardianRelation: r.guardianRelation,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to commit bulk student import");
      }

      setResult({
        successCount: data.successCount,
        failureCount: data.failureCount,
      });

      if (data.failureCount === 0) {
        setTimeout(() => {
          onOpenChange(false);
          onSuccess();
        }, 1500);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Bulk Student Onboarding (Excel / CSV)</DialogTitle>
            <Button variant="outline" size="sm" onClick={downloadSampleTemplate} className="gap-1 text-xs">
              <Download className="h-3.5 w-3.5" />
              Download CSV Template
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {error && <Alert variant="error">{error}</Alert>}
          {result && (
            <Alert variant="info" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
              <CheckCircle2 className="h-4 w-4 shrink-0 inline mr-2" />
              Successfully onboarded {result.successCount} students. {result.failureCount > 0 ? `(${result.failureCount} skipped/failed)` : ""}
            </Alert>
          )}

          {rows.length === 0 ? (
            <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
              <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-3" />
              <label htmlFor="csv-upload" className="cursor-pointer">
                <Button variant="default" className="gap-2 pointer-events-none">
                  <Upload className="h-4 w-4" />
                  Select CSV File to Upload
                </Button>
                <input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
              <p className="text-xs text-muted-foreground mt-2">
                Supported columns: admissionNo, firstName, lastName, gender, dob, phone, email, className, guardianName, guardianPhone
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Total parsed rows: <strong>{rows.length}</strong></span>
                <div className="flex gap-2">
                  <Badge variant="success">
                    {rows.filter((r) => r.isValid).length} Valid
                  </Badge>
                  {rows.some((r) => !r.isValid) && (
                    <Badge variant="destructive">
                      {rows.filter((r) => !r.isValid).length} Errors
                    </Badge>
                  )}
                </div>
              </div>

              <div className="border rounded-md max-h-60 overflow-y-auto text-xs">
                <table className="w-full text-left">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="p-2">Admission No</th>
                      <th className="p-2">Name</th>
                      <th className="p-2">Class</th>
                      <th className="p-2">Guardian</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.map((row, idx) => (
                      <tr key={idx} className={!row.isValid ? "bg-red-500/10" : ""}>
                        <td className="p-2 font-mono font-medium">{row.admissionNo || "—"}</td>
                        <td className="p-2">{row.firstName} {row.lastName}</td>
                        <td className="p-2">{row.className || "—"}</td>
                        <td className="p-2">{row.guardianName ? `${row.guardianName} (${row.guardianRelation})` : "—"}</td>
                        <td className="p-2">
                          {row.isValid ? (
                            <span className="text-emerald-600 font-medium">Ready</span>
                          ) : (
                            <span className="text-red-500 font-medium">{row.error}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRows([]);
                  setResult(null);
                }}
              >
                Upload Different File
              </Button>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {rows.length > 0 && (
              <Button
                type="button"
                onClick={handleImportSubmit}
                disabled={loading || rows.filter((r) => r.isValid).length === 0}
              >
                {loading ? "Importing Students..." : `Import ${rows.filter((r) => r.isValid).length} Students`}
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
