// CertiForge Editor - Client-side canvas state + serialization
export interface EditorElement {
  id: string;
  type: 'text' | 'image' | 'shape' | 'line' | 'qr_code';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  content: string | null;
  style: Record<string, unknown>;
  dynamic: { field: string; fallback?: string } | null;
  zIndex: number;
}

export interface EditorState {
  version: 1;
  canvas: { width: number; height: number; unit: 'px' | 'mm' | 'in' };
  background: string | null;
  elements: EditorElement[];
  selectedElementId: string | null;
}

export function createDefaultCanvas(unit: 'px' | 'mm' | 'in' = 'px'): EditorState['canvas'] {
  if (unit === 'mm') return { width: 297, height: 210, unit };
  if (unit === 'in') return { width: 11.7, height: 8.3, unit };
  return { width: 1122, height: 794, unit };
}

export function createEmptyState(canvas = createDefaultCanvas()): EditorState {
  return {
    version: 1,
    canvas,
    background: '#ffffff',
    elements: [],
    selectedElementId: null,
  };
}

export function serializeEditorState(state: EditorState): string {
  return JSON.stringify(state);
}

export function deserializeEditorState(json: string): EditorState | null {
  try {
    const parsed = JSON.parse(json);
    if (parsed?.version !== 1) return null;
    if (!Array.isArray(parsed.elements)) return null;
    return parsed as EditorState;
  } catch {
    return null;
  }
}

export function addElement(state: EditorState, element: EditorElement): EditorState {
  return {
    ...state,
    elements: [...state.elements, element],
    selectedElementId: element.id,
  };
}

export function updateElement(
  state: EditorState,
  id: string,
  patch: Partial<EditorElement>
): EditorState {
  return {
    ...state,
    elements: state.elements.map((el) => (el.id === id ? { ...el, ...patch } : el)),
  };
}

export function removeElement(state: EditorState, id: string): EditorState {
  return {
    ...state,
    elements: state.elements.filter((el) => el.id !== id),
    selectedElementId: state.selectedElementId === id ? null : state.selectedElementId,
  };
}

export function reorderElement(state: EditorState, id: string, direction: 'up' | 'down'): EditorState {
  const maxIndex = state.elements.length - 1;
  const currentIndex = state.elements.findIndex((el) => el.id === id);
  if (currentIndex < 0) return state;

  const swapWith = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (swapWith < 0 || swapWith > maxIndex) return state;

  const next = state.elements.slice();
  const current = next[currentIndex];
  next[currentIndex] = next[swapWith];
  next[swapWith] = current;

  return { ...state, elements: next.map((el, idx) => ({ ...el, zIndex: idx })) };
}

export function fitTextSize(text: string, maxWidth: number, options: { min?: number; max?: number } = {}): number {
  const min = options.min ?? 10;
  const max = options.max ?? 72;
  if (!text) return max;

  let size = max;
  while (size >= min) {
    const estimatedWidth = text.length * size * 0.52;
    if (estimatedWidth <= maxWidth) return size;
    size -= 1;
  }
  return min;
}
