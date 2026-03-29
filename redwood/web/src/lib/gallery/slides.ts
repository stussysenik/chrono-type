/**
 * Gallery Slides Configuration
 *
 * Central registry of all 8 ChronoType visualizations. Each slide defines
 * the route path, display metadata, and a factory function that creates
 * a fresh renderer instance. The factory pattern ensures each page (and
 * each thumbnail on the index page) gets its own isolated state.
 */

import {
  PipelineRenderer,
  GalleryHistogramRenderer,
  WaveformRenderer,
  MemoryRenderer,
  ScatterRenderer,
  HeatmapRenderer,
  StreamsRenderer,
  StatsRenderer,
} from './renderers'
import type { GalleryRenderer } from './base-renderer'

export interface SlideConfig {
  path: string
  title: string
  description: string
  createRenderer: () => GalleryRenderer
}

export const SLIDES: SlideConfig[] = [
  {
    path: '/gallery/pipeline',
    title: 'The Pipeline',
    description: 'Mechanical data flow — keydown to canvas',
    createRenderer: () => new PipelineRenderer(),
  },
  {
    path: '/gallery/histogram',
    title: 'The Histogram',
    description: 'Spring-physics latency distribution',
    createRenderer: () => new GalleryHistogramRenderer(),
  },
  {
    path: '/gallery/waveform',
    title: 'The Waveform',
    description: 'EKG heartbeat of your typing rhythm',
    createRenderer: () => new WaveformRenderer(),
  },
  {
    path: '/gallery/memory',
    title: 'The Memory',
    description: 'WASM linear memory — live hex matrix',
    createRenderer: () => new MemoryRenderer(),
  },
  {
    path: '/gallery/scatter',
    title: 'The Scatter',
    description: 'Particle cloud of keystroke timing',
    createRenderer: () => new ScatterRenderer(),
  },
  {
    path: '/gallery/heatmap',
    title: 'The Heatmap',
    description: 'LED spectrogram — rhythm over time',
    createRenderer: () => new HeatmapRenderer(),
  },
  {
    path: '/gallery/streams',
    title: 'The Streams',
    description: 'RxJS marble diagram — live reactive flow',
    createRenderer: () => new StreamsRenderer(),
  },
  {
    path: '/gallery/stats',
    title: 'The Stats',
    description: 'Odometer dashboard — your typing signature',
    createRenderer: () => new StatsRenderer(),
  },
]
