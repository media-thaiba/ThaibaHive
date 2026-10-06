import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

export interface ScanFinding {
  file: string;
  method: string;
  handlerName?: string;
  reasons: string[];
}

export function scanRouteSource(filePath: string, code: string): ScanFinding[] {
  const sourceFile = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true);
  const findings: ScanFinding[] = [];

  // 1. Build symbol/declaration map for all top-level functions and variables
  const topLevelDeclarations = new Map<string, ts.Node>();

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isFunctionDeclaration(node) && node.name) {
      topLevelDeclarations.set(node.name.text, node);
    } else if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.initializer) {
          topLevelDeclarations.set(decl.name.text, decl.initializer);
        }
      }
    }
  });

  function unwrapHandlerNode(expr: ts.Expression): { node: ts.Node; handlerName?: string } {
    if (ts.isCallExpression(expr)) {
      // e.g. requireAuth(getHandler, "perm") or withDPoP(requireAuth(...))
      for (const arg of expr.arguments) {
        if (ts.isFunctionExpression(arg) || ts.isArrowFunction(arg)) {
          return { node: arg };
        }
        if (ts.isIdentifier(arg)) {
          const resolved = topLevelDeclarations.get(arg.text);
          if (resolved) {
            return { node: resolved, handlerName: arg.text };
          }
        }
        if (ts.isCallExpression(arg)) {
          return unwrapHandlerNode(arg);
        }
      }
    } else if (ts.isIdentifier(expr)) {
      const resolved = topLevelDeclarations.get(expr.text);
      if (resolved) {
        return { node: resolved, handlerName: expr.text };
      }
    } else if (ts.isFunctionExpression(expr) || ts.isArrowFunction(expr)) {
      return { node: expr };
    }
    return { node: expr };
  }

  function inspectHandler(methodName: string, targetNode: ts.Node, handlerName?: string) {
    const handlerText = targetNode.getText(sourceFile);

    const tenantParamRegex = /searchParams\.get\(["'](?:institutionId|tenantId|institution_id|campusId|branchId)["']\)/;
    const tenantBodyRegex = /(?:body|data|input|parsed|json|payload)\.(?:institutionId|tenantId|institution_id|campusId|branchId)/;
    const tenantKeyRegex = /(?:institutionId|tenantId|institution_id|campusId|branchId)\s*:\s*(?:body|data|input|parsed|json|searchParams)/;
    const tenantDestructRegex = /const\s*\{\s*[^}]*(?:institutionId|tenantId|institution_id|campusId|branchId)[^}]*\}\s*=\s*(?:body|data|input|parsed|json|parsed\.data|parse\.data|result\.data|query)/;
    const tenantZodDefaultRegex = /(?:institutionId|tenantId|institution_id|campusId|branchId)\s*:\s*z\.string\(\)[^.]*\.default\(/;

    const readsSearchInst = tenantParamRegex.test(handlerText);
    const readsBodyInst = tenantBodyRegex.test(handlerText) || tenantKeyRegex.test(handlerText) || tenantDestructRegex.test(handlerText) || tenantZodDefaultRegex.test(handlerText);
    
    const callsResolver = /resolve(?:Request|Scoped)Institution(?:s)?\(/.test(handlerText) ||
                          /resolveScopedInstitutionId\(/.test(handlerText);

    const reasons: string[] = [];
    if (readsSearchInst && !callsResolver) {
      reasons.push('Reads query tenant/institution parameter without calling resolver');
    }
    if (readsBodyInst && !callsResolver) {
      reasons.push('Reads body/parsed tenant/institution parameter without calling resolver');
    }

    if (reasons.length > 0) {
      findings.push({
        file: filePath.replace(/\\/g, '/'),
        method: methodName,
        handlerName,
        reasons,
      });
    }
  }

  ts.forEachChild(sourceFile, (node) => {
    // Variable statement: export const GET = ...
    if (ts.isVariableStatement(node)) {
      const isExported = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
      if (isExported) {
        for (const decl of node.declarationList.declarations) {
          const name = decl.name.getText(sourceFile);
          if (['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(name) && decl.initializer) {
            const { node: handlerNode, handlerName } = unwrapHandlerNode(decl.initializer);
            inspectHandler(name, handlerNode, handlerName);
          }
        }
      }
    }

    // Function declaration: export async function GET(...)
    if (ts.isFunctionDeclaration(node) && node.name) {
      const isExported = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
      const name = node.name.text;
      if (isExported && ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(name)) {
        inspectHandler(name, node);
      }
    }
  });

  return findings;
}

export const ALLOW_LIST: Record<string, string> = {
  // Public unauthenticated endpoints where tenant parameter is solely used for routing/discovery
  "src/app/api/public/enquiries/route.ts:POST": "Public enquiry submission allows prospective students to submit an admission enquiry for an institution",
  "src/app/api/auth/switch-institution/route.ts:POST": "Dedicated institution switcher validates membership against staffInstitutions and reissues scoped JWT session",
  "src/app/api/auth/oidc/login/route.ts:GET": "Public SSO entry; tenantId selects the IdP, no data returned",
  "src/app/api/auth/saml/sso/route.ts:GET": "Public SSO entry; tenantId selects the IdP, no data returned",
};

export function runScan(dir: string = 'src/app/api'): ScanFinding[] {
  function walk(currentDir: string): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(currentDir);
    for (const file of list) {
      const full = path.join(currentDir, file);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        results = results.concat(walk(full));
      } else if (file === 'route.ts' || file === 'route.js') {
        results.push(full);
      }
    }
    return results;
  }

  const routes = walk(dir);
  const allFindings: ScanFinding[] = [];

  for (const filePath of routes) {
    const code = fs.readFileSync(filePath, 'utf8');
    const findings = scanRouteSource(filePath, code);
    for (const finding of findings) {
      const allowKey = `${finding.file}:${finding.method}`;
      if (!ALLOW_LIST[allowKey]) {
        allFindings.push(finding);
      }
    }
  }

  return allFindings;
}

if (require.main === module) {
  const findings = runScan();
  console.log('Total unshielded handler findings:', findings.length);
  if (findings.length > 0) {
    console.error(JSON.stringify(findings, null, 2));
    process.exit(1);
  } else {
    console.log('AST Tenant Parameter Scanner: 100% of routes properly resolve tenant parameters.');
  }
}
