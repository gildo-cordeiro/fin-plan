# 🛠️ Skill: Backend Patterns & Arquitetura REST em Go no FinPlan

Esta skill estabelece os padrões e convenções de backend adotados no **FinPlan**. Use estas diretrizes para criar novos endpoints, estender a persistência ou refatorar a camada de serviços em Go.

---

## 1. Visão Geral da Camada Backend

No FinPlan, o backend é implementado como uma API REST nativa em Go, empacotada em container Docker distroless:
- **Localização**: `apps/api/`
- **Ponto de entrada**: `apps/api/cmd/api/main.go`
- **Módulo Go**: `github.com/gildo-cordeiro/fin-plan/apps/api`
- **Driver de banco de dados**: Driver oficial `go.mongodb.org/mongo-driver` (v1.17.1), conectando-se diretamente ao cluster MongoDB Atlas.
- **Roteamento**: HTTP Multiplexer nativo de Go (`net/http`) sem frameworks pesados externos.

---

## 2. Padrão de Conexão Singleton (MongoClient)

A conexão com o MongoDB Atlas é mantida como singleton ao longo do ciclo de vida da aplicação, com timeouts estritos e desconexão graciosa:

```go
// Trecho extraído de apps/api/cmd/api/main.go:
clientOpts := options.Client().
    ApplyURI(cfg.MongoDBURI).
    SetServerSelectionTimeout(8 * time.Second)

mongoClient, err := mongo.Connect(ctx, clientOpts)
if err != nil {
    log.Fatalf("[FATAL] Falha ao conectar ao MongoDB: %v", err)
}

if err := mongoClient.Ping(ctx, nil); err != nil {
    log.Fatalf("[FATAL] Falha no ping ao MongoDB: %v", err)
}
```

### Regras de Conexão:
- Sempre configure `SetServerSelectionTimeout(8 * time.Second)`.
- Reutilize a instância do cliente para todas as requisições HTTP; nunca crie uma nova conexão por request.
- Resolva o nome do banco via `cfg.MongoDBName` (padrão: `"finplan"`).
- O shutdown graceful do servidor deve chamar `mongoClient.Disconnect(shutdownCtx)`.

---

## 3. Padrão de Handlers e Pipeline de Middlewares

As requisições passam pela cadeia explícita de middlewares:
```
Request -> CORS -> Auth -> ServeMux -> Handler
```

### Regras de Handlers:
- Handlers utilizam timeouts contextuais explícitos (8s para consultas de banco de dados):
  ```go
  ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
  defer cancel()
  ```
- Use a função utilitária `reply(w, status, data)` para padronizar respostas JSON e status HTTP.
- Requisições `OPTIONS` são respondidas imediatamente com `200 OK` pelo middleware de CORS.
- Métodos não suportados devem responder com status `405 Method Not Allowed`.

---

## 4. Camada de Repositório (`internal/budget/repository.go`)

- Toda persistência no MongoDB reside no repositório dedicado.
- O padrão de documento único atômico (`_id: "default_budget"`) é mantido:
  - `FindDefault(ctx)` recupera o orçamento.
  - `UpsertDefault(ctx, data)` grava atomicamente o estado completo com timestamp UTC em `updatedAt`.
- Se o documento não existir, o repositório retorna `nil, nil`, e o handler responde com `{ "exists": false, "data": null }`.

---

## 5. Autenticação e Segurança de Endpoints

- **Autenticação opcional**: Se `API_SECRET_KEY` estiver configurada, o middleware em `internal/middleware/auth.go` valida o cabeçalho `x-api-key` ou `Authorization: Bearer <key>`.
- Caso `API_SECRET_KEY` esteja vazia, a autenticação opera em modo aberto para facilitar o desenvolvimento local.
- Responda `503 Service Unavailable` se `MONGODB_URI` não estiver configurada.

---

## 6. Cliente Frontend Consumidor (`budgetApiService`)

No lado cliente (em `apps/web/src/services/budgetApiService.ts`):
1. **URL Base Dinâmica**:
   - `getBaseUrl()` lê `import.meta.env.VITE_API_URL` (se configurada) ou utiliza caminhos relativos (proxied pelo Vite em dev ou Nginx em prod).
2. **Endpoints v1**:
   - As chamadas apontam para `${getBaseUrl()}/api/v1/budget`.
3. **Timeouts com AbortController**:
   - 12 segundos para `GET`.
   - 15 segundos para `POST`.
4. **Header de Autenticação**:
   - Injeta `x-api-key: VITE_API_SECRET_KEY` caso definida.
