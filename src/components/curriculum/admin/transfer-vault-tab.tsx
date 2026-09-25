'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ensureArray } from '@/lib/utils';

interface TransferVaultTabProps {
  onParseOcrTranscript?: (rawText: string) => Promise<any>;
  loading?: boolean;
}

export const TransferVaultTab: React.FC<TransferVaultTabProps> = ({
  onParseOcrTranscript,
  loading = false,
}) => {
  const [ocrText, setOcrText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsedResult, setParsedResult] = useState<any>(null);

  const handleParse = async () => {
    if (!ocrText.trim() || !onParseOcrTranscript) return;
    setParsing(true);
    try {
      const res = await onParseOcrTranscript(ocrText);
      setParsedResult(res);
    } catch {
      // Handle error gracefully
    } finally {
      setParsing(false);
    }
  };

  if (loading) {
    return <Skeleton className="h-64 w-full" />;
  }

  const recommendations = ensureArray(parsedResult?.recommendations);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Transfer Articulation OCR & Semantic Parser
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Paste raw transcript text from an external accredited institution to extract course credits, calculate semantic catalog similarity, and generate articulation recommendations.
          </p>
          <Textarea
            rows={5}
            placeholder="Paste transcript text here (e.g. CS-101 Intro to Computer Science 4.0 A)..."
            value={ocrText}
            onChange={(e) => setOcrText(e.target.value)}
          />
          <Button
            size="sm"
            onClick={handleParse}
            disabled={parsing || !ocrText.trim()}
          >
            {parsing ? 'Parsing OCR & Matching...' : 'Run Articulation Matcher'}
          </Button>
        </CardContent>
      </Card>

      {parsedResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Articulation Recommendations: {parsedResult.parsedTranscript?.sourceInstitution}</span>
              <Badge variant="success">Confidence: {Math.round((parsedResult.parsedTranscript?.confidenceScore || 0.9) * 100)}%</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y text-sm">
              {recommendations.map((rec: any, idx: number) => (
                <div key={idx} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">
                      {rec.sourceCourse.sourceCourseCode}: {rec.sourceCourse.sourceTitle} ({rec.sourceCourse.sourceCredits} cr, Grade: {rec.sourceCourse.sourceGrade})
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      → Matched: {rec.targetCourseCode || 'General Elective'} · {rec.rationale}
                    </p>
                  </div>
                  <Badge variant={rec.recommendationType === 'exact_equivalent' ? 'success' : rec.recommendationType === 'rejected' ? 'destructive' : 'warning'}>
                    {rec.recommendationType.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
