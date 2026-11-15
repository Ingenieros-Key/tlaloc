import type { Metadata } from "next";
import { Workspace } from "@/features/workspace/Workspace";

export const metadata: Metadata = {
  title: "Workspace · Tlaloc",
};

export default function WorkspacePage() {
  return <Workspace />;
}
