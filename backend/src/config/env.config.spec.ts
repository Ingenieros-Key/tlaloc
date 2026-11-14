import { loadEnv } from "./env.config.js";

describe("loadEnv", () => {
  it("throws when required vars are missing", () => {
    const prev = process.env.PROFILES_TABLE;
    delete process.env.PROFILES_TABLE;
    expect(() => loadEnv()).toThrow(/PROFILES_TABLE/);
    process.env.PROFILES_TABLE = prev;
  });

  it("returns typed config when vars are present", () => {
    process.env.PROFILES_TABLE = "t";
    process.env.MEDIA_BUCKET = "b";
    process.env.USER_POOL_ID = "u";
    process.env.USER_POOL_CLIENT_ID = "c";
    process.env.REGION = "us-east-1";
    expect(loadEnv().profilesTable).toBe("t");
  });
});
