import test, { expect } from '@playwright/test'
import { importMozbotInDatabase } from '@mozbot.io/playwright/databaseActions'
import { createId } from '@paralleldrive/cuid2'
import { getTestAsset } from '@/test/utils/playwright'

test('should work as expected', async ({ page }) => {
  const mozbotId = createId()
  await importMozbotInDatabase(getTestAsset('mozbots/logic/jump.json'), {
    id: mozbotId,
  })

  await page.goto(`/mozbots/${mozbotId}/edit`)
  await page.getByText('Configure...').click()
  await page.getByPlaceholder('Select a group').click()
  await expect(page.getByRole('menuitem', { name: 'Group #2' })).toBeHidden()
  await page.getByRole('menuitem', { name: 'Group #1' }).click()
  await page.getByPlaceholder('Select a block').click()
  await page.getByRole('menuitem', { name: 'Block #2' }).click()
  await page.getByRole('button', { name: 'Test' }).click()
  await page.getByPlaceholder('Type your answer...').fill('Hi there!')
  await page.getByRole('button', { name: 'Send' }).click()
  await expect(
    page.locator('mozbot-standard').getByText('How are you?').nth(1)
  ).toBeVisible()
  await expect(
    page.locator('mozbot-standard').getByText('Hello this is a test!').nth(1)
  ).toBeHidden()
})
