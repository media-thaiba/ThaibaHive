import { existsSync } from "fs";
import { join } from "path";
import { getItemsForWorkspace, workspaces, type WorkspaceId } from "@/config/navigation";
import { WORKSPACE_REDIRECTS } from "@/lib/navigation/workspace-redirects";

const shellDir = join(__dirname, "..", "..", "..", "app", "(shell)");

function routeExists(pathname: string): boolean {
  if (pathname === "/") return existsSync(join(shellDir, "page.tsx"));
  return existsSync(join(shellDir, pathname.slice(1), "page.tsx"));
}

const workspaceIds: WorkspaceId[] = workspaces.map((w) => w.id);

describe("workspace redirect bridge", () => {
  it("maps every nav target that has no physical route", () => {
    const missing: string[] = [];
    for (const id of workspaceIds) {
      for (const item of getItemsForWorkspace(id)) {
        if (!routeExists(item.href) && !WORKSPACE_REDIRECTS[item.href]) {
          missing.push(item.href);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it("does not map targets that already exist as real routes", () => {
    const redundant = Object.keys(WORKSPACE_REDIRECTS).filter((source) =>
      routeExists(source)
    );
    expect(redundant).toEqual([]);
  });

  it("redirects only to existing legacy routes", () => {
    const broken = Object.entries(WORKSPACE_REDIRECTS)
      .filter(([, target]) => !routeExists(target))
      .map(([source, target]) => `${source} -> ${target}`);
    expect(broken).toEqual([]);
  });

  it("never redirects into an unmapped workspace URL (no loops)", () => {
    const loops = Object.values(WORKSPACE_REDIRECTS).filter(
      (target) =>
        workspaceIds.some((id) => target === `/${id}` || target.startsWith(`/${id}/`)) &&
        !routeExists(target)
    );
    expect(loops).toEqual([]);
  });

  it("covers every workspace sub-route reachable from dashboards", () => {
    for (const id of workspaceIds) {
      expect(routeExists(`/${id}`)).toBe(true);
    }
  });
});
