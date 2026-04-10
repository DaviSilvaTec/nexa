# RELATÓRIO TÉCNICO DO SISTEMA — NEXA

## FUNÇÃO DESTE ARQUIVO
Registrar a análise técnica completa do sistema ALLTEC NEXA realizada em 09/04/2026, cobrindo arquitetura, stack, estrutura, pontos fortes, problemas identificados e prioridades.

## QUANDO CONSULTAR
Consultar ao revisar o estado geral do sistema, planejar próximas etapas ou retomar contexto após período de inatividade.

## RELAÇÃO COM OUTROS ARQUIVOS
- Subordinado a `../AGENTS.md`.
- Complementa `changelog.md` e `implementation-plan.md`.
- Gerado com base na leitura completa do código-fonte, documentação e histórico git em 2026-04-09.

---

## DATA DA ANÁLISE
2026-04-09

---

## VISÃO GERAL

**NEXA** (Networked EXecution Agent) é um assistente inteligente de orçamentos de serviços técnicos (câmeras, interfones, elétrica, iluminação, redes). Integra OpenAI para interpretação de linguagem natural e Bling (ERP) para execução operacional, com fluxo obrigatório de aprovação antes de qualquer ação no ERP.

- **Versão:** 0.1.0 (MVP ativo)
- **Status:** Em desenvolvimento ativo
- **Branch na data da análise:** `docs/arquivos-de-registro-obrigatorios`

---

## STACK TÉCNICO

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js + TypeScript 6.0.2 (ES2022, strict) |
| Framework HTTP | Fastify 5.8.4 |
| IA | OpenAI API (interpretação e revisão) |
| ERP | Bling API v3 (catálogo, contatos, orçamentos) |
| Persistência | JSON file-based + in-memory cache |
| Frontend | HTML + CSS + JS vanilla (sem framework) |
| Testes | Node built-in test runner |

---

## ARQUITETURA

O projeto segue **Clean Architecture** com 4 camadas bem definidas:

```
src/
├── domain/          # Entidades e estado de máquina (modelo legacy de conversação)
├── application/     # Lógica de negócio (47 use cases, gateways, repositórios)
├── infrastructure/  # Implementações concretas (HTTP, filesystem, in-memory)
└── config/          # Configuração e variáveis de ambiente
```

**Padrões aplicados:** Gateway, Repository, Use Case, Dependency Injection.

### Frontend modularizado (refatorado em 07/04/2026)

- `public/app.html` — 298 linhas (estrutura HTML pura)
- `public/css/app.css` — 2.151 linhas (3 temas: Classic NEXA, Compact Operational, High Contrast)
- `public/js/app.js` — 3.058 linhas (lógica, polling a cada 5s, Web Speech API)

---

## ESTRUTURA DE DIRETÓRIOS

```
/
├── src/
│   ├── server.ts                    # Bootstrap HTTP
│   ├── main.ts                      # Criação do runtime e carregamento de config
│   ├── app/
│   │   ├── create-app.ts            # Factory Fastify com todas as rotas (40+)
│   │   ├── build-app-dependencies.ts # Container de DI
│   │   └── ai-agent-operation-store.ts # Rastreamento de operações em memória
│   ├── domain/conversation/
│   ├── application/
│   │   ├── gateways/                # Contratos de serviços externos (5 Bling + 1 OpenAI)
│   │   ├── repositories/            # Contratos de persistência
│   │   ├── catalog/                 # Contratos de cache local
│   │   └── use-cases/               # 47 arquivos de lógica de negócio
│   ├── infrastructure/
│   │   ├── integrations/bling/      # Implementações HTTP e in-memory do Bling
│   │   ├── integrations/openai/     # Implementações HTTP e in-memory da OpenAI
│   │   ├── persistence/file-system/ # Repositórios JSON em disco
│   │   ├── persistence/in-memory/   # Repositórios RAM para testes
│   │   └── observability/           # Log JSONL de eventos
│   └── config/
├── public/                          # Frontend estático
├── test/                            # 57 arquivos de teste
├── data/                            # Dados em disco (sessions, models, caches Bling, logs)
└── docs/                            # Documentação (24+ arquivos markdown)
```

**Métricas:**
- Arquivos TypeScript: 92
- Arquivos de teste: 57
- Arquivos de documentação: 24+
- Linhas de frontend: 5.507 (HTML + CSS + JS)
- Use cases: 47

---

## ENDPOINTS PRINCIPAIS (40+)

Organizados em grupos:
- **Workflow de orçamento:** `/local/ai-agent-response/*`, `/local/ai-sessions/:id/*`
- **Integração Bling:** `/bling/*`, `/local/bling-quote/*`
- **Biblioteca de modelos:** `/local/ai-models/*`
- **Configurações:** `/local/settings/*`, `/auth/bling/callback`
- **Frontend:** `/app`, `/public/**`

---

## PONTOS FORTES

1. **Arquitetura limpa e testável** — 57 arquivos de teste, implementações in-memory para mock.
2. **Documentação abrangente** — 24+ arquivos markdown, changelog com 150+ entradas.
3. **TypeScript estrito** — `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `strict: true`.
4. **Fluxo de aprovação robusto** — Nenhuma ação no Bling sem aprovação explícita do usuário.
5. **Frontend recém modularizado** — Separado do monólito de 5.510 linhas em três arquivos.
6. **Dependências mínimas** — Apenas 2 dependências de produção (Fastify + @fastify/static).

---

## PROBLEMAS IDENTIFICADOS

### Críticos

| # | Problema | Impacto |
|---|---|---|
| 1 | **Token OAuth do Bling expira em 2026-04-10** | Integração com Bling para de funcionar |
| 2 | **Concorrência no filesystem** | Race conditions com múltiplas sessões simultâneas |
| 3 | **WhatsApp não implementado** | Canal `POST /messages` incompleto |

### Limitações conhecidas

- `quantityText` da revisão AI não propagado corretamente para a prévia do Bling.
- Numeração de orçamentos no Bling retorna `numero = 0` em novos orçamentos (workaround: re-query + PUT).
- Modo de revisão (manual/double-check/suggestion-only) parcialmente implementado no backend.

### Segurança

- Sem middleware de autenticação nos endpoints.
- CORS não configurado explicitamente.
- Sem rate limiting (risco de consumo excessivo de tokens OpenAI).
- Input do usuário renderizado sem escaping completo no frontend.

### Performance / Dívida Técnica

- Frontend sem minificação (3k+ linhas JS, 2k+ linhas CSS).
- Persistência em filesystem inadequada para produção (> ~100 sessões simultâneas).
- Polling a 5s no frontend (sem WebSockets/SSE).
- Sem paginação no catálogo de produtos/contatos do Bling.

---

## PRIORIDADES IMEDIATAS

1. **Urgente:** Renovar token OAuth do Bling (`POST /local/settings/bling-token/refresh`) — expira 2026-04-10.
2. Implementar renovação automática de token em background.
3. Resolver propagação de `quantityText` na prévia do Bling.
4. Adicionar validação de input (Zod ou similar).
5. Implementar integração WhatsApp.

## ROADMAP ESTRUTURAL (MÉDIO PRAZO)

- Migrar persistência para PostgreSQL.
- Implementar fila de jobs (Bull/BullMQ) para operações longas.
- WebSockets/SSE para substituir polling.
- Bundling/minificação do frontend (Vite/Esbuild).
- Autenticação e rate limiting.
