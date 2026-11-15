import { describe, expect, it } from "vitest";
import { sanitizeNextPath } from "./redirect";

describe("sanitizeNextPath", () => {
  it.each([
    [null, "/app"],
    ["/app/periods/x", "/app/periods/x"],
    ["https://evil.com", "/app"],
    ["//evil.com", "/app"],
    ["/app/../admin", "/app"],
    ["/app/%2e%2e/login", "/app"],
    ["javascript:alert(1)", "/app"],
    ["/login", "/app"],
  ])("%s → %s", (input, expected) => {
    expect(sanitizeNextPath(input as string | null)).toBe(expected);
  });
});
