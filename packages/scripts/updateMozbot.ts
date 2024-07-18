import { PrismaClient } from '@mozbot.io/prisma'
import { promptAndSetEnvironment } from './utils'
import * as p from '@clack/prompts'

const updateMozbot = async () => {
  await promptAndSetEnvironment('production')

  const prisma = new PrismaClient()

  const mozbotId = await p.text({
    message: 'Mozbot ID?',
  })

  if (!mozbotId || p.isCancel(mozbotId)) process.exit()

  const mozbot = await prisma.mozbot.update({
    where: {
      id: mozbotId,
    },
    data: {
      riskLevel: -1,
    },
  })

  console.log(mozbot)
}

updateMozbot()
