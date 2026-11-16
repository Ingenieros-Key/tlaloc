export type EnvConfig = {
  readonly profilesTable: string;
  readonly plotsTable: string;
  readonly notificationsTable: string;
  readonly mediaBucket: string;
  readonly userPoolId: string;
  readonly userPoolClientId: string;
  readonly region: string;
};

const REQUIRED = ["PROFILES_TABLE", "PLOTS_TABLE", "NOTIFICATIONS_TABLE", "MEDIA_BUCKET", "USER_POOL_ID", "USER_POOL_CLIENT_ID", "REGION"] as const;

export function loadEnv(): EnvConfig {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
  return {
    profilesTable: process.env.PROFILES_TABLE as string,
    plotsTable: process.env.PLOTS_TABLE as string,
    notificationsTable: process.env.NOTIFICATIONS_TABLE as string,
    mediaBucket: process.env.MEDIA_BUCKET as string,
    userPoolId: process.env.USER_POOL_ID as string,
    userPoolClientId: process.env.USER_POOL_CLIENT_ID as string,
    region: process.env.REGION as string,
  };
}
