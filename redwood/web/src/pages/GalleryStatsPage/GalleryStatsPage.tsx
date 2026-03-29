// import { Link, routes } from '@redwoodjs/router'
import { Metadata } from '@redwoodjs/web'

const GalleryStatsPage = () => {
  return (
    <>
      <Metadata title="GalleryStats" description="GalleryStats page" />

      <h1>GalleryStatsPage</h1>
      <p>
        Find me in{' '}
        <code>./web/src/pages/GalleryStatsPage/GalleryStatsPage.tsx</code>
      </p>
      {/*
          My default route is named `galleryStats`, link to me with:
          `<Link to={routes.galleryStats()}>GalleryStats</Link>`
      */}
    </>
  )
}

export default GalleryStatsPage
