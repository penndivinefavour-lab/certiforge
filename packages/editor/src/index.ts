// CertiForge Editor Package
export {
  createEmptyState,
  serializeEditorState,
  deserializeEditorState,
  addElement,
  updateElement,
  removeElement,
  reorderElement,
  fitTextSize,
} from './editor-state';
export type { EditorElement, EditorState } from './editor-state';
export type { EditorState as SerializedEditorState } from './serialization';
export { serializeEditorState as serializeState, deserializeEditorState as deserializeState, validateElement } from './serialization';
