export type ElementType = 'ring' | 'counter' | 'bar' | 'pie' | 'line' | 'kpi' | 'growth' | 'text';

export type EasingName =
  | 'linear' | 'easeInQuad' | 'easeOutQuad' | 'easeInOutQuad'
  | 'easeInCubic' | 'easeOutCubic' | 'easeInOutCubic'
  | 'easeOutQuart' | 'easeInOutQuart' | 'easeOutExpo' | 'easeInOutExpo'
  | 'easeOutBack' | 'easeOutElastic' | 'easeOutBounce' | 'custom';

export type Entrance = 'none' | 'fade' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight' | 'scale' | 'blur';

export interface AnimSettings {
  delay: number;      // seconds
  duration: number;   // seconds
  easing: EasingName;
  bezier: [number, number, number, number];
  stagger: number;    // seconds between items (bars, slices, points)
  entrance: Entrance;
  entranceDuration: number;
}

/** Colors may be hex/rgba strings or palette references like "$0", "$1"... */
export type ColorRef = string;

export interface Series {
  name: string;
  color: ColorRef;
  values: number[];
}

export interface DataTable {
  labels: string[];
  series: Series[];
}

export interface NumberFormat {
  decimals: number;
  prefix: string;
  suffix: string;
  thousands: boolean;
  digits: 'latin' | 'arabic';
  compact: boolean; // 1.2K / 3.4M
}

export interface BaseElement {
  id: string;
  type: ElementType;
  name: string;
  x: number; y: number; w: number; h: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  anim: AnimSettings;
  font: string;          // '' = use brand fonts
  fontWeight: number;
  textColor: ColorRef;
  mutedColor: ColorRef;
  fontScale: number;
  strokeWidth: number;
  radius: number;
  format: NumberFormat;
  // type-specific props (kept in one bag to keep editing generic)
  props: Record<string, number | string | boolean>;
  data: DataTable;
}

export interface Palette {
  id: string;
  name: string;
  colors: string[];
}

export interface CanvasSettings {
  width: number;
  height: number;
  background: string;
  transparent: boolean;
  direction: 'ltr' | 'rtl';
  duration: number;
  latinFont: string;
  arabicFont: string;
}

export interface Project {
  id: string;
  name: string;
  canvas: CanvasSettings;
  palette: Palette;
  elements: BaseElement[];
}

export interface Template {
  id: string;
  name: string;
  createdAt: number;
  thumbnail?: string;
  builtIn?: boolean;
  project: Project;
}

export interface CustomFont {
  family: string;
  dataUrl: string;
}
