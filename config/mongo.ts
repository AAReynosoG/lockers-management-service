import env from '#start/env'
import { MongoClient, ServerApiVersion } from 'mongodb'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const credentials = join(__dirname, 'mongo-certs', 'X509-cert-1532914571237800098.pem')

const mongoClient = new MongoClient(env.get('MONGODB_URI_SSL')!, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  tlsCertificateKeyFile: credentials,
  maxPoolSize: 10,
})

export default mongoClient
