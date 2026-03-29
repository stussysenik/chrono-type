// Pass props to your component by passing an `args` object to your story
//
// ```tsx
// export const Primary: Story = {
//  args: {
//    propName: propValue
//  }
// }
// ```
//
// See https://storybook.js.org/docs/7/writing-stories/args

import type { Meta, StoryObj } from '@storybook/react'

import Histogram from './Histogram'

const meta: Meta<typeof Histogram> = {
  component: Histogram,
  tags: ['autodocs'],
}

export default meta

type Story = StoryObj<typeof Histogram>

export const Primary: Story = {}
