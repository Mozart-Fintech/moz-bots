import test, { expect } from '@playwright/test'
import { importMozbotInDatabase } from '@mozbot.io/playwright/databaseActions'
import { createId } from '@paralleldrive/cuid2'
import { getTestAsset } from '@/test/utils/playwright'

const mozbotId = createId()

test.describe('Script block', () => {
  test('script should trigger', async ({ page }) => {
    await importMozbotInDatabase(getTestAsset('mozbots/logic/script.json'), {
      id: mozbotId,
    })

    await page.goto(`/mozbots/${mozbotId}/edit`)
    await page.click('text=Configure...')
    await page.fill(
      'div[role="textbox"]',
      'window.location.href = "https://www.google.com"'
    )

    await page.click('text=Test')
    await page.getByRole('button', { name: 'Trigger code' }).click()
    await expect(page).toHaveURL('https://www.google.com')
  })
})
