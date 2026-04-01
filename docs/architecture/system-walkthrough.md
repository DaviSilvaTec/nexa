# SYSTEM WALKTHROUGH

## FUNÇÃO DESTE ARQUIVO
Este arquivo descreve o funcionamento completo do NEXA com base no código atual. Ele explica o papel de cada camada, o fluxo de uso do sistema, as rotas disponíveis, as principais funções exportadas e como elas se relacionam entre si.

## QUANDO CONSULTAR
Consultar este arquivo quando for necessário:
- entender o sistema do início ao fim;
- localizar onde determinada responsabilidade vive;
- revisar o fluxo da Web App;
- alterar integrações com OpenAI ou Bling;
- documentar novas regras sem perder a coerência do fluxo atual.

## RELAÇÃO COM OUTROS ARQUIVOS
- É subordinado a `../../AGENTS.md`.
- Complementa `../README.md`, que funciona como índice da documentação.
- Complementa os documentos temáticos em `architecture/`, `integrations/`, `learning/` e `patterns/`.
- Deve ser atualizado sempre que uma alteração validada mudar o comportamento real do sistema.

## VISÃO GERAL
O NEXA atual é um backend Node.js + TypeScript com Fastify e uma Web App HTML única servida pelo próprio backend. O sistema opera como um agente assistido para orçamentos:

1. recebe texto livre;
2. estrutura esse texto com apoio da OpenAI;
3. cruza o resultado com base local e histórico do Bling;
4. cria uma sessão persistida;
5. exige aprovação humana;
6. gera rascunho comercial;
7. permite revisão e ajustes;
8. envia a proposta ao Bling somente no fim do fluxo.

## MAPA DE CAMADAS

### `src/config`
Responsável por:
- carregar `.env.local`;
- normalizar variáveis de ambiente;
- consolidar a configuração da aplicação;
- persistir mudanças locais em `.env.local` quando necessário.

Arquivos principais:
- [app-config.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/config/app-config.ts)
- [load-local-env.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/config/load-local-env.ts)
- [upsert-local-env.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/config/upsert-local-env.ts)

### `src/app`
Responsável por:
- montar dependências concretas;
- criar a aplicação Fastify;
- expor as rotas HTTP;
- controlar operações assíncronas de análise assistida.

Arquivos principais:
- [build-app-dependencies.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/app/build-app-dependencies.ts)
- [create-app.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/app/create-app.ts)
- [ai-agent-operation-store.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/app/ai-agent-operation-store.ts)

### `src/application`
Responsável por:
- definir contratos de gateways e repositórios;
- encapsular os casos de uso;
- orquestrar o fluxo operacional do orçamento;
- transformar regras de negócio em funções reutilizáveis.

Subpastas:
- `catalog/`: contratos de caches e catálogos locais;
- `gateways/`: contratos para OpenAI e Bling;
- `repositories/`: contratos de persistência de sessões e modelos;
- `use-cases/`: fluxo operacional do sistema.

### `src/domain`
Responsável por:
- regras do fluxo conversacional legado e seus estados;
- repositórios de conversa e análises suspensas.

### `src/infrastructure`
Responsável por:
- integrações reais com OpenAI e Bling;
- persistência em arquivos JSON;
- observabilidade via log estruturado.

## BOOTSTRAP DO SISTEMA

### 1. `loadLocalEnv`
Arquivo:
- [load-local-env.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/config/load-local-env.ts)

Função:
- lê `.env.local` se ele existir;
- converte o conteúdo em objeto chave/valor;
- ignora linhas vazias e comentários;
- remove aspas externas simples ou duplas.

Objetivo:
- permitir ambiente local simples sem depender de outro loader.

### 2. `buildAppConfig`
Arquivo:
- [app-config.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/config/app-config.ts)

Função:
- lê o ambiente carregado;
- valida `APP_PORT`;
- monta o bloco `openai` apenas se houver alguma configuração;
- monta o bloco `bling` apenas se houver alguma configuração;
- separa `authorizedChannels`.

Objetivo:
- fornecer uma visão única e consistente da configuração ativa do runtime.

### 3. `buildAppDependencies`
Arquivo:
- [build-app-dependencies.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/app/build-app-dependencies.ts)

Função:
- decide quais implementações concretas usar;
- escolhe gateways HTTP reais quando há credenciais;
- cai para gateways em memória quando faltam integrações;
- instancia repositórios e caches baseados em arquivo.

