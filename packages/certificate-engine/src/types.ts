// Certificate Engine Types
export interface ElementData {
  type: string;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  color?: string;
  textAlign?: string;
  lineHeight?: number;
  letterSpacing?: number;
  dynamicField?: string;
  minFontSize?: number;
  opacity?: number;
  src?: string;
  assetId?: string;
  fit?: string;
  shapeType?: string;
  fillColor?: string;
  fillOpacity?: number;
  strokeColor?: string;
  strokeWidth?: number;
  verificationUrl?: string;
  size?: number;
  backgroundColor?: string;
  foregroundColor?: string;
  [key: string]: unknown;
}
