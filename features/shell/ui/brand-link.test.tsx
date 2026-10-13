// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { BrandLink } from "./brand-link";

test("uses the supplied brand logo inside an accessible home link", () => {
  render(<BrandLink />);

  const link = screen.getByRole("link", { name: "SignalOps-AI home" });
  expect(link).toHaveAttribute("href", "/");
  expect(link.querySelector("img")).toHaveAttribute("alt", "");
  expect(link.querySelector("img")?.getAttribute("src")).toContain("brand%2Fandroid-chrome-192x192.png");
});
