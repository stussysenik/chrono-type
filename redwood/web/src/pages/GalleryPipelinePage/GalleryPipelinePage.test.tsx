import { render } from '@redwoodjs/testing/web'

import GalleryPipelinePage from './GalleryPipelinePage'

//   Improve this test with help from the Redwood Testing Doc:
//   https://redwoodjs.com/docs/testing#testing-pages-layouts

describe('GalleryPipelinePage', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<GalleryPipelinePage />)
    }).not.toThrow()
  })
})