Responsabilidades principais:
- `buildBlingQuoteGateway`
- `buildBlingProductGateway`
- `buildBlingOAuthGateway`
- `buildOpenAIBudgetAssistantGateway`

Relação com o resto do sistema:
- `createApp` depende desse objeto para montar as rotas;
- os casos de uso recebem apenas os contratos e não conhecem as implementações.

### 4. `createRuntime`
Arquivo:
- [main.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/main.ts)

Função:
- junta `loadLocalEnv`, `buildAppConfig`, `buildAppDependencies` e `createApp`;
- devolve `app`, `config` e `dependencies`.

Objetivo:
- concentrar o bootstrap da aplicação em um ponto único.

### 5. `startServer`
Arquivo:
- [server.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/server.ts)

Função:
- recebe o runtime;
- sobe o Fastify em `0.0.0.0` e na porta configurada;
- imprime no `stdout` o endereço final.

Objetivo:
- ser a borda mínima entre bootstrap e processo HTTP.

## PERSISTÊNCIA E DADOS LOCAIS

### Sessões assistidas
Repositório:
- [file-system-ai-budget-session-repository.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/infrastructure/persistence/file-system/file-system-ai-budget-session-repository.ts)

Arquivo de dados:
- `data/nexa/ai-budget-sessions/sessions.json`

Conteúdo:
- texto original;
- status;
- cliente provável;
- payload completo do fluxo assistido;
- proposta;
- revisão;
- confirmação final;
- referência do Bling.

### Modelos reutilizáveis
Repositório:
- [file-system-ai-budget-model-repository.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/infrastructure/persistence/file-system/file-system-ai-budget-model-repository.ts)

Arquivo de dados:
- `data/nexa/ai-budget-models/models.json`

Conteúdo:
- snapshot consolidado de uma sessão finalizada;
- referência opcional ao orçamento do Bling para edição posterior.

### Caches locais do Bling
Arquivos principais:
- [file-system-bling-contact-catalog-cache.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/infrastructure/persistence/file-system/file-system-bling-contact-catalog-cache.ts)
- [file-system-bling-product-catalog-cache.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/infrastructure/persistence/file-system/file-system-bling-product-catalog-cache.ts)
- [file-system-bling-quote-history-cache.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/infrastructure/persistence/file-system/file-system-bling-quote-history-cache.ts)
- [file-system-bling-service-note-history-cache.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/infrastructure/persistence/file-system/file-system-bling-service-note-history-cache.ts)

Objetivo:
- permitir análise local rápida sem depender de chamadas remotas em toda operação.

## OBSERVABILIDADE

### `appendAppLog`
Arquivo:
- [file-system-app-log.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/infrastructure/observability/file-system-app-log.ts)

Função:
- grava eventos em JSONL;
- registra tráfego HTTP, chamadas externas e falhas operacionais.

### `InMemoryAiAgentOperationStore`
Arquivo:
- [ai-agent-operation-store.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/app/ai-agent-operation-store.ts)

Função:
- guarda o estado temporário da operação assíncrona iniciada por `/local/ai-agent-response/start`;
- expõe as fases:
  - `queued`
  - `extracting_intake`
  - `building_context`
  - `interpreting_request`
  - `saving_session`
  - `completed`
  - `failed`

Objetivo:
- permitir polling na Web App enquanto a análise assistida roda em background.

## ROTAS PRINCIPAIS

### Utilitárias
- `GET /health`
  Verificação simples de saúde do serviço.
- `GET /app`
  Entrega o arquivo [app.html](/home/usuario/workspace/Antigravity/2026/NeXa/public/app.html).

### Configuração do Bling
- `GET /local/settings/bling-token`
  Lê o status do token configurado.
- `POST /local/settings/bling-token/refresh`
  Faz refresh do token e persiste o resultado em `.env.local`.
- `GET /auth/bling/callback`
  Recebe o `code` do OAuth e troca por tokens.

### Catálogo e histórico local
- `GET /bling/products`
- `GET /local/commercial-history/search`
- `GET /local/products/search`
- `POST /local/budget-context`
- `POST /local/budget-analysis`

Essas rotas existem para consulta técnica e apoio à interface.

### Fluxo assistido principal
- `POST /local/ai-agent-response`
  Executa a análise assistida de forma síncrona.
- `POST /local/ai-agent-response/start`
  Inicia a análise assistida em background.
- `GET /local/ai-operations/:operationId`
  Permite acompanhar a execução por polling.

