import test, { expect } from '@playwright/test'
import { createId } from '@paralleldrive/cuid2'
import { CollaborationType, Plan, WorkspaceRole } from '@mozbot.io/prisma'
import prisma from '@mozbot.io/lib/prisma'
import {
  createMozbots,
  injectFakeResults,
} from '@mozbot.io/playwright/databaseActions'
import { parseDefaultGroupWithBlock } from '@mozbot.io/playwright/databaseHelpers'
import { userId } from '@mozbot.io/playwright/databaseSetup'
import { createFolder } from '@/test/utils/databaseActions'
import { InputBlockType } from '@mozbot.io/schemas/features/blocks/inputs/constants'

test.describe('Mozbot owner', () => {
  test('Can invite collaborators', async ({ page }) => {
    const mozbotId = createId()
    const guestWorkspaceId = createId()
    await prisma.workspace.create({
      data: {
        id: guestWorkspaceId,
        name: 'Guest Workspace',
        plan: Plan.FREE,
        members: {
          createMany: {
            data: [{ role: WorkspaceRole.ADMIN, userId }],
          },
        },
      },
    })
    await createMozbots([
      {
        id: mozbotId,
        name: 'Guest mozbot',
        workspaceId: guestWorkspaceId,
        ...parseDefaultGroupWithBlock({
          type: InputBlockType.TEXT,
        }),
      },
    ])
    await page.goto(`/mozbots/${mozbotId}/edit`)
    await page.click('button[aria-label="Open share popover"]')
    await expect(page.locator('text=Free user')).toBeHidden()
    await page.fill(
      'input[placeholder="colleague@company.com"]',
      'guest@email.com'
    )
    await page.click('text=Can view')
    await page.click('text=Can edit')
    await page.click('text=Invite')
    await expect(page.locator('text=Pending')).toBeVisible()
    await expect(page.locator('text=Free user')).toBeHidden()
    await page.fill(
      'input[placeholder="colleague@company.com"]',
      'other-user@email.com'
    )
    await page.click('text=Can edit')
    await page.click('text=Can view')
    await page.click('text=Invite')
    await expect(page.locator('text=James Doe')).toBeVisible()
    await page.click('text="guest@email.com"')
    await page.click('text="Remove"')
    await expect(page.locator('text="guest@email.com"')).toBeHidden()
  })
})

test.describe('Guest with read access', () => {
  test('should have shared mozbots displayed', async ({ page }) => {
    const mozbotId = createId()
    const guestWorkspaceId = createId()
    await prisma.workspace.create({
      data: {
        id: guestWorkspaceId,
        name: 'Guest Workspace #2',
        plan: Plan.FREE,
        members: {
          createMany: {
            data: [{ role: WorkspaceRole.GUEST, userId }],
          },
        },
      },
    })
    await createMozbots([
      {
        id: mozbotId,
        name: 'Guest mozbot',
        workspaceId: guestWorkspaceId,
        ...parseDefaultGroupWithBlock({
          type: InputBlockType.TEXT,
        }),
      },
      {
        name: 'Another mozbot',
        workspaceId: guestWorkspaceId,
      },
    ])
    await prisma.collaboratorsOnMozbots.create({
      data: {
        mozbotId,
        userId,
        type: CollaborationType.READ,
      },
    })
    await createFolder(guestWorkspaceId, 'Guest folder')
    await injectFakeResults({ mozbotId, count: 10 })
    await page.goto(`/mozbots`)
    await page.click('text=Pro workspace')
    await page.click('text=Guest workspace #2')
    await expect(page.locator('text=Guest mozbot')).toBeVisible()
    await expect(page.locator('text=Another mozbot')).toBeHidden()
    await expect(page.locator('text=Guest folder')).toBeHidden()
    await page.click('text=Guest mozbot')
    await page.click('button[aria-label="Open share popover"]')
    await page.click('text=Everyone at Guest workspace')
    await expect(page.locator('text="Remove"')).toBeHidden()
    await expect(page.locator('text=John Doe')).toBeVisible()
    await page.click('text=Group #1', { force: true })
    await expect(page.locator('input[value="Group #1"]')).toBeHidden()
    await page.goto(`/mozbots/${mozbotId}/results`)
    await expect(page.locator('text="See logs" >> nth=9')).toBeVisible()
  })
})

test.describe('Guest with write access', () => {
  test('should have shared mozbots displayed', async ({ page }) => {
    const mozbotId = createId()
    const guestWorkspaceId = createId()
    await prisma.workspace.create({
      data: {
        id: guestWorkspaceId,
        name: 'Guest Workspace #3',
        plan: Plan.FREE,
        members: {
          createMany: {
            data: [{ role: WorkspaceRole.GUEST, userId }],
          },
        },
      },
    })
    await createMozbots([
      {
        id: mozbotId,
        name: 'Guest mozbot',
        workspaceId: guestWorkspaceId,
        ...parseDefaultGroupWithBlock({
          type: InputBlockType.TEXT,
        }),
      },
      {
        name: 'Another mozbot',
        workspaceId: guestWorkspaceId,
      },
    ])
    await prisma.collaboratorsOnMozbots.create({
      data: {
        mozbotId,
        userId,
        type: CollaborationType.WRITE,
      },
    })
    await createFolder(guestWorkspaceId, 'Guest folder')
    await page.goto(`/mozbots`)
    await page.click('text=Pro workspace')
    await page.click('text=Guest workspace #3')
    await expect(page.locator('text=Guest mozbot')).toBeVisible()
    await expect(page.locator('text=Another mozbot')).toBeHidden()
    await expect(page.locator('text=Guest folder')).toBeHidden()
    await page.click('text=Guest mozbot')
    await page.click('button[aria-label="Open share popover"]')
    await page.click('text=Everyone at Guest workspace')
    await expect(page.locator('text="Remove"')).toBeHidden()
    await expect(page.locator('text=John Doe')).toBeVisible()
    await page.click('text=Group #1', { force: true })
    await expect(page.getByText('Group #1')).toBeVisible()
  })
})

test.describe('Guest on public mozbot', () => {
  test('should have shared mozbots displayed', async ({ page }) => {
    const mozbotId = createId()
    const guestWorkspaceId = createId()
    await prisma.workspace.create({
      data: {
        id: guestWorkspaceId,
        name: 'Guest Workspace #4',
        plan: Plan.FREE,
      },
    })
    await createMozbots([
      {
        id: mozbotId,
        name: 'Guest mozbot',
        workspaceId: guestWorkspaceId,
        ...parseDefaultGroupWithBlock({
          type: InputBlockType.TEXT,
        }),
        settings: {
          publicShare: { isEnabled: true },
        },
      },
    ])
    await page.goto(`/mozbots/${mozbotId}/edit`)
    await expect(page.getByText('Guest mozbot')).toBeVisible()
    await expect(page.getByText('Duplicate')).toBeVisible()
    await expect(page.getByText('Group #1')).toBeVisible()
  })
})
