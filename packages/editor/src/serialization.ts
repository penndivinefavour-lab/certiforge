// CertiForge Editor - Canvas serialization and deserialization
import type { TemplateElement, CanvasDimensions } from '@certiforge/types';

export interface EditorState {
  canvas: CanvasDimensions;
  elements: TemplateElement[];
  zoom: number;
  selectedElementId: string | null;
}

export function serializeEditorState(state: EditorState): string {
  const data = {
    version: 1,
    canvas: state.canvas,
    elements: state.elements.map(el => ({
      id: el.id,
      type: el.type,
      x: el.x,
      y: el.y,
      width: el.width,
      height: el.height,
      rotation: el.rotation,
      content: el.content,
      style: el.style,
      dynamic: el.dynamic,
      zIndex: el.zIndex
    }))
  };
  return JSON.stringify(data);
}

export function deserializeEditorState(json: string): EditorState | null {
  try {
    const data = JSON.parse(json);
    if (data.version !== 1) return null;
    
    return {
      canvas: data.canvas,
      elements: data.elements.map((el: any) => ({
        id: el.id,
        type: el.type,
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
        rotation: el.rotation || 0,
        content: el.content,
        style: el.style || {},
        dynamic: el.dynamic,
        zIndex: el.zIndex || 0
      })),
      zoom: data.zoom || 1,
      selectedElementId: data.selectedElementId || null
    };
  } catch {
    return null;
  }
}

export function stateToFabricState(state: EditorState): any {
  return {
    canvas: {
      width: state.canvas.width,
      height: state.canvas.height,
      unit: state.canvas.unit
    },
    elements: state.elements.map(el => ({
      type: el.type,
      left: el.x,
      top: el.y,
      width: el.width,
      height: el.height,
      angle: el.rotation,
      text: el.content,
      fill: el.style?.color,
      fontFamily: el.style?.fontFamily,
      fontSize: el.style?.fontSize,
      fontWeight: el.style?.fontWeight,
      textAlign: el.style?.textAlign,
      opacity: el.style?.opacity,
      dynamic: el.dynamic,
      index: el.zIndex
    }))
  };
}

export function validateElement(element: TemplateElement, canvas: CanvasDimensions): boolean {
  // Basic validation: element should be within canvas bounds
  if (element.x < 0 || element.y < 0) return false;
  if (element.x + element.width > canvas.width) return false;
  if (element.y + element.height > canvas.height) return false;
  
  // Validate type-specific properties
  if (element.type === 'text' && !element.content) return false;
  if (element.type === 'image' && !element.content) return false;
  
  return true;
}
