import { normalizeRoutePath } from "../../src/lib/observability/route-normalizer";

const testPaths = [
  "/api//institutions",
  "/api/institutions/",
  "/api%2Finstitutions",
  "/api/./institutions",
  "/api/../api/institutions",
  "/api/institutions?query=1#frag",
  "/api/departments",
  "/api/departments/",
  "/api/auth/onboarding/affiliate",
  "/api/auth/me",
];

console.log("PATH".padEnd(32), "URL.pathname".padEnd(25), "normalizeRoutePath");
console.log("-".repeat(75));

for (const p of testPaths) {
  const urlPath = new URL("https://host" + p).pathname;
  console.log(p.padEnd(32), urlPath.padEnd(25), normalizeRoutePath(urlPath));
}
