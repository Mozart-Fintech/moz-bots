import { getTestAsset } from '@/test/utils/playwright'
import test, { expect } from '@playwright/test'
import { createId } from '@paralleldrive/cuid2'
import { importMozbotInDatabase } from '@mozbot.io/playwright/databaseActions'

test('should correctly be injected', async ({ page }) => {
  const mozbotId = createId()
  await importMozbotInDatabase(
    getTestAsset('mozbots/predefinedVariables.json'),
    { id: mozbotId, publicId: `${mozbotId}-public` }
  )
  await page.goto(`/${mozbotId}-public`)
  await expect(page.locator('text="Your name is"')).toBeVisible()
  await page.goto(`/${mozbotId}-public?Name=Baptiste&Email=email@test.com`)
  await expect(page.locator('text="Baptiste"')).toBeVisible()
  await expect(page.getByPlaceholder('Type your email...')).toHaveValue(
    'email@test.com'
  )
})
