// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { ExperienceSelector } from "./experience-selector";

afterEach(cleanup);

test("offers the working guest route and labels workspace sign-in as unavailable", () => {
  render(<ExperienceSelector />);
  expect(screen.getByRole("link", { name: /Open guest demo/ })).toHaveAttribute("href", "/demo");
  expect(screen.getByLabelText("My Workspace sign-in unavailable")).toHaveTextContent("Sign in is not yet available");
  expect(screen.getByText(/Google authentication and private personal workspaces are not available yet/)).toBeVisible();
  expect(screen.getByRole("link", { name: "SignalOps-AI home" })).toHaveAttribute("href", "/");
  expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/");
  expect(screen.getByRole("heading", { level: 1, name: /How would you like to explore/ })).toBeVisible();
});
