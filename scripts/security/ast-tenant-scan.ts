import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

function walk(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(walk(full));
    } else if (file === 'route.ts' || file === 'route.js') {
      results.push(full);
    }
  }
  return results;
}

const routes = walk('src/app/api');
const findings: Array<{ file: string; method: string; reasons: string[] }> = [];

for (const filePath of routes) {
  const code = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true);

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        const name = decl.name.getText(sourceFile);
        if (['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(name)) {
          const handlerText = decl.getText(sourceFile);
          
          const readsSearchInst = /searchParams\.get\(["'](?:institutionId|tenantId)["']\)/.test(handlerText);
          const readsBodyInst = /(?:body|data|input|parsed|json)\.(?:institutionId|tenantId)/.test(handlerText) ||
                                /(?:institutionId|tenantId)\s*:\s*(?:body|data|input|parsed|json)/.test(handlerText) ||
                                /const\s*\{\s*[^}]*(?:institutionId|tenantId)[^}]*\}\s*=\s*(?:body|data|input|parsed|json|parsed\.data|parse\.data|result\.data)/.test(handlerText);
          const callsResolver = /resolve(?:Request|Scoped)Institution(?:s)?\(/.test(handlerText) ||
                                /resolveScopedInstitutionId\(/.test(handlerText);

          const reasons: string[] = [];
          if (readsSearchInst && !callsResolver) {
            reasons.push('Reads query institutionId without calling resolver');
          }
          if (readsBodyInst && !callsResolver) {
            reasons.push('Reads body/parsed institutionId without calling resolver');
          }

          if (reasons.length > 0) {
            findings.push({
              file: filePath.replace(/\\/g, '/'),
              method: name,
              reasons,
            });
          }
        }
      }
    }
  });
}

console.log('Total handler findings:', findings.length);
fs.writeFileSync('scripts/security/ast-findings.json', JSON.stringify(findings, null, 2));

