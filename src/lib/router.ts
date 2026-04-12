import type { Route } from "../types";

const BASE = "/github-review";

export function routeToPath(route: Route): string {
  switch (route.page) {
    case "list":
      return `${BASE}/`;
    case "detail":
      return `${BASE}/${route.owner}/${route.repo}/pull/${route.number}`;
    case "diff":
      return `${BASE}/${route.owner}/${route.repo}/pull/${route.number}/files/${route.fileIndex}`;
  }
}

export function pathToRoute(path: string): Route {
  // Strip base prefix
  let p = path;
  if (p.startsWith(BASE)) p = p.slice(BASE.length);
  p = p.replace(/\/+$/, "");
  if (p === "" || p === "/") return { page: "list" };

  const parts = p.split("/").filter(Boolean);
  // [owner, repo, "pull", number] or [owner, repo, "pull", number, "files", index]
  if (parts.length >= 4 && parts[2] === "pull") {
    const owner = parts[0]!;
    const repo = parts[1]!;
    const number = parseInt(parts[3]!, 10);
    if (!Number.isFinite(number)) return { page: "list" };

    if (parts[4] === "files" && parts.length >= 6) {
      const fileIndex = parseInt(parts[5]!, 10);
      if (Number.isFinite(fileIndex)) {
        return { page: "diff", owner, repo, number, fileIndex };
      }
    }
    return { page: "detail", owner, repo, number };
  }
  return { page: "list" };
}
