// Certificate serialization tests
import { describe, it, expect } from "vitest";
import { serializeEditorState, deserializeEditorState } from "../../packages/editor/src/serialization";

describe("Editor Serialization", () => {
  describe("serializeEditorState", () => {
    it("should serialize editor state to JSON", () => {
      const state = {
        canvas: { width: 842, height: 595 },
        elements: [
          {
            id: "el-1",
            type: "text",
            x: 100,
            y: 100,
            width: 300,
            height: 40,
            rotation: 0,
            content: "{{recipient_name}}",
            style: { fontSize: 24 },
            dynamic: { field: "recipient_name" },
            z: 0,
          },
        ],
        zoom: 1,
        selectedElementId: null,
      };

      const serialized = serializeEditorState(state);
      const parsed = JSON.parse(serialized);

      expect(parsed.version).toBe(1);
      expect(parsed.canvas).toEqual(state.canvas);
      expect(parsed.elements).toHaveLength(1);
      expect(parsed.elements[0].id).toBe("el-1");
    });
  });

  describe("deserializeEditorState", () => {
    it("should deserialize valid JSON", () => {
      const json = JSON.stringify({
        version: 1,
        canvas: { width: 842, height: 595 },
        elements: [],
        zoom: 1,
        selectedElementId: null,
      });

      const state = deserializeEditorState(json);
      expect(state).not.toBeNull();
      expect(state?.canvas.width).toBe(842);
      expect(state?.elements).toHaveLength(0);
    });

    it("should return null for invalid JSON", () => {
      expect(deserializeEditorState("invalid")).toBeNull();
      expect(deserializeEditorState("")).toBeNull();
    });

    it("should return null for wrong version", () => {
      const json = JSON.stringify({
        version: 2,
        canvas: { width: 842, height: 595 },
        elements: [],
        zoom: 1,
        selectedElementId: null,
      });

      expect(deserializeEditorState(json)).toBeNull();
    });
  });
});
