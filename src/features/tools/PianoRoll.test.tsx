import { describe, expect, it, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { PianoRoll } from "./PianoRoll";

describe("PianoRoll", () => {
  it("renders and removes a note block on click", () => {
    const onRemove = vi.fn();
    const { getByTestId, getByTitle } = render(
      <PianoRoll
        notes={[{ id: "n1", midi: 60, time: 0.5, duration: 0.5, velocity: 0.8 }]}
        onPlace={() => undefined}
        onRemove={onRemove}
      />
    );
    expect(getByTestId("piano-roll")).toBeTruthy();
    fireEvent.click(getByTitle(/C4/));
    expect(onRemove).toHaveBeenCalledWith("n1");
  });
});
