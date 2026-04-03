import { describe, expect, it } from "vitest";

describe("Supabase credentials", () => {
  it("should have VITE_SUPABASE_URL set", () => {
    const url = process.env.VITE_SUPABASE_URL;
    expect(url).toBeDefined();
    expect(url).toContain("supabase.co");
  });

  it("should have VITE_SUPABASE_ANON_KEY set", () => {
    const key = process.env.VITE_SUPABASE_ANON_KEY;
    expect(key).toBeDefined();
    expect(key!.length).toBeGreaterThan(10);
  });

  it("should be able to reach Supabase API", async () => {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_ANON_KEY;
    const response = await fetch(`${url}/rest/v1/`, {
      headers: {
        apikey: key!,
        Authorization: `Bearer ${key}`,
      },
    });
    expect(response.status).toBeLessThan(500);
  });
});
