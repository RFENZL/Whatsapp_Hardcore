// Simple MongoDB initialization script
const { MongoClient } = require('mongodb');
const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/whatsapp_prod';
const client = new MongoClient(uri);

async function main() {
  await client.connect();
  const db = client.db();
  // Create collections if needed
  await db.createCollection('users');
  await db.createCollection('messages');
  await db.createCollection('groups');
  await db.createCollection('conversations');
  await db.createCollection('notifications');
  console.log('Collections created.');
  await client.close();
}
main().catch(console.error);
