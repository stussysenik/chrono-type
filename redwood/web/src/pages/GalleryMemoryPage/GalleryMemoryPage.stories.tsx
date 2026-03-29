import type { Meta, StoryObj } from '@storybook/react'

import GalleryMemoryPage from './GalleryMemoryPage'

const meta: Meta<typeof GalleryMemoryPage> = {
  component: GalleryMemoryPage,
}

export default meta

type Story = StoryObj<typeof GalleryMemoryPage>

export const Primary: Story = {}
