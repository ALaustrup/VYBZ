import { afterEach, describe, expect, it } from "vitest";
import {
  getPackPipeline,
  isStageComplete,
  isStageSkipped,
  markStageComplete,
  markStageSkipped,
  resetPackPipeline,
} from "./packPipelineStore";

describe("pack pipeline store", () => {
  afterEach(() => {
    resetPackPipeline();
  });

  it("does not treat skip as complete", () => {
    markStageSkipped(2);
    expect(isStageSkipped(2)).toBe(true);
    expect(isStageComplete(2)).toBe(false);
    expect(getPackPipeline().completed).toEqual([]);
  });

  it("complete replaces skip on the same stage", () => {
    markStageSkipped(1);
    markStageComplete(1);
    expect(isStageComplete(1)).toBe(true);
    expect(isStageSkipped(1)).toBe(false);
  });

  it("skip after complete does not erase the completion", () => {
    markStageComplete(3);
    markStageSkipped(3);
    expect(isStageComplete(3)).toBe(true);
    expect(isStageSkipped(3)).toBe(false);
  });
});
