'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ensureArray } from '@/lib/utils';

export function BatchGeneratorTab() {
  const [docType, setDocType] = useState<'report_card' | 'hall_ticket' | 'certificate'>('report_card');
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [termOrExamName, setTermOrExamName] = useState('First Terminal Examination');
  const [studentCount, setStudentCount] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResults, setGeneratedResults] = useState<any[]>([]);

  const handleRunBatch = () => {
    setIsGenerating(true);

    const candidates = Array.from({ length: studentCount }).map((_, i) => ({
      institutionId: 'inst-001',
      documentType: docType,
      recipientId: `stu-cohort-${i + 1}`,
      recipientName: `Candidate ${i + 1} Al-Nuaimi`,
      rollNumber: `TGCIS-2026-${100 + i + 1}`,
      academicYear,
      termOrExamName,
      className: 'B.Sc Computer Science',
      subjects: [
        { subjectName: 'Data Structures', maxMarks: 100, marksObtained: 85 + (i % 12) },
        { subjectName: 'Computer Architecture', maxMarks: 100, marksObtained: 78 + (i % 15) },
      ],
      examSchedule: [
        { date: '2026-09-10', time: '10:00 AM - 01:00 PM', subjectCode: 'CS101', subjectTitle: 'Data Structures' },
        { date: '2026-09-12', time: '10:00 AM - 01:00 PM', subjectCode: 'CS102', subjectTitle: 'Computer Architecture' },
      ],
      purpose: 'Annual Cohort Certification',
    }));

    fetch('/api/docgen/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        institutionId: 'inst-001',
        documentType: docType,
        academicYear,
        termOrExamName,
        candidates,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setGeneratedResults(ensureArray(data.results));
        }
      })
      .catch((err) => {
        console.error('Batch generation error:', err);
      })
      .finally(() => {
        setIsGenerating(false);
      });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Batch Document Generation Studio</CardTitle>
          <CardDescription>
            Compile entire class cohorts into official cryptographically signed PDF documents with instant QR authenticity seals.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Document Type</Label>
              <select
                aria-label="Document Type"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={docType}
                onChange={(e) => setDocType(e.target.value as any)}
              >
                <option value="report_card">Examination Report Card</option>
                <option value="hall_ticket">Examination Hall Ticket</option>
                <option value="certificate">Bonafide / Merit Certificate</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Academic Year</Label>
              <Input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Examination / Term Title</Label>
              <Input value={termOrExamName} onChange={(e) => setTermOrExamName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Cohort Size</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={studentCount}
                onChange={(e) => setStudentCount(Number(e.target.value) || 1)}
              />
            </div>
          </div>

          <Button className="w-full md:w-auto" disabled={isGenerating} onClick={handleRunBatch}>
            {isGenerating ? 'Generating Cohort Batch...' : `Generate Batch for ${studentCount} Students`}
          </Button>
        </CardContent>
      </Card>

      {generatedResults.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-base">Generated Batch Manifest</CardTitle>
                <CardDescription>{generatedResults.length} official documents compiled and signed</CardDescription>
              </div>
              <Badge variant="default">100% SIGNED &amp; VERIFIED</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md divide-y">
              {generatedResults.map((r, i) => (
                <div key={i} className="p-3 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-semibold font-mono">{r.serialNumber}</div>
                    <div className="text-xs text-muted-foreground font-mono">Hash: {r.shortHash}... | Issued: {r.issuedAt}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const win = window.open('', '_blank');
                        if (win) {
                          win.document.write(r.renderedHtml);
                          win.document.close();
                        }
                      }}
                    >
                      View Document
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
