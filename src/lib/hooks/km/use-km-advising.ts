import { useState, useCallback } from 'react';
import { DegreeAuditResult, CopilotResponsePayload } from '@/lib/operations/km/km-types';

export function useKmAdvising() {
  const [loading, setLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<DegreeAuditResult | null>(null);
  const [copilotResponse, setCopilotResponse] = useState<CopilotResponsePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runDegreeAudit = useCallback(async (studentId: string, programCode = 'BS-CS', transcript: any[] = []) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/km/advising/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, programCode, transcript }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAuditResult(data.audit);
      } else {
        setError(data.error || 'Audit failed');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  const sendCopilotMessage = useCallback(async (sessionId: string, studentId: string, prompt: string, targetLanguage = 'en') => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/km/advising/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, studentId, prompt, targetLanguage }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCopilotResponse(data.response);
        return data.response;
      } else {
        setError(data.error || 'Chat failed');
        return null;
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, auditResult, copilotResponse, error, runDegreeAudit, sendCopilotMessage };
}
