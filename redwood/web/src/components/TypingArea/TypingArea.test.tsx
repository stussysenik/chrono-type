import { render } from '@redwoodjs/testing/web'

import TypingArea from './TypingArea'

//   Improve this test with help from the Redwood Testing Doc:
//    https://redwoodjs.com/docs/testing#testing-components

describe('TypingArea', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<TypingArea />)
    }).not.toThrow()
  })
})
