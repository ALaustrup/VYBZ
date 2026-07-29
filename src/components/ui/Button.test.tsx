import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/ui/Button";
import { StateView } from "@/components/states/StateView";

describe("Button", () => {
  it("fires click when enabled", async () => {
    const user = userEvent.setup();
    let clicked = false;
    render(
      <Button onClick={() => { clicked = true; }}>Save</Button>,
    );
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(clicked).toBe(true);
  });

  it("does not fire when loading", async () => {
    const user = userEvent.setup();
    let clicked = false;
    render(
      <Button loading onClick={() => { clicked = true; }}>
        Save
      </Button>,
    );
    await user.click(screen.getByRole("button"));
    expect(clicked).toBe(false);
  });
});

describe("StateView", () => {
  it("renders empty variant copy", () => {
    render(
      <StateView
        variant="empty"
        title="Nothing here"
        body="Start a release to begin."
      />,
    );
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.getByText("Start a release to begin.")).toBeInTheDocument();
  });
});
