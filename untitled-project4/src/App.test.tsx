import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("opens directly into a compact live trivia card", () => {
    render(<App />);

    expect(screen.getByText("QUEUE TIME TRIVIA")).toBeInTheDocument();
    expect(screen.getAllByText(/^#\d/).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^answer [a-d]:/i })).toHaveLength(4);
    expect(screen.getByText(/NEXT QUESTION IN/i)).toBeInTheDocument();
    expect(screen.queryByText("Category")).not.toBeInTheDocument();
    expect(screen.queryByText("Difficulty")).not.toBeInTheDocument();
    expect(screen.queryByText("Score")).not.toBeInTheDocument();
    expect(screen.queryByText("Streak")).not.toBeInTheDocument();
  });

  it("shows large answer feedback and prevents duplicate answers", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole("button", { name: /^answer [a-d]:/i })[0]);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/CORRECT|INCORRECT/)).toBeInTheDocument();
    expect(screen.getByText(/TRIVIA POINTS/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^answer [a-d]:/i })[0]).toBeDisabled();
  });
});
