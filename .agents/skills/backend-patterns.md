# 🛠️ Skill: Backend Patterns & Arquitetura Serverless no FinPlan

Esta skill estabelece os padrões e convenções de backend adotados no **FinPlan**. Use estas diretrizes para criar novos endpoints, estender a persistência ou refatorar a camada de serviços.

---

## 1. Visão Geral da Camada Backend

No FinPlan, o backend é projetado como funções serverless leves e autossuficientes hospedadas na Vercel e executadas em Node.js:
- **Arquivo principal**: [`api/budget.ts`](file:///home/gildo-duarte/Documentos/Projects/fin-plan/api/budget.ts)
- **Emulação local**: Middleware em [`vite.config.ts`](file:///home/gildo-duarte/Documentos/Projects/fin-plan/vite.config.ts) que intercepta chamadas `/api/budget` e carrega o handler com `server.ssrLoadModule('/api/budget.ts')`.
- **Driver de banco de dados**: Driver oficial `mongodb` (v6.10.0), conectando-se diretamente ao cluster MongoDB Atlas.

---

## 2. Padrão de Conexão Singleton (MongoClient)

Para evitar esgotamento de sockets e conexões órfãs em ambientes serverless ou durante o Hot Module Replacement (HMR) no desenvolvimento local, a conexão com o MongoDB deve seguir o padrão singleton reutilizável:

```typescript
// Trecho real extraído de api/budget.ts:
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient> | undefined;

function getMongoClientPromise(uri: string): Promise<MongoClient> {
  const options = {
    serverSelectionTimeoutMS: 8000, // Timeout estrito para evitar travamento da função
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
```

### Regras de Conexão:
- Sempre configure `serverSelectionTimeoutMS` (usar 8000ms como padrão).
- Nunca execute `client.close()` dentro do handler serverless; a conexão deve permanecer no pool para atender as próximas requisições.
- Resolva o nome do banco via `process.env.MONGODB_DB_NAME || 'finplan'`.

---

## 3. Helper de Resposta Seguro (`reply`)

Em ambientes híbridos (onde a função pode ser chamada pelo runtime da Vercel ou pelo servidor HTTP nativo do Node/Vite), objetos `res` podem ter ou não os métodos `.status()` e `.json()`. Use sempre a função utilitária `reply`:

```typescript
// Trecho real extraído de api/budget.ts:
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
```

---

## 4. Tratamento de Corpo de Requisição em Streams

Em endpoints serverless Node.js, `req.body` pode chegar como objeto parsed, como string ou como uma Readable Stream bruta:

```typescript
// Trecho real extraído de api/budget.ts:
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
    body = null;
  }
}

if (!body || typeof body !== 'object') {
  return reply(res, 400, { error: 'Corpo da requisição inválido ou ausente.' });
}
```

---

## 5. Autenticação e Segurança de Endpoints

- **Autenticação opcional**: Se `process.env.API_SECRET_KEY` estiver configurada, valide o cabeçalho `x-api-key` ou `Authorization`:
```typescript
// Trecho real extraído de api/budget.ts:
const expectedApiKey = process.env.API_SECRET_KEY;
if (expectedApiKey) {
  const rawAuth = req.headers?.['x-api-key'] || req.headers?.authorization;
  const clientApiKey = typeof rawAuth === 'string' ? rawAuth.replace(/^Bearer\s+/i, '') : '';
  if (!clientApiKey || clientApiKey !== expectedApiKey) {
    return reply(res, 401, { error: 'Acesso não autorizado. Chave de API ausente ou inválida.' });
  }
}
```
- **CORS Preflight**: Responda status `200` imediatamente em requisições `OPTIONS`.
- **Métodos Não Suportados**: Responda `405` para verbos HTTP não implementados.
- **Variáveis Ausentes**: Responda `503` com mensagem orientativa clara caso `MONGODB_URI` não esteja definida.

---

## 6. Cliente Frontend Consumidor (`budgetApiService`)

No lado cliente, as requisições à API devem ser encapsuladas em [`src/services/budgetApiService.ts`](file:///home/gildo-duarte/Documentos/Projects/fin-plan/src/services/budgetApiService.ts) com:
1. **Controle Estrito de Timeout com AbortController**:
   - `fetchBudget`: 12 segundos.
   - `saveBudget`: 15 segundos.
2. **Injeção de Cabeçalhos de Autenticação**:
   - Lê `(import.meta as any).env?.VITE_API_SECRET_KEY` e adiciona `x-api-key` automaticamente.
3. **Mapeamento de Erros Amigáveis**:
   - Diferenciação de erros de timeout (`err.name === 'AbortError'`) de falhas de status HTTP ou de rede.
