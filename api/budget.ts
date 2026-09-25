import type { IncomingMessage, ServerResponse } from 'http';
import { getBudgetCollection } from './lib/mongodb';

const BUDGET_DOCUMENT_ID = 'default_budget';

interface ExtendedRequest extends IncomingMessage {
  body?: unknown;
  method?: string;
}

interface ExtendedResponse extends ServerResponse {
  status: (statusCode: number) => ExtendedResponse;
  json: (body: unknown) => ExtendedResponse;
}

export default async function handler(req: ExtendedRequest, res: ExtendedResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!process.env.MONGODB_URI) {
    return res.status(503).json({
      error: 'MONGODB_URI não configurada. Defina MONGODB_URI no seu .env.local ou nas variáveis da Vercel.',
    });
  }

  try {
    const collection = await getBudgetCollection();

    if (req.method === 'GET') {
      const doc = await collection.findOne({ _id: BUDGET_DOCUMENT_ID as any });

      if (!doc || !doc.data) {
        return res.status(200).json({ exists: false, data: null });
      }

      return res.status(200).json({
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
        const raw = Buffer.concat(buffers).toString();
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
        return res.status(400).json({ error: 'Corpo da requisição inválido ou ausente.' });
      }

      await collection.updateOne(
        { _id: BUDGET_DOCUMENT_ID as any },
        {
          $set: {
            data: body,
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );

      return res.status(200).json({
        success: true,
        message: 'Orçamento persistido no MongoDB Atlas com sucesso.',
        updatedAt: new Date(),
      });
    }

    return res.status(405).json({ error: `Método ${req.method} não suportado.` });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Erro interno do servidor';
    console.error('[API /api/budget] Erro:', err);
    return res.status(500).json({ error: errorMsg });
  }
}
