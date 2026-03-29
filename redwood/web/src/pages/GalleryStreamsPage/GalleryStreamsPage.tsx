// import { Link, routes } from '@redwoodjs/router'
import { Metadata } from '@redwoodjs/web'

const GalleryStreamsPage = () => {
  return (
    <>
      <Metadata title="GalleryStreams" description="GalleryStreams page" />

      <h1>GalleryStreamsPage</h1>
      <p>
        Find me in{' '}
        <code>./web/src/pages/GalleryStreamsPage/GalleryStreamsPage.tsx</code>
      </p>
      {/*
          My default route is named `galleryStreams`, link to me with:
          `<Link to={routes.galleryStreams()}>GalleryStreams</Link>`
      */}
    </>
  )
}

export default GalleryStreamsPage
