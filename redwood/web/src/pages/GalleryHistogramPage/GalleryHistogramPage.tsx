// import { Link, routes } from '@redwoodjs/router'
import { Metadata } from '@redwoodjs/web'

const GalleryHistogramPage = () => {
  return (
    <>
      <Metadata title="GalleryHistogram" description="GalleryHistogram page" />

      <h1>GalleryHistogramPage</h1>
      <p>
        Find me in{' '}
        <code>
          ./web/src/pages/GalleryHistogramPage/GalleryHistogramPage.tsx
        </code>
      </p>
      {/*
          My default route is named `galleryHistogram`, link to me with:
          `<Link to={routes.galleryHistogram()}>GalleryHistogram</Link>`
      */}
    </>
  )
}

export default GalleryHistogramPage
