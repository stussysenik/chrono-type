import type { Meta, StoryObj } from '@storybook/react'

import LeaderboardPage from './LeaderboardPage'

const meta: Meta<typeof LeaderboardPage> = {
  component: LeaderboardPage,
}

export default meta

type Story = StoryObj<typeof LeaderboardPage>

export const Primary: Story = {}
