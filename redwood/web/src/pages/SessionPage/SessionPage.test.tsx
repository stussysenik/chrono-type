import { render } from '@redwoodjs/testing/web'

import SessionPage from './SessionPage'

//   Improve this test with help from the Redwood Testing Doc:
//   https://redwoodjs.com/docs/testing#testing-pages-layouts

describe('SessionPage', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<SessionPage />)
    }).not.toThrow()
  })
})
