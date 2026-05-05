import { Db, MongoClient } from "mongodb";
import { requireEnv } from "@/lib/env";

let clientPromise: Promise<MongoClient> | null = null;

function getMongoClient() {
  if (!clientPromise) {
    clientPromise = new MongoClient(requireEnv("MONGODB_URI")).connect();
  }

  return clientPromise;
}

export async function getMongoDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db();
}
