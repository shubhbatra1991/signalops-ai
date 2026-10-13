import { describe, expect, test } from "vitest";
import { legacyProductHref, productHref, withQuery } from "./product-routes";

describe("product routes", () => {
  test.each([["/", "/demo"], ["/events", "/demo/events"], ["settings", "/demo/settings"], ["/app/impact", "/demo/impact"], ["/demo/funnels", "/demo/funnels"]])("maps %s to %s", (input, expected) => {
    expect(productHref(input)).toBe(expected);
  });

  test("preserves legacy query values without interpreting them", () => {
    expect(legacyProductHref("events", { project: "demo", q: "report setup", theme: ["a", "b"] }))
      .toBe("/demo/events?project=demo&q=report+setup&theme=a&theme=b");
  });

  test("preserves repeated and encoded query values on the guest root", () => {
    expect(withQuery("/demo", { range: "all", theme: ["a", "b"], q: "report setup" }))
      .toBe("/demo?range=all&theme=a&theme=b&q=report+setup");
  });
});
