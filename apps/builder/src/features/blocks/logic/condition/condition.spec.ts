import test, { expect } from '@playwright/test'
import { importMozbotInDatabase } from '@mozbot.io/playwright/databaseActions'
import { createId } from '@paralleldrive/cuid2'
import { getTestAsset } from '@/test/utils/playwright'

const mozbotId = createId()

test.describe('Condition block', () => {
  test('its configuration should work', async ({ page }) => {
    await importMozbotInDatabase(getTestAsset('mozbots/logic/condition.json'), {
      id: mozbotId,
    })

    await page.goto(`/mozbots/${mozbotId}/edit`)
    await page.click('text=Configure... >> nth=0', { force: true })
    await page.fill(
      'input[placeholder="Search for a variable"] >> nth=-1',
      'Age'
    )
    await page.getByRole('menuitem', { name: 'Age' }).click()
    await page.click('button:has-text("Select an operator")')
    await page.click('button:has-text("Greater than")', { force: true })
    await page.fill('input[placeholder="Type a number..."]', '80')

    await page.click('button:has-text("Add comparison")')

    await page.fill(
      ':nth-match(input[placeholder="Search for a variable"], 2)',
      'Age'
    )
    await page.getByRole('menuitem', { name: 'Age' }).click()
    await page.click('button:has-text("Select an operator")')
    await page.click('button:has-text("Less than")', { force: true })
    await page.fill(
      ':nth-match(input[placeholder="Type a number..."], 2)',
      '100'
    )

    await page.click('text=Configure...', { force: true })
    await page.fill(
      'input[placeholder="Search for a variable"] >> nth=-1',
      'Age'
    )
    await page.getByRole('menuitem', { name: 'Age' }).click()
    await page.click('button:has-text("Select an operator")')
    await page.click('button:has-text("Greater than")', { force: true })
    await page.fill('input[placeholder="Type a number..."]', '20')

    await page.click('text=Test')
    await page
      .locator('mozbot-standard')
      .locator('input[placeholder="Type a number..."]')
      .fill('15')
    await page.locator('mozbot-standard').locator('text=Send').click()
    await expect(
      page.locator('mozbot-standard').getByText('You are younger than 20')
    ).toBeVisible()

    await page.click('text=Restart')
    await page
      .locator('mozbot-standard')
      .locator('input[placeholder="Type a number..."]')
      .fill('45')
    await page.locator('mozbot-standard').locator('text=Send').click()
    await expect(
      page.locator('mozbot-standard').getByText('You are older than 20')
    ).toBeVisible()

    await page.click('text=Restart')
    await page
      .locator('mozbot-standard')
      .locator('input[placeholder="Type a number..."]')
      .fill('90')
    await page.locator('mozbot-standard').locator('text=Send').click()
    await expect(
      page.locator('mozbot-standard').getByText('You are older than 80')
    ).toBeVisible()
  })
})
