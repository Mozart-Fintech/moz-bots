import { Popup } from '../Popup'
import { open, toggle } from '@mozbot.io/js'
import { leadGenerationMozbot } from './assets/leadGenerationMozbot'

export const Default = () => {
  return (
    <>
      <button onClick={open}>Open modal</button>
      <button onClick={toggle}>Toggle modal</button>
      <Popup
        mozbot={leadGenerationMozbot}
        apiHost="http://localhost:3001"
        autoShowDelay={3000}
        theme={{
          width: '800px',
        }}
        isPreview
      />
    </>
  )
}
