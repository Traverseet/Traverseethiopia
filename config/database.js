const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

// MongoDB Connection URI from your env
const uri = process.env.MONGODB_URI;
const dbName = 'traverse_ethiopia';

// Create a MongoClient with proper settings
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  maxPoolSize: 10,
  minPoolSize: 2,
  connectTimeoutMS: 30000,
  socketTimeoutMS: 45000,
});

let db = null;
let isConnected = false;

/**
 * Connect to MongoDB Atlas
 */
async function connectDB() {
  if (isConnected && db) {
    console.log('✅ Using existing MongoDB connection');
    return db;
  }

  try {
    await client.connect();
    db = client.db(dbName);
    isConnected = true;
    console.log('✅ Successfully connected to MongoDB Atlas!');
    console.log(`📊 Database: ${dbName}`);
    
    // Test the connection
    await db.command({ ping: 1 });
    console.log('✅ Database ping successful');
    
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('💡 Please check your MONGODB_URI in .env file');
    throw error;
  }
}

/**
 * Get database instance (must be connected first)
 */
function getDB() {
  if (!db) {
    throw new Error('Database not connected. Call connectDB() first.');
  }
  return db;
}

/**
 * Get a specific collection
 */
function getCollection(collectionName) {
  const database = getDB();
  return database.collection(collectionName);
}

/**
 * Close database connection
 */
async function closeDB() {
  if (client) {
    await client.close();
    isConnected = false;
    db = null;
    console.log('🔌 MongoDB connection closed');
  }
}

// Export everything
module.exports = {
  connectDB,
  getDB,
  getCollection,
  closeDB,
  ObjectId,
  client,
};