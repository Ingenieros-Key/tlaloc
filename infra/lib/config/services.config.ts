import { ServicesConfig } from "@stack-types/services.types";

export const servicesConfig: ServicesConfig = {
  lambdaMemoryMb: 512,
  lambdaTimeoutSec: 20,
  logRetentionDays: 14,
  apiDomainName: "api.tlaloc.space",
  apiCertArn: process.env.API_CERT_ARN,
};
