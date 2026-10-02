import fs from "fs";
import path from "path";
import ts from "typescript";

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
const missingPerm: Array<{ file: string; method: string }> = [];

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
                if (callNode.arguments.length <= 1) {
                  missingPerm.push({ file: relativePath, method: name });
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

console.log(`=== Naked requireAuth Scanner: ${missingPerm.length} route handlers found without permission parameter ===`);
if (missingPerm.length > 0) {
  for (const item of missingPerm) {
    console.log(`- ${item.file} [${item.method}]`);
  }
  process.exit(1);
} else {
  console.log("✅ All requireAuth handlers specify an explicit permission parameter.");
  process.exit(0);
}
