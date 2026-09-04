"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

// Dynamically import Fabric.js to avoid SSR issues
const fabric = dynamic(() => import("fabric").then((mod) => ({ default: mod })), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>,
});

interface TemplateElement {
  id: string;
  type: "text" | "image" | "shape" | "line" | "qr_code";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  content: string;
  style: Record<string, unknown>;
  dynamic: { field: string; fallback?: string } | null;
  zIndex: number;
}

interface CanvasState {
  width: number;
  height: number;
  backgroundColor: string;
  orientation: "portrait" | "landscape";
}

const DYNAMIC_FIELDS = [
  "recipient_name",
  "course_name",
  "issue_date",
  "certificate_id",
  "instructor",
  "organization",
  "duration",
  "grade",
  "email",
];

export default function EditorPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const templateId = params.templateId as string;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [elements, setElements] = useState<TemplateElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<TemplateElement | null>(null);
  const [canvas, setCanvas] = useState<CanvasState>({
    width: 842,
    height: 595,
    backgroundColor: "#ffffff",
    orientation: "landscape",
  });
  const [zoom, setZoom] = useState(1);
  const [showFieldPicker, setShowFieldPicker] = useState(false);
  const [showProperties, setShowProperties] = useState(true);

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const initCanvas = async () => {
      const mod = await fabric;
      const fabricModule = mod.default || mod;
      const { Canvas } = fabricModule;

      const canvas = new Canvas(canvasRef.current, {
        width: canvas.width * zoom,
        height: canvas.height * zoom,
        backgroundColor: canvas.backgroundColor,
        preserveObjectStacking: true,
      });

      fabricRef.current = canvas;

      // Load elements from API
      await loadTemplate();

      // Event listeners
      canvas.on("selection:created", (e: any) => {
        const obj = e.selected?.[0];
        if (obj) {
          const el: TemplateElement = {
            id: obj.id || obj.get("id"),
            type: obj.type || "text",
            x: obj.left || 0,
            y: obj.top || 0,
            width: obj.width || 100,
            height: obj.height || 50,
            rotation: obj.angle || 0,
            content: obj.text || "",
            style: obj.toObject(["fill", "fontSize", "fontFamily", "fontWeight", "textAlign", "opacity"]),
            dynamic: obj.dynamic ? JSON.parse(obj.dynamic) : null,
            zIndex: obj.zIndex || 0,
          };
          setSelectedElement(el);
          setShowProperties(true);
        }
      });

      canvas.on("selection:cleared", () => {
        setSelectedElement(null);
        setShowProperties(false);
      });

      canvas.on("object:modified", (e: any) => {
        const obj = e.target;
        setElements((prev) =>
          prev.map((el) =>
            el.id === obj.id
              ? {
                  ...el,
                  x: obj.left,
                  y: obj.top,
                  width: obj.width,
                  height: obj.height,
                  rotation: obj.angle,
                  style: obj.toObject(["fill", "fontSize", "fontFamily", "fontWeight", "textAlign", "opacity"]),
                }
              : el
          )
        );
      });

      setIsLoading(false);
    };

    initCanvas();

    return () => {
      fabricRef.current?.dispose();
      fabricRef.current = null;
    };
  }, []);

  const loadTemplate = async () => {
    try {
      const res = await fetch(`/api/templates/${templateId}`);
      if (!res.ok) return;
      const data = await res.json();
      const version = data.template?.versions?.[0];
      if (version) {
        const loadedElements = version.elements ? JSON.parse(version.elements) : [];
        setElements(loadedElements);
        setCanvas({
          width: version.width || 842,
          height: version.height || 595,
          backgroundColor: version.backgroundColor || "#ffffff",
          orientation: version.orientation || "landscape",
        });
      }
    } catch (err) {
      console.error("Failed to load template:", err);
    }
  };

  const saveTemplate = async () => {
    if (!templateId) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ elements: JSON.stringify(elements), canvas }),
      });
      if (!res.ok) throw new Error("Failed to save");
      alert("Template saved successfully!");
    } catch (err) {
      console.error("Save failed:", err);
      alert("Failed to save template");
    } finally {
      setIsSaving(false);
    }
  };

  const addElement = (type: TemplateElement["type"]) => {
    if (!fabricRef.current) return;

    const mod = fabricRef.current;
    let object: any;

    switch (type) {
      case "text":
        object = new mod.util.createClass({
          type: "text",
          text: "{{recipient_name}}",
          left: 100,
          top: 100,
          width: 300,
          height: 40,
          fill: "#000000",
          fontSize: 24,
          fontFamily: "Poppins",
        });
        break;
      case "shape":
        object = new mod.Rect({
          left: 100,
          top: 100,
          width: 100,
          height: 100,
          fill: "#3b82f6",
          rx: 4,
          ry: 4,
        });
        break;
      case "line":
        object = new mod.Line([
          { x: 100, y: 100 },
          { x: 400, y: 100 },
        ], {
          stroke: "#000000",
          strokeWidth: 2,
        });
        break;
      case "qr_code":
        object = new mod.Rect({
          left: 600,
          top: 450,
          width: 100,
          height: 100,
          fill: "#ffffff",
          stroke: "#000000",
          strokeWidth: 1,
        });
        // Add QR text
        const qrText = new mod.Text("QR", {
          left: 625,
          top: 485,
          fontSize: 12,
          fill: "#666666",
        });
        canvasRef.current.add(qrText);
        break;
    }

    if (object) {
      object.id = `el-${Date.now()}`;
      object.dynamic = JSON.stringify({ field: type === "text" ? "recipient_name" : null });
      mod.canvas?.add(object);
      mod.canvas?.setActiveObject(object);
      mod.canvas?.renderAll();

      setElements((prev) => [
        ...prev,
        {
          id: object.id,
          type,
          x: object.left || 0,
          y: object.top || 0,
          width: object.width || 100,
          height: object.height || 50,
          rotation: object.angle || 0,
          content: object.text || "",
          style: {},
          dynamic: type === "text" ? { field: "recipient_name" } : null,
          zIndex: prev.length,
        },
      ]);
    }
  };

  const deleteSelected = () => {
    if (!fabricRef.current) return;
    const activeObject = fabricRef.current.canvas?.getActiveObject();
    if (activeObject) {
      fabricRef.current.canvas?.remove(activeObject);
      fabricRef.current.canvas?.renderAll();
      setElements((prev) => prev.filter((el) => el.id !== activeObject.id));
      setSelectedElement(null);
    }
  };

  const updateSelected = (updates: Partial<TemplateElement>) => {
    if (!fabricRef.current || !selectedElement) return;
    const mod = fabricRef.current;
    const object = mod.canvas?.getObjects().find((o: any) => o.id === selectedElement.id);
    if (object) {
      if (updates.content && object.type === "text") object.set("text", updates.content);
      if (updates.style?.fill) object.set("fill", updates.style.fill);
      if (updates.style?.fontSize) object.set("fontSize", updates.style.fontSize);
      if (updates.x !== undefined) object.set("left", updates.x);
      if (updates.y !== undefined) object.set("top", updates.y);
      mod.canvas?.renderAll();
      setSelectedElement({ ...selectedElement, ...updates });
      setElements((prev) =>
        prev.map((el) => (el.id === selectedElement.id ? { ...el, ...updates } : el))
      );
    }
  };

  const addDynamicField = (field: string) => {
    if (!fabricRef.current) return;
    const mod = fabricRef.current;
    const text = new mod.Text(`{{${field}}}`, {
      left: 100,
      top: 100,
      fontSize: 24,
      fontFamily: "Poppins",
      fill: "#000000",
    });
    text.id = `el-${Date.now()}`;
    text.dynamic = JSON.stringify({ field });
    mod.canvas?.add(text);
    mod.canvas?.setActiveObject(text);
    mod.canvas?.renderAll();

    setElements((prev) => [
      ...prev,
      {
        id: text.id,
        type: "text",
        x: text.left,
        y: text.top,
        width: text.width,
        height: text.height,
        rotation: text.angle || 0,
        content: `{{${field}}}`,
        style: { fontSize: 24, fontFamily: "Poppins" },
        dynamic: { field },
        zIndex: prev.length,
      },
    ]);
    setShowFieldPicker(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
          <p className="text-muted-foreground">Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-container min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b bg-card px-6 py-3 flex items-center justify-between sticky top-0 z-50" style={{ borderColor: "hsl(var(--border))" }}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/projects/${projectId}`)}
            className="btn btn-ghost btn-sm"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>
          <div className="h-6 w-px" style={{ background: "hsl(var(--border))" }} />
          <h1 className="font-semibold">Template Editor</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
            className="btn btn-ghost btn-sm btn-icon"
            title="Zoom out"
          >
            -
          </button>
          <span className="text-sm text-muted-foreground w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
            className="btn btn-ghost btn-sm btn-icon"
            title="Zoom in"
          >
            +
          </button>
          <div className="h-6 w-px" style={{ background: "hsl(var(--border))" }} />
          <button
            onClick={() => setShowFieldPicker(!showFieldPicker)}
            className="btn btn-ghost btn-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 7V4h16v3" />
              <path d="M9 20h6" />
              <path d="M12 4v16" />
            </svg>
            Add Field
          </button>
          <button
            onClick={saveTemplate}
            disabled={isSaving}
            className="btn btn-primary btn-sm"
          >
            {isSaving ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                Saving...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                Save
              </>
            )}
          </button>
          <button
            onClick={() => router.push(`/projects/${projectId}/generation`)}
            className="btn btn-accent btn-sm"
          >
            Generate
          </button>
        </div>
      </header>

      <div className="flex h-[calc(100vh-64px)]">
        {/* Left panel - Elements */}
        <aside className="w-64 border-r bg-card flex flex-col" style={{ borderColor: "hsl(var(--border))" }}>
          <div className="p-4 border-b" style={{ borderColor: "hsl(var(--border))" }}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Add Elements</h3>
          </div>
          <div className="p-4 grid grid-cols-2 gap-2">
            {[
              { type: "text" as const, icon: "T", label: "Text" },
              { type: "shape" as const, icon: "□", label: "Shape" },
              { type: "line" as const, icon: "—", label: "Line" },
              { type: "qr_code" as const, icon: "QR", label: "QR Code" },
            ].map((item) => (
              <button
                key={item.type}
                onClick={() => addElement(item.type)}
                className="btn btn-ghost btn-sm flex flex-col items-center gap-1 p-3"
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-xs">{item.label}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 border-t p-4" style={{ borderColor: "hsl(var(--border))" }}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Layers</h3>
            <div className="space-y-1">
              {[...elements].reverse().map((el, i) => (
                <button
                  key={el.id}
                  onClick={() => {
                    setSelectedElement(el);
                    setShowProperties(true);
                  }}
                  className={`w-full text-left px-3 py-2 rounded text-sm ${selectedElement?.id === el.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                  <span className="text-xs opacity-60 mr-2">{el.type.toUpperCase()}</span>
                  {el.content?.slice(0, 20) || el.id}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Center - Canvas */}
        <main className="flex-1 overflow-auto bg-muted/20 p-8 flex items-center justify-center">
          <div
            className="relative shadow-lg"
            style={{
              width: canvas.width * zoom,
              height: canvas.height * zoom,
              transform: `scale(${zoom})`,
              transformOrigin: "center center",
            }}
          >
            <canvas ref={canvasRef} />
          </div>
        </main>

        {/* Right panel - Properties */}
        <AnimatePresence>
          {showProperties && selectedElement && (
            <motion.aside
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              className="w-80 border-l bg-card overflow-y-auto"
              style={{ borderColor: "hsl(var(--border))" }}
            >
              <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "hsl(var(--border))" }}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Properties</h3>
                <button onClick={() => setShowProperties(false)} className="btn btn-ghost btn-icon btn-sm">
                  ✕
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Content */}
                {selectedElement.type === "text" && (
                  <div>
                    <label className="form-label">Content</label>
                    <textarea
                      className="form-input"
                      rows={3}
                      value={selectedElement.content || ""}
                      onChange={(e) => updateSelected({ content: e.target.value })}
                    />
                  </div>
                )}

                {/* Dynamic field */}
                <div>
                  <label className="form-label">Dynamic Field</label>
                  <select
                    className="form-select"
                    value={selectedElement.dynamic?.field || ""}
                    onChange={(e) => updateSelected({ dynamic: e.target.value ? { field: e.target.value } : null })}
                  >
                    <option value="">None</option>
                    {DYNAMIC_FIELDS.map((field) => (
                      <option key={field} value={field}>{`{{${field}}}`}</option>
                    ))}
                  </select>
                </div>

                {/* Position */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="form-label">X</label>
                    <input
                      type="number"
                      className="form-input"
                      value={Math.round(selectedElement.x)}
                      onChange={(e) => updateSelected({ x: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="form-label">Y</label>
                    <input
                      type="number"
                      className="form-input"
                      value={Math.round(selectedElement.y)}
                      onChange={(e) => updateSelected({ y: Number(e.target.value) })}
                    />
                  </div>
                </div>

                {/* Size */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="form-label">Width</label>
                    <input
                      type="number"
                      className="form-input"
                      value={Math.round(selectedElement.width)}
                      onChange={(e) => updateSelected({ width: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="form-label">Height</label>
                    <input
                      type="number"
                      className="form-input"
                      value={Math.round(selectedElement.height)}
                      onChange={(e) => updateSelected({ height: Number(e.target.value) })}
                    />
                  </div>
                </div>

                {/* Style */}
                {selectedElement.type === "text" && (
                  <>
                    <div>
                      <label className="form-label">Font Size</label>
                      <input
                        type="number"
                        className="form-input"
                        value={selectedElement.style?.fontSize || 24}
                        onChange={(e) => updateSelected({ style: { ...selectedElement.style, fontSize: Number(e.target.value) } })}
                      />
                    </div>
                    <div>
                      <label className="form-label">Color</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          className="w-10 h-8 rounded cursor-pointer"
                          value={selectedElement.style?.fill || "#000000"}
                          onChange={(e) => updateSelected({ style: { ...selectedElement.style, fill: e.target.value } })}
                        />
                        <input
                          type="text"
                          className="form-input flex-1"
                          value={selectedElement.style?.fill || "#000000"}
                          onChange={(e) => updateSelected({ style: { ...selectedElement.style, fill: e.target.value } })}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Delete button */}
                <button
                  onClick={deleteSelected}
                  className="btn btn-danger btn-sm w-full"
                >
                  Delete Element
                </button>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Field picker dropdown */}
      <AnimatePresence>
        {showFieldPicker && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-16 right-6 bg-card border rounded-lg shadow-lg p-4 z-50"
            style={{ borderColor: "hsl(var(--border))" }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Add Dynamic Field</h3>
              <button onClick={() => setShowFieldPicker(false)} className="btn btn-ghost btn-sm btn-icon">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DYNAMIC_FIELDS.map((field) => (
                <button
                  key={field}
                  onClick={() => addDynamicField(field)}
                  className="btn btn-ghost btn-sm text-left"
                >
                  <code className="text-xs">{`{{${field}}}`}</code>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
