import { getTestAsset } from '@/test/utils/playwright'
import test, { expect } from '@playwright/test'
import { env } from '@mozbot.io/env'
import { importMozbotInDatabase } from '@mozbot.io/playwright/databaseActions'

const mozbotId = 'cl0ibhi7s0018n21aarlmg0cm'
const mozbotWithMergeDisabledId = 'cl0ibhi7s0018n21aarlag0cm'
const linkedmozbotId = 'cl0ibhv8d0130n21aw8doxhj5'

test.beforeAll(async () => {
  try {
    await importMozbotInDatabase(getTestAsset('mozbots/linkMozbots/1.json'), {
      id: mozbotId,
      publicId: `${mozbotId}-public`,
    })
    await importMozbotInDatabase(
      getTestAsset('mozbots/linkMozbots/1-merge-disabled.json'),
      {
        id: mozbotWithMergeDisabledId,
        publicId: `${mozbotWithMergeDisabledId}-public`,
      }
    )
    await importMozbotInDatabase(getTestAsset('mozbots/linkMozbots/2.json'), {
      id: linkedmozbotId,
      publicId: `${linkedmozbotId}-public`,
    })
  } catch (err) {
    console.error(err)
  }
})

test('should work as expected', async ({ page }) => {
  await page.goto(`/${mozbotId}-public`)
  await page.getByPlaceholder('Type your answer...').fill('Hello there!')
  await page.getByPlaceholder('Type your answer...').press('Enter')
  await expect(page.getByText('Cheers!')).toBeVisible()
  await page.goto(`${env.NEXTAUTH_URL}/mozbots/${mozbotId}/results`)
  await expect(page.locator('text=Hello there!')).toBeVisible()
})

test.describe('Merge disabled', () => {
  test('should work as expected', async ({ page }) => {
    await page.goto(`/${mozbotWithMergeDisabledId}-public`)
    await page.getByPlaceholder('Type your answer...').fill('Hello there!')
    await page.getByPlaceholder('Type your answer...').press('Enter')
    await expect(page.getByText('Cheers!')).toBeVisible()
    await page.goto(
      `${process.env.NEXTAUTH_URL}/mozbots/${mozbotWithMergeDisabledId}/results`
    )
    await expect(page.locator('text=Submitted at')).toBeVisible()
    await expect(page.locator('text=Hello there!')).toBeHidden()
    await page.goto(
      `${process.env.NEXTAUTH_URL}/mozbots/${linkedmozbotId}/results`
    )
    await expect(page.locator('text=Hello there!')).toBeVisible()
  })
})
