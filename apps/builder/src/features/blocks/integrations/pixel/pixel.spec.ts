import test, { expect } from '@playwright/test'
import { createMozbots } from '@mozbot.io/playwright/databaseActions'
import { parseDefaultGroupWithBlock } from '@mozbot.io/playwright/databaseHelpers'
import { createId } from '@paralleldrive/cuid2'
import { IntegrationBlockType } from '@mozbot.io/schemas/features/blocks/integrations/constants'

test.describe('Pixel block', () => {
  test('its configuration should work', async ({ page }) => {
    const mozbotId = createId()
    await createMozbots([
      {
        id: mozbotId,
        ...parseDefaultGroupWithBlock({
          type: IntegrationBlockType.PIXEL,
        }),
      },
    ])

    await page.goto(`/mozbots/${mozbotId}/edit`)
    await page.click('text=Configure...')
    await page.getByPlaceholder('Pixel ID (e.g. "123456789")').fill('pixelid')
    await expect(page.getByText('Init Pixel')).toBeVisible()
    await page.getByText('Track event').click()
    await page.getByPlaceholder('Select event type').click()
    await page.getByRole('menuitem', { name: 'Lead' }).click()
    await expect(page.getByText('Track "Lead"')).toBeVisible()
    await page.getByRole('button', { name: 'Add parameter' }).click()
    await page.getByRole('button', { name: 'Select key' }).click()
    await page.getByRole('menuitem', { name: 'currency' }).click()
    await page.getByPlaceholder('Value').fill('USD')
    await page.getByRole('button', { name: 'Test' }).click()
    await expect(
      page.getByText('Pixel is not enabled in Preview mode').nth(1)
    ).toBeVisible()
  })
})
