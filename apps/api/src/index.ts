import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import sensible from '@fastify/sensible'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { ZodError } from 'zod'
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { config } from './config.js'
import { fundRoutes } from './routes/funds.js'
import { distributionRoutes } from './routes/distributions.js'
import { investorRoutes } from './routes/investors.js'
import { settlementMonitorRoutes } from './routes/settlement-monitor.js'
import { startLedgerWatcher } from './services/ledger-watcher.js'

async function main() {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      transport:
        config.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
    },
  }).withTypeProvider<ZodTypeProvider>()

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  await app.register(cors, { origin: true, credentials: true })
  await app.register(sensible)

  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'StableHedge API',
        description:
          'Backend for the StableHedge Realty Platform. Maps 1:1 to the 3 Figma screens: Deal Distribution Dashboard, XRPL Settlement Monitor, Investor Statement.',
        version: '0.1.0',
      },
      servers: [{ url: `http://localhost:${config.PORT}`, description: 'Local dev' }],
      tags: [
        { name: 'funds', description: 'Fund metadata' },
        { name: 'distributions', description: 'Quarterly distribution lifecycle (Calculate / Submit XRPL Payment)' },
        { name: 'settlement-monitor', description: 'Treasury & investor balances + recent XRPL transactions' },
        { name: 'investors', description: 'Investor profiles and statements' },
      ],
    },
    transform: jsonSchemaTransform,
  })
  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: true },
  })

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof ZodError) {
      return reply.status(400).send({ error: 'ValidationError', issues: err.issues })
    }
    app.log.error(err)
    const e = err as { statusCode?: number; name?: string; message?: string }
    return reply.status(e.statusCode ?? 500).send({
      error: e.name ?? 'InternalError',
      message: e.message ?? 'Unknown error',
    })
  })

  app.get('/healthz', async () => ({ status: 'ok', network: config.XRPL_NETWORK }))

  await app.register(fundRoutes, { prefix: '/api/funds' })
  await app.register(distributionRoutes, { prefix: '/api/distributions' })
  await app.register(investorRoutes, { prefix: '/api/investors' })
  await app.register(settlementMonitorRoutes, { prefix: '/api/settlement-monitor' })

  await app.listen({ host: '0.0.0.0', port: config.PORT })

  void startLedgerWatcher().catch((err) => app.log.error(err, 'ledger-watcher start failed'))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
