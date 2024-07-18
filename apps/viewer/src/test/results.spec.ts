import { getTestAsset } from '@/test/utils/playwright'
import test, { expect } from '@playwright/test'
import { createId } from '@paralleldrive/cuid2'
import { importMozbotInDatabase } from '@mozbot.io/playwright/databaseActions'
import { env } from '@mozbot.io/env'

test('Big groups should work as expected', async ({ page }) => {
  const mozbotId = createId()
  await importMozbotInDatabase(getTestAsset('mozbots/hugeGroup.json'), {
    id: mozbotId,
    publicId: `${mozbotId}-public`,
  })
  await page.goto(`/${mozbotId}-public`)
  await page.locator('input').fill('Baptiste')
  await page.locator('input').press('Enter')
  await page.locator('input').fill('26')
  await page.locator('input').press('Enter')
  await page.getByRole('button', { name: 'Yes' }).click()
  await page.goto(`${env.NEXTAUTH_URL}/mozbots/${mozbotId}/results`)
  await expect(page.locator('text="Baptiste"')).toBeVisible()
  await expect(page.locator('text="26"')).toBeVisible()
  await expect(page.locator('text="Yes"')).toBeVisible()
  await page.hover('tbody > tr')
  await page.click('button >> text="Open"')
  await expect(page.locator('text="Baptiste" >> nth=1')).toBeVisible()
  await expect(page.locator('text="26" >> nth=1')).toBeVisible()
  await expect(page.locator('text="Yes" >> nth=1')).toBeVisible()
})
