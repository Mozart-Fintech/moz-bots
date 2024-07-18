import test, { expect } from '@playwright/test'
import { createId } from '@paralleldrive/cuid2'
import {
  createMozbots,
  updateMozbot,
} from '@mozbot.io/playwright/databaseActions'
import { parseDefaultGroupWithBlock } from '@mozbot.io/playwright/databaseHelpers'
import { InputBlockType } from '@mozbot.io/schemas/features/blocks/inputs/constants'
import { Settings } from '@mozbot.io/schemas'
import { defaultTextInputOptions } from '@mozbot.io/schemas/features/blocks/inputs/text/constants'

test('Result should be overwritten on page refresh', async ({ page }) => {
  const mozbotId = createId()
  await createMozbots([
    {
      id: mozbotId,
      settings: {
        general: {
          rememberUser: {
            isEnabled: true,
            storage: 'session',
          },
        },
      },
      ...parseDefaultGroupWithBlock({
        type: InputBlockType.TEXT,
      }),
    },
  ])

  const [, response] = await Promise.all([
    page.goto(`/${mozbotId}-public`),
    page.waitForResponse(/startChat/),
  ])
  const { resultId } = await response.json()
  expect(resultId).toBeDefined()
  await expect(page.getByRole('textbox')).toBeVisible()

  const [, secondResponse] = await Promise.all([
    page.reload(),
    page.waitForResponse(/startChat/),
  ])
  const { resultId: secondResultId } = await secondResponse.json()
  expect(secondResultId).toBe(resultId)
})

test.describe('Create result on page refresh enabled', () => {
  test('should work', async ({ page }) => {
    const mozbotId = createId()
    await createMozbots([
      {
        id: mozbotId,
        ...parseDefaultGroupWithBlock({
          type: InputBlockType.TEXT,
        }),
      },
    ])
    const [, response] = await Promise.all([
      page.goto(`/${mozbotId}-public`),
      page.waitForResponse(/startChat/),
    ])
    const { resultId } = await response.json()
    expect(resultId).toBeDefined()

    await expect(page.getByRole('textbox')).toBeVisible()
    const [, secondResponse] = await Promise.all([
      page.reload(),
      page.waitForResponse(/startChat/),
    ])
    const { resultId: secondResultId } = await secondResponse.json()
    expect(secondResultId).not.toBe(resultId)
  })
})

test('Hide query params', async ({ page }) => {
  const mozbotId = createId()
  await createMozbots([
    {
      id: mozbotId,
      ...parseDefaultGroupWithBlock({
        type: InputBlockType.TEXT,
      }),
    },
  ])
  await page.goto(`/${mozbotId}-public?Name=John`)
  await page.waitForTimeout(1000)
  expect(page.url()).toEqual(`http://localhost:3001/${mozbotId}-public`)
  await updateMozbot({
    id: mozbotId,
    settings: {
      general: { isHideQueryParamsEnabled: false },
    },
  })
  await page.goto(`/${mozbotId}-public?Name=John`)
  await page.waitForTimeout(1000)
  expect(page.url()).toEqual(
    `http://localhost:3001/${mozbotId}-public?Name=John`
  )
})

test('Show close message', async ({ page }) => {
  const mozbotId = createId()
  await createMozbots([
    {
      id: mozbotId,
      ...parseDefaultGroupWithBlock({
        type: InputBlockType.TEXT,
      }),
      isClosed: true,
    },
  ])
  await page.goto(`/${mozbotId}-public`)
  await expect(page.locator('text=This bot is now closed')).toBeVisible()
})

test('Should correctly parse metadata', async ({ page }) => {
  const mozbotId = createId()
  const customMetadata: Settings['metadata'] = {
    description: 'My custom description',
    title: 'Custom title',
    favIconUrl: 'https://www.baptistearno.com/favicon.png',
    imageUrl: 'https://www.baptistearno.com/images/site-preview.png',
    customHeadCode: '<meta name="author" content="John Doe">',
  }
  await createMozbots([
    {
      id: mozbotId,
      settings: {
        metadata: customMetadata,
      },
      ...parseDefaultGroupWithBlock({
        type: InputBlockType.TEXT,
      }),
    },
  ])
  await page.goto(`/${mozbotId}-public`)
  expect(
    await page.evaluate(`document.querySelector('title').textContent`)
  ).toBe(customMetadata.title)
  expect(
    await page.evaluate(
      () =>
        (document.querySelector('meta[name="description"]') as HTMLMetaElement)
          .content
    )
  ).toBe(customMetadata.description)
  expect(
    await page.evaluate(
      () =>
        (document.querySelector('meta[property="og:image"]') as HTMLMetaElement)
          .content
    )
  ).toBe(customMetadata.imageUrl)
  expect(
    await page.evaluate(() =>
      (
        document.querySelector('link[rel="icon"]') as HTMLLinkElement
      ).getAttribute('href')
    )
  ).toBe(customMetadata.favIconUrl)
  await expect(
    page.locator(
      `input[placeholder="${defaultTextInputOptions.labels.placeholder}"]`
    )
  ).toBeVisible()
  expect(
    await page.evaluate(
      () =>
        (document.querySelector('meta[name="author"]') as HTMLMetaElement)
          .content
    )
  ).toBe('John Doe')
})
