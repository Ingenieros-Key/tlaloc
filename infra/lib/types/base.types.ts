export type Env = "dev" | "prod";

export type BaseConfig = {
  readonly tenant: string;
  readonly env: Env;
  readonly region: string;
  readonly appPrefix: string;
};
