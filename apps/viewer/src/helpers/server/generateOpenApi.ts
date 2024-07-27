import { generateOpenApiDocument } from '@lilyrose2798/trpc-openapi'
import { writeFileSync } from 'fs'
import { appRouter } from './appRouter'

const openApiDocument = generateOpenApiDocument(appRouter, {
  title: 'Chat API',
  version: '3.0.0',
  baseUrl: 'https://mozbot.mozartfintech.com/api',
  docsUrl: 'https://mozdocs.mozartfintech.com/api-reference',
})

writeFileSync('./openapi/viewer.json', JSON.stringify(openApiDocument, null, 2))

process.exit()
