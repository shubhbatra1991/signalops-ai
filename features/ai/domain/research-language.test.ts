import { expect, test } from "vitest";
import { insightDraftSchema } from "./insights";
import { hasUnsupportedCausalAssertion, hasUnsupportedNumber } from "./research-language";

test.each([
  "Could clearer guidance build confidence?",
  "Could confusing permissions cause hesitation?",
  "Might customers value the report because it supports planning?",
  "May report clarity lead to a positive experience?",
  "Could one-to-one interviews reveal what users value?",
])("accepts legitimate tentative research language: %s", (hypothesis) => {
  expect(insightDraftSchema.safeParse({ title: "Understanding positive report experiences", evidenceReferenceIds: ["theme:report-value"],
    hypotheses: [hypothesis], limitations: ["The evidence does not prove causation; impact remains unknown."],
    recommendedAction: "Conduct one-to-one interviews to explore confidence and understand positive feedback." }).success).toBe(true);
});

test.each(["Conversion improved by 25%.", "Ninety percent improvement", "Two customers dropped off.", "Half of the users converted.", "All customers love the report.", "The report doubles conversion."])("rejects unsupported quantities: %s", (text) => {
  expect(hasUnsupportedNumber(text)).toBe(true);
});

test.each(["Guidance caused noncompletion.", "The report leads to retention.", "Users returned because the report improved planning.",
  "Could guidance help? It caused noncompletion.", "The report definitely improves retention.", "This proves product success.",
  "The report causes retention and does not prove engagement."])("rejects unsupported causal/certainty assertions: %s", (text) => {
  expect(hasUnsupportedCausalAssertion(text)).toBe(true);
});

test("collection limits, markup rejection and reference field shape are preserved", () => {
  const base = { title: "Report research", evidenceReferenceIds: ["theme:report-value"], hypotheses: ["Could clarity help?"], limitations: ["Impact remains unknown."], recommendedAction: "Interview volunteers." };
  for (const output of [{ ...base, title: "x".repeat(401) }, { ...base, hypotheses: Array(4).fill("Could clarity help?") },
    { ...base, evidenceReferenceIds: [] }, { ...base, title: "<script>unsafe</script>" }, { ...base, observation: "Invented statistic" }]) {
    expect(insightDraftSchema.safeParse(output).success).toBe(false);
  }
});
