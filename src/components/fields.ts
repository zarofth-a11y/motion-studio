import type { BaseElement, ElementType } from '../types';

export type FieldKind = 'num' | 'slider' | 'text' | 'textarea' | 'color' | 'select' | 'toggle' | 'segment';
export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  min?: number; max?: number; step?: number; suffix?: string;
  options?: { value: string; label: string }[];
  show?: (el: BaseElement) => boolean;
  data?: boolean; // appears in the Data tab
}

const align = [{ value: 'start', label: 'Start' }, { value: 'center', label: 'Center' }, { value: 'end', label: 'End' }];
const grid: FieldDef[] = [
  { key: 'showGrid', label: 'Grid lines', kind: 'toggle' },
  { key: 'gridLines', label: 'Grid count', kind: 'num', min: 1, max: 20, step: 1, show: (e) => !!e.props.showGrid },
  { key: 'axisLabels', label: 'Axis values', kind: 'toggle', show: (e) => !!e.props.showGrid },
  { key: 'maxValue', label: 'Max (0 = auto)', kind: 'num', min: 0, step: 1 },
];

export const FIELDS: Record<ElementType, FieldDef[]> = {
  ring: [
    { key: 'value', label: 'Value', kind: 'num', step: 1, data: true },
    { key: 'max', label: 'Max', kind: 'num', step: 1, min: 0.0001, data: true },
    { key: 'label', label: 'Label', kind: 'text', data: true },
    { key: 'color', label: 'Progress color', kind: 'color' },
    { key: 'gradient', label: 'Gradient', kind: 'toggle' },
    { key: 'color2', label: 'Gradient color', kind: 'color', show: (e) => !!e.props.gradient },
    { key: 'trackColor', label: 'Track color', kind: 'color' },
    { key: 'trackOpacity', label: 'Track opacity', kind: 'slider', min: 0, max: 1, step: 0.01 },
    { key: 'startAngle', label: 'Start angle', kind: 'slider', min: -180, max: 180, step: 1, suffix: '°' },
    { key: 'clockwise', label: 'Clockwise', kind: 'toggle' },
    { key: 'showValue', label: 'Show value', kind: 'toggle' },
    { key: 'showAsPercent', label: 'Value as %', kind: 'toggle', show: (e) => !!e.props.showValue },
    { key: 'glow', label: 'Glow', kind: 'toggle' },
  ],
  counter: [
    { key: 'from', label: 'From', kind: 'num', step: 1, data: true },
    { key: 'to', label: 'To', kind: 'num', step: 1, data: true },
    { key: 'label', label: 'Label', kind: 'text', data: true },
    { key: 'color', label: 'Number color', kind: 'color' },
    { key: 'align', label: 'Align', kind: 'segment', options: align },
    { key: 'labelPosition', label: 'Label', kind: 'segment', options: [{ value: 'above', label: 'Above' }, { value: 'below', label: 'Below' }] },
  ],
  bar: [
    { key: 'orientation', label: 'Orientation', kind: 'segment', options: [{ value: 'vertical', label: 'Vertical' }, { value: 'horizontal', label: 'Horizontal' }] },
    { key: 'gap', label: 'Bar spacing', kind: 'slider', min: 0, max: 0.9, step: 0.01 },
    { key: 'seriesGap', label: 'Series gap', kind: 'slider', min: 0, max: 0.5, step: 0.01, show: (e) => e.data.series.length > 1 },
    { key: 'showLabels', label: 'Category labels', kind: 'toggle' },
    { key: 'showValues', label: 'Value labels', kind: 'toggle' },
    { key: 'showTrack', label: 'Background track', kind: 'toggle' },
    { key: 'gradient', label: 'Gradient fill', kind: 'toggle' },
    ...grid,
  ],
  pie: [
    { key: 'centerLabel', label: 'Center label', kind: 'text', data: true },
    { key: 'inner', label: 'Inner radius', kind: 'slider', min: 0, max: 0.92, step: 0.01 },
    { key: 'padAngle', label: 'Slice gap', kind: 'slider', min: 0, max: 12, step: 0.1, suffix: '°' },
    { key: 'startAngle', label: 'Start angle', kind: 'slider', min: -180, max: 180, step: 1, suffix: '°' },
    { key: 'centerMode', label: 'Center value', kind: 'select', options: [{ value: 'total', label: 'Total' }, { value: 'first', label: 'First slice %' }, { value: 'none', label: 'None' }] },
    { key: 'showLegend', label: 'Legend', kind: 'toggle' },
    { key: 'legendPosition', label: 'Legend position', kind: 'segment', options: [{ value: 'side', label: 'Side' }, { value: 'bottom', label: 'Bottom' }], show: (e) => !!e.props.showLegend },
    { key: 'legendPercent', label: 'Legend shows %', kind: 'toggle', show: (e) => !!e.props.showLegend },
    { key: 'sliceLabels', label: 'Labels on slices', kind: 'toggle' },
    { key: 'popOut', label: 'Highlight first slice', kind: 'toggle' },
    { key: 'colorOffset', label: 'Palette offset', kind: 'num', min: 0, max: 20, step: 1 },
  ],
  line: [
    { key: 'smooth', label: 'Smooth curve', kind: 'toggle' },
    { key: 'showArea', label: 'Area fill', kind: 'toggle' },
    { key: 'areaOpacity', label: 'Area opacity', kind: 'slider', min: 0, max: 1, step: 0.01, show: (e) => !!e.props.showArea },
    { key: 'showDots', label: 'Points', kind: 'toggle' },
    { key: 'dotSize', label: 'Point size', kind: 'slider', min: 0.5, max: 4, step: 0.05, show: (e) => !!e.props.showDots },
    { key: 'dotFill', label: 'Point fill', kind: 'color', show: (e) => !!e.props.showDots },
    { key: 'showLabels', label: 'X labels', kind: 'toggle' },
    { key: 'showValues', label: 'End value', kind: 'toggle' },
    { key: 'startAtZero', label: 'Start at zero', kind: 'toggle' },
    { key: 'glow', label: 'Glow', kind: 'toggle' },
    ...grid,
  ],
  kpi: [
    { key: 'title', label: 'Title', kind: 'text', data: true },
    { key: 'value', label: 'Value', kind: 'num', step: 1, data: true },
    { key: 'delta', label: 'Change %', kind: 'num', step: 0.1, data: true },
    { key: 'deltaLabel', label: 'Change caption', kind: 'text', data: true },
    { key: 'accent', label: 'Accent', kind: 'color' },
    { key: 'showCard', label: 'Card background', kind: 'toggle' },
    { key: 'cardColor', label: 'Card color', kind: 'color', show: (e) => !!e.props.showCard },
    { key: 'cardOpacity', label: 'Card opacity', kind: 'slider', min: 0, max: 1, step: 0.01, show: (e) => !!e.props.showCard },
    { key: 'border', label: 'Hairline border', kind: 'toggle', show: (e) => !!e.props.showCard },
    { key: 'accentBar', label: 'Accent bar', kind: 'toggle', show: (e) => !!e.props.showCard },
    { key: 'showDelta', label: 'Change badge', kind: 'toggle' },
    { key: 'deltaDecimals', label: 'Change decimals', kind: 'num', min: 0, max: 3, step: 1, show: (e) => !!e.props.showDelta },
    { key: 'posColor', label: 'Positive', kind: 'color' },
    { key: 'negColor', label: 'Negative', kind: 'color' },
    { key: 'showSpark', label: 'Sparkline', kind: 'toggle' },
  ],
  growth: [
    { key: 'value', label: 'Change', kind: 'num', step: 0.1, data: true },
    { key: 'label', label: 'Caption', kind: 'text', data: true },
    { key: 'style', label: 'Style', kind: 'segment', options: [{ value: 'pill', label: 'Pill' }, { value: 'plain', label: 'Plain' }, { value: 'plain-white', label: 'Neutral' }] },
    { key: 'pillOpacity', label: 'Pill opacity', kind: 'slider', min: 0, max: 1, step: 0.01, show: (e) => e.props.style === 'pill' },
    { key: 'showArrow', label: 'Arrow', kind: 'toggle' },
    { key: 'showSign', label: '+ sign', kind: 'toggle' },
    { key: 'posColor', label: 'Positive', kind: 'color' },
    { key: 'negColor', label: 'Negative', kind: 'color' },
  ],
  text: [
    { key: 'text', label: 'Text', kind: 'textarea', data: true },
    { key: 'size', label: 'Font size', kind: 'num', min: 4, max: 600, step: 1, suffix: 'px' },
    { key: 'align', label: 'Align', kind: 'segment', options: align },
    { key: 'lineHeight', label: 'Line height', kind: 'slider', min: 0.7, max: 2.5, step: 0.01 },
    { key: 'tracking', label: 'Tracking', kind: 'slider', min: -0.1, max: 0.5, step: 0.005 },
    { key: 'reveal', label: 'Reveal', kind: 'segment', options: [{ value: 'lines', label: 'By line' }, { value: 'none', label: 'None' }] },
  ],
};

export const HAS_TABLE: Record<ElementType, boolean> = {
  ring: false, counter: false, bar: true, pie: true, line: true, kpi: true, growth: false, text: false,
};
export const MULTI_SERIES: Record<ElementType, boolean> = {
  ring: false, counter: false, bar: true, pie: false, line: true, kpi: false, growth: false, text: false,
};
export const STAGGERED: Record<ElementType, string | null> = {
  ring: null, counter: null, bar: 'Delay between bars', pie: 'Slice stagger (0 = sweep)', line: 'Delay between series', kpi: null, growth: null, text: 'Delay between lines',
};
