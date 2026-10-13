import type { Metadata } from "next";
import { ExperienceSelector } from "@/features/marketing/ui/experience-selector";

export const metadata: Metadata = {
  title: "Choose your experience",
  description: "Choose the public SignalOps-AI guest demonstration or review the future workspace experience.",
};

export default function StartPage() {
  return <ExperienceSelector />;
}
