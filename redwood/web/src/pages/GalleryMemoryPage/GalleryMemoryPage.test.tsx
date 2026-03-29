import { render } from '@redwoodjs/testing/web'

import GalleryMemoryPage from './GalleryMemoryPage'

//   Improve this test with help from the Redwood Testing Doc:
//   https://redwoodjs.com/docs/testing#testing-pages-layouts

describe('GalleryMemoryPage', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<GalleryMemoryPage />)
    }).not.toThrow()
  })
})
