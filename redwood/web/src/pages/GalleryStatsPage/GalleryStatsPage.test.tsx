import { render } from '@redwoodjs/testing/web'

import GalleryStatsPage from './GalleryStatsPage'

//   Improve this test with help from the Redwood Testing Doc:
//   https://redwoodjs.com/docs/testing#testing-pages-layouts

describe('GalleryStatsPage', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<GalleryStatsPage />)
    }).not.toThrow()
  })
})
