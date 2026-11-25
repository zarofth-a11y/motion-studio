import type { AnimSettings, BaseElement, ElementType, NumberFormat, Palette, Project, Template } from './types';
import { uid } from './lib/color';

export const BUILTIN_PALETTES: Palette[] = [
  { id: 'pal_aurora', name: 'Aurora', colors: ['#0a84ff', '#5e5ce6', '#bf5af2', '#64d2ff', '#30d158', '#ff9f0a'] },
  { id: 'pal_ember', name: 'Ember', colors: ['#ff6b35', '#f7c548', '#ff3864', '#ffb4a2', '#9b5de5', '#00bbf9'] },
  { id: 'pal_mint', name: 'Mint', colors: ['#2dd4bf', '#a3e635', '#38bdf8', '#facc15', '#f472b6', '#818cf8'] },
  { id: 'pal_mono', name: 'Mono', colors: ['#ffffff', '#c7c7cc', '#8e8e93', '#636366', '#48484a', '#3a3a3c'] },
  { id: 'pal_desert', name: 'Desert Gold', colors: ['#d4a373', '#e9c46a', '#2a9d8f', '#e76f51', '#264653', '#f4a261'] },
  { id: 'pal_corporate', name: 'Corporate', colors: ['#1e3a8a', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'] },
];

/** Google fonts available out of the box (loaded via index.html) */
export const LATIN_FONTS = ['Inter', 'Manrope', 'Montserrat', 'Poppins', 'DM Sans', 'Space Grotesk', 'Outfit', 'Sora', 'JetBrains Mono', 'Playfair Display'];
export const ARABIC_FONTS = ['IBM Plex Sans Arabic', 'Cairo', 'Tajawal', 'Almarai', 'Noto Kufi Arabic', 'Readex Pro', 'Rubik', 'Alexandria', 'El Messiri', 'Changa'];

export const defaultAnim = (o: Partial<AnimSettings> = {}): AnimSettings => ({
  delay: 0, duration: 1.6, easing: 'easeOutCubic', bezier: [0.22, 1, 0.36, 1], stagger: 0, entrance: 'fade', entranceDuration: 0.5, ...o,
});

export const defaultFormat = (o: Partial<NumberFormat> = {}): NumberFormat => ({
  decimals: 0, prefix: '', suffix: '', thousands: true, digits: 'latin', compact: false, ...o,
});

export const ELEMENT_META: Record<ElementType, { label: string; icon: string; hint: string }> = {
  ring: { label: 'Progress Ring', icon: 'ring', hint: 'Circular progress' },
  counter: { label: 'Counter', icon: 'counter', hint: 'Animated number' },
  bar: { label: 'Bar Chart', icon: 'bar', hint: 'Vertical / horizontal' },
  pie: { label: 'Pie / Donut', icon: 'pie', hint: 'Share of total' },
  line: { label: 'Line Chart', icon: 'line', hint: 'Trend over time' },
  kpi: { label: 'KPI Card', icon: 'kpi', hint: 'Stat with delta' },
  growth: { label: 'Growth', icon: 'growth', hint: 'Percentage change' },
  text: { label: 'Text', icon: 'text', hint: 'Titles & captions' },
};

function base(type: ElementType, o: Partial<BaseElement>): BaseElement {
  return {
    id: uid('el'), type, name: ELEMENT_META[type].label,
    x: 100, y: 100, w: 400, h: 400, rotation: 0, opacity: 1, visible: true, locked: false,
    anim: defaultAnim(), font: '', fontWeight: 700, textColor: '#ffffff', mutedColor: '#8e8e98',
    fontScale: 1, strokeWidth: 24, radius: 12, format: defaultFormat(), props: {},
    data: { labels: [], series: [] },
    ...o,
  };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

export function createElement(type: ElementType, cw = 1920, ch = 1080): BaseElement {
  const center = (w: number, h: number) => ({ x: Math.round((cw - w) / 2), y: Math.round((ch - h) / 2), w, h });
  switch (type) {
    case 'ring':
      return base('ring', {
        ...center(420, 420), strokeWidth: 34, radius: 1,
        format: defaultFormat({ suffix: '%' }),
        props: { value: 78, max: 100, label: 'Completion', startAngle: -90, clockwise: true, color: '$0', color2: '$1', trackColor: '#ffffff', trackOpacity: 0.1, showValue: true, showAsPercent: true, gradient: false, glow: false },
      });
    case 'counter':
      return base('counter', {
        ...center(720, 260), fontWeight: 800,
        format: defaultFormat({ suffix: '+' }),
        anim: defaultAnim({ duration: 2.2, easing: 'easeOutExpo' }),
        props: { from: 0, to: 12500, label: 'Active users', align: 'center', labelPosition: 'below', color: '#ffffff' },
      });
    case 'bar':
      return base('bar', {
        ...center(1100, 600), radius: 10, strokeWidth: 4,
        anim: defaultAnim({ duration: 1.2, stagger: 0.12, easing: 'easeOutBack' }),
        props: { orientation: 'vertical', gap: 0.4, seriesGap: 0.08, showLabels: true, showValues: true, showGrid: true, gridLines: 4, axisLabels: false, maxValue: 0, gradient: false, showTrack: false },
        data: { labels: MONTHS, series: [{ name: 'Revenue', color: '$0', values: [42, 58, 51, 73, 88, 96] }] },
      });
    case 'pie':
      return base('pie', {
        ...center(900, 520), radius: 0,
        format: defaultFormat(),
        anim: defaultAnim({ duration: 1.6, easing: 'easeInOutCubic' }),
        props: { inner: 0.62, padAngle: 2, startAngle: -90, showLegend: true, legendPosition: 'side', legendPercent: true, centerMode: 'total', centerLabel: 'Total', sliceLabels: false, popOut: false, colorOffset: 0 },
        data: { labels: ['Direct', 'Social', 'Search', 'Referral'], series: [{ name: 'Visits', color: '$0', values: [420, 310, 260, 120] }] },
      });
    case 'line':
      return base('line', {
        ...center(1200, 560), strokeWidth: 6,
        anim: defaultAnim({ duration: 2, stagger: 0.3, easing: 'easeInOutCubic' }),
        props: { smooth: true, showArea: true, areaOpacity: 0.32, showDots: true, dotSize: 1.4, dotFill: '#0b0b0f', showGrid: true, gridLines: 4, showLabels: true, showValues: true, axisLabels: false, startAtZero: true, maxValue: 0, glow: false },
        data: { labels: MONTHS, series: [{ name: '2025', color: '$0', values: [12, 19, 15, 28, 34, 46] }] },
      });
    case 'kpi':
      return base('kpi', {
        ...center(520, 340), radius: 28, strokeWidth: 6,
        format: defaultFormat({ prefix: '$', compact: true, decimals: 1 }),
        anim: defaultAnim({ duration: 1.8, easing: 'easeOutExpo', entrance: 'slideUp', entranceDuration: 0.7 }),
        props: { title: 'Monthly Revenue', value: 2480000, delta: 18.4, deltaDecimals: 1, deltaLabel: 'vs last month', showDelta: true, showSpark: true, showCard: true, cardColor: '#17171c', cardOpacity: 1, border: true, borderColor: '#ffffff', accent: '$0', accentBar: true, posColor: '#30d158', negColor: '#ff453a' },
        data: { labels: MONTHS, series: [{ name: 'Trend', color: '$0', values: [8, 11, 9, 14, 13, 19] }] },
      });
    case 'growth':
      return base('growth', {
        ...center(420, 150), radius: 999, fontWeight: 700,
        format: defaultFormat({ suffix: '%', decimals: 1 }),
        anim: defaultAnim({ duration: 1.4, easing: 'easeOutCubic', entrance: 'scale' }),
        props: { value: 24.5, label: '', style: 'pill', showArrow: true, showSign: true, posColor: '#30d158', negColor: '#ff453a', pillOpacity: 0.16 },
      });
    case 'text':
      return base('text', {
        ...center(1200, 140), fontWeight: 700,
        anim: defaultAnim({ duration: 0.8, stagger: 0.12, entrance: 'none' }),
        props: { text: 'Quarterly Performance', size: 72, align: 'center', lineHeight: 1.15, tracking: -0.01, reveal: 'lines' },
      });
  }
}

export function createProject(name = 'Untitled'): Project {
  return {
    id: uid('prj'), name,
    canvas: { width: 1920, height: 1080, background: '#0b0b0f', transparent: false, direction: 'ltr', duration: 5, latinFont: 'Inter', arabicFont: 'IBM Plex Sans Arabic' },
    palette: { ...BUILTIN_PALETTES[0], colors: [...BUILTIN_PALETTES[0].colors] },
    elements: [],
  };
}

type Over = Omit<Partial<BaseElement>, 'anim' | 'format'> & { anim?: Partial<AnimSettings>; format?: Partial<NumberFormat> };

function place<T extends BaseElement>(el: T, o: Over): T {
  return { ...el, ...o, anim: { ...el.anim, ...(o.anim ?? {}) }, props: { ...el.props, ...(o.props ?? {}) }, format: { ...el.format, ...(o.format ?? {}) } } as T;
}

export function builtinTemplates(): Template[] {
  // 1 — Executive dashboard (LTR)
  const p1 = createProject('Executive Dashboard');
  p1.elements = [
    place(createElement('text'), { name: 'Title', x: 120, y: 80, w: 1100, h: 110, props: { text: 'Q3 Performance Overview', align: 'start', size: 68 } }),
    place(createElement('text'), { name: 'Subtitle', x: 120, y: 170, w: 1100, h: 60, fontWeight: 500, textColor: '#8e8e98', anim: { delay: 0.15 }, props: { text: 'All figures in USD · Updated weekly', align: 'start', size: 30 } }),
    place(createElement('kpi'), { name: 'Revenue', x: 120, y: 290, w: 520, h: 320, anim: { delay: 0.3 } }),
    place(createElement('kpi'), { name: 'Customers', x: 700, y: 290, w: 520, h: 320, anim: { delay: 0.45 }, format: { prefix: '', compact: true, decimals: 1 }, props: { title: 'Active Customers', value: 84200, delta: 6.2, accent: '$1' }, data: { labels: MONTHS, series: [{ name: 't', color: '$1', values: [3, 4, 6, 5, 8, 9] }] } }),
    place(createElement('ring'), { name: 'Target', x: 1340, y: 290, w: 460, h: 460, anim: { delay: 0.6 }, props: { value: 86, label: 'Annual target' } }),
    place(createElement('bar'), { name: 'Monthly', x: 120, y: 660, w: 1100, h: 360, anim: { delay: 0.8 } }),
    place(createElement('growth'), { name: 'Growth', x: 1360, y: 820, w: 420, h: 140, anim: { delay: 1.4 } }),
  ];
  p1.canvas.duration = 5;

  // 2 — Arabic report (RTL)
  const p2 = createProject('تقرير الأداء');
  p2.canvas.direction = 'rtl';
  p2.canvas.arabicFont = 'Cairo';
  p2.palette = { ...BUILTIN_PALETTES[4], colors: [...BUILTIN_PALETTES[4].colors] };
  p2.canvas.background = '#0f1412';
  const ar = { digits: 'arabic' as const };
  p2.elements = [
    place(createElement('text'), { name: 'العنوان', x: 120, y: 70, w: 1680, h: 120, props: { text: 'تقرير الأداء السنوي ٢٠٢٦', align: 'start', size: 76 } }),
    place(createElement('counter'), { name: 'المستخدمون', x: 1180, y: 250, w: 620, h: 240, anim: { delay: 0.3 }, format: { ...ar, suffix: '+' }, props: { to: 125000, label: 'مستخدم نشط', align: 'start' } }),
    place(createElement('counter'), { name: 'الإيرادات', x: 520, y: 250, w: 620, h: 240, anim: { delay: 0.45 }, format: { ...ar, suffix: ' مليون', decimals: 1 }, props: { to: 48.6, label: 'ريال سعودي', align: 'start', color: '$0' } }),
    place(createElement('line'), { name: 'النمو', x: 120, y: 540, w: 1060, h: 460, anim: { delay: 0.7 }, format: ar, data: { labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'], series: [{ name: 'المبيعات', color: '$0', values: [14, 22, 19, 31, 38, 52] }] } }),
    place(createElement('pie'), { name: 'الحصص', x: 1240, y: 560, w: 560, h: 420, anim: { delay: 0.9 }, format: ar, props: { centerLabel: 'الإجمالي', showLegend: false }, data: { labels: ['مباشر', 'اجتماعي', 'بحث'], series: [{ name: 'زيارات', color: '$0', values: [45, 35, 20] }] } }),
  ];
  p2.canvas.duration = 5;

  // 3 — Social stat (square, transparent)
  const p3 = createProject('Social Stat 1:1');
  p3.canvas.width = 1080; p3.canvas.height = 1080;
  p3.canvas.transparent = true;
  p3.palette = { ...BUILTIN_PALETTES[1], colors: [...BUILTIN_PALETTES[1].colors] };
  p3.elements = [
    place(createElement('ring', 1080, 1080), { name: 'Ring', x: 240, y: 150, w: 600, h: 600, strokeWidth: 46, props: { value: 92, label: 'Satisfaction', gradient: true, glow: true } }),
    place(createElement('text', 1080, 1080), { name: 'Caption', x: 90, y: 810, w: 900, h: 120, anim: { delay: 1.2 }, props: { text: 'of customers recommend us', size: 54 } }),
  ];
  p3.canvas.duration = 4;

  // 4 — Horizontal ranking
  const p4 = createProject('Ranking Bars');
  p4.palette = { ...BUILTIN_PALETTES[2], colors: [...BUILTIN_PALETTES[2].colors] };
  p4.elements = [
    place(createElement('text'), { name: 'Title', x: 160, y: 90, w: 1600, h: 110, props: { text: 'Top Markets by Revenue', size: 66, align: 'start' } }),
    place(createElement('bar'), {
      name: 'Ranking', x: 160, y: 240, w: 1600, h: 760, radius: 999, anim: { delay: 0.3, stagger: 0.15, easing: 'easeOutQuart', duration: 1.4 },
      format: { prefix: '$', suffix: 'M', decimals: 1 },
      props: { orientation: 'horizontal', gap: 0.45, showGrid: false, showTrack: true },
      data: { labels: ['United States', 'Saudi Arabia', 'Germany', 'Japan', 'Brazil', 'India'], series: [{ name: 'Revenue', color: '$0', values: [48.2, 39.5, 31.1, 26.8, 18.4, 12.9] }] },
    }),
  ];

  const mk = (p: Project): Template => ({ id: 'tpl_' + p.id, name: p.name, createdAt: 0, builtIn: true, project: p });
  return [mk(p1), mk(p2), mk(p3), mk(p4)];
}
