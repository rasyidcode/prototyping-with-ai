import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("starts a trivia session and shows answer feedback", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /start trivia/i }));
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /^answer [a-d]:/i })[0]);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
