import { describe, expect, it } from "vitest";

// Smoke test: the homepage must answer 200 once the dev server is up.
// Retries cover the window while the server is starting or restarting.
const BASE_URL = process.env.SMOKE_URL ?? "http://localhost:8080";
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS ?? 60_000);

async function waitForHomepage(): Promise<Response> {
  const deadline = Date.now() + TIMEOUT_MS;
  let last = "no response";
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/`, { redirect: "follow" });
      if (res.status === 200) return res;
      last = `HTTP ${res.status}`;
    } catch (error) {
      last = String(error);
    }
    await new Promise((r) => setTimeout(r, 1_000));
  }
  throw new Error(`Homepage did not return 200 within ${TIMEOUT_MS}ms (last: ${last})`);
}

describe("homepage smoke", () => {
  it("responds 200 with the app HTML", async () => {
    const res = await waitForHomepage();
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("<title>SemantiCare");
  }, TIMEOUT_MS + 5_000);
});
