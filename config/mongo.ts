import env from '#start/env'
import { MongoClient } from 'mongodb'

const mongoClient = new MongoClient(env.get('MONGODB_DG_VPC_URI')!, {
  maxPoolSize: 10,
})

export default mongoClient
