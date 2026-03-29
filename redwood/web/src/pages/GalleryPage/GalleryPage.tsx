// import { Link, routes } from '@redwoodjs/router'
import { Metadata } from '@redwoodjs/web'

const GalleryPage = () => {
  return (
    <>
      <Metadata title="Gallery" description="Gallery page" />

      <h1>GalleryPage</h1>
      <p>
        Find me in <code>./web/src/pages/GalleryPage/GalleryPage.tsx</code>
      </p>
      {/*
          My default route is named `gallery`, link to me with:
          `<Link to={routes.gallery()}>Gallery</Link>`
      */}
    </>
  )
}

export default GalleryPage
