// import { Link, routes } from '@redwoodjs/router'
import { Metadata } from '@redwoodjs/web'

const GalleryScatterPage = () => {
  return (
    <>
      <Metadata title="GalleryScatter" description="GalleryScatter page" />

      <h1>GalleryScatterPage</h1>
      <p>
        Find me in{' '}
        <code>./web/src/pages/GalleryScatterPage/GalleryScatterPage.tsx</code>
      </p>
      {/*
          My default route is named `galleryScatter`, link to me with:
          `<Link to={routes.galleryScatter()}>GalleryScatter</Link>`
      */}
    </>
  )
}

export default GalleryScatterPage
