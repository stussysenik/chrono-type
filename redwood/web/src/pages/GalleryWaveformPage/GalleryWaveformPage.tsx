// import { Link, routes } from '@redwoodjs/router'
import { Metadata } from '@redwoodjs/web'

const GalleryWaveformPage = () => {
  return (
    <>
      <Metadata title="GalleryWaveform" description="GalleryWaveform page" />

      <h1>GalleryWaveformPage</h1>
      <p>
        Find me in{' '}
        <code>./web/src/pages/GalleryWaveformPage/GalleryWaveformPage.tsx</code>
      </p>
      {/*
          My default route is named `galleryWaveform`, link to me with:
          `<Link to={routes.galleryWaveform()}>GalleryWaveform</Link>`
      */}
    </>
  )
}

export default GalleryWaveformPage
