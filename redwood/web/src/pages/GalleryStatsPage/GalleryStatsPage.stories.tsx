import type { Meta, StoryObj } from '@storybook/react'

import GalleryStatsPage from './GalleryStatsPage'

const meta: Meta<typeof GalleryStatsPage> = {
  component: GalleryStatsPage,
}

export default meta

type Story = StoryObj<typeof GalleryStatsPage>

export const Primary: Story = {}
