import { MongoClient, type Collection, type Document } from 'mongodb';

const BUDGET_DOCUMENT_ID = 'default_budget';

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient> | undefined;

function getMongoClientPromise(uri: string): Promise<MongoClient> {
  const options = {
    serverSelectionTimeoutMS: 8000,
  };

  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      const client = new MongoClient(uri, options);
      global._mongoClientPromise = client.connect();
    }
    return global._mongoClientPromise;
  }

  if (!clientPromise) {
    const client = new MongoClient(uri, options);
    clientPromise = client.connect();
  }
  return clientPromise;
}

async function getBudgetCollection(uri: string): Promise<Collection<Document>> {
  const client = await getMongoClientPromise(uri);
  const dbName = process.env.MONGODB_DB_NAME || 'finplan';
  return client.db(dbName).collection('budgets');
}

function reply(res: any, status: number, data?: unknown) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return data !== undefined ? res.status(status).json(data) : res.status(status).end();
  }
  res.statusCode = status;
  if (data !== undefined) {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
  } else {
    res.end();
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return reply(res, 200);
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    return reply(res, 503, {
      error: 'MONGODB_URI não configurada nas variáveis de ambiente da Vercel. Adicione MONGODB_URI nas variáveis do projeto na Vercel (Project Settings -> Environment Variables).',
    });
  }

  try {
    const collection = await getBudgetCollection(mongoUri);

    if (req.method === 'GET') {
      const doc = await collection.findOne({ _id: BUDGET_DOCUMENT_ID as any });

      if (!doc || !doc.data) {
        return reply(res, 200, { exists: false, data: null });
      }

      return reply(res, 200, {
        exists: true,
        data: doc.data,
        updatedAt: doc.updatedAt,
      });
    }

    if (req.method === 'POST') {
      let body = req.body;

      if (!body) {
        const buffers: Buffer[] = [];
        for await (const chunk of req) {
          buffers.push(chunk as Buffer);
        }
        const raw = Buffer.concat(buffers).toString('utf-8');
        if (raw) {
          try {
            body = JSON.parse(raw);
          } catch {
            body = null;
          }
        }
      } else if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch {
        }
      }

      if (!body || typeof body !== 'object') {
        return reply(res, 400, { error: 'Corpo da requisição inválido ou ausente.' });
      }

      const now = new Date();
      await collection.updateOne(
        { _id: BUDGET_DOCUMENT_ID as any },
        {
          $set: {
            data: body,
            updatedAt: now,
          },
        },
        { upsert: true }
      );

      return reply(res, 200, {
        success: true,
        message: 'Orçamento persistido no MongoDB Atlas com sucesso.',
        updatedAt: now,
      });
    }

    return reply(res, 405, { error: `Método ${req.method} não suportado.` });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Erro interno do servidor';
    console.error('[API /api/budget] Erro:', err);
    return reply(res, 500, { error: errorMsg });
  }
}
