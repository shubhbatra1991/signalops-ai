import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import ts from "typescript";
import { expect, test } from "vitest";

test("Settings runtime client import graph excludes all server code and environment access", () => {
  const visited = new Set<string>();
  function visit(path: string) {
    if (visited.has(path)) return; visited.add(path);
    const source = readFileSync(path, "utf8");
    expect(source).not.toContain("process.env"); expect(source).not.toMatch(/localStorage|sessionStorage|indexedDB|document\.cookie/);
    const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
    for (const node of ast.statements) {
      if (!ts.isImportDeclaration(node) || !ts.isStringLiteral(node.moduleSpecifier) || node.importClause?.isTypeOnly) continue;
      const name = node.moduleSpecifier.text;
      expect(name).not.toMatch(/server|node:|next\/headers/);
      if (name.startsWith(".") || name.startsWith("@/")) {
        const base = name.startsWith("@/") ? resolve(name.slice(2)) : resolve(dirname(path), name);
        visit(existsSync(`${base}.ts`) ? `${base}.ts` : `${base}.tsx`);
      }
    }
  }
  visit(resolve("features/ai/ui/provider-settings.tsx"));
  visit(resolve("features/ai/ui/insights-screen.tsx"));
  expect(visited.size).toBeGreaterThan(2);
});
test("all AI server entry modules retain the server-only marker and no feedback dependency", () => {
  for (const file of ["adapters", "configuration", "connection", "errors", "transport", "diagnostics"]) {
    const source = readFileSync(resolve(`server/ai/${file}.ts`), "utf8");
    expect(source).toContain('import "server-only"');
    expect(source).not.toMatch(/from ["'][^"']*(feedback|demo|analytics)/);
  }
});
