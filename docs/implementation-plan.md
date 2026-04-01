# PLANO DE IMPLEMENTAÇÃO E PROGRESSO

## FUNÇÃO DESTE ARQUIVO
Registrar o plano de ação do projeto, a ordem de execução recomendada, as decisões já tomadas e o progresso real da implementação.

## QUANDO CONSULTAR
Consultar este arquivo ao:
- acompanhar o andamento do projeto;
- decidir a próxima entrega;
- revisar o que já foi implementado;
- alinhar documentação e código;
- retomar contexto após pausas no desenvolvimento.

## RELAÇÃO COM OUTROS ARQUIVOS
- É subordinado a `../AGENTS.md`.
- Consolida decisões derivadas de `README.md`, `architecture/`, `integrations/`, `learning/` e `orcamento-engine.md`.
- Deve ser atualizado sempre que uma etapa relevante for concluída.

## REGRAS DE USO
- este arquivo deve refletir o estado real do projeto;
- itens só devem ser marcados como concluídos quando houver implementação e teste correspondente, quando aplicável;
- documentação concluída pode ser marcada como concluída mesmo antes da implementação;
- bugs corrigidos devem ser registrados junto com o teste que reproduziu o problema;
- novas fases devem respeitar TDD como padrão obrigatório.
- aprendizados práticos e descobertas operacionais devem ser registrados também em `changelog.md`;
- entradas cronológicas devem preferir data e horário completos no fuso do projeto.

## DECISÕES JÁ FECHADAS
- fase inicial com operador único via WhatsApp;
- apenas números autorizados poderão operar o sistema;
- a aprovação pertence ao número que iniciou a conversa;
- cada rascunho deve ser versionado em sequência: `v1`, `v2`, `v3`;
- a aprovação simples usa, por padrão, a versão ativa mais recente;
- versões anteriores podem ser aprovadas explicitamente;
- se houver nova mensagem antes da aprovação, o sistema deve perguntar se descarta ou suspende a sessão atual;
- após 10 minutos sem resposta, a análise deve ser suspensa;
- na próxima interação, o sistema deve listar análises suspensas abertas;
- a criação do orçamento será feita diretamente no Bling;
- antes de criar no Bling, o sistema deve exibir um resumo final e exigir nova confirmação;
- o sistema deve sugerir itens faltantes em texto pronto, sem confirmar automaticamente;
- consolidação de padrão novo apenas após no mínimo 3 recorrências relevantes;
- TDD é obrigatório para nova funcionalidade, regra de negócio e correção de bug.

### __Atualização 2026-03-30 17:54:00 -03__ ✓
- `Confirmar proposta` passou a ser uma etapa própria do fluxo comercial assistido.
- A confirmação agora exige rascunho comercial já gerado, registra `confirmedAt` na sessão e move o estado para `Finalizada`.
- O comportamento evita confirmação prematura de sessão ainda não consolidada comercialmente.

### __Atualização 2026-03-30 18:22:00 -03__ ✓
- Sessões `Finalizada` agora podem ser promovidas para uma biblioteca separada de modelos reaproveitáveis.
- O fluxo Web ganhou aba própria de `Modelos`, com suporte a carregar o texto do modelo para nova edição e remover modelos salvos.
- A conversão para modelo remove a sessão original da lista operacional após confirmação e persistência concluída.

### __Atualização 2026-03-30 18:41:00 -03__ ✓
- `Confirmar e enviar ao Bling` passou a executar o envio real do rascunho comercial para o gateway de orçamentos do Bling.
- A sessão agora preserva os metadados do orçamento criado no Bling para rastreamento posterior.
- Com isso, o fluxo assistido Web já cobre a trilha principal do MVP até a geração operacional do orçamento externo.

### __Atualização 2026-03-31 10:35:00 -03__ ✓
- Modelos finalizados agora preservam a referência da proposta comercial do Bling.
- A aba `Modelos` passou a distinguir `Usar modelo` de `Editar`.
- `Usar modelo` reaproveita o conteúdo para nova proposta.
- `Editar` inicia uma sessão de proposta pronta vinculada ao orçamento já existente no Bling, permitindo atualizar a mesma proposta em vez de criar outra.

### __Atualização 2026-03-31 14:20:00 -03__ ✓
- O fluxo assistido da Web App agora roda com operação assíncrona monitorável durante o processamento do orçamento.
- A interface passou a mostrar uma tela de espera com mensagens amigáveis por etapa real e atualização periódica.
- A chamada à OpenAI passou a usar timeout controlado para evitar esperas indefinidas no MVP.

### __Atualização 2026-03-31 18:35:00 -03__ ✓
- O fluxo de `Editar` a partir de modelos passou a destacar melhor a proposta do Bling em edição no cabeçalho da sessão.
- A lista lateral passou a mostrar resumo do serviço com a identificação do cliente logo abaixo.
- O backend agora preserva o número de referência anterior do Bling quando uma edição retorna `numero = 0`, evitando degradar a rastreabilidade local do orçamento.

### __Atualização 2026-03-31 19:05:00 -03__ ✓
- O envio ao Bling agora corrige automaticamente a sequência quando uma proposta nova nasce com `numero = 0`.
- A estratégia adotada no MVP é: criar, verificar o número retornado e, se vier inválido, consultar a sequência recente no Bling e reaplicar o próximo número por `PUT`.
- Em edições, o NEXA continua levando e preservando o número já conhecido da proposta existente.

### __Atualização 2026-03-31 19:20:00 -03__ ✓
- O envio manual de texto ao NEXA agora exige uma confirmação explícita do operador via caixa `Terminado`.
- A interface também passou a bloquear o envio de textos com menos de 30 palavras, reduzindo disparos acidentais no fluxo assistido mesmo quando a fala vier consolidada em uma única linha.

### __Atualização 2026-03-31 20:10:00 -03__ ✓
- O primeiro retorno assistido agora traz um `summaryTitle` operacional em até 5 palavras, usado como título principal dos cards de sessão.
- O rascunho comercial voltou a incorporar a lista de serviços no corpo da proposta, para que o texto gerado reflita materiais e serviços antes da revisão final.
- O seletor visível de `Modelo de IA` foi reposicionado para cima do botão de envio, reforçando sua lembrança operacional sem ainda transformar essa escolha em etapa obrigatória do MVP.

### __Atualização 2026-03-31 20:30:00 -03__ ✓
- Após a confirmação de envio ao Bling, a interface volta automaticamente ao estado inicial para deixar o NEXA pronto para um novo orçamento.
- O formulário principal também ganhou uma ação local de `Cancelar`, ao lado do envio, para limpar a tela e descartar o contexto aberto sem depender de refresh manual.

### __Atualização 2026-03-31 20:45:00 -03__ ✓
- O seletor visível de `Modelo de IA` foi movido da tela inicial para a área do rascunho comercial, imediatamente antes da revisão assistida.
- Com isso, a escolha do modelo fica associada ao momento operacional correto de revisar e refinar o texto antes do envio ao Bling.

## FASES DO PROJETO

### __Fase 1 - Base documental operacional__ ✓
Objetivo:
- transformar a visão conceitual em especificação operacional pronta para implementação.

Entregas:
- __máquina de estados da conversa definida__ ✓
- __fluxo de aprovação com dupla confirmação definido__ ✓
- __modelo de dados inicial detalhado__ ✓
- __cenários que devem virar teste documentados__ ✓

Arquivos atualizados:
- [conversation-flow.md](/home/usuario/workspace/Antigravity/2026/NeXa/docs/architecture/conversation-flow.md)
- [approval-flow.md](/home/usuario/workspace/Antigravity/2026/NeXa/docs/architecture/approval-flow.md)
- [data-model.md](/home/usuario/workspace/Antigravity/2026/NeXa/docs/architecture/data-model.md)

Resultado:
- o projeto já possui especificação mínima coerente para iniciar implementação orientada por testes.

### __Fase 2 - Scaffold técnico inicial com TDD__ ✓
Objetivo:
- criar a base do backend em TypeScript com testes automatizados desde o primeiro ciclo.

Entregas:
- __projeto Node.js inicializado__ ✓
- __TypeScript configurado__ ✓
- __runner de testes configurado com `node:test`__ ✓
- __Fastify instalado e aplicação HTTP mínima criada__ ✓
- __scripts de build e teste configurados__ ✓

Arquivos criados ou atualizados:
- [package.json](/home/usuario/workspace/Antigravity/2026/NeXa/package.json)
- [tsconfig.json](/home/usuario/workspace/Antigravity/2026/NeXa/tsconfig.json)
- [create-app.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/app/create-app.ts)
- [create-app.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/create-app.test.ts)

Resultado:
- o backend já pode ser compilado e testado localmente.

### __Fase 3 - Núcleo do domínio de conversação__ ✓
Objetivo:
- implementar o primeiro núcleo puro de regras de negócio sem acoplamento com HTTP, banco ou integrações externas.

Entregas:
- __modelo de tipos do domínio de conversa criado__ ✓
- __criação de conversa implementada__ ✓
- __versionamento de rascunho implementado__ ✓
- __aprovação do rascunho implementada__ ✓
- __validação de canal dono da conversa implementada__ ✓
- __resolução de conflito inicial implementada__ ✓
- __timeout de 10 minutos implementado__ ✓
- __suspensão de análise implementada__ ✓
- __bloqueio de confirmação final sem resumo implementado__ ✓

Arquivos criados:
- [types.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/domain/conversation/types.ts)
- [conversation-machine.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/domain/conversation/conversation-machine.ts)
- [conversation-machine.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/conversation-machine.test.ts)

Resultado:
- o ciclo principal de estados da conversa já existe em código e com testes automatizados.

### __Fase 4 - Persistência inicial__ ✓
Objetivo:
- introduzir armazenamento simples e testável para conversas, versões e análises suspensas.

Entregas:
- __interface de repositório para `Conversation` criada__ ✓
- __interface de repositório para `SuspendedAnalysis` criada__ ✓
- __repositório em memória para `Conversation` implementado__ ✓
- __repositório em memória para `SuspendedAnalysis` implementado__ ✓
- __testes de salvar, buscar, listar e retomar implementados__ ✓
- __estrutura preparada para futura troca por PostgreSQL__ ✓

Arquivos criados:
- [conversation-repository.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/domain/conversation/conversation-repository.ts)
- [in-memory-conversation-repository.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/infrastructure/persistence/in-memory/in-memory-conversation-repository.ts)
- [in-memory-suspended-analysis-repository.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/infrastructure/persistence/in-memory/in-memory-suspended-analysis-repository.ts)
- [in-memory-conversation-repository.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/in-memory-conversation-repository.test.ts)

Critério de pronto:
- os casos de uso do domínio devem funcionar sem depender de variáveis globais ou estado implícito.

### Fase 5 - Casos de uso da aplicação
Objetivo:
- orquestrar domínio, persistência e fluxo de entrada de mensagens.

Entregas planejadas:
- __caso de uso inicial de recebimento de mensagem implementado__ ✓
- __caso de uso de edição de rascunho implementado__ ✓
- __caso de uso de aprovação do rascunho implementado__ ✓
- __caso de uso de suspensão por timeout implementado__ ✓
- __caso de uso de retomada de análise suspensa implementado__ ✓
- __caso de uso de confirmação final antes do Bling implementado__ ✓
- testes cobrindo o fluxo ponta a ponta no nível de aplicação.

Arquivos criados:
- [receive-message.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/receive-message.ts)
- [receive-message.use-case.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/receive-message.use-case.test.ts)
- [resume-suspended-analysis.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/resume-suspended-analysis.ts)
- [resume-suspended-analysis.use-case.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/resume-suspended-analysis.use-case.test.ts)
- [edit-draft.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/edit-draft.ts)
- [edit-draft.use-case.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/edit-draft.use-case.test.ts)
- [approve-draft.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/approve-draft.ts)
- [approve-draft.use-case.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/approve-draft.use-case.test.ts)
- [suspend-expired-conversation.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/suspend-expired-conversation.ts)
- [suspend-expired-conversation.use-case.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/suspend-expired-conversation.use-case.test.ts)
- [confirm-final-approval.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/confirm-final-approval.ts)
- [confirm-final-approval.use-case.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/confirm-final-approval.use-case.test.ts)

Critério de pronto:
- a aplicação deve conseguir simular, em teste, uma conversa completa sem integração externa.

### __Fase 5.1 - Exposição HTTP inicial__ ✓
Objetivo:
- expor o fluxo principal por HTTP interno sem introduzir integrações externas.

Entregas:
- __injeção de dependências na aplicação HTTP__ ✓
- __rota para recebimento de mensagem__ ✓
- __rota para edição de rascunho__ ✓
- __rota para aprovação de rascunho__ ✓
- __rota para retomada de análise suspensa__ ✓
- __rota para confirmação final antes do Bling__ ✓
- __rota para criação de orçamento via fronteira Bling__ ✓
- __testes HTTP com `inject` cobrindo o fluxo principal__ ✓

Arquivos criados ou atualizados:
- [create-app.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/app/create-app.ts)
- [http-routes.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/http-routes.test.ts)

Critério de pronto:
- os casos de uso principais devem estar acessíveis por rotas HTTP simples e testadas.

### Fase 6 - Integração de leitura com Bling
Objetivo:
- conectar o projeto ao histórico operacional real.

Entregas planejadas:
- __interface inicial de gateway para criação de orçamento definida__ ✓
- __gateway em memória para testes definido__ ✓
- __caso de uso inicial de criação de orçamento via fronteira Bling implementado__ ✓
- __adaptador HTTP inicial do Bling implementado e testado por contrato__ ✓
- __composição por ambiente preparada para escolher gateway do Bling__ ✓
- __bootstrap de runtime e leitura de configuração de ambiente implementados__ ✓
- __fluxo OAuth inicial do Bling implementado e testado localmente__ ✓
- __callback HTTP do OAuth do Bling implementado e testado localmente__ ✓
- __ponto de entrada executável para subir a aplicação local implementado__ ✓
- __leitura real de produtos do Bling validada__ ✓
- __catálogo local diário de produtos implementado__ ✓
- __cache em arquivo JSON para catálogo de produtos implementado__ ✓
- __sincronização real do catálogo local de produtos executada__ ✓
- __listagem real de propostas comerciais validada__ ✓
- __histórico local diário de propostas comerciais implementado__ ✓
- __cache em arquivo JSON para histórico de propostas comerciais implementado__ ✓
- __sincronização real do histórico local de propostas comerciais executada__ ✓
- __listagem real de notas de serviço validada__ ✓
- __histórico local diário de notas de serviço implementado__ ✓
- __cache em arquivo JSON para histórico de notas de serviço implementado__ ✓
- __sincronização real do histórico local de notas de serviço executada__ ✓
- __listagem real de contatos validada__ ✓
- __catálogo local diário de contatos implementado__ ✓
- __cache em arquivo JSON para catálogo de contatos implementado__ ✓
- __sincronização real do catálogo local de contatos executada__ ✓
- cliente de integração do Bling;
- autenticação inicial;
- leitura de situações e transições;
- primeira carga histórica para análise interna;
- testes de contrato e tratamento explícito de falhas.

Critério de pronto:
- o sistema deve conseguir importar e persistir histórico sem criar orçamento novo.

### Fase 7 - Criação de orçamento no Bling
Objetivo:
- executar a primeira ação operacional real com dupla confirmação.

Entregas planejadas:
- montagem do payload de orçamento;
- confirmação final obrigatória antes do envio;
- criação de orçamento no Bling;
- persistência do vínculo externo;
- preparação para PDF futuro;
- testes cobrindo sucesso, rejeição de validação e falha externa.

Critério de pronto:
- um orçamento aprovado deve poder ser criado com rastreabilidade completa.

### Fase 8 - Aprendizado assistido inicial
Objetivo:
- registrar uso real e começar a sugerir padrões sem autonomia irrestrita.

Entregas planejadas:
- registro de feedback do operador;
- registro de motivo de não avanço;
- contagem de recorrências;
- sugestão de padrões após no mínimo 3 recorrências;
- testes de elegibilidade e bloqueio de consolidação automática.

Critério de pronto:
- o sistema deve sugerir padrões, mas nunca consolidá-los sozinho.

### Fase 9 - Padrões por tipo de serviço
Objetivo:
- transformar histórico real em padrões úteis para orçamento.

Entregas planejadas:
- enriquecer `camera.md`;
- enriquecer `interfone.md`;
- enriquecer `iluminacao.md`;
- enriquecer `eletrica.md`;
- enriquecer `rede.md`;
- ligar padrões validados ao motor de sugestão.

Critério de pronto:
- o agente deve gerar sugestões melhores por categoria, com base documentada.

### Fase 10 - Camada de interpretação com OpenAI
Objetivo:
- adicionar uma camada de IA para interpretação, estruturação e sugestão, mantendo o backend no controle das regras críticas.

Entregas planejadas:
- __arquitetura da integração com OpenAI documentada__ ✓
- __pacote determinístico de contexto para IA implementado__ ✓
- __caso de uso de resposta assistida por IA implementado__ ✓
- __rota HTTP de resposta assistida por IA implementada__ ✓
- __Web App atualizada com fluxo assistido por IA__ ✓
- __gateway em memória para exercitar o fluxo assistido implementado__ ✓
- __entrada assistida simplificada para texto natural com extração inicial da IA__ ✓
- __Web App consolidada no formato final de interação principal__ ✓
- __gateway real da OpenAI com Responses API implementado__ ✓
- contrato interno do schema de saída da IA;
- endpoint interno para interpretação assistida;
- comparação lado a lado entre resposta local e resposta assistida na Web App;
- testes cobrindo contrato, falhas externas e validação do backend.

Arquivos criados:
- [openai.md](/home/usuario/workspace/Antigravity/2026/NeXa/docs/integrations/openai.md)
- [build-ai-budget-assistant-context.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/build-ai-budget-assistant-context.ts)
- [build-ai-budget-assistant-context.use-case.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/build-ai-budget-assistant-context.use-case.test.ts)
- [build-ai-assisted-agent-response.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/build-ai-assisted-agent-response.ts)
- [build-ai-assisted-agent-response.use-case.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/build-ai-assisted-agent-response.use-case.test.ts)
- [openai-budget-assistant-gateway.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/gateways/openai-budget-assistant-gateway.ts)
- [in-memory-openai-budget-assistant-gateway.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/infrastructure/integrations/openai/in-memory-openai-budget-assistant-gateway.ts)
- [ai-assisted-agent-response-route.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/ai-assisted-agent-response-route.test.ts)

Critério de pronto:
- a IA deve receber contexto rico e estruturado, mas continuar fora do caminho de execução operacional direta.

## STATUS ATUAL
- __especificação operacional inicial concluída__ ✓
- __scaffold técnico inicial concluído__ ✓
- __núcleo inicial do domínio de conversação concluído__ ✓
- __persistência inicial concluída__ ✓
- __casos de uso principais da aplicação concluídos__ ✓
- __integração inicial com Bling em andamento__ ✓
- __OAuth local com Bling validado__ ✓
- __leitura real de produtos validada__ ✓
- __catálogo local de produtos sincronizado__ ✓
- __leitura real de propostas comerciais validada__ ✓
- __histórico local de propostas comerciais sincronizado__ ✓
- __leitura real de notas de serviço validada__ ✓
- __histórico local de notas de serviço sincronizado__ ✓
- __leitura real de contatos validada__ ✓
- __catálogo local de contatos sincronizado__ ✓
- __busca cruzada local entre contatos e propostas implementada__ ✓
- integração com WhatsApp ainda não iniciada
- aprendizado assistido em código ainda não iniciado

## REGISTRO RECENTE
- __2026-03-30 - rota interna `/local/commercial-history/search` adicionada para cruzar contatos locais com propostas locais__ ✓
- __2026-03-30 - catálogo local de contatos sincronizado com 365 registros reais do Bling em `data/bling/contacts/catalog.json`__ ✓
- __2026-03-30 - throttle entre páginas adicionado ao fluxo de sincronização de contatos para respeitar o limite de 3 req/s do Bling__ ✓
- __2026-03-30 - histórico local de notas de serviço sincronizado com 321 registros reais do Bling em `data/bling/service-notes/history.json`__ ✓
- __2026-03-30 - endpoint público de ordem de serviço não encontrado de forma clara na OpenAPI atual do Bling; investigação permanece pendente__ ✓
- __2026-03-30 - histórico local de propostas comerciais sincronizado com 98 registros reais do Bling em `data/bling/quotes/history.json`__ ✓
- __2026-03-30 - listagem de propostas comerciais confirmada no endpoint `/propostas-comerciais` a partir do OpenAPI oficial e da API real__ ✓
- __2026-03-30 - schema local de produtos ampliado com preço, custo, estoque, tipo e status__ ✓
- __2026-03-30 - paginação do catálogo ajustada para continuar até a última página com lote incompleto__ ✓
- __2026-03-30 - catálogo local de produtos sincronizado com 803 itens reais do Bling em `data/bling/products/catalog.json`__ ✓

## TESTES JÁ IMPLEMENTADOS
- __criação de `v1`__ ✓
- __criação de `v2` sem sobrescrever `v1`__ ✓
- __aprovação da versão ativa__ ✓
- __rejeição de aprovação por canal inválido__ ✓
- __entrada em resolução de conflito__ ✓
- __timeout e suspensão da conversa__ ✓
- __bloqueio de confirmação final sem resumo__ ✓
- __healthcheck HTTP com Fastify__ ✓
- __persistência e busca de conversa em memória__ ✓
- __listagem de análises suspensas abertas__ ✓
- __retomada lógica de análise suspensa em repositório__ ✓
- __recebimento inicial de mensagem na camada de aplicação__ ✓
- __bloqueio de canal não autorizado na camada de aplicação__ ✓
- __identificação de conversa ativa ou análises suspensas__ ✓
- __retomada explícita de análise suspensa na camada de aplicação__ ✓
- __edição de rascunho na camada de aplicação__ ✓
- __aprovação de rascunho na camada de aplicação__ ✓
- __suspensão por timeout na camada de aplicação__ ✓
- __confirmação final antes do Bling na camada de aplicação__ ✓
- __rotas HTTP mínimas do fluxo principal__ ✓
- __confirmação final exposta por HTTP__ ✓
- __fronteira inicial do Bling criada para testes__ ✓
- __criação de orçamento via fronteira Bling exposta por HTTP__ ✓
- __adaptador HTTP do Bling preparado para substituir o gateway em memória__ ✓
- __seleção do gateway do Bling por ambiente implementada__ ✓
- __configuração de ambiente pronta para receber credenciais reais__ ✓
- __troca de authorization code por token preparada em código__ ✓
- __rota `/auth/bling/callback` pronta para capturar `code` real__ ✓
- __bootstrap local pronto para teste real do callback OAuth__ ✓

## PRÓXIMO PASSO RECOMENDADO
Iniciar a Fase 5 com TDD:
- preparar em seguida a confirmação final antes do Bling.
- preparar a confirmação final antes do Bling;
- avaliar se a próxima entrega deve ser a fronteira do Bling ou a camada de webhook WhatsApp.
- implementar futuramente uma camada de normalização canônica de materiais, com nome base, atributos técnicos e sinônimos para melhorar o casamento entre texto livre e catálogo real sem depender de regra específica por produto;
- preparar a fronteira da integração com o Bling;
- implementar a rota HTTP para disparar a criação do orçamento no gateway Bling;
- substituir o gateway em memória por cliente real da API do Bling;
- decidir a estratégia de autenticação inicial antes da chamada real;
- registrar e validar as credenciais reais do Bling no ambiente;
- criar o ponto de entrada executável para subir a aplicação com essas credenciais;
- subir a aplicação localmente e testar o callback com o app autorizado no Bling;
- executar o fluxo real de autorização no navegador;
- avaliar depois o webhook do WhatsApp como camada de entrada real.

## LOG DE PROGRESSO
- __2026-03-29__: documentação principal revisada e parecer técnico emitido. ✓
- __2026-03-29__: máquina de estados, aprovação e modelo de dados detalhados. ✓
- __2026-03-29__: regra global de TDD adotada para o projeto. ✓
- __2026-03-29__: scaffold TypeScript criado com testes automatizados. ✓
- __2026-03-29__: domínio inicial de conversação implementado com testes passando. ✓
- __2026-03-29__: aplicação HTTP mínima com Fastify implementada e testada. ✓
- __2026-03-29__: persistência inicial em memória implementada e testada. ✓
- __2026-03-29__: primeiro caso de uso da aplicação implementado e testado. ✓
- __2026-03-30__: retomada explícita de análise suspensa implementada e testada. ✓
- __2026-03-30__: edição de rascunho na camada de aplicação implementada e testada. ✓
- __2026-03-30__: aprovação de rascunho na camada de aplicação implementada e testada. ✓
- __2026-03-30__: suspensão por timeout na camada de aplicação implementada e testada. ✓
- __2026-03-30__: fluxo principal exposto por HTTP e testado. ✓
- __2026-03-30__: confirmação final antes do Bling implementada e testada. ✓
- __2026-03-30__: confirmação final exposta por HTTP e testada. ✓
- __2026-03-30__: fronteira inicial do Bling implementada com contrato e gateway em memória. ✓
- __2026-03-30__: criação de orçamento via fronteira Bling exposta por HTTP e testada. ✓
- __2026-03-30__: adaptador HTTP inicial do Bling implementado e testado localmente. ✓
- __2026-03-30__: composição por ambiente preparada para alternar entre gateway fake e gateway HTTP do Bling. ✓
- __2026-03-30__: bootstrap de ambiente e runtime implementados e testados. ✓
- __2026-03-30__: fluxo OAuth inicial do Bling implementado e testado localmente. ✓
- __2026-03-30__: callback HTTP do OAuth do Bling implementado e testado localmente. ✓
- __2026-03-30__: ponto de entrada executável para subir a aplicação local implementado e testado. ✓
- __2026-03-30__: integração real da OpenAI conectada ao fluxo assistido da Web App. ✓
- __2026-03-30__: resposta operacional assistida pela IA simplificada para blocos de orçamento, trabalhos, materiais, serviços e pesquisa de mão de obra. ✓
- __2026-03-30__: pipeline de extração assistida endurecido com sanitização local e ranking mais rígido para materiais de rede. ✓
- __2026-03-30__: fluxo de retrieval + rerank com seleção explícita de item de catálogo pela IA implementado. ✓
- __2026-03-30__: persistência da sessão assistida de orçamento implementada com listagem e carregamento por id. ✓
- __2026-03-30__: backlog registrado para normalização canônica futura de materiais, atributos técnicos e sinônimos. ✓
- __2026-03-30__: estimativa inicial fraca de mão de obra passou a ser exigida já na primeira resposta assistida da IA, usando materiais normalizados e descrição do trabalho. ✓
- __2026-03-30__: estimativa inicial de mão de obra ampliada para incluir faixa textual de valor, faixa textual de horas, base usada e confiança no primeiro retorno assistido. ✓
- __2026-03-30__: reforço do contrato para faixa de mão de obra em reais e fallback local fraco implementado quando o modelo omitir o valor inicial. ✓
- __2026-03-30__: sessões recentes da Web App ganharam ações de continuar e apagar, com exclusão persistida por HTTP. ✓
- __2026-03-30__: exclusão de sessão na Web App protegida com dupla confirmação, exibindo cliente/resumo e depois data de criação. ✓
- __2026-03-30__: troca de sessão via botão `Continuar` passou a tratar texto novo não salvo e revisão de sessão carregada, com opção de guardar, atualizar ou ignorar antes de trocar de contexto. ✓
- __2026-03-30__: sessões assistidas passaram a suportar aprovação e cancelamento explícitos por status, com botões dedicados na Web App e rotas HTTP próprias. ✓
- __2026-03-30__: sessões aprovadas passaram a gerar rascunho inicial de proposta comercial diretamente na Web App, sem integração com Bling nesta etapa. ✓
- __2026-03-30__: rascunho comercial passou a suportar confirmação final e transição para `Finalizada`, mantendo reabertura para revisão antes da futura execução externa. ✓
## NOTAS DE ACOMPANHAMENTO DO MVP

