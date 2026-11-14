import { baseConfig } from "@config/base.config";

export function buildName(resource: string): string {
  const slug = resource.trim().toLowerCase().replace(/\s+/g, "-");
  return `${baseConfig.appPrefix}-${slug}`;
}
