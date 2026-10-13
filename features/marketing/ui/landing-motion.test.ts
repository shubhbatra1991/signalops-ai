import { describe, expect, test } from "vitest";
import { heroItemVariants, revealMotion } from "./landing-motion";

describe("landing motion preferences", () => {
  test("removes entrance animation when reduced motion is requested", () => {
    expect(revealMotion(true, 0.5, 20)).toEqual({ initial: false, transition: { duration: 0 } });
  });

  test("keeps non-reduced initial content visible while using layout-neutral transforms", () => {
    const config = revealMotion(false, 0.1, 16);
    expect(config.initial).toEqual({ opacity: 0.08, y: 16 });
    expect(config.transition).toMatchObject({ duration: 0.64, delay: 0.1 });
  });

  test("uses a clearly observable hero movement while preserving a stable final state", () => {
    expect(heroItemVariants.hidden).toEqual({ opacity: 0.08, y: 28 });
    expect(heroItemVariants.visible).toMatchObject({ opacity: 1, y: 0, transition: { duration: 0.64 } });
  });
});
