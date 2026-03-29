// import { Link, routes } from '@redwoodjs/router'
import { Metadata } from '@redwoodjs/web'

const GalleryHeatmapPage = () => {
  return (
    <>
      <Metadata title="GalleryHeatmap" description="GalleryHeatmap page" />

      <h1>GalleryHeatmapPage</h1>
      <p>
        Find me in{' '}
        <code>./web/src/pages/GalleryHeatmapPage/GalleryHeatmapPage.tsx</code>
      </p>
      {/*
          My default route is named `galleryHeatmap`, link to me with:
          `<Link to={routes.galleryHeatmap()}>GalleryHeatmap</Link>`
      */}
    </>
  )
}

export default GalleryHeatmapPage
