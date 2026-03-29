import { render } from '@redwoodjs/testing/web'

import GalleryStreamsPage from './GalleryStreamsPage'

//   Improve this test with help from the Redwood Testing Doc:
//   https://redwoodjs.com/docs/testing#testing-pages-layouts

describe('GalleryStreamsPage', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<GalleryStreamsPage />)
    }).not.toThrow()
  })
})
