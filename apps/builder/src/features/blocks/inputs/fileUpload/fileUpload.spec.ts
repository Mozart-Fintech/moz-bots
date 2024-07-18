import test, { expect } from '@playwright/test'
import { createMozbots } from '@mozbot.io/playwright/databaseActions'
import { parseDefaultGroupWithBlock } from '@mozbot.io/playwright/databaseHelpers'
import { createId } from '@paralleldrive/cuid2'
import { freeWorkspaceId } from '@mozbot.io/playwright/databaseSetup'
import { getTestAsset } from '@/test/utils/playwright'
import { InputBlockType } from '@mozbot.io/schemas/features/blocks/inputs/constants'

test.describe.configure({ mode: 'parallel' })

test('options should work', async ({ page }) => {
  const mozbotId = createId()
  await createMozbots([
    {
      id: mozbotId,
      ...parseDefaultGroupWithBlock({
        type: InputBlockType.FILE,
      }),
    },
  ])

  await page.goto(`/mozbots/${mozbotId}/edit`)

  await page.click('text=Test')
  await expect(page.locator(`text=Click to upload`)).toBeVisible()
  await expect(page.locator(`text="Skip"`)).toBeHidden()
  await page
    .locator(`input[type="file"]`)
    .setInputFiles([getTestAsset('avatar.jpg')])
  await expect(
    page.getByRole('img', { name: 'Attached image 1' })
  ).toBeVisible()
  await page.click('text="Collect file"')
  await page.click('text="Required?"')
  await page.click('text="Allow multiple files?"')
  await page.fill('div[contenteditable=true]', '<strong>Upload now!!</strong>')
  await page.click('text="Labels"')
  await page.fill('[value="Upload"]', 'Go')
  await page.fill('[value="Clear"]', 'Reset')
  await page.fill('[value="Skip"]', 'Pass')
  await page.click('text="Restart"')
  await expect(page.locator(`text="Pass"`)).toBeVisible()
  await expect(page.locator(`text="Upload now!!"`)).toBeVisible()
  await page
    .locator(`input[type="file"]`)
    .setInputFiles([
      getTestAsset('avatar.jpg'),
      getTestAsset('avatar.jpg'),
      getTestAsset('avatar.jpg'),
    ])
  await expect(page.getByRole('img', { name: 'avatar.jpg' })).toHaveCount(3)
  await page.locator('text="Go"').click()
  await expect(
    page.getByRole('img', { name: 'Attached image 1' })
  ).toBeVisible()
})

test.describe('Free workspace', () => {
  test("shouldn't be able to publish mozbot", async ({ page }) => {
    const mozbotId = createId()
    await createMozbots([
      {
        id: mozbotId,
        ...parseDefaultGroupWithBlock({
          type: InputBlockType.FILE,
        }),
        version: '6',
        workspaceId: freeWorkspaceId,
      },
    ])
    await page.goto(`/mozbots/${mozbotId}/edit`)
    await page.click('text="Collect file"')
    await page.click('text="Allow multiple files?"')
    await page.click('text="Publish"')
    await expect(
      page.locator(
        'text="You need to upgrade your plan in order to use file input blocks"'
      )
    ).toBeVisible()
  })
})
