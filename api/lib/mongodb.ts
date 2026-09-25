import { MongoClient, Collection, Document } from 'mongodb';

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient>;

export function getMongoClientPromise(): Promise<MongoClient> {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('Variável MONGODB_URI não configurada. Defina MONGODB_URI no seu .env.local ou na Vercel.');
  }

  const options = {
    serverSelectionTimeoutMS: 8000,
  };

  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      const client = new MongoClient(mongoUri, options);
      global._mongoClientPromise = client.connect();
    }
    return global._mongoClientPromise;
  } else {
    if (!clientPromise) {
      const client = new MongoClient(mongoUri, options);
      clientPromise = client.connect();
    }
    return clientPromise;
  }
}

export async function getBudgetCollection(): Promise<Collection<Document>> {
  const client = await getMongoClientPromise();
  const dbName = process.env.MONGODB_DB_NAME || 'finplan';
  const db = client.db(dbName);
  return db.collection('budgets');
}
