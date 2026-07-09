import { describe, expect, it } from "vitest";
import { DEFAULT_EVENT_COMPOSE_VALUES, validateEventCompose } from "@/data/events";

describe("validateEventCompose", () => {
  const base = { ...DEFAULT_EVENT_COMPOSE_VALUES, title: "테스트 행사" };

  it("rejects empty title", () => {
    const result = validateEventCompose({ ...base, title: "  " });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.field).toBe("title");
  });

  it("rejects invalid capacity", () => {
    const result = validateEventCompose({ ...base, capacity: "0" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.field).toBe("capacity");
  });

  it("rejects recruit end before start", () => {
    const result = validateEventCompose({
      ...base,
      recruitStart: "2026-08-01",
      recruitEnd: "2026-07-01",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.field).toBe("recruitEnd");
  });

  it("accepts valid payload", () => {
    const result = validateEventCompose(base);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.payload.title).toBe("테스트 행사");
  });
});
