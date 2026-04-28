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

  it("should have valid JWT format for anon key", () => {
    const key = process.env.VITE_SUPABASE_ANON_KEY;
    expect(key).toBeDefined();
    // JWT has 3 parts separated by dots
    const parts = key!.split(".");
    expect(parts.length).toBe(3);
  });
});
