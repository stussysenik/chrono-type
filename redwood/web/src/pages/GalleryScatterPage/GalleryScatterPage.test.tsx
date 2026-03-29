import { render } from '@redwoodjs/testing/web'

import GalleryScatterPage from './GalleryScatterPage'

//   Improve this test with help from the Redwood Testing Doc:
//   https://redwoodjs.com/docs/testing#testing-pages-layouts

describe('GalleryScatterPage', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<GalleryScatterPage />)
    }).not.toThrow()
  })
})
