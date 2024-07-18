import { render } from '@faire/mjml-react/utils/render'
import fs from 'fs'
import path from 'path'
import {
  AlmostReachedChatsLimitEmail,
  DefaultBotNotificationEmail,
  GuestInvitationEmail,
  WorkspaceMemberInvitation,
} from './emails'
import { MagicLinkEmail } from './emails/MagicLinkEmail'

const createDistFolder = () => {
  const dist = path.resolve(__dirname, 'dist')
  if (!fs.existsSync(dist)) {
    fs.mkdirSync(dist)
  }
}

const createHtmlFile = () => {
  fs.writeFileSync(
    path.resolve(__dirname, 'dist', 'guestInvitation.html'),
    render(
      <GuestInvitationEmail
        workspaceName={'Mozbot'}
        mozbotName={'Lead Generation'}
        url={'https://app.mozbot.io'}
        hostEmail={'host@mozbot.io'}
        guestEmail={'guest@mozbot.io'}
      />
    ).html
  )
  fs.writeFileSync(
    path.resolve(__dirname, 'dist', 'workspaceMemberInvitation.html'),
    render(
      <WorkspaceMemberInvitation
        workspaceName={'Mozbot'}
        url={'https://app.mozbot.io'}
        hostEmail={'host@mozbot.io'}
        guestEmail={'guest@mozbot.io'}
      />
    ).html
  )
  fs.writeFileSync(
    path.resolve(__dirname, 'dist', 'almostReachedChatsLimit.html'),
    render(
      <AlmostReachedChatsLimitEmail
        usagePercent={86}
        chatsLimit={2000}
        workspaceName="My Workspace"
      />
    ).html
  )
  fs.writeFileSync(
    path.resolve(__dirname, 'dist', 'defaultBotNotification.html'),
    render(
      <DefaultBotNotificationEmail
        resultsUrl={'https://app.mozbot.io'}
        answers={{
          'Group #1': 'Answer #1',
          Name: 'Baptiste',
          Email: 'baptiste.arnaud95@gmail.com',
        }}
      />
    ).html
  )
  fs.writeFileSync(
    path.resolve(__dirname, 'dist', 'magicLink.html'),
    render(<MagicLinkEmail url={'https://app.mozbot.io'} />).html
  )
}

createDistFolder()
createHtmlFile()
