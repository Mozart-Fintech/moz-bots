import { PrismaClient } from '@mozbot.io/prisma'
import { promptAndSetEnvironment } from './utils'
import * as p from '@clack/prompts'
import { isCancel } from '@clack/prompts'

const inspectMozbot = async () => {
  await promptAndSetEnvironment('production')

  const type = await p.select<any, 'id' | 'publicId'>({
    message: 'Select way',
    options: [
      { label: 'ID', value: 'id' },
      { label: 'Public ID', value: 'publicId' },
    ],
  })

  if (!type || isCancel(type)) process.exit()

  const val = await p.text({
    message: 'Enter value',
  })

  if (!val || isCancel(val)) process.exit()

  const prisma = new PrismaClient({
    log: [{ emit: 'event', level: 'query' }, 'info', 'warn', 'error'],
  })

  const mozbot = await prisma.mozbot.findFirst({
    where: {
      [type]: val,
    },
    select: {
      id: true,
      name: true,
      riskLevel: true,
      publicId: true,
      customDomain: true,
      createdAt: true,
      isArchived: true,
      isClosed: true,
      publishedMozbot: {
        select: {
          id: true,
        },
      },
      workspace: {
        select: {
          id: true,
          name: true,
          plan: true,
          isPastDue: true,
          isSuspended: true,
          members: {
            select: {
              role: true,
              user: {
                select: {
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!mozbot) {
    console.log('Mozbot not found')
    return
  }

  console.log(`https://app.mozbot.io/mozbots/${mozbot.id}/edit`)

  console.log(JSON.stringify(mozbot, null, 2))
}

inspectMozbot()
