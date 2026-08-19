import * as fs from 'fs';
import * as path from 'path';

export interface ComplianceRule {
  id: string;
  description: string;
  dataSource: string;
  predicate: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  remediationGuidance: string;
}

export class RuleParser {
  loadFramework(frameworkName: string): ComplianceRule[] {
    const rulePath = path.join(__dirname, 'rules', frameworkName + '.json');
    if (!fs.existsSync(rulePath)) return [];
    const content = fs.readFileSync(rulePath, 'utf8');
    const parsed = JSON.parse(content);
    return parsed.rules || [];
  }
}