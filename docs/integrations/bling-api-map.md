# MAPA DA API DO BLING PARA O NEXA

## FUNÇÃO DESTE ARQUIVO
Mapear os módulos da API do Bling relevantes para o NEXA, registrar o que já foi validado no projeto e orientar a ordem recomendada de integração.

## QUANDO CONSULTAR
Consultar este arquivo ao:
- planejar integrações com o Bling;
- decidir quais endpoints entram em cada fase;
- revisar autenticação, limites e riscos;
- implementar leitura e escrita de dados operacionais;
- conectar webhooks futuros.

## RELAÇÃO COM OUTROS ARQUIVOS
- Complementa `bling-history.md`.
- Complementa `../architecture/bling.md`.
- Segue as regras de `../../AGENTS.md`.

## VISÃO GERAL
A API do Bling v3 deve ser tratada no NEXA por domínios de negócio, não como uma integração única e genérica.

Ordem recomendada para o NEXA:
1. OAuth e refresh de token
2. Produtos
3. Contatos e clientes
4. Orçamentos
5. Situações e histórico operacional
6. PDF e documentos derivados
7. Webhooks

## REGRAS GERAIS CONFIRMADAS
- autenticação via OAuth 2.0 com `Bearer access token`;
- app cadastrado no portal do Bling;
- callback deve bater exatamente com a `redirect_uri` cadastrada;
- limite global de `3 req/s`;
- limite diário de `120.000 req/dia`;
- webhooks exigem verificação de assinatura;
- webhooks devem ser tratados com idempotência.

## DOMÍNIOS RELEVANTES

### 1. OAuth
Uso no NEXA:
- autorização inicial do app;
- troca de `authorization_code` por token;
- refresh de `access_token`;
- base para todas as demais chamadas.

Status no projeto:
- __fluxo OAuth local validado__ ✓
- __callback local implementado__ ✓
- __troca de código por token implementada__ ✓
- __refresh de token implementado por contrato__ ✓

Pendências:
- persistência segura dos tokens;
- refresh automático no runtime;
- política de renovação antes do vencimento.

### 2. Produtos
Uso no NEXA:
- localizar materiais do orçamento;
- consultar `preco` e `precoCusto`;
- calcular custo, venda e lucro estimado;
- validar correspondência de materiais inferidos.

Status no projeto:
- __leitura real da listagem de produtos validada__ ✓
- __gateway HTTP de produtos implementado__ ✓

Pontos de atenção:
- a busca simples por texto ainda precisa ser ajustada;
- o cadastro atual contém itens fora do escopo técnico do agente;
- será necessário filtro melhor por nome, código, situação ou outra estratégia suportada pela API.

### 3. Contatos e Clientes
Uso no NEXA:
- localizar cliente para vincular orçamento;
- validar cadastro existente;
- evitar criação duplicada;
- preparar fluxo futuro de atualização de dados cadastrais.

Status no projeto:
- __listagem real de contatos validada__ ✓
- __catálogo local diário de contatos implementado__ ✓

Pontos de atenção:
- a listagem já traz campos úteis para o fluxo inicial: `nome`, `codigo`, `situacao`, `numeroDocumento`, `telefone`, `celular`;
- detalhes cadastrais mais ricos ainda podem exigir leitura por ID em uma fase seguinte;
- sincronizações paginadas precisam respeitar o limite de `3 req/s`, com throttle explícito.

### 4. Orçamentos
Uso no NEXA:
- criar orçamento após dupla confirmação;
- vincular orçamento à conversa;
- registrar ID e número do documento;
- consultar orçamento para retomadas e revisão.

Status no projeto:
- __fronteira de criação criada em contrato__ ✓
- __gateway fake implementado__ ✓
- __rota HTTP de disparo implementada__ ✓
- __listagem real de propostas comerciais validada__ ✓
- __histórico local diário de propostas comerciais implementado__ ✓
- integração real de criação ainda pendente

### 5. Situações e Histórico
Uso no NEXA:
- entender aprovação, rejeição, pendência e conversão;
- alimentar aprendizado assistido;
- estudar padrões reais de resultado comercial.

Status no projeto:
- ainda não integrado

### 6. PDF e Documentos
Uso no NEXA:
- recuperar PDF do orçamento;
- enviar documento ao usuário futuramente;
- apoiar fluxo de ordem de serviço e nota fiscal.

Status no projeto:
- ainda não integrado

### 7. Notas de Serviço
Uso no NEXA:
- consultar histórico de emissão de serviços executados;
- cruzar clientes, datas e valores com propostas comerciais;
- alimentar aprendizado assistido sobre conversão operacional;
- preparar futuras automações ligadas à emissão.

Status no projeto:
- __listagem real de notas de serviço validada__ ✓
- __histórico local diário de notas de serviço implementado__ ✓

Pontos de atenção:
- o endpoint público identificado foi `GET /nfse`;
- ainda não há decisão de como relacionar automaticamente notas de serviço às propostas do NEXA;
- campos mais detalhados podem exigir leitura por ID em uma fase seguinte.

### 8. Webhooks
Uso no NEXA:
- atualizar estado interno sem polling constante;
- reagir a alterações de orçamento, produto, estoque ou nota;
- preparar sincronização futura com baixa latência.

Status no projeto:
- ainda não integrado

## O QUE JÁ FOI VALIDADO NO PROJETO
- callback OAuth local com `http://localhost:3000/auth/bling/callback`;
- troca de `code` por `access_token` e `refresh_token`;
- leitura real de produtos com token válido;
- leitura real de propostas comerciais com token válido;
- leitura real de notas de serviço com token válido;
- leitura real de contatos com token válido;
- retorno de campos úteis como:
  - `id`
  - `nome`
  - `codigo`
  - `preco`
  - `precoCusto`
  - `estoque.saldoVirtualTotal`

## DECISÕES TÉCNICAS ATUAIS
- manter gateways por domínio, não um cliente único gigante;
- esconder HTTP atrás de interfaces pequenas;
- usar TDD para cada novo recurso do Bling;
- começar com leitura segura antes de gravação real;
- só criar orçamento real após confirmação final do fluxo interno.

## PRÓXIMAS ENTREGAS RECOMENDADAS
1. Persistir tokens do Bling com segurança.
2. Substituir o gateway fake de orçamento por cliente real.
3. Ajustar a busca real de produtos conforme o comportamento atual da API.
4. Implementar leitura de contatos/clientes.
5. Implementar criação real de propostas comerciais.
6. Mapear situações e transições das propostas comerciais.
7. Investigar endpoint ou estratégia real para ordens de serviço.
8. Preparar webhooks após estabilizar leitura e escrita básicas.

## STATUS
- __OAuth do Bling mapeado e testado localmente__ ✓
- __Produtos mapeados e leitura inicial validada__ ✓
- __Contatos mapeados e leitura inicial validada__ ✓
- __Propostas comerciais mapeadas e leitura inicial validada__ ✓
- __Notas de serviço mapeadas e leitura inicial validada__ ✓
- __Orçamentos preparados por contrato interno__ ✓
- contatos, histórico, PDF e webhooks ainda pendentes
