// In this file, all Page components from 'src/pages` are auto-imported. Nested
// directories are supported, and should be uppercase. Each subdirectory will be
// prepended onto the component name.
//
// Examples:
//
// 'src/pages/HomePage/HomePage.js'         -> HomePage
// 'src/pages/Admin/BooksPage/BooksPage.js' -> AdminBooksPage

import { Router, Route } from '@redwoodjs/router'

const Routes = () => {
  return (
    <Router>
      <Route path="/gallery/stats" page={GalleryStatsPage} name="galleryStats" />
      <Route path="/gallery/streams" page={GalleryStreamsPage} name="galleryStreams" />
      <Route path="/gallery/heatmap" page={GalleryHeatmapPage} name="galleryHeatmap" />
      <Route path="/gallery/scatter" page={GalleryScatterPage} name="galleryScatter" />
      <Route path="/gallery/memory" page={GalleryMemoryPage} name="galleryMemory" />
      <Route path="/gallery/waveform" page={GalleryWaveformPage} name="galleryWaveform" />
      <Route path="/gallery/histogram" page={GalleryHistogramPage} name="galleryHistogram" />
      <Route path="/gallery/pipeline" page={GalleryPipelinePage} name="galleryPipeline" />
      <Route path="/gallery" page={GalleryPage} name="gallery" />
      <Route path="/history" page={HistoryPage} name="history" />
      <Route path="/leaderboard" page={LeaderboardPage} name="leaderboard" />
      <Route path="/session" page={SessionPage} name="session" />
      <Route path="/" page={HomePage} name="home" />
      <Route notfound page={NotFoundPage} />
    </Router>
  )
}

export default Routes
