import test, { expect } from '@playwright/test'
import { createId } from '@paralleldrive/cuid2'
import { importMozbotInDatabase } from '@mozbot.io/playwright/databaseActions'
import { getTestAsset } from '@/test/utils/playwright'

test('should execute webhooks properly', async ({ page }) => {
  const mozbotId = createId()
  await importMozbotInDatabase(getTestAsset('mozbots/webhook.json'), {
    id: mozbotId,
    publicId: `${mozbotId}-public`,
  })
  await page.goto(`/${mozbotId}-public`)
  await page.locator('text=Send failing webhook').click()
  await page.locator('[placeholder="Type a name..."]').fill('John')
  await page.locator('text="Send"').click()
  await page.locator('[placeholder="Type an age..."]').fill('30')
  await page.locator('text="Send"').click()
  await page.locator('text="Male"').click()
  await expect(
    page.getByText('{"name":"John","age":25,"gender":"male"}')
  ).toBeVisible()
  await expect(
    page.getByText('{"name":"John","age":30,"gender":"Male"}')
  ).toBeVisible()
  await page.goto(`http://localhost:3000/mozbots/${mozbotId}/results`)
  await page.click('text="See logs"')
  await expect(
    page.locator('text="Webhook successfuly executed." >> nth=1')
  ).toBeVisible()
  await expect(page.locator('text="Webhook returned an error."')).toBeVisible()
})
