import { MongoClient } from 'mongodb';

let client = null;
let db = null;

export async function connectDb(uri) {
  if (!uri) return null;
  if (db) return db;
  client = new MongoClient(uri);
  await client.connect();
  db = client.db();
  return db;
}

export function getDb() {
  return db;
}

export async function closeDb() {
  if (client) await client.close();
  client = null;
  db = null;
}