### Sessões e modelos
- `GET /local/ai-sessions`
- `GET /local/ai-sessions/:sessionId`
- `DELETE /local/ai-sessions/:sessionId`
- `GET /local/ai-models`
- `GET /local/ai-models/:modelId`
- `DELETE /local/ai-models/:modelId`
- `POST /local/ai-models/:modelId/start`

### Etapas do fluxo comercial
- `POST /local/ai-sessions/:sessionId/approve`
- `POST /local/ai-sessions/:sessionId/review`
- `POST /local/ai-sessions/:sessionId/cancel`
- `POST /local/ai-sessions/:sessionId/proposal-draft`
- `POST /local/ai-sessions/:sessionId/proposal-draft/save`
- `POST /local/ai-sessions/:sessionId/proposal-draft/review`
- `POST /local/ai-sessions/:sessionId/proposal-draft/review/accept`
- `POST /local/ai-sessions/:sessionId/proposal-draft/review/reject`
- `POST /local/ai-sessions/:sessionId/save-as-model`
- `POST /local/ai-sessions/:sessionId/confirm-proposal`

### Fluxos legados / complementares
- `POST /messages`
- `POST /drafts/:conversationId/edit`
- `POST /drafts/:conversationId/approve`
- `POST /conversations/:conversationId/confirm-final-approval`
- `POST /conversations/:conversationId/create-bling-quote`
- `POST /suspended-analyses/:suspendedAnalysisId/resume`

Essas rotas mantêm compatibilidade com a camada conversacional anterior.

## FLUXO PRINCIPAL DA WEB APP

### 1. Entrada do texto original
Ponto de entrada:
- botão `Enviar ao NEXA` na Web App;
- rota `POST /local/ai-agent-response/start`.

O front:
- valida se o operador marcou `Terminado`;
- envia o texto original;
- cria uma operação assíncrona;
- passa a consultar o status por polling.

### 2. Criação da sessão assistida
Caso de uso principal:
- [create-ai-budget-session.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/create-ai-budget-session.ts)

Função:
- reaproveita sessão existente se vier um `sessionId`;
- chama `buildAiAssistedAgentResponse`;
- extrai cliente resolvido se ele vier do contexto;
- persiste tudo no repositório de sessões.

Objetivo:
- transformar o texto livre em uma sessão navegável e reaproveitável.

### 3. Construção da resposta assistida
Caso de uso:
- [build-ai-assisted-agent-response.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/build-ai-assisted-agent-response.ts)

Sequência:
1. `extractBudgetIntake`
2. `normalizeAiBudgetIntake`
3. `buildLocalBudgetContext`
4. `analyzeLocalBudgetMaterials`
5. `buildAiBudgetAssistantContext`
6. `interpretBudgetRequest`
7. `buildLocalAgentResponse`

Objetivo:
- combinar IA + base local + regras determinísticas para montar a sessão.

### 4. Extração inicial do texto
Gateway:
- [openai-budget-assistant-gateway.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/gateways/openai-budget-assistant-gateway.ts)
- implementação HTTP:
  [openai-http-budget-assistant-gateway.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/infrastructure/integrations/openai/openai-http-budget-assistant-gateway.ts)

Função:
- identificar cliente provável;
- extrair materiais citados;
- extrair serviços citados;
- levantar ambiguidade inicial.

Resultado esperado:
- uma estrutura fraca, mas legível, para alimentar o resto do fluxo.

### 5. Construção do contexto local
Caso de uso:
- [build-local-budget-context.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/build-local-budget-context.ts)

Função:
- pesquisar cliente no cache local;
- pesquisar materiais no catálogo local;
- buscar histórico comercial e operacional do Bling.

Objetivo:
- tirar o fluxo do “texto puro” e colocá-lo num contexto comercial real.

### 6. Análise de materiais locais
Caso de uso:
- [analyze-local-budget-materials.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/analyze-local-budget-materials.ts)

Função:
- consolidar custo, venda e lucro estimado dos materiais com base no catálogo local.

Objetivo:
- gerar o resumo financeiro dos materiais antes da aprovação final.

### 7. Interpretação final do orçamento
Gateway:
- `interpretBudgetRequest`

Função:
- transformar o texto original e o contexto montado em:
  - descrição do orçamento;
  - descrição do trabalho;
  - materiais sugeridos;
  - serviços sugeridos;
  - pontos de atenção;
  - sugestões;
  - confiança.

Objetivo:
- produzir a leitura assistida principal do orçamento.

### 8. Resposta local complementar
Caso de uso:
- [build-local-agent-response.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/build-local-agent-response.ts)

Função:
- montar a resposta determinística com base local, status inicial e resumo financeiro.

Objetivo:
- garantir que o retorno final do NEXA não dependa só da IA.

## FLUXO DE ESTADOS DA SESSÃO

As mudanças de estado passam principalmente por:
- [update-ai-budget-session-status.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/update-ai-budget-session-status.ts)
- [approve-draft.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/approve-draft.ts)

Estados práticos:
1. `Aguardando aprovacao`
2. `Aprovado para proposta`
3. `Proposta comercial pronta`
4. `Finalizada`
5. `Cancelada`

## FLUXO DO RASCUNHO COMERCIAL

### 1. Geração do rascunho
Caso de uso:
- [generate-ai-budget-proposal-draft.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/generate-ai-budget-proposal-draft.ts)

Função:
- lê a interpretação atual;
- monta o corpo comercial;
- consolida materiais e serviços exibidos no orçamento;
- registra o rascunho na sessão.

### 2. Edição manual
Caso de uso:
- [update-ai-budget-proposal-draft.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/update-ai-budget-proposal-draft.ts)

Função:
- salva o novo corpo do rascunho;
- relê seções relevantes do texto;
- atualiza materiais reconciliados;
- ajusta partes do payload derivadas do texto salvo.

### 3. Revisão assistida
Caso de uso:
- [review-ai-budget-proposal-draft.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/review-ai-budget-proposal-draft.ts)

Função atual:
- exige que a sessão esteja em `Proposta comercial pronta`;
- lê o rascunho salvo;
- envia ao gateway de revisão:
  - texto original;
  - rascunho atual;
  - cliente;
  - descrição do orçamento;
  - descrição do trabalho;
  - materiais;
  - serviços;
  - pontos de atenção;
  - override opcional de modelo;
  - `reviewBehavior`, quando esse modo estiver habilitado na interface.

Objetivo:
- gerar uma segunda versão do texto antes do aceite.

Comportamento real do `reviewBehavior`:
- `manual`
  mantém a revisão padrão do sistema;
- `double-check`
  pede uma passada mais conservadora, com dupla checagem do texto e menos confiança automática em inferências;
- `suggestion-only`
  pede mudanças mais leves, preservando a estrutura do rascunho sempre que possível.

### 4. Aceite da revisão
Caso de uso:
- [accept-ai-budget-proposal-draft-review.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/accept-ai-budget-proposal-draft-review.ts)

Função:
- substitui o rascunho principal pela sugestão aceita;
- atualiza materiais reconciliados;
- limpa o bloco de revisão pendente.

### 5. Rejeição da revisão
Caso de uso:
- [reject-ai-budget-proposal-draft-review.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/reject-ai-budget-proposal-draft-review.ts)

Função:
- remove a revisão pendente;
- preserva o rascunho principal.

### Funções auxiliares importantes do rascunho
- [extract-material-items-from-commercial-body.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/extract-material-items-from-commercial-body.ts)
- [extract-customer-from-commercial-body.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/extract-customer-from-commercial-body.ts)
- [update-commercial-body-material-section.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/update-commercial-body-material-section.ts)
- [calculate-material-financial-summary.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/calculate-material-financial-summary.ts)

Essas funções existem para manter o corpo comercial, os materiais e o resumo financeiro coerentes entre si.

## ENVIO AO BLING

### Caso de uso principal
- [confirm-ai-budget-proposal.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/confirm-ai-budget-proposal.ts)

Função:
- valida a sessão;
- resolve contato;
- resolve itens finais;
- monta payload da proposta;
- cria ou atualiza a proposta no Bling;
- salva a confirmação na sessão;
- marca a sessão como finalizada.

### Relações principais
- `confirmAiBudgetProposal`
  -> usa `BlingQuoteGateway`
  -> usa catálogo local
  -> usa materiais reconciliados do rascunho
  -> persiste `proposalConfirmation` e `blingQuote`

### Gateways do Bling
- [bling-http-quote-gateway.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/infrastructure/integrations/bling/bling-http-quote-gateway.ts)
- [bling-http-product-gateway.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/infrastructure/integrations/bling/bling-http-product-gateway.ts)
- [bling-oauth-http-gateway.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/infrastructure/integrations/bling/bling-oauth-http-gateway.ts)

Objetivo:
- isolar a chamada externa real do resto da aplicação.

## MODELOS REUTILIZÁVEIS

### Criar modelo a partir de sessão
Caso de uso:
- [create-ai-budget-model-from-session.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/create-ai-budget-model-from-session.ts)

Função:
- transforma uma sessão finalizada em modelo reutilizável.

