import test, { expect } from '@playwright/test'
import { createId } from '@paralleldrive/cuid2'
import { importMozbotInDatabase } from '@mozbot.io/playwright/databaseActions'
import { getTestAsset } from './utils/playwright'

test('Transcript set variable should be correctly computed', async ({
  page,
}) => {
  const mozbotId = createId()
  await importMozbotInDatabase(getTestAsset('mozbots/transcript.json'), {
    id: mozbotId,
    publicId: `${mozbotId}-public`,
  })

  await page.goto(`/${mozbotId}-public`)
  await page.getByPlaceholder('Type your answer...').fill('hey')
  await page.getByLabel('Send').click()
  await page.getByPlaceholder('Type your answer...').fill('hey 2')
  await page.getByLabel('Send').click()
  await page.getByPlaceholder('Type your answer...').fill('hey 3')
  await page.getByLabel('Send').click()
  await expect(
    page.getByText('Assistant: "How are you? You said "')
  ).toBeVisible()
  await expect(
    page.getByText('Assistant: "How are you? You said hey"')
  ).toBeVisible()
  await expect(
    page.getByText('Assistant: "How are you? You said hey 2"')
  ).toBeVisible()
  await expect(page.getByText('User: "hey"')).toBeVisible()
  await expect(page.getByText('User: "hey 2"')).toBeVisible()
  await expect(page.getByText('User: "hey 3"')).toBeVisible()
})
