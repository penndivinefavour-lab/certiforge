import { describe, it, expect } from "vitest";
import {
  createEmptyState,
  serializeEditorState,
  deserializeEditorState,
  addElement,
  updateElement,
  removeElement,
  reorderElement,
  fitTextSize,
} from "../../packages/editor/src/editor-state";

describe("editor state", () => {
  it("creates an empty state", () => {
    const state = createEmptyState();
    expect(state.version).toBe(1);
    expect(state.elements).toHaveLength(0);
    expect(state.selectedElementId).toBeNull();
  });

  it("serializes and deserializes", () => {
    const state = createEmptyState();
    const json = serializeEditorState(state);
    const parsed = deserializeEditorState(json);
    expect(parsed).toEqual(state);
  });

  it("rejects invalid version", () => {
    expect(deserializeEditorState(JSON.stringify({ version: 2 }))).toBeNull();
  });

  it("adds and removes elements", () => {
    const state = addElement(createEmptyState(), {
      id: "1",
      type: "text",
      x: 10,
      y: 10,
      width: 100,
      height: 40,
      rotation: 0,
      content: "Hello",
      style: {},
      dynamic: null,
      zIndex: 0,
    });
    expect(state.elements).toHaveLength(1);
    expect(state.selectedElementId).toBe("1");

    const removed = removeElement(state, "1");
    expect(removed.elements).toHaveLength(0);
    expect(removed.selectedElementId).toBeNull();
  });

  it("updates element properties", () => {
    const state = addElement(createEmptyState(), {
      id: "1",
      type: "text",
      x: 0,
      y: 0,
      width: 100,
      height: 40,
      rotation: 0,
      content: "Hello",
      style: {},
      dynamic: null,
      zIndex: 0,
    });
    const updated = updateElement(state, "1", { x: 50, content: "World" });
    expect(updated.elements[0].x).toBe(50);
    expect(updated.elements[0].content).toBe("World");
  });

  it("reorders elements", () => {
    let state = addElement(createEmptyState(), {
      id: "1",
      type: "text",
      x: 0,
      y: 0,
      width: 100,
      height: 40,
      rotation: 0,
      content: "A",
      style: {},
      dynamic: null,
      zIndex: 0,
    });
    state = addElement(state, {
      id: "2",
      type: "text",
      x: 0,
      y: 0,
      width: 100,
      height: 40,
      rotation: 0,
      content: "B",
      style: {},
      dynamic: null,
      zIndex: 1,
    });

    const reordered = reorderElement(state, "2", "up");
    expect(reordered.elements[0].id).toBe("2");
    expect(reordered.elements[1].id).toBe("1");
  });

  it("fits text within width", () => {
    expect(fitTextSize("Short", 400)).toBeGreaterThanOrEqual(10);
    expect(fitTextSize("A very long name that should shrink", 100, { min: 10, max: 40 })).toBeLessThanOrEqual(40);
  });
});
