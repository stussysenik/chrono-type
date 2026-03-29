import { render } from '@redwoodjs/testing/web'

import StatsPanel from './StatsPanel'

//   Improve this test with help from the Redwood Testing Doc:
//    https://redwoodjs.com/docs/testing#testing-components

describe('StatsPanel', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<StatsPanel />)
    }).not.toThrow()
  })
})
