import { registerWebComponents } from './register'
import { parseMozbot, injectMozbotInWindow } from './window'

registerWebComponents()

const mozbot = parseMozbot()

injectMozbotInWindow(mozbot)

export default mozbot
