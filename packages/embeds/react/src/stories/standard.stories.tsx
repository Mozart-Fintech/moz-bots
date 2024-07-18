import { Standard } from '..'
import { leadGenerationMozbot } from './assets/leadGenerationMozbot'

export const Default = () => {
  return (
    <div style={{ height: '500px' }}>
      <Standard
        mozbot={leadGenerationMozbot}
        apiHost="http://localhost:3001"
        isPreview
      />
    </div>
  )
}

export const StartWhenIntoView = () => {
  return (
    <>
      <div style={{ height: '300vh' }} />
      <Standard
        mozbot={leadGenerationMozbot}
        apiHost="http://localhost:3001"
        isPreview
        style={{ height: '300px' }}
      />
    </>
  )
}
