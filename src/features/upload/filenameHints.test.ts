/**
 * Cases drawn from a real 43-file pack, where detection got the tempo wrong on
 * every loop and the filename was right every time.
 */
import { describe, expect, it } from "vitest";
import { bpmFromFilename, hintsFromFilename, keyFromFilename } from "@/features/upload/filenameHints";
import { MUSICAL_KEYS } from "@/lib/profileFields";

describe("bpmFromFilename", () => {
  it("reads the tempo packs put at the end of the name", () => {
    expect(bpmFromFilename("CS BASSLOOP 01 F 174.wav")).toBe(174);
    expect(bpmFromFilename("OPTCL OPBASS MORPHBASS 170.wav")).toBe(170);
    expect(bpmFromFilename("OPTCL PUNCHBAGBASS 172.wav")).toBe(172);
  });

  it("ignores a track index, which is a number but not a tempo", () => {
    expect(bpmFromFilename("TELEKINESIS BASSLOOP 04 F 174.wav")).toBe(174);
    expect(bpmFromFilename("BASSLOOP 03.wav")).toBeNull();
  });

  it("ignores numbers welded into a product name", () => {
    // REPRO-1 and X64 are gear, not tempo. 64 is in range and must not win.
    expect(bpmFromFilename("OVERDISTORT BASS - REPRO-1(X64)MAXEDRXMORE.wav")).toBeNull();
  });

  it("refuses numbers nobody counts in", () => {
    expect(bpmFromFilename("weird 420 thing.wav")).toBeNull();
    expect(bpmFromFilename("take 12.wav")).toBeNull();
  });
});

describe("keyFromFilename", () => {
  it("takes a key only when the name states the mode", () => {
    expect(keyFromFilename("Deep Roller Am 174.wav")).toBe("A minor");
    expect(keyFromFilename("Pad Fmaj 120.wav")).toBe("F major");
    expect(keyFromFilename("Sub Bbm 140.wav")).toBe("A# / Bb minor");
  });

  it("will not invent a mode from a bare root", () => {
    // "F" says the root and nothing else. Half an answer is not an answer.
    expect(keyFromFilename("CS BASSLOOP 01 F 174.wav")).toBeNull();
    expect(keyFromFilename("CS BASSLOOP 11 E 172.wav")).toBeNull();
  });

  it("abstains when the name names two different keys", () => {
    expect(keyFromFilename("OPTCL MAKESBACTERIABASS C D# 174.wav")).toBeNull();
    expect(keyFromFilename("transition Am to Cm.wav")).toBeNull();
  });

  it("does not read a word as a note", () => {
    expect(keyFromFilename("CS BASSLOOP 174.wav")).toBeNull();
    expect(keyFromFilename("GATED SNARE.wav")).toBeNull();
  });

  it("only ever returns a key the app can store", () => {
    for (const name of ["x Am 90.wav", "x Bbm 90.wav", "x C#maj 90.wav", "x Ebm 90.wav"]) {
      const key = keyFromFilename(name);
      expect(key, name).toBeTruthy();
      expect(MUSICAL_KEYS, name).toContain(key!);
    }
  });
});

describe("hintsFromFilename", () => {
  it("returns nothing for a name that says nothing", () => {
    expect(hintsFromFilename("bounce final v3.wav")).toEqual({ bpm: null, musicalKey: null });
  });

  it("reads both when both are stated", () => {
    expect(hintsFromFilename("Roller Gm 174.wav")).toEqual({ bpm: 174, musicalKey: "G minor" });
  });
});
