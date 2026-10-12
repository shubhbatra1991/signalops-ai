import { describe, expect, test } from "vitest";
import { legacyProductHref, productHref } from "./product-routes";

describe("product routes", () => {
  test.each([["/", "/app"], ["/events", "/app/events"], ["settings", "/app/settings"], ["/app/impact", "/app/impact"]])("maps %s to %s", (input, expected) => {
    expect(productHref(input)).toBe(expected);
  });

  test("preserves legacy query values without interpreting them", () => {
    expect(legacyProductHref("events", { project: "demo", q: "report setup", theme: ["a", "b"] }))
      .toBe("/app/events?project=demo&q=report+setup&theme=a&theme=b");
  });
});
