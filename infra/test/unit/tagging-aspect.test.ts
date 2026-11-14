import { describe, it, expect } from "vitest";
import { App, Stack, aws_sns as sns, Aspects } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { TaggingAspect } from "../../lib/aspects/tagging-aspect";

describe("TaggingAspect", () => {
  it("applies tenant/environment/service tags to resources", () => {
    const app = new App();
    const stack = new Stack(app, "T");
    new sns.Topic(stack, "Topic");
    Aspects.of(app).add(new TaggingAspect());
    const t = Template.fromStack(stack);
    t.hasResourceProperties("AWS::SNS::Topic", {
      Tags: [
        { Key: "environment", Value: "dev" },
        { Key: "service", Value: "tlaloc" },
        { Key: "tenant", Value: "tlaloc" },
      ],
    });
  });
});
