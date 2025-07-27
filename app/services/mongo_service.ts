import mongoClient from "#config/mongo";
import { SlackService } from '#services/slack_service'


let isConnected = false;

async function getConnection() { 
  if (!isConnected) {
    try {
      await mongoClient.connect();
      isConnected = true;
    } catch(error) {
      isConnected = false;
      await new SlackService().sendExceptionMessage(error, 500)
    }
  }

  return mongoClient
}

export async function getDb(dbName: string) {
  const client = await getConnection();
  return client.db(dbName);
}

export async function storeMongoLogs(insertMany: boolean, collectionName: string, data: any) {
  try {
    const db = await getDb('lockity_db');
    const collection = db.collection(collectionName);

    if (insertMany) {
      await collection.insertMany(data);
    } else {
      await collection.insertOne(data);
    }
  } catch (error) {
    await new SlackService().sendExceptionMessage(error, 500)
  }
}