import { render } from '@redwoodjs/testing/web'

import Histogram from './Histogram'

//   Improve this test with help from the Redwood Testing Doc:
//    https://redwoodjs.com/docs/testing#testing-components

describe('Histogram', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<Histogram />)
    }).not.toThrow()
  })
})
