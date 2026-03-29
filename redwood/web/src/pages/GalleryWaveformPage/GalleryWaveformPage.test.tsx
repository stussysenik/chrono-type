import { render } from '@redwoodjs/testing/web'

import GalleryWaveformPage from './GalleryWaveformPage'

//   Improve this test with help from the Redwood Testing Doc:
//   https://redwoodjs.com/docs/testing#testing-pages-layouts

describe('GalleryWaveformPage', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<GalleryWaveformPage />)
    }).not.toThrow()
  })
})
