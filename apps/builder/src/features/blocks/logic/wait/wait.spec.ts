import test, { expect } from '@playwright/test'
import { importMozbotInDatabase } from '@mozbot.io/playwright/databaseActions'
import { createId } from '@paralleldrive/cuid2'
import { getTestAsset } from '@/test/utils/playwright'

const mozbotId = createId()

test.describe('Wait block', () => {
  test('wait should trigger', async ({ page }) => {
    await importMozbotInDatabase(getTestAsset('mozbots/logic/wait.json'), {
      id: mozbotId,
    })

    await page.goto(`/mozbots/${mozbotId}/edit`)
    await page.click('text=Configure...')
    await page.getByRole('textbox', { name: 'Seconds to wait for:' }).fill('3')

    await page.click('text=Test')
    await page.getByRole('button', { name: 'Wait now' }).click()
    await page.waitForTimeout(1000)
    await expect(
      page.locator('mozbot-standard').locator('text="Hi there!"')
    ).toBeHidden()
    await page.waitForTimeout(3000)
    await expect(
      page.locator('mozbot-standard').locator('text="Hi there!"')
    ).toBeVisible()
  })
})
