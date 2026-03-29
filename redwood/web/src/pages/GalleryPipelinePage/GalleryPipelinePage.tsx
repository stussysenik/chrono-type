// import { Link, routes } from '@redwoodjs/router'
import { Metadata } from '@redwoodjs/web'

const GalleryPipelinePage = () => {
  return (
    <>
      <Metadata title="GalleryPipeline" description="GalleryPipeline page" />

      <h1>GalleryPipelinePage</h1>
      <p>
        Find me in{' '}
        <code>./web/src/pages/GalleryPipelinePage/GalleryPipelinePage.tsx</code>
      </p>
      {/*
          My default route is named `galleryPipeline`, link to me with:
          `<Link to={routes.galleryPipeline()}>GalleryPipeline</Link>`
      */}
    </>
  )
}

export default GalleryPipelinePage
