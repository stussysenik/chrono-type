import type { Meta, StoryObj } from '@storybook/react'

import SessionPage from './SessionPage'

const meta: Meta<typeof SessionPage> = {
  component: SessionPage,
}

export default meta

type Story = StoryObj<typeof SessionPage>

export const Primary: Story = {}
