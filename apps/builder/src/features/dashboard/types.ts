import { Mozbot } from '@mozbot.io/schemas'

export type MozbotInDashboard = Pick<Mozbot, 'id' | 'name' | 'icon'> & {
  publishedmozbotId?: string
}
