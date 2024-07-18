import test, { expect } from '@playwright/test'
import { importMozbotInDatabase } from '@mozbot.io/playwright/databaseActions'
import { createId } from '@paralleldrive/cuid2'
import { getTestAsset } from '@/test/utils/playwright'

const mozbotId = createId()

test.describe('Redirect block', () => {
  test('its configuration should work', async ({ page, context }) => {
    await importMozbotInDatabase(getTestAsset('mozbots/logic/redirect.json'), {
      id: mozbotId,
    })

    await page.goto(`/mozbots/${mozbotId}/edit`)
    await page.click('text=Configure...')
    await page.fill('input[placeholder="Type a URL..."]', 'google.com')

    await page.click('text=Test')
    await page.locator('mozbot-standard').locator('text=Go to URL').click()
    await expect(page).toHaveURL('https://www.google.com')
    await page.goBack()

    await page.click('text=Redirect to google.com')
    await page.click('text=Open in new tab')

    await page.click('text=Test')
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      page.locator('mozbot-standard').locator('text=Go to URL').click(),
    ])
    await newPage.waitForLoadState()
    await expect(newPage).toHaveURL('https://www.google.com')
  })
})
