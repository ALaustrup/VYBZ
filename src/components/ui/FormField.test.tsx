import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormField } from "./FormField";

describe("FormField", () => {
  it("associates label and surfaces error text", () => {
    render(
      <FormField id="title" label="Title" error="Required">
        <input id="title" />
      </FormField>,
    );
    expect(screen.getByLabelText("Title")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Required");
  });
});
