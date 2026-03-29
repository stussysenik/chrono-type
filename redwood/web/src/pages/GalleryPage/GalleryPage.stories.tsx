import type { Meta, StoryObj } from '@storybook/react'

import GalleryPage from './GalleryPage'

const meta: Meta<typeof GalleryPage> = {
  component: GalleryPage,
}

export default meta

type Story = StoryObj<typeof GalleryPage>

export const Primary: Story = {}
