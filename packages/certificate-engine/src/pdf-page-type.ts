// Type for PDFPage (simplification - pdf-lib types)
export type PDFPage = {
  drawText: (text: string, options: { x: number; y: number }) => void;
  drawImage: (image: unknown, options: { x: number; y: number; width: number; height: number; opacity?: number }) => void;
  drawRectangle: (options: {
    x: number; y: number; width: number; height: number;
    color?: unknown; borderColor?: unknown; borderWidth?: number;
    opacity?: number;
  }) => void;
  drawCircle: (options: {
    x: number; y: number; radius: number;
    color?: unknown; borderColor?: unknown; borderWidth?: number;
    opacity?: number;
  }) => void;
  drawLine: (options: {
    start: { x: number; y: number };
    end: { x: number; y: number };
    thickness: number;
    color: unknown;
  }) => void;
  setFont: (font: unknown) => void;
  setFontSize: (size: number) => void;
  setTextColor: (color: unknown) => void;
  addPage: (size: [number, number]) => PDFPage;
};
