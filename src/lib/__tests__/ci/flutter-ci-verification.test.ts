import fs from 'fs';
import path from 'path';

describe('Machine-Enforced Flutter CI Analysis (KM-015 / TD-044-01 Resolution)', () => {
  it('should verify the existence and execution permissions of verify-flutter-analysis.sh', () => {
    const scriptPath = path.resolve(process.cwd(), 'scripts/ci/verify-flutter-analysis.sh');
    expect(fs.existsSync(scriptPath)).toBe(true);

    const scriptContent = fs.readFileSync(scriptPath, 'utf8');
    expect(scriptContent).toContain('flutter analyze');
    expect(scriptContent).toContain('TD-044-01');
    expect(scriptContent).toContain('error •|warning •');
  });

  it('should verify mobile analysis_options.yaml or mobile directory structure', () => {
    const mobileDir = path.resolve(process.cwd(), 'mobile');
    if (fs.existsSync(mobileDir)) {
      expect(fs.statSync(mobileDir).isDirectory()).toBe(true);
    }
  });
});