- a etapa de envio ao Bling agora falha rápido com timeout e erro explícito na Web App, mantendo o MVP testável mesmo quando a API externa estiver lenta ou indisponível;
- o envio ao Bling agora usa o endpoint correto de proposta comercial e exige cliente resolvido antes da entrega;
- o MVP agora mantém o cliente resolvido preso à sessão assistida desde o início do fluxo, reduzindo erros de resolução tardia no envio ao Bling;
- a revisão da proposta agora suporta edição manual e salvamento explícito do corpo comercial antes da entrega final ao Bling;
- o MVP agora registra logs operacionais amplos durante os testes da interface, incluindo tráfego HTTP e eventos das integrações com OpenAI e Bling, para facilitar diagnóstico antes da redução futura da política de logging;
- a etapa de rascunho da proposta agora suporta uma passada explícita de revisão por IA sobre o texto editado, retornando crítica e versão sugerida que continuam apenas como apoio até o usuário salvar o texto final;
- a interface agora expõe uma área visível, porém ainda não funcional, de configurações pós-MVP, incluindo nível de log, escolha de modelo de IA, tema visual e comportamento de revisão;
- o ciclo de revisão da proposta agora suporta aceitar uma sugestão editada da IA para dentro do rascunho principal, permitindo refinamento antes da consolidação do corpo comercial final;
- o ciclo de revisão da proposta agora também suporta rejeição explícita, fazendo o estado temporário de revisão desaparecer sem alterar o rascunho principal;
- o MVP agora trata a validade do token do Bling como preocupação operacional da aplicação: o vencimento é persistido localmente, exposto no painel de configurações e verificado antes de chamadas HTTP reais, com renovação manual disponível na interface;
- a entrega ao Bling agora reflete melhor a estrutura da proposta aprovada: o texto comercial vai para `introducao`, materiais compatíveis seguem como itens e artefatos finalizados continuam destacados visualmente também quando são promovidos para modelos;
- a etapa de interpretação assistida agora pede à IA que sempre retorne linhas de serviço com valores aproximados em reais, para que a primeira passada já exponha preços editáveis antes do ciclo de revisão da proposta;
- a etapa de revisão da proposta agora pede à IA que aproxime valores de serviço e mão de obra do mercado local e reformate o texto com melhor espaçamento para a apresentação do orçamento no Bling;
- a escolha de modelo para revisão deixou de ser apenas placeholder e agora atua como override local, aplicado somente à chamada de revisão do rascunho comercial.
- a escolha de `Modelo de IA` nas configurações da Web App agora atua como padrão persistido no navegador para as etapas principais do NEXA, separada do override pontual usado apenas na revisão do rascunho.
- a revisão do rascunho agora também orienta a IA a incluir somas e subtotais aproximados no corpo do orçamento, para apoiar a conferência e o ajuste manual antes do envio ao Bling.
- a IA agora também foi orientada a derivar metragens e quantidades aproximadas de materiais lineares ou proporcionais usando distâncias, tubulações, rotas e outras pistas do contexto técnico quando o texto não trouxer medidas exatas.
- a interpretação inicial agora também usa heurísticas assistidas de infraestrutura para lembrar fixações e acessórios correlatos quando houver eletrodutos, conduletes, suportes e caixas de passagem no contexto.
- backlog pós-MVP: expandir heurísticas assistidas de fixação por porte do item e geometria aproximada, por exemplo caixas pequenas usando cerca de 2 buchas/parafusos e itens maiores usando 4 ou mais, sempre ponderando superfície, peso e contexto de instalação.
- o ciclo de proposta agora também sincroniza o cliente a partir da linha `Cliente:` do rascunho salvo ou aceito, e a confirmação final ao Bling passou a considerar o cliente presente no corpo comercial revisado como fonte adicional de resolução de contato.
- a resolução de cliente para o envio final ao Bling agora também considera semelhança por tokens relevantes entre o nome operacional do orçamento e o cadastro formal do contato, reduzindo falhas quando o texto usa formas abreviadas do cliente.
- o aceite da revisão da proposta agora também passou a acionar uma etapa intermediária de reconciliação assistida dos materiais, usando a lista gerada pelo modelo e a shortlist local do backend para consolidar a seção final de materiais antes do envio ao Bling.
- o timeout padrão das chamadas assistidas da OpenAI foi ampliado para 120 segundos, sem trocar o modelo atual do fluxo.
- as telas de espera do orçamento e da revisão agora exibem o tempo total restante da operação, com atualização visual do status mantida a cada 5 segundos.
- a confirmação final ao Bling agora também adiciona a mão de obra média como item de serviço usando o produto `Mão de Obra - SERVIÇOS DIVERSOS`, convertendo o valor médio total em quantidade quando o preço unitário cadastrado for R$ 1,00.
- a regra do item de mão de obra no envio ao Bling foi refinada para usar apenas as linhas da seção `Serviços contemplados` do rascunho comercial final, evitando misturar totais de materiais ou subtotais globais na quantidade do serviço.
- a última revisão do rascunho agora orienta a IA a escrever a linha explícita `Soma mínima da mão de obra:` em reais, e o envio final ao Bling passa a usar essa linha como fonte prioritária com base na soma dos menores valores estimados dos serviços.
- o backend agora aplica uma checagem final de aderência da shortlist antes de montar os itens da proposta no Bling, reduzindo falsos positivos em acessórios e embalagens quando o item reconciliado ainda vier semanticamente incorreto.
- o ciclo de `Salvar mudanças` do rascunho agora também reprocessa a seção `Materiais previstos` usando o catálogo inteiro local, para melhorar a assertividade dos materiais finais sem depender apenas da shortlist original do primeiro fluxo.
- a etapa de proposta agora usa `proposalDraft.materialItems` como fonte visual principal quando a consolidação já existe, reduzindo a confusão entre lista inicial interpretada e lista final reconciliada.
- a normalização da seção `Materiais previstos` passou a remover repetições antes de inserir a versão consolidada mais recente no corpo comercial.
- o resumo financeiro exibido na proposta agora pode ser recalculado a partir dos produtos efetivamente vinculados ao catálogo local, aproximando a conferência de materiais do valor real que será usado no fechamento.
- a tela de revisão da proposta agora compartilha o mesmo contador total de 120 segundos da operação principal, mantendo a mensagem de espera mais curta e direta.
- o fluxo de materiais do rascunho agora também trata remoção explícita: ao excluir a seção `Materiais previstos`, a sessão passa a limpar materiais reconciliados e resumo financeiro associado em vez de manter itens antigos invisíveis.
- o aceite da revisão passou a reconciliar materiais a partir do corpo aceito pelo usuário, preservando alterações feitas diretamente no editor de revisão antes da consolidação final.
- o envio ao Bling agora prioriza o `catalogItemId` já consolidado no rascunho sempre que esse produto ainda existir no catálogo local, reduzindo regressões causadas pela shortlist antiga.
