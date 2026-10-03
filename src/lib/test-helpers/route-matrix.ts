import fs from "fs";
import path from "path";
import ts from "typescript";

export const HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
] as const;

export type GuardKind = "requireAuth" | "self" | "public";

export interface RouteHandlerEntry {
  /** Relative path from repo root, e.g. src/app/api/tasks/[id]/route.ts */
  file: string;
  /** Jest/Next module specifier, e.g. "@/app/api/tasks/[id]/route" */
  moduleName: string;
  /** Public URL path, e.g. /api/tasks/[id] */
  routePath: string;
  method: (typeof HTTP_METHODS)[number];
  /** Permission key passed as the 2nd arg of requireAuth, null when absent */
  permission: string | null;
  guard: GuardKind;
  /** withDPoP wrapper enforces a DPoP proof before the RBAC guard runs */
  dpopRequired: boolean;
  /** requireAuth called inside the handler body instead of as the export wrapper */
  inlineRequireAuth: boolean;
}

const WRAPPER_CALLEES = new Set([
  "withDPoP",
  "withPublicApm",
  "withRateLimit",
  "withCache",
  "withApm",
  "withSecurityHeaders",
]);

function collectRouteFiles(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) collectRouteFiles(full, out);
    else if (item === "route.ts" || item === "route.js") out.push(full);
  }
  return out;
}

function calleeName(expr: ts.Expression, sf: ts.SourceFile): string {
  const text = expr.getText(sf);
  const parts = text.split(".");
  return parts[parts.length - 1];
}

function permissionFromCall(call: ts.CallExpression, sf: ts.SourceFile): string | null {
  const arg = call.arguments[1];
  return arg && ts.isStringLiteral(arg) ? arg.text : null;
}

function dpopRequiredFromCall(call: ts.CallExpression, sf: ts.SourceFile): boolean {
  const opts = call.arguments[1];
  if (!opts) return true;
  if (!ts.isObjectLiteralExpression(opts)) return true;
  const prop = opts.properties.find(
    (p) => ts.isPropertyAssignment(p) && p.name?.getText(sf) === "required"
  );
  if (!prop || !ts.isPropertyAssignment(prop)) return true;
  return prop.initializer.getText(sf) !== "false";
}

function findCallInBody(body: ts.Node, sf: ts.SourceFile, name: string): ts.CallExpression | null {
  let found: ts.CallExpression | null = null;
  const visit = (node: ts.Node): void => {
    if (found) return;
    if (ts.isCallExpression(node) && calleeName(node.expression, sf) === name) {
      found = node;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(body);
  return found;
}

function classifyFunction(fn: ts.Node, sf: ts.SourceFile): {
  guard: GuardKind;
  permission: string | null;
  inlineRequireAuth: boolean;
} {
  const requireAuthCall = findCallInBody(fn, sf, "requireAuth");
  if (requireAuthCall) {
    return {
      guard: "requireAuth",
      permission: permissionFromCall(requireAuthCall, sf),
      inlineRequireAuth: true,
    };
  }
  const verifyCall = findCallInBody(fn, sf, "verifySession");
  if (verifyCall) {
    return { guard: "self", permission: null, inlineRequireAuth: false };
  }
  return { guard: "public", permission: null, inlineRequireAuth: false };
}

function unwrapInitializer(
  initializer: ts.Expression,
  sf: ts.SourceFile
): { permission: string | null; dpopRequired: boolean; guard: GuardKind | null; fnNode: ts.Node | null } {
  let node: ts.Expression = initializer;
  let permission: string | null = null;
  let dpopRequired = false;
  let guard: GuardKind | null = null;

  while (ts.isCallExpression(node)) {
    const name = calleeName(node.expression, sf);
    if (name === "requireAuth") {
      guard = "requireAuth";
      permission = permissionFromCall(node, sf);
      break;
    }
    if (name === "withDPoP") {
      dpopRequired = dpopRequiredFromCall(node, sf);
      node = node.arguments[0];
      continue;
    }
    if (WRAPPER_CALLEES.has(name)) {
      node = node.arguments[0];
      continue;
    }
    if (node.arguments.length > 0 && ts.isExpression(node.arguments[0])) {
      node = node.arguments[0];
      continue;
    }
    break;
  }

  return { permission, dpopRequired, guard, fnNode: node };
}

export function buildManifest(apiRoot = path.join(process.cwd(), "src/app/api")): RouteHandlerEntry[] {
  const entries: RouteHandlerEntry[] = [];
  for (const abs of collectRouteFiles(apiRoot).sort()) {
    const rel = path.relative(process.cwd(), abs).replace(/\\/g, "/");
    const content = fs.readFileSync(abs, "utf-8");
    const sf = ts.createSourceFile(abs, content, ts.ScriptTarget.Latest, true);
    const tail = path.relative(apiRoot, abs).replace(/\\/g, "/").replace(/\/route\.ts$/, "");
    const moduleName = `@/app/api/${tail}/route`;
    const routePath = `/api/${tail}`;

    const found = new Map<string, RouteHandlerEntry>();
    const aliases: Array<{ method: string; target: string }> = [];

    const push = (method: string, entry: Omit<RouteHandlerEntry, "file" | "moduleName" | "routePath" | "method">) => {
      found.set(method, {
        file: rel,
        moduleName,
        routePath,
        method: method as RouteHandlerEntry["method"],
        ...entry,
      });
    };

    const visit = (node: ts.Node): void => {
      if (ts.isVariableStatement(node)) {
        const isExported = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
        if (isExported) {
          for (const decl of node.declarationList.declarations) {
            const name = decl.name.getText(sf);
            if (!(HTTP_METHODS as readonly string[]).includes(name) || !decl.initializer) continue;
            if (ts.isIdentifier(decl.initializer)) {
              aliases.push({ method: name, target: decl.initializer.getText(sf) });
              continue;
            }
            const unwrapped = unwrapInitializer(decl.initializer, sf);
            let guard = unwrapped.guard;
            let permission = unwrapped.permission;
            let inline = false;
            if (!guard && unwrapped.fnNode) {
              const classified = classifyFunction(unwrapped.fnNode, sf);
              guard = classified.guard;
              permission = classified.permission;
              inline = classified.inlineRequireAuth;
            }
            push(name, {
              permission,
              guard: guard ?? "public",
              dpopRequired: unwrapped.dpopRequired,
              inlineRequireAuth: inline,
            });
          }
        }
      }
      if (ts.isFunctionDeclaration(node) && node.name) {
        const name = node.name.text;
        const isExported = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
        if (isExported && (HTTP_METHODS as readonly string[]).includes(name) && node.body) {
          const classified = classifyFunction(node.body, sf);
          push(name, {
            permission: classified.permission,
            guard: classified.guard,
            dpopRequired: false,
            inlineRequireAuth: classified.inlineRequireAuth,
          });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);

    for (const alias of aliases) {
      const target = found.get(alias.target);
      if (target) {
        found.set(alias.method, { ...target, method: alias.method as RouteHandlerEntry["method"] });
      }
    }

    for (const entry of found.values()) entries.push(entry);
  }
  return entries;
}

export function entryKey(entry: Pick<RouteHandlerEntry, "file" | "method">): string {
  return `${entry.file}#${entry.method}`;
}

export async function loadRouteModule(entry: RouteHandlerEntry): Promise<Record<string, unknown>> {
  return import(/* webpackIgnore: true */ entry.moduleName) as Promise<Record<string, unknown>>;
}
