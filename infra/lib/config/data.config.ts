import { buildName } from "@utils/name-builder";
import { DataConfig } from "@stack-types/data.types";
import { baseConfig } from "@config/base.config";

export const dataConfig: DataConfig = {
  profilesTableName: buildName("profiles"),
  mediaBucketName: buildName("media"),
  userPoolName: buildName("users"),
  userPoolClientName: buildName("users-web"),
  sesDomain: "tlaloc.space",
  sesSender: "info@tlaloc.space",
  // Email logo host (Amplify = S3 + CloudFront). Custom domain in prod, app domain in dev.
  assetBaseUrl:
    baseConfig.env === "prod"
      ? "https://tlaloc.space"
      : "https://dev.d25pn0dlq8jiih.amplifyapp.com",
};
