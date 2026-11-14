import { BaseConfig, Env } from "@stack-types/base.types";

const tenant = "tlaloc";
const env = (process.env.ENV ?? "dev") as Env;
const region = process.env.AWS_REGION ?? "us-east-1";

export const baseConfig: BaseConfig = {
  tenant,
  env,
  region,
  appPrefix: `${tenant}-${env}`,
};
