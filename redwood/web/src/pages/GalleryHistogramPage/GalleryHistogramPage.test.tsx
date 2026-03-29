import { render } from '@redwoodjs/testing/web'

import GalleryHistogramPage from './GalleryHistogramPage'

//   Improve this test with help from the Redwood Testing Doc:
//   https://redwoodjs.com/docs/testing#testing-pages-layouts

describe('GalleryHistogramPage', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<GalleryHistogramPage />)
    }).not.toThrow()
  })
})
