# Motion Studio

A browser-based studio for making animated data visualizations, built for graphic and motion designers. You design charts on a canvas, animate them on a timeline, and export MP4, transparent WebM or PNG sequences at 1080p or 4K.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
```

Video export needs **WebCodecs**. Chrome and Edge support all formats, including WebM with alpha. Safari 16.4+ supports MP4 and WebM. Every browser can export PNG sequences.

## Features

| Area | What you get |
|---|---|
| **Elements** | Progress ring, number counter, vertical/horizontal/grouped bar chart, pie & donut, multi-series line/area chart, KPI card with sparkline and change badge, growth indicator, text |
| **Data** | Values edited in a table, multiple series, CSV/TSV paste from Excel or Sheets, and an "All data" sheet that edits every element's numbers in one place. Animations are generated from the data, so changing a number never needs re-animating |
| **Typography** | 10 Latin and 10 Arabic Google fonts, plus your own TTF/OTF/WOFF uploads (stored in IndexedDB). Each glyph falls back automatically: Latin text uses the Latin brand font and Arabic text uses the Arabic one |
| **RTL / LTR** | Switching direction mirrors bar order, axes, line direction, ring sweep, legends, alignment and growth arrows. Arabic-Indic digits (١٢٣) and ٪ can be set per element or globally |
| **Brand** | Editable brand palette with 1–12 colors. Colors can be *linked* to palette slots (`Brand 1…n`), so swapping the palette recolors everything. Palettes can be saved and reused |
| **Style** | Stroke width, rounded corners and caps, gradients, glow, grid, axis labels, tracks, legends, number prefix/suffix/decimals/compact (K/M/B) |
| **Animation** | Delay, duration, 14 easing presets plus a custom cubic-bézier with a curve preview, per-item stagger, and entrance effects (fade, slide, scale, blur) |
| **Canvas** | Size presets (16:9, 9:16, 1:1, 4:5, 4K, …) or custom dimensions, with optional layout rescaling. Solid or transparent background (checkerboard preview) |
| **Preview & timeline** | Real-time preview. Drag/resize with snapping to the canvas and other elements, title-safe guides, zoom. Timeline with scrubbing, frame stepping, loop, and clips you can drag or trim to change delay and duration |
| **Templates** | Save branded templates with thumbnails, then apply one with your own data, or apply only its design and keep your current data. Templates import/export as `.json`, and four starter templates are included (one is Arabic RTL) |
| **Export** | MP4 (H.264), WebM (VP9 with **alpha**), PNG sequence (RGBA; saved as a ZIP or written straight to a folder in Chromium), and looping animated GIF (480/720/1080 px, 12–25 fps, optional 1-bit transparency). 1080p / 4K / canvas size, 25/30/60 fps, three quality levels, and a single-frame PNG |
| **Workflow** | Undo/redo, autosave to localStorage, project files, keyboard shortcuts (Space, ⌘Z, ⌘D, ⌫, arrows, `,` `.`, Home/End, ⌘E export) |

## Architecture

```
src/
  render/renderer.ts   Pure, deterministic Canvas 2D renderer: renderProject(ctx, project, t, {scale})
  export/exporter.ts   Frame-by-frame offline export (Mediabunny + WebCodecs, gifenc for GIF, fflate for ZIP)
  store.ts             Zustand store: project, selection, playback, undo history, templates, palettes
  defaults.ts          Element factories, palettes, fonts, starter templates
  lib/                 Easing (incl. bézier solver), number formatting, colors, font loading
  components/          TopBar, LeftPanel (library + layers), Preview, Inspector, DataEditor, Timeline, dialogs
```

Every frame is a pure function of `(project, time)`. The preview and the exporter use the same renderer: the preview draws in real time, and the exporter renders each frame offline at the target resolution as vector graphics (so 4K output is sharp), then hands the frames to the hardware video encoder. Export output therefore matches the preview frame for frame, independent of machine speed.
