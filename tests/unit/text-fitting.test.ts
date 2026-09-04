// Text fitting tests
import { describe, it, expect } from "vitest";

// Inline text fitting logic
function fitText(text: string, maxWidth: number, initialSize: number, fontFamily: string, minSize: number = 8): number {
  let size = initialSize;
  const avgCharWidth = size * 0.6;
  const charsPerLine = Math.floor(maxWidth / avgCharWidth);

  if (text.length <= charsPerLine) {
    return size;
  }

  while (size > minSize) {
    const newAvgWidth = size * 0.6;
    const newCharsPerLine = Math.floor(maxWidth / newAvgWidth);
    if (text.length <= newCharsPerLine) {
      break;
    }
    size -= 1;
  }

  return Math.max(size, minSize);
}

describe("Text Fitting", () => {
  it("should fit normal names", () => {
    const size = fitText("John Doe", 200, 24, "Helvetica");
    expect(size).toBe(24);
  });

  it("should fit medium names", () => {
    const size = fitText("Christopher Alexander", 200, 24, "Helvetica");
    expect(size).toBeLessThan(24);
    expect(size).toBeGreaterThan(12);
  });

  it("should fit extremely long names", () => {
    const longName = "Christopher Alexander Montgomery-Smith III";
    const size = fitText(longName, 200, 24, "Helvetica");
    expect(size).toBeLessThan(24);
    expect(size).toBeGreaterThanOrEqual(8);
  });

  it("should handle empty text", () => {
    const size = fitText("", 200, 24, "Helvetica");
    expect(size).toBe(24);
  });

  it("should use custom minimum size", () => {
    const size = fitText("Very long text that needs fitting", 100, 24, "Helvetica", 10);
    expect(size).toBeGreaterThanOrEqual(10);
  });
});
