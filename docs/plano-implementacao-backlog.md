# Plano de Implementação — Backlog NeXa

> Criado em: 2026-04-09  
> Autor: Claude (para execução humana ou por agente de IA)  
> Branch de referência: `ui/acoes-em-lote-por-selecao`

---

## Índice

1. [Item 2 — Renovação automática de token em background](#item-2)
2. [Item 3 — Resolver propagação de quantityText na prévia do Bling](#item-3)
3. [Item 4 — Adicionar validação de input com Zod](#item-4)

---

## <a name="item-2"></a>Item 2 — Renovação automática de token em background

### Por que fazer

O token OAuth do Bling expira periodicamente. Atualmente o sistema já faz
renovação **sob demanda** (lazy) dentro de `ensureFreshBlingGateways()`
(`src/app/create-app.ts:1113`): toda vez que uma rota chama a API do Bling, a
função verifica se o token está expirado ou prestes a expirar (threshold: 5
minutos) e renova antes de prosseguir.

**O problema** é que, se nenhuma rota for chamada por horas, o token expira
silenciosamente. Quando o operador finalmente usa o sistema — possivelmente
justo no momento de confirmar e enviar um orçamento urgente — a renovação é
bloqueante e pode falhar sob pressão de rede ou timeout, causando erro visível
para o usuário.

A renovação em background (proativa) resolve isso: o servidor renova o token
antes que ele expire, sem depender de uma requisição do usuário para disparar
esse fluxo.

### Como implementar

#### Passo 1 — Criar o agendador em `create-app.ts`

O local correto é **depois** que `createApp()` retorna, ou seja, na função que
inicializa o servidor (`src/main.ts` ou `src/server.ts`). Como `create-app.ts`
exporta a função `createApp`, a recomendação é iniciar o interval no arquivo
que chama `createApp`.

Alternativamente, pode-se expor uma função `startTokenRefreshScheduler` em
`create-app.ts` e chamá-la no bootstrap.

**Arquivo:** `src/app/create-app.ts`

Adicionar ao final do arquivo, após as funções auxiliares existentes:

```typescript
/**
 * Inicia um job em background que renova o token do Bling proativamente
 * antes que ele expire. Deve ser chamado uma única vez, logo após o servidor
 * iniciar.
 *
 * @param appDependencies - Dependências injetadas com o gateway OAuth
 * @param intervalMs - Frequência de verificação (padrão: 10 minutos)
 * @returns NodeJS.Timeout — guarde para poder cancelar com clearInterval()
 */
export function startBlingTokenRefreshScheduler(
  appDependencies: AppDependencies,
  intervalMs = 10 * 60 * 1000, // 10 minutos
): ReturnType<typeof setInterval> {
  return setInterval(async () => {
    const env = readRuntimeEnv();
    const tokenStatus = readBlingTokenStatus(env);

    if (
      tokenStatus.status === 'unconfigured' ||
      !tokenStatus.refreshAvailable
    ) {
      // Sem token configurado ou sem refresh token — nada a fazer.
      return;
    }

    if (
      tokenStatus.status === 'expired' ||
      tokenStatus.status === 'expiring_soon' ||
      tokenStatus.status === 'unknown'
    ) {
      try {
        await refreshConfiguredBlingAccessToken(appDependencies);
      } catch (error) {
        // Log silencioso — não deve derrubar o servidor
        await appendAppLog({
          source: 'bling',
          event: 'token_auto_refresh_failed',
          error: error instanceof Error ? error.message : String(error),
        }).catch(() => {});
      }
    }
  }, intervalMs);
}
```

#### Passo 2 — Chamar o agendador no bootstrap

**Arquivo:** `src/server.ts` (ou `src/main.ts`, onde o app é iniciado)

```typescript
import { createApp, startBlingTokenRefreshScheduler } from './app/create-app.js';

const { app, appDependencies } = await createApp(...);
await app.listen({ port, host });

// Inicia renovação proativa do token Bling (a cada 10 min)
startBlingTokenRefreshScheduler(appDependencies);
```

> **Atenção:** Se `createApp` não retornar `appDependencies` hoje, é necessário
> ajustar a assinatura de retorno da função para expô-las junto com `app`.

#### Passo 3 — Ajuste no threshold de "expiring_soon"

Hoje o threshold é 5 minutos (`src/app/create-app.ts:1362`). Com o scheduler
rodando a cada 10 minutos, aumente o threshold para **20 minutos** para
garantir que o scheduler sempre encontre o token ainda válido na verificação
anterior ao vencimento:

```typescript
// src/app/create-app.ts linha ~1362
const EXPIRING_SOON_THRESHOLD_MINUTES = 20; // era 5
if (expiresInMinutes <= EXPIRING_SOON_THRESHOLD_MINUTES) {
  status = 'expiring_soon';
}
```

#### Passo 4 — Prevenir refreshes concorrentes

Adicione uma flag de guard para evitar que duas execuções do interval
disparem refresh simultâneo:

```typescript
let tokenRefreshInProgress = false;

// Dentro do setInterval:
if (tokenRefreshInProgress) return;
tokenRefreshInProgress = true;
try {
  await refreshConfiguredBlingAccessToken(appDependencies);
} finally {
  tokenRefreshInProgress = false;
}
```

#### Passo 5 — Testes

- **Arquivo a criar:** `test/bling-token-refresh-scheduler.test.ts`
- Testar que o scheduler chama `refreshConfiguredBlingAccessToken` quando o
  token tem status `expired` ou `expiring_soon`.
- Testar que NÃO chama quando o token está `valid`.
- Testar que NÃO chama quando o token está `unconfigured`.
- Usar mocks de `appDependencies.blingOAuthGateway` (já existe
  `InMemoryBlingOAuthGateway`).

### Diagrama do fluxo

```
[Servidor inicia]
      │
      ▼
startBlingTokenRefreshScheduler()
      │
      ▼
setInterval(10 min)
      │
      ├─► tokenStatus = 'valid' ──────────────────────► noop
      │
      ├─► tokenStatus = 'expiring_soon' ou 'expired' ──► refreshConfiguredBlingAccessToken()
      │                                                        │
      │                                                        ├─► upsertLocalEnv() ─► .env.local
      │                                                        ├─► process.env atualizado
      │                                                        └─► appendAppLog(token_renovado)
      │
      └─► tokenStatus = 'unconfigured' ─────────────────► noop
```

---

## <a name="item-3"></a>Item 3 — Resolver propagação de quantityText na prévia do Bling

### Por que fazer

A prévia do Bling (aba "Bling" no card de resposta) exibe uma tabela de
materiais com a coluna "Qtd". Quando o campo `quantity` (numérico) de um item
é zero ou ausente, o frontend tenta usar `item.quantityText` como fallback
(`public/js/app.js:832`). Porém, os itens que chegam via `resolvedMaterialItems`
(resultado da revisão por IA) **não carregam o campo `quantityText`** — o
schema da IA de revisão (`openai-http-budget-assistant-gateway.ts:336-355`)
inclui apenas: `description`, `quantity`, `catalogItemId`, `catalogItemName`,
`sourceQuery`.

Resultado: quando `quantity = 0` em um item revisado, a célula exibe
**"Quantidade a validar"** em vez do texto original que veio da interpretação
(ex.: "5 metros", "2 barras").

### Diagnóstico detalhado

**Pipeline de dados:**

```
[Interpretação IA]
materialItems[].quantityText = "5 metros"   ← texto livre da IA

[Revisão de Proposta IA]
resolvedMaterialItems[].quantity = 5        ← numérico (pode ser 0 se IA falhar)
resolvedMaterialItems[].quantityText = ???  ← campo NÃO EXISTE no schema

[Frontend — buildBlingPreviewData()]
previewMaterialItems = resolvedMaterialItems (quando revisão existe)
→ item.quantity = 0
→ item.quantityText = undefined            ← fallback falha
→ exibe: "Quantidade a validar"            ← BUG
```

### Como implementar

Há duas abordagens. A **opção A** (frontend) é mais simples e não requer
alteração do schema da IA. A **opção B** (backend + schema) é mais correta
semanticamente mas tem maior superfície de mudança.

#### Opção A — Correção no Frontend (recomendada)

**Arquivo:** `public/js/app.js`

**Onde:** na função que constrói `materialRows` (linha ~822).

**Estratégia:** antes de mapear `previewMaterialItems`, construir um Map de
`sourceQuery → quantityText` a partir de `displayMaterialItems` (que são os
itens da interpretação original, sempre presentes). Usar esse Map como fallback
quando `item.quantityText` não existir no item resolvido.

```javascript
// Construir mapa de quantityText da interpretação original
// displayMaterialItems vem de aiInterpretation.materialItems
const quantityTextBySourceQuery = new Map(
  (displayMaterialItems || [])
    .filter((item) => item.sourceQuery && item.quantityText)
    .map((item) => [item.sourceQuery, item.quantityText])
);

const materialRows = previewMaterialItems.map((item, index) => {
  // ... código existente ...
  const quantityValue = Number(item?.quantity || 0);
  const quantityText =
    quantityValue > 0
      ? formatPreviewQuantity(quantityValue)
      : item.quantityText                                         // já no item (fallback existente)
        || quantityTextBySourceQuery.get(item.sourceQuery || '')  // ← NOVO: busca da interpretação
        || 'Quantidade a validar';
  // ...
});
```

**Localização exata das linhas a alterar:**
- `public/js/app.js:822` — início do `previewMaterialItems.map()`
- `public/js/app.js:829-832` — bloco `const quantityText = ...`

#### Opção B — Correção no Schema da IA (alternativa mais completa)

Adicionar `quantityText` como campo opcional ao schema de `resolvedMaterialItems`
na IA de revisão:

**Arquivo:** `src/infrastructure/integrations/openai/openai-http-budget-assistant-gateway.ts`

```typescript
// linha ~348-355 no schema JSON de resolvedMaterialItems
properties: {
  description: { type: 'string' },
  quantity: { type: 'number' },
  quantityText: { type: ['string', 'null'] }, // ← NOVO
  catalogItemId: { type: ['string', 'null'] },
  catalogItemName: { type: ['string', 'null'] },
  sourceQuery: { type: ['string', 'null'] },
},
```

E atualizar o type no gateway de aplicação:
**Arquivo:** `src/application/gateways/openai-budget-assistant-gateway.ts:173`

```typescript
resolvedMaterialItems: Array<{
  description: string;
  quantity: number;
  quantityText?: string | null; // ← NOVO
  catalogItemId: string | null;
  catalogItemName: string | null;
  sourceQuery: string | null;
}>;
```

E adicionar instrução no prompt da revisão para preservar `quantityText`
quando `quantity = 0` ou quando o texto for mais descritivo que o número.

> **Recomendação:** implementar a **Opção A** agora (menor risco, zero mudança
> de prompt de IA) e a **Opção B** numa iteração futura quando o schema da IA
> de revisão for revisado de qualquer forma.

### Testes

- Verificar manualmente: criar uma sessão com materiais cujas quantidades sejam
  textuais ("2 metros de cabo", "meia dúzia de parafusos").
- Confirmar que a prévia Bling exibe o texto da quantidade original em vez de
  "Quantidade a validar".
- Adicionar teste unitário em `test/` que valide a função de building da
  prévia (extrair lógica para função pura se necessário).

---

## <a name="item-4"></a>Item 4 — Adicionar validação de input com Zod

### Por que fazer

Atualmente o backend usa _type assertions_ (`as { campo: tipo }`) para acessar
corpos de requisição e query params. Isso significa que:

- Um campo obrigatório ausente causa erro de runtime imprevisível (em vez de
  `400 Bad Request` com mensagem clara).
- Tipos errados (ex.: string onde se espera número) passam silenciosamente e
  causam comportamentos incorretos mais adiante no fluxo.
- Não há documentação implícita do contrato das rotas.

Zod resolve isso com schemas declarativos que validam e inferem tipos ao mesmo
tempo, eliminando o casting manual.

### Escopo de rotas prioritárias

| Rota | Corpo/Query | Campos críticos |
|------|------------|-----------------|
| `POST /local/ai-agent-response` | body | `originalText` (string, min 1) |
| `POST /local/ai-agent-response/start` | body | `originalText` (string, min 1) |
| `POST /local/agent-response` | body | `originalText`, `customerQuery`, `materialQueries` |
| `POST /local/budget-context` | query | `materialLimitPerQuery`, `quoteLimitPerContact` (number > 0) |
| `POST /local/budget-analysis` | body | estrutura de contexto |
| `GET /local/products/search` | query | `q` (string), `limit` (number inteiro positivo) |
| `GET /bling/products` | query | `search` (string opcional), `limit` (number) |
| `POST /messages` | body | `text` (string) |

### Como implementar

#### Passo 1 — Instalar Zod

```bash
npm install zod
```

Zod não tem peer dependencies e é compatível com TypeScript 5+.

#### Passo 2 — Criar arquivo de schemas centralizados

**Arquivo a criar:** `src/app/route-schemas.ts`

```typescript
import { z } from 'zod';

// ── Shared primitives ─────────────────────────────────────────────────────────

const positiveInt = z.coerce.number().int().positive();
const nonEmptyString = z.string().min(1);

// ── Query schemas ─────────────────────────────────────────────────────────────

export const ProductSearchQuerySchema = z.object({
  q: z.string().optional(),
  limit: positiveInt.default(20),
  page: positiveInt.default(1).optional(),
});

export const BlingProductsQuerySchema = z.object({
  search: z.string().optional(),
  limit: positiveInt.default(20),
  page: positiveInt.default(1).optional(),
});

export const BudgetContextQuerySchema = z.object({
  materialLimitPerQuery: positiveInt.default(5),
  quoteLimitPerContact: positiveInt.default(3),
});

// ── Body schemas ──────────────────────────────────────────────────────────────

export const AiAgentResponseBodySchema = z.object({
  sessionId: z.string().optional(),
  originalText: nonEmptyString,
  materialLimitPerQuery: positiveInt.optional(),
  quoteLimitPerContact: positiveInt.optional(),
  defaultAiModel: z.string().optional(),
});

export const AgentResponseBodySchema = z.object({
  originalText: nonEmptyString,
  customerQuery: nonEmptyString,
  materialQueries: z.array(nonEmptyString).min(1),
  materialLimitPerQuery: positiveInt.optional(),
  quoteLimitPerContact: positiveInt.optional(),
});

export const MessageBodySchema = z.object({
  text: nonEmptyString,
});

// Tipos TypeScript inferidos dos schemas (uso nas rotas)
export type AiAgentResponseBody = z.infer<typeof AiAgentResponseBodySchema>;
export type AgentResponseBody = z.infer<typeof AgentResponseBodySchema>;
export type ProductSearchQuery = z.infer<typeof ProductSearchQuerySchema>;
```

#### Passo 3 — Criar helper de validação de rota

**Arquivo a criar:** `src/app/validate-route-input.ts`

```typescript
import { ZodSchema, ZodError } from 'zod';
import { FastifyReply } from 'fastify';

/**
 * Valida input de rota contra um schema Zod.
 * Retorna o valor parseado ou, em caso de erro, envia 400 e retorna null.
 *
 * Uso:
 *   const body = validateInput(AiAgentResponseBodySchema, request.body, reply);
 *   if (!body) return; // reply já foi enviado com 400
 */
export function validateInput<T>(
  schema: ZodSchema<T>,
  data: unknown,
  reply: FastifyReply,
): T | null {
  const result = schema.safeParse(data);
  if (!result.success) {
    const formatted = result.error.flatten();
    reply.code(400).send({
      error: 'Validation failed',
      fieldErrors: formatted.fieldErrors,
      formErrors: formatted.formErrors,
    });
    return null;
  }
  return result.data;
}
```

#### Passo 4 — Aplicar nas rotas

**Arquivo:** `src/app/create-app.ts`

Substituir os casts `as { ... }` pelo helper de validação. Exemplo para a
rota mais crítica:

```typescript
// ANTES (linha ~438):
const body = request.body as {
  sessionId?: string;
  originalText: string;
  materialLimitPerQuery?: number;
  quoteLimitPerQuery?: number;
  defaultAiModel?: string;
};

// DEPOIS:
import { AiAgentResponseBodySchema } from './route-schemas.js';
import { validateInput } from './validate-route-input.js';

// ...dentro do handler:
const body = validateInput(AiAgentResponseBodySchema, request.body, reply);
if (!body) return; // 400 já enviado
```

Repetir para as demais rotas listadas na tabela de escopo.

#### Passo 5 — Configurar schema no Fastify (opcional mas recomendado)

Fastify suporta schemas de validação nativamente via `ajv`. É possível integrar
Zod com Fastify usando o pacote `fastify-type-provider-zod`. Isso habilita
validação automática sem helper manual:

```bash
npm install fastify-type-provider-zod
```

```typescript
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

// Depois as rotas ficam:
app.post('/local/ai-agent-response', {
  schema: { body: AiAgentResponseBodySchema },
}, async (request) => {
  // request.body já é tipado e validado
  const { originalText, sessionId } = request.body;
  // ...
});
```

> **Recomendação de ordem:** implementar o Passo 3 e 4 primeiro (helper manual)
> para ter validação funcionando rapidamente sem refatorar a estrutura de todas
> as rotas. Migrar para `fastify-type-provider-zod` (Passo 5) em seguida, rota
> por rota.

### Tratamento de erros de validação no Frontend

Após validação no backend, o frontend (`public/js/app.js`) deve tratar
resposta `400` explicitamente. Hoje a maioria dos `fetch` trata apenas erros
genéricos. Adicionar:

```javascript
if (response.status === 400) {
  const err = await response.json();
  const detail = Object.values(err.fieldErrors || {}).flat().join(', ');
  showUserError(`Dados inválidos: ${detail || err.error}`);
  return;
}
```

### Testes

- **Arquivo:** `test/route-schemas.test.ts`
- Testar cada schema com inputs válidos e inválidos.
- Testar que campos ausentes geram `ZodError`.
- Testar coerção de número: `"20"` → `20` para query params.
- Testes de integração: fazer requisição HTTP real ao server de teste com
  body inválido e verificar `400`.

### Checklist de execução

- [ ] `npm install zod`
- [ ] Criar `src/app/route-schemas.ts` com todos os schemas
- [ ] Criar `src/app/validate-route-input.ts`
- [ ] Aplicar `validateInput` na rota `POST /local/ai-agent-response`
- [ ] Aplicar `validateInput` na rota `POST /local/ai-agent-response/start`
- [ ] Aplicar `validateInput` na rota `POST /local/agent-response`
- [ ] Aplicar `validateInput` na rota `GET /local/products/search`
- [ ] Aplicar `validateInput` na rota `GET /bling/products`
- [ ] Aplicar `validateInput` na rota `POST /messages`
- [ ] Criar `test/route-schemas.test.ts`
- [ ] (Opcional) Migrar para `fastify-type-provider-zod`

---

## Ordem sugerida de implementação

1. **Item 3** (quantityText) — menor esforço, correção pontual no frontend,
   impacto imediato na qualidade da prévia do Bling.
2. **Item 2** (token background) — médio esforço, melhora a resiliência
   operacional sem afetar fluxos existentes.
3. **Item 4** (Zod) — maior esforço mas o mais importante para manutenibilidade
   a longo prazo; fazer rota por rota para não quebrar nada.

---

## Arquivos-chave por item

| Item | Arquivos principais |
|------|-------------------|
| 2 — Token background | `src/app/create-app.ts`, `src/server.ts` ou `src/main.ts` |
| 3 — quantityText | `public/js/app.js` (~linha 822) |
| 4 — Zod | `src/app/route-schemas.ts` (novo), `src/app/validate-route-input.ts` (novo), `src/app/create-app.ts` |
