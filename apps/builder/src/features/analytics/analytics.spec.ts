import { getTestAsset } from '@/test/utils/playwright'
import test, { expect } from '@playwright/test'
import { createId } from '@paralleldrive/cuid2'
import {
  importMozbotInDatabase,
  injectFakeResults,
} from '@mozbot.io/playwright/databaseActions'
import { starterWorkspaceId } from '@mozbot.io/playwright/databaseSetup'

test('analytics are not available for non-pro workspaces', async ({ page }) => {
  const mozbotId = createId()
  await importMozbotInDatabase(
    getTestAsset('mozbots/results/submissionHeader.json'),
    {
      id: mozbotId,
      workspaceId: starterWorkspaceId,
    }
  )
  await injectFakeResults({ mozbotId, count: 10 })
  await page.goto(`/mozbots/${mozbotId}/results/analytics`)
  const firstDropoffBox = page.locator('text="%" >> nth=0')
  await firstDropoffBox.hover()
  await expect(
    page.locator('text="Upgrade your plan to PRO to reveal drop-off rate."')
  ).toBeVisible()
  await firstDropoffBox.click()
  await expect(
    page.locator(
      'text="You need to upgrade your plan in order to unlock in-depth analytics"'
    )
  ).toBeVisible()
})
