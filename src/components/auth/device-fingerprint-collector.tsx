'use client';

import { useEffect } from 'react';

export interface DeviceFingerprintData {
  ua: string;
  screenRes: string;
  timezone: string;
  language: string;
}

interface Props {
  onFingerprint: (data: DeviceFingerprintData) => void;
}

export function DeviceFingerprintCollector({ onFingerprint }: Props) {
  useEffect(() => {
    try {
      const data: DeviceFingerprintData = {
        ua: navigator.userAgent || 'unknown',
        screenRes: typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : 'unknown',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
        language: navigator.language || 'unknown'
      };
      
      onFingerprint(data);
    } catch (e) {
      console.error('Failed to collect fingerprint', e);
    }
  }, [onFingerprint]);

  return <div style={{ display: 'none' }} aria-hidden="true" />;
}