### Iniciar sessão a partir de modelo
Caso de uso:
- [start-ai-budget-session-from-model.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/start-ai-budget-session-from-model.ts)

Função:
- recria uma sessão pronta para proposta a partir de um modelo salvo.

### Leituras e exclusões
- [list-ai-budget-models.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/list-ai-budget-models.ts)
- [get-ai-budget-model.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/get-ai-budget-model.ts)
- [delete-ai-budget-model.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/delete-ai-budget-model.ts)

## FLUXO LEGADO DE CONVERSA

Ainda existem casos de uso para o fluxo conversacional anterior:
- [receive-message.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/receive-message.ts)
- [edit-draft.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/edit-draft.ts)
- [confirm-final-approval.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/confirm-final-approval.ts)
- [create-bling-quote.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/create-bling-quote.ts)
- [suspend-expired-conversation.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/suspend-expired-conversation.ts)
- [resume-suspended-analysis.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/resume-suspended-analysis.ts)

Eles continuam no projeto porque o NEXA ainda preserva a camada de conversa como parte da arquitetura maior.

## RESUMO DO PROCESSO DE USO

Na prática, o operador usa o sistema assim:

1. abre a Web App em `/app`;
2. digita ou dita o texto original;
3. envia ao NEXA;
4. o sistema cria uma sessão assistida;
5. o operador revisa o retorno técnico;
6. aprova a sessão;
7. gera a proposta comercial;
8. edita o rascunho se necessário;
9. manda para revisão assistida se desejar;
10. aceita ou rejeita a revisão;
11. confirma o envio ao Bling;
12. opcionalmente salva o resultado como modelo.

## PAINEL DE CONFIGURAÇÕES NA WEB APP

O painel `Configurações`, servido pela própria [app.html](/home/usuario/workspace/Antigravity/2026/NeXa/public/app.html), agora está organizado como uma lista vertical de grupos compactos:
- `Log`
- `Modelo`
- `Tema`
- `Revisão`
- `Foco`

Cada grupo possui:
- um nome curto;
- um checkbox visual no lado direito;
- um indicador `i` que abre ajuda contextual por clique;
- uma subárea visual para os controles associados.

Comportamento real atual:
- `Log`
  - mostra ou oculta o console lateral local;
  - quando habilitado, revela `Nível de log`;
  - o filtro atual compara severidade em três níveis:
    - `debug`
    - `warn`
    - `error`
  - escritas diretas em `output.textContent` entram como `debug`, enquanto alguns pontos do fluxo usam níveis explícitos com `setOutputMessage(...)`.
- `Modelo`
  - habilita ou desabilita a escolha persistida do modelo padrão da interface;
  - quando desabilitado, o front volta a usar `gpt-5-nano` como padrão fixo;
  - quando habilitado, o valor selecionado é salvo em `localStorage` e segue para `submitAiAgentResponse(...)` como `defaultAiModel`;
  - esse mesmo valor também preenche o seletor visível de revisão do rascunho quando a proposta é aberta.
- `Tema`
  - revela o seletor de tema e aplica a opção atual no `body` com `data-theme`;
  - os temas implementados hoje são:
    - `classic`
    - `compact`
    - `high-contrast`
  - a interface persiste tanto o estado de ativação quanto o tema escolhido.
- `Revisão`
  - revela o seletor de comportamento da revisão;
  - persiste a escolha do operador;
  - envia esse modo para a rota `POST /local/ai-sessions/:sessionId/proposal-draft/review`;
  - o backend repassa isso ao gateway OpenAI para alterar a instrução de revisão.
- `Foco`
  - controla se a `textarea` principal recebe foco automático ao carregar sessão ou modelo;
  - o comportamento é consultado em `loadSessionIntoForm(...)` e `startSessionFromModel(...)`.

Persistência:
- o painel usa `localStorage` com chaves específicas para:
  - visibilidade de logs;
  - nível de log;
  - uso do modelo padrão persistido;
  - ativação e valor do tema;
  - ativação e valor do comportamento de revisão;
  - foco automático no texto.

Observação importante:
- o bloco de status do token do Bling permanece funcional abaixo da lista e não é controlado por esses toggles.

## REGRA DE MANUTENÇÃO DESTE DOCUMENTO
Toda mudança validada que altere:
- fluxo;
- contratos;
- ordem operacional;
- persistência;
- UX que afete o funcionamento do processo;

deve atualizar este arquivo no mesmo ciclo em que atualiza `docs/changelog.md`.
