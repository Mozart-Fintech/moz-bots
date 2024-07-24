import test, { expect } from '@playwright/test'
import { importMozbotInDatabase } from '@mozbot.io/playwright/databaseActions'
import { createId } from '@paralleldrive/cuid2'
import { getTestAsset } from '@/test/utils/playwright'

test('should be configurable', async ({ page }) => {
  const mozbotId = createId()
  const linkedmozbotId = createId()
  await importMozbotInDatabase(
    getTestAsset('mozbots/logic/linkMozbots/1.json'),
    { id: mozbotId, name: 'My link mozbot 1' }
  )
  await importMozbotInDatabase(
    getTestAsset('mozbots/logic/linkMozbots/2.json'),
    { id: linkedmozbotId, name: 'My link mozbot 2' }
  )

  await page.goto(`/mozbots/${mozbotId}/edit`)
  await page.click('text=Configure...')
  await page.click('input[placeholder="Select a mozbot"]')
  await page.click('text=My link mozbot 2')
  await expect(page.locator('input[value="My link mozbot 2"]')).toBeVisible()
  await expect(page.getByText('Jump in My link mozbot 2')).toBeVisible()
  await page.click('[aria-label="Navigate to mozbot"]')
  await expect(page).toHaveURL(
    `/mozbots/${linkedmozbotId}/edit?parentId=${mozbotId}`
  )
  await page.waitForTimeout(500)
  await page.click('[aria-label="Navigate back"]')
  await expect(page).toHaveURL(`/mozbots/${mozbotId}/edit`)
  await page.click('text=Jump in My link mozbot 2')
  await expect(page.getByTestId('selected-item-label').first()).toHaveText(
    'My link mozbot 2'
  )
  await page.click('input[placeholder="Select a group"]')
  await page.click('text=Group #2')

  await page.click('text=Test')
  await expect(
    page.locator('mozbot-standard').locator('text=Second block')
  ).toBeVisible()

  await page.click('[aria-label="Close"]')
  await page.click('text=Jump to Group #2 in My link mozbot 2')
  await page.getByTestId('selected-item-label').nth(1).click({ force: true })
  await page.getByLabel('Clear').click()

  await page.click('text=Test')
  await page.getByPlaceholder('Type your answer...').fill('Hello there!')
  await page.getByPlaceholder('Type your answer...').press('Enter')
  await expect(
    page.locator('mozbot-standard').locator('text=Hello there!')
  ).toBeVisible()

  await page.click('[aria-label="Close"]')
  await page.click('text=Jump in My link mozbot 2')
  await page.waitForTimeout(1000)
  await page.getByTestId('selected-item-label').first().click({ force: true })
  await page.click('button >> text=Current mozbot')
  await page.getByRole('textbox').nth(1).click()
  await page.click('button >> text=Hello')

  await page.click('text=Test')
  await expect(
    page.locator('mozbot-standard').locator('text=Hello world')
  ).toBeVisible()
})