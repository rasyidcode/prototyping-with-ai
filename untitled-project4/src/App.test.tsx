import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("opens directly into a live trivia question", () => {
    render(<App />);

    expect(screen.getAllByText(/^#\d/).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^answer [a-d]:/i })).toHaveLength(4);
    expect(screen.queryByText("Category")).not.toBeInTheDocument();
    expect(screen.queryByText("Difficulty")).not.toBeInTheDocument();
  });

  it("shows answer feedback and prevents duplicate answers", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole("button", { name: /^answer [a-d]:/i })[0]);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^answer [a-d]:/i })[0]).toBeDisabled();
  });
});
