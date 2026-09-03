// CertiForge Editor - Canvas serialization and deserialization
import type { TemplateElement, CanvasDimensions } from '@/types';

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
      z: el.z
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
        z: el.z || 0
      })),
      zoom: data.zoom || 1,
      selectedElementId: data.selectedElementId || null
    };
  } catch {
    return null;
  }
}

// Smart text fitting
export function fitText(
  text: string,
  maxWidth: number,
  fontSize: number,
  fontFamily: string,
  fontWeight: string = 'normal',
  fontFamilyMap: Record<string, string> = {}
): number {
  // Simplified text fitting - in production, use canvas measureText
  const maxFontSize = fontSize;
  const minFontSize = 8;
  
  if (text.length === 0) return maxFontSize;
  
  // Approximate character width (in pixels)
  const avgCharWidth = fontSize * 0.6;
  const charsPerLine = Math.floor(maxWidth / avgCharWidth);
  
  if (text.length <= charsPerLine) {
    return maxFontSize;
  }
  
  // Reduce font size proportionally
  let fittedSize = maxFontSize;
  while (fittedSize > minFontSize) {
    const newAvgWidth = fittedSize * 0.6;
    const newCharsPerLine = Math.floor(maxWidth / newAvgWidth);
    if (text.length <= newCharsPerLine) {
      break;
    }
    fittedSize -= 1;
  }
  
  return fittedSize;
}

// Validate element dimensions
export function validateElement(element: TemplateElement, canvas: CanvasDimensions): boolean {
  return (
    element.x >= 0 &&
    element.y >= 0 &&
    element.x + element.width <= canvas.width &&
    element.y + element.height <= canvas.height &&
    element.width > 0 &&
    element.height > 0
  );
}

// Convert fabric.js data to Prisma format
export function fabricDataToPrisma(canvasData: any): EditorState {
  return {
    canvas: {
      width: canvasData.width,
      height: canvasData.height,
      unit: canvasData.unit || 'mm'
    },
    elements: canvasData.objects.map((obj: any) => ({
      id: obj.id,
      type: obj.type,
      x: obj.left,
      y: obj.top,
      width: obj.width,
      height: obj.height,
      rotation: obj.angle || 0,
      content: obj.text || obj.fill || obj.stroke,
      style: {
        fontFamily: obj.fontFamily,
        fontSize: obj.fontSize,
        fontWeight: obj.fontWeight,
        color: obj.fill,
        textAlign: obj.textAlign,
        opacity: obj.opacity
      },
      dynamic: obj.dynamic,
      z: obj.index || 0
    }))
  };
}

// Convert Prisma format to fabric.js data
export function prismaDataToFabric(state: EditorState): any {
  return {
    width: state.canvas.width,
    height: state.canvas.height,
    objects: state.elements.map(el => ({
      id: el.id,
      type: el.type,
      left: el.x,
      top: el.y,
      width: el.width,
      height: el.height,
      angle: el.rotation,
      text: el.content,
      fill: el.style.color,
      fontFamily: el.style.fontFamily,
      fontSize: el.style.fontSize,
      fontWeight: el.style.fontWeight,
      textAlign: el.style.textAlign,
      opacity: el.style.opacity,
      dynamic: el.dynamic,
      index: el.z
    }))
  };
}
