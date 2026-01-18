export enum ShapeType {
  POINT = 'point',
  LINE = 'line',
  CIRCLE = 'circle',
  TEXT = 'text',
  TRIANGLE = 'triangle',
  POLYGON = 'polygon',
  PATH = 'path' // Dùng cho các cung tròn biểu đồ
}

export interface BaseShape {
  id: string;
  type: ShapeType;
  color: string;
  selected?: boolean;
  strokeWidth?: number;
  strokeStyle?: 'solid' | 'dashed' | 'dotted';
  pattern?: 'none' | 'lines' | 'vertical' | 'dots' | 'grid' | 'cross' | 'diagonal' | 'diagonal-rev' | 'waves' | 'zigzag' | 'bricks' | 'hexagons' | 'checks' | 'triangles' | 'circles' | 'plus'; // Expanded to 16 types
}

export interface PointShape extends BaseShape {
  type: ShapeType.POINT;
  x: number;
  y: number;
  label: string;
  radius: number;
}

export interface LineShape extends BaseShape {
  type: ShapeType.LINE;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  arrow?: boolean; // New property for arrowheads
}

export interface CircleShape extends BaseShape {
  type: ShapeType.CIRCLE;
  cx: number;
  cy: number;
  r: number;
}

export interface TextShape extends BaseShape {
  type: ShapeType.TEXT;
  x: number;
  y: number;
  content: string;
  fontSize: number;
}

export interface PolygonShape extends BaseShape {
  type: ShapeType.POLYGON;
  points: {x: number, y: number}[]; 
  fill?: string;
  opacity?: number;
}

export interface PathShape extends BaseShape {
  type: ShapeType.PATH;
  d: string; // SVG Path data
  fill?: string;
  opacity?: number;
}

export type Shape = PointShape | LineShape | CircleShape | TextShape | PolygonShape | PathShape;

export interface GeometryResponse {
  explanation: string;
  shapes: Shape[];
}

export enum AppStatus {
  IDLE = 'idle',
  ANALYZING = 'analyzing',
  RENDERING = 'rendering',
  SPEAKING = 'speaking',
  ERROR = 'error'
}