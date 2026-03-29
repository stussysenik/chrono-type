import type { Meta, StoryObj } from '@storybook/react'

import GalleryHistogramPage from './GalleryHistogramPage'

const meta: Meta<typeof GalleryHistogramPage> = {
  component: GalleryHistogramPage,
}

export default meta

type Story = StoryObj<typeof GalleryHistogramPage>

export const Primary: Story = {}
