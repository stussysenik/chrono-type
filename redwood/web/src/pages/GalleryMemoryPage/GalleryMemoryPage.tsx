// import { Link, routes } from '@redwoodjs/router'
import { Metadata } from '@redwoodjs/web'

const GalleryMemoryPage = () => {
  return (
    <>
      <Metadata title="GalleryMemory" description="GalleryMemory page" />

      <h1>GalleryMemoryPage</h1>
      <p>
        Find me in{' '}
        <code>./web/src/pages/GalleryMemoryPage/GalleryMemoryPage.tsx</code>
      </p>
      {/*
          My default route is named `galleryMemory`, link to me with:
          `<Link to={routes.galleryMemory()}>GalleryMemory</Link>`
      */}
    </>
  )
}

export default GalleryMemoryPage
