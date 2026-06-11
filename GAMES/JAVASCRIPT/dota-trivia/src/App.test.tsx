import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { LIVE_TRIVIA_EPOCH_MS } from "./lib/liveTrivia";

describe("App", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens directly into a compact live trivia card", () => {
    render(<App />);

    expect(screen.getByText("QUEUE TIME TRIVIA")).toBeInTheDocument();
    expect(screen.getAllByText(/^#\d/).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^answer [a-d]:/i })).toHaveLength(4);
    expect(screen.queryByText(/NEXT QUESTION IN/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Category")).not.toBeInTheDocument();
    expect(screen.queryByText("Difficulty")).not.toBeInTheDocument();
    expect(screen.queryByText("Score")).not.toBeInTheDocument();
    expect(screen.queryByText("Streak")).not.toBeInTheDocument();
  });

  it("locks an answer without revealing the result until countdown ends", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(LIVE_TRIVIA_EPOCH_MS + 10_000);
    render(<App />);

    act(() => {
      screen.getAllByRole("button", { name: /^answer [a-d]:/i })[0].click();
    });

    expect(screen.getByText("ANSWER LOCKED")).toBeInTheDocument();
    expect(screen.queryByText(/CORRECT|INCORRECT/)).not.toBeInTheDocument();
    expect(screen.queryByText(/NEXT QUESTION IN/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^answer [a-d]:/i })[0]).toBeDisabled();

    await act(async () => {
      vi.advanceTimersByTime(5_000);
    });

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/CORRECT|INCORRECT/)).toBeInTheDocument();
    expect(screen.getByText(/TRIVIA POINTS/)).toBeInTheDocument();
    expect(screen.getByText(/NEXT QUESTION IN/i)).toBeInTheDocument();
  });

  it("shows a no-answer result when the countdown expires", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(LIVE_TRIVIA_EPOCH_MS + 14_200);

    render(<App />);

    await act(async () => {
      vi.advanceTimersByTime(1_100);
    });

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("NO ANSWER SUBMITTED")).toBeInTheDocument();
    expect(screen.getByText("+0 TRIVIA POINTS")).toBeInTheDocument();
    expect(screen.getByText(/NEXT QUESTION IN/i)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^answer [a-d]:/i })[0]).toBeDisabled();
  });
});
