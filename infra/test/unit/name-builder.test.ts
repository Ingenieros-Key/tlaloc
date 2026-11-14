import { describe, it, expect } from "vitest";
import { buildName } from "@utils/name-builder";

describe("buildName", () => {
  it("prefixes resource with tenant and env", () => {
    expect(buildName("profiles")).toBe("tlaloc-dev-profiles");
  });

  it("lowercases and dash-joins multi-word resources", () => {
    expect(buildName("User Pool")).toBe("tlaloc-dev-user-pool");
  });
});
