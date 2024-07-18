import test from '@playwright/test'
import { createMozbots } from '@mozbot.io/playwright/databaseActions'
import { parseDefaultGroupWithBlock } from '@mozbot.io/playwright/databaseHelpers'
import { createId } from '@paralleldrive/cuid2'
import { IntegrationBlockType } from '@mozbot.io/schemas/features/blocks/integrations/constants'

test.describe('Google Analytics block', () => {
  test('its configuration should work', async ({ page }) => {
    const mozbotId = createId()
    await createMozbots([
      {
        id: mozbotId,
        ...parseDefaultGroupWithBlock({
          type: IntegrationBlockType.GOOGLE_ANALYTICS,
        }),
      },
    ])

    await page.goto(`/mozbots/${mozbotId}/edit`)
    await page.click('text=Configure...')
    await page.fill('input[placeholder="G-123456..."]', 'G-VWX9WG1TNS')
    await page.fill('input[placeholder="Example: conversion"]', 'conversion')
    await page.click('text=Advanced')
    await page.fill('input[placeholder="Example: Mozbot"]', 'Mozbot')
    await page.fill('input[placeholder="Example: Campaign Z"]', 'Campaign Z')
    await page.fill('input[placeholder="Example: 0"]', '0')
  })
})
