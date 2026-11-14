import { buildName } from "@utils/name-builder";
import { DataConfig } from "@stack-types/data.types";

export const dataConfig: DataConfig = {
  profilesTableName: buildName("profiles"),
  mediaBucketName: buildName("media"),
  userPoolName: buildName("users"),
  sesDomain: "tlaloc.space",
  sesSender: "info@tlaloc.space",
};
