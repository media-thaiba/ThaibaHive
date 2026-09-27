import fs from "fs";
import path from "path";
import ts from "typescript";
import { VALID_STAFF_ROLES, getRolePermissions } from "../../packages/auth/roles";

function getAllRoutes(dir: string, list: string[] = []): string[] {
  if (!fs.existsSync(dir)) return list;
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) getAllRoutes(full, list);
    else if (item === "route.ts" || item === "route.js") list.push(full);
  }
  return list;
}

const routes = getAllRoutes("src/app/api");
const usedPermissions = new Map<string, Array<{ route: string; method: string }>>();

for (const filePath of routes) {
  const content = fs.readFileSync(filePath, "utf-8");
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
  const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, "/");

  function visit(node: ts.Node) {
    if (ts.isVariableStatement(node)) {
      const isExported = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
      if (isExported) {
        for (const decl of node.declarationList.declarations) {
          const name = decl.name.getText(sourceFile);
          if (["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"].includes(name) && decl.initializer) {
            let callNode: ts.CallExpression | null = null;
            if (ts.isCallExpression(decl.initializer)) {
              callNode = decl.initializer;
            }

            if (callNode) {
              const callText = callNode.expression.getText(sourceFile);
              if (callText === "requireAuth" || callText.endsWith(".requireAuth")) {
                if (callNode.arguments.length > 1) {
                  const permArg = callNode.arguments[1];
                  if (ts.isStringLiteral(permArg)) {
                    const perm = permArg.text;
                    if (!usedPermissions.has(perm)) usedPermissions.set(perm, []);
                    usedPermissions.get(perm)!.push({ route: relativePath, method: name });
                  }
                }
              }
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

const allConfiguredPerms = new Set<string>();
for (const role of VALID_STAFF_ROLES) {
  for (const p of getRolePermissions(role)) {
    allConfiguredPerms.add(p);
  }
}

const unconfiguredByModule: Record<string, string[]> = {};
for (const perm of [...usedPermissions.keys()].sort()) {
  if (!allConfiguredPerms.has(perm)) {
    const prefix = perm.split(":")[0];
    if (!unconfiguredByModule[prefix]) unconfiguredByModule[prefix] = [];
    unconfiguredByModule[prefix].push(perm);
  }
}

console.log("=== Unconfigured Permissions by Module Prefix ===");
console.log(JSON.stringify(unconfiguredByModule, null, 2));

const missingTotal = Object.values(unconfiguredByModule).reduce((acc, curr) => acc + curr.length, 0);
if (missingTotal > 0) {
  console.error(`❌ RBAC Audit Failed: ${missingTotal} permissions are missing in role mappings!`);
  process.exit(1);
} else {
  console.log("✅ RBAC Audit Passed: 100% of route permissions are mapped in role hierarchy.");
  process.exit(0);
}
