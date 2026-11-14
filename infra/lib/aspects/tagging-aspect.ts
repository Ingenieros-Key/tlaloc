import { IAspect, Tags } from "aws-cdk-lib";
import { IConstruct } from "constructs";
import { baseConfig } from "@config/base.config";

/** Applies tenant/environment/service tags to every construct in the app. */
export class TaggingAspect implements IAspect {
  visit(node: IConstruct): void {
    Tags.of(node).add("tenant", baseConfig.tenant);
    Tags.of(node).add("environment", baseConfig.env);
    Tags.of(node).add("service", baseConfig.tenant);
  }
}
