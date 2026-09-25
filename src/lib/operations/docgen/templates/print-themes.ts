export interface PrintTheme {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  backgroundColor: string;
  borderColor: string;
  fontFamily: string;
}

export const printThemes: Record<string, PrintTheme> = {
  academicNavy: {
    name: 'Academic Navy',
    primaryColor: '#1e3a8a',
    secondaryColor: '#3b82f6',
    accentColor: '#d97706',
    textColor: '#0f172a',
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
  },
  classicCrimson: {
    name: 'Classic Crimson',
    primaryColor: '#881337',
    secondaryColor: '#e11d48',
    accentColor: '#b45309',
    textColor: '#1c1917',
    backgroundColor: '#fffdfa',
    borderColor: '#e7e5e4',
    fontFamily: "Georgia, 'Times New Roman', serif",
  },
  modernEmerald: {
    name: 'Modern Emerald',
    primaryColor: '#064e3b',
    secondaryColor: '#059669',
    accentColor: '#d97706',
    textColor: '#022c22',
    backgroundColor: '#ffffff',
    borderColor: '#a7f3d0',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  executiveSlate: {
    name: 'Executive Slate',
    primaryColor: '#0f172a',
    secondaryColor: '#475569',
    accentColor: '#2563eb',
    textColor: '#0f172a',
    backgroundColor: '#ffffff',
    borderColor: '#94a3b8',
    fontFamily: "'Segoe UI', Helvetica, Arial, sans-serif",
  },
};
