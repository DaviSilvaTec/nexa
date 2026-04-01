# CHANGELOG DO PROJETO

## FUNÇÃO DESTE ARQUIVO
Registrar mudanças relevantes do projeto, decisões práticas, aprendizados técnicos e comportamentos observados em integrações reais.

## QUANDO CONSULTAR
Consultar este arquivo ao:
- revisar o que mudou no projeto;
- entender decisões recentes;
- verificar aprendizados descobertos na prática;
- confirmar limitações observadas em integrações externas;
- retomar contexto depois de pausas.

## RELAÇÃO COM OUTROS ARQUIVOS
- É subordinado a `../AGENTS.md`.
- Complementa `implementation-plan.md`, que registra o plano e o status macro.
- Deve registrar fatos práticos que impactam implementação, testes, arquitetura ou operação.

## REGRAS DE REGISTRO
- cada entrada deve ter data e horário no fuso do projeto;
- registrar mudanças implementadas, correções, decisões e aprendizados;
- registrar também descobertas negativas, como comportamentos esperados que não funcionaram;
- sempre que possível, citar arquivos impactados ou área afetada;
- não registrar segredos, tokens ou credenciais;
- usar linguagem objetiva e factual.

## ENTRADAS

### 2026-04-01 21:40:00 -03
- __Revisão obrigatória passou a devolver cliente e materiais estruturados, e a prévia do Bling passou a priorizar essa revisão__ ✓
- O contrato de `reviewProposalDraft` foi ampliado para devolver, além do texto revisado, um `resolvedCustomer` estruturado e uma lista `resolvedMaterialItems` com descrição, quantidade textual e vínculo opcional ao catálogo local.
- O caso de uso `reviewAiBudgetProposalDraft` passou a persistir esse retorno estruturado dentro de `proposalDraftReview`, junto do rascunho sugerido, das notas de ajuste e da confiança.
- A interface da revisão agora exibe explicitamente o `Cliente sugerido` e a lista `Materiais sugeridos para envio`, incluindo o nome do item do catálogo quando o modelo conseguir apontar uma correspondência.
- A aba `Prévia Bling` passou a priorizar os materiais e o cliente vindos de `proposalDraftReview` quando essa revisão existir; quando não houver revisão estruturada, ela continua caindo para os materiais consolidados do rascunho ou da interpretação inicial.
- Comportamento ainda observado nesta etapa: após `Aceitar revisão`, a escolha de materiais e cliente já atravessa corretamente a prévia, mas a `quantityText` nem sempre aparece consolidada na tabela da prévia, mesmo quando está correta no corpo do texto comercial. Esse ajuste permanece pendente para a etapa seguinte do fluxo.
- Arquivos impactados:
- [openai-budget-assistant-gateway.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/gateways/openai-budget-assistant-gateway.ts)
- [openai-http-budget-assistant-gateway.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/infrastructure/integrations/openai/openai-http-budget-assistant-gateway.ts)
- [in-memory-openai-budget-assistant-gateway.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/infrastructure/integrations/openai/in-memory-openai-budget-assistant-gateway.ts)
- [review-ai-budget-proposal-draft.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/review-ai-budget-proposal-draft.ts)
- [app.html](/home/usuario/workspace/Antigravity/2026/NeXa/public/app.html)
- [review-ai-budget-proposal-draft.use-case.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/review-ai-budget-proposal-draft.use-case.test.ts)
- [openai-http-budget-assistant-gateway.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/openai-http-budget-assistant-gateway.test.ts)
- [ai-assisted-agent-response-route.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/ai-assisted-agent-response-route.test.ts)

### 2026-04-01 15:20:00 -03
- __Revisão assistida passou a usar o pedido original como contexto e as instruções adicionais do operador__ ✓
- O contrato de `reviewProposalDraft` foi ampliado para receber `reviewInstructions`, além de `originalText`, `proposalDraft`, `reviewBehavior` e `modelOverride`.
- O caso de uso `reviewAiBudgetProposalDraft` agora lê `proposalDraft.reviewInstructions` da sessão persistida e envia esse conteúdo ao gateway de revisão.
- O prompt HTTP da OpenAI passou a deixar explícito que o texto original transcrito é apenas referência de contexto do pedido inicial, não texto final a ser copiado automaticamente.
- O mesmo prompt agora orienta o modelo a comparar o pedido original, o rascunho atual e as instruções adicionais do operador, priorizando essas instruções quando houver conflito explícito.
- O gateway em memória também passou a refletir as instruções adicionais nas notas da revisão simulada, para manter o comportamento de teste coerente com o contrato real.
- Arquivos impactados:
- [openai-budget-assistant-gateway.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/gateways/openai-budget-assistant-gateway.ts)
- [review-ai-budget-proposal-draft.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/review-ai-budget-proposal-draft.ts)
- [in-memory-openai-budget-assistant-gateway.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/infrastructure/integrations/openai/in-memory-openai-budget-assistant-gateway.ts)
- [openai-http-budget-assistant-gateway.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/infrastructure/integrations/openai/openai-http-budget-assistant-gateway.ts)
- [review-ai-budget-proposal-draft.use-case.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/review-ai-budget-proposal-draft.use-case.test.ts)
- [openai-http-budget-assistant-gateway.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/openai-http-budget-assistant-gateway.test.ts)

### 2026-04-01 15:00:00 -03
- __Rascunho comercial ganhou campo persistido de instruções para revisão com ditado próprio__ ✓
- A área de `Proposta Comercial` agora renderiza um campo adicional `Instruções para revisão` logo abaixo do rascunho principal quando a sessão está em `Proposta comercial pronta`.
- Esse campo possui microfone próprio, usando a mesma infraestrutura de reconhecimento de voz da entrada principal, mas com mensagens específicas para orientar a captura das instruções de ajuste.
- O salvamento do rascunho passou a persistir `reviewInstructions` dentro de `proposalDraft`, sem depender do bloco temporário de revisão assistida.
- A geração inicial do rascunho agora já cria `proposalDraft.reviewInstructions` como string vazia, para manter a estrutura persistida estável desde o primeiro `proposal-draft`.
- Nesta etapa, o campo já existe na interface e já é salvo no backend, mas ainda não altera o payload enviado para a revisão assistida; essa integração fica na etapa seguinte.
- Arquivos impactados:
- [app.html](/home/usuario/workspace/Antigravity/2026/NeXa/public/app.html)
- [create-app.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/app/create-app.ts)
- [generate-ai-budget-proposal-draft.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/generate-ai-budget-proposal-draft.ts)
- [update-ai-budget-proposal-draft.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/update-ai-budget-proposal-draft.ts)
- [update-ai-budget-proposal-draft.use-case.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/update-ai-budget-proposal-draft.use-case.test.ts)
- [ai-assisted-agent-response-route.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/ai-assisted-agent-response-route.test.ts)

### 2026-04-01 14:05:00 -03
- __Painel de Configurações passou a ter comportamento real e persistido na Web App__ ✓
- O grupo `Log` agora controla de fato a visibilidade do console lateral local e revela o seletor `Nível de log`, que filtra a saída por severidade entre `debug`, `warn` e `error`.
- O grupo `Modelo` passou a controlar a escolha persistida do modelo padrão do NEXA no navegador. Quando habilitado, esse modelo segue para a análise inicial do orçamento e também é usado como valor inicial do seletor visível na etapa de revisão do rascunho.
- O grupo `Tema` passou a alternar entre três variações reais da interface (`Clássico NEXA`, `Compacto operacional` e `Contraste alto`) usando `data-theme` no `body` e persistência em `localStorage`.
- O grupo `Revisão` agora controla um modo persistido de comportamento da revisão (`manual`, `double-check` ou `suggestion-only`), enviado do front para o backend e incorporado ao prompt de revisão da OpenAI.
- O grupo `Foco` passou a decidir se a `textarea` principal recebe foco automaticamente ao carregar uma sessão ou iniciar uma sessão a partir de modelo.
- Toda a configuração funcional dessa etapa passou a ser persistida no navegador via `localStorage`.
- Arquivos impactados:
- [app.html](/home/usuario/workspace/Antigravity/2026/NeXa/public/app.html)
- [create-app.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/app/create-app.ts)
- [openai-budget-assistant-gateway.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/gateways/openai-budget-assistant-gateway.ts)
- [review-ai-budget-proposal-draft.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/review-ai-budget-proposal-draft.ts)
- [in-memory-openai-budget-assistant-gateway.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/infrastructure/integrations/openai/in-memory-openai-budget-assistant-gateway.ts)
- [openai-http-budget-assistant-gateway.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/infrastructure/integrations/openai/openai-http-budget-assistant-gateway.ts)
- [review-ai-budget-proposal-draft.use-case.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/review-ai-budget-proposal-draft.use-case.test.ts)

### 2026-04-01 12:55:00 -03
- __Walkthrough detalhado do sistema foi recriado como base documental da nova rodada de implementação__ ✓
- O arquivo `docs/architecture/system-walkthrough.md` foi recriado para documentar o funcionamento atual do NEXA ponta a ponta com base no código real, cobrindo bootstrap, configuração, camadas, rotas, fluxo assistido, proposta comercial, envio ao Bling, modelos e funções centrais.
- O índice principal em `docs/README.md` passou a apontar explicitamente para esse walkthrough como leitura recomendada após backend e estrutura de projeto.
- A regra operacional desta fase ficou reforçada: cada etapa validada deve continuar sendo registrada tanto no `changelog` quanto no walkthrough detalhado.
- Arquivos impactados:
- [docs/architecture/system-walkthrough.md](/home/usuario/workspace/Antigravity/2026/NeXa/docs/architecture/system-walkthrough.md)
- [docs/README.md](/home/usuario/workspace/Antigravity/2026/NeXa/docs/README.md)

### 2026-04-01 13:20:00 -03
- __Painel de Configurações foi reorganizado visualmente em lista vertical com ajuda contextual por clique__ ✓
- O bloco `Configurações` da Web App deixou a grade simples de labels e passou para um formato de lista vertical com grupos compactos, nomes curtos (`Log`, `Modelo`, `Tema`, `Revisão`, `Foco`) e um indicador `i` que abre ajuda contextual por clique.
- Nesta etapa a mudança foi apenas visual e estrutural: os grupos e popovers já existem, mas os checkboxes continuam desabilitados e as opções ainda não ganharam comportamento real.
- O seletor `Modelo de IA` continua visível dentro do grupo `Modelo`, mantendo o estado anterior do sistema.
- Arquivo impactado:
- [app.html](/home/usuario/workspace/Antigravity/2026/NeXa/public/app.html)

### 2026-03-31 20:45:00 -03
- __Seletor visível de modelo foi reposicionado para a etapa de revisão do rascunho__ ✓
- O seletor operacional de `Modelo de IA` deixou a tela inicial de envio ao NEXA e passou para o bloco do rascunho comercial, logo acima do botão `Mandar pra revisão`.
- A opção continua disponível em `Configurações` como referência geral, mas o ponto visível do fluxo agora fica alinhado à hora certa de trocar o modelo antes da revisão assistida.
- Arquivos impactados:
- [app.html](/home/usuario/workspace/Antigravity/2026/NeXa/public/app.html)
- [create-app.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/create-app.test.ts)

### 2026-03-31 20:30:00 -03
- __Tela do orçamento passou a se preparar automaticamente para um novo envio após confirmação no Bling__ ✓
- Depois do envio confirmado ao Bling, a interface agora limpa o formulário, remove o contexto ativo da sessão/modelo e volta ao estado inicial, pronta para um novo orçamento.
- O formulário principal também ganhou o botão `Cancelar` ao lado de `Enviar ao NEXA`, com o mesmo comportamento de limpeza local da tela mediante confirmação.
- Arquivos impactados:
- [app.html](/home/usuario/workspace/Antigravity/2026/NeXa/public/app.html)
- [create-app.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/create-app.test.ts)

### 2026-03-31 20:10:00 -03
- __Título operacional das sessões passou a vir da IA e a proposta voltou a incorporar os serviços no texto comercial__ ✓
- A interpretação inicial do orçamento agora exige `summaryTitle`, um resumo operacional em até 5 palavras para nomear os cards de sessão com mais clareza do que o recorte do texto original.
- A listagem de sessões passou a persistir e exibir esse título resumido sempre que ele estiver disponível.
- A geração do rascunho comercial voltou a incluir os serviços contemplados no corpo da proposta, junto dos materiais previstos, mantendo `Pontos de atenção` fora do texto enviado ao Bling.
- O seletor visível de `Modelo de IA` foi movido para cima do botão `Enviar ao NEXA`, para reforçar esse passo na operação durante a revisão.
- Arquivos impactados:
- [openai-budget-assistant-gateway.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/gateways/openai-budget-assistant-gateway.ts)
- [openai-http-budget-assistant-gateway.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/infrastructure/integrations/openai/openai-http-budget-assistant-gateway.ts)
- [in-memory-openai-budget-assistant-gateway.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/infrastructure/integrations/openai/in-memory-openai-budget-assistant-gateway.ts)
- [ai-budget-session-repository.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/repositories/ai-budget-session-repository.ts)
- [file-system-ai-budget-session-repository.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/infrastructure/persistence/file-system/file-system-ai-budget-session-repository.ts)
- [in-memory-ai-budget-session-repository.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/infrastructure/persistence/in-memory/in-memory-ai-budget-session-repository.ts)
- [generate-ai-budget-proposal-draft.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/generate-ai-budget-proposal-draft.ts)
- [app.html](/home/usuario/workspace/Antigravity/2026/NeXa/public/app.html)

### 2026-03-31 10:35:00 -03
- __Modelos passaram a distinguir `Usar` de `Editar` para propostas já enviadas ao Bling__ ✓
- O modelo agora preserva a referência da proposta comercial do Bling (`id` e `número`) quando nasce de uma sessão finalizada.
- A aba `Modelos` ganhou dois fluxos distintos:
- `Usar modelo` cria uma nova sessão pronta para proposta, sem levar a referência do Bling, para gerar uma proposta nova.
- `Editar` cria uma nova sessão pronta para proposta já vinculada ao `id` da proposta comercial existente, permitindo editar e reenviar a mesma proposta no Bling.
- O envio final ao Bling passou a decidir entre `criar` ou `atualizar` a proposta comercial com base nessa referência preservada.
- Arquivos impactados:
- [bling-quote-gateway.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/gateways/bling-quote-gateway.ts)
- [confirm-ai-budget-proposal.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/confirm-ai-budget-proposal.ts)
- [start-ai-budget-session-from-model.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/start-ai-budget-session-from-model.ts)
- [create-ai-budget-model-from-session.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/create-ai-budget-model-from-session.ts)
- [ai-budget-model-repository.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/repositories/ai-budget-model-repository.ts)
- [bling-http-quote-gateway.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/infrastructure/integrations/bling/bling-http-quote-gateway.ts)
- [in-memory-bling-quote-gateway.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/infrastructure/integrations/bling/in-memory-bling-quote-gateway.ts)
- [app.html](/home/usuario/workspace/Antigravity/2026/NeXa/public/app.html)

### 2026-03-31 14:20:00 -03
- __Tela de espera do NEXA passou a acompanhar o progresso real da operação assistida__ ✓
- O envio de texto para análise assistida agora inicia uma operação assíncrona com status consultável por rota própria.
- A interface web passou a mostrar mensagens amigáveis por etapa real do processamento, com contagem regressiva de atualização a cada 5 segundos.
- As fases atuais expostas são: leitura da solicitação, cruzamento com base local, interpretação final com IA e salvamento da sessão.
- A integração com OpenAI também passou a ter timeout controlado, evitando travamentos indefinidos do fluxo.
- Arquivos impactados:
- [ai-agent-operation-store.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/app/ai-agent-operation-store.ts)
- [create-app.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/app/create-app.ts)
- [build-ai-assisted-agent-response.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/build-ai-assisted-agent-response.ts)
- [create-ai-budget-session.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/create-ai-budget-session.ts)
- [openai-http-budget-assistant-gateway.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/infrastructure/integrations/openai/openai-http-budget-assistant-gateway.ts)
- [app.html](/home/usuario/workspace/Antigravity/2026/NeXa/public/app.html)

### 2026-03-31 18:35:00 -03
- __Fluxo de edição via modelo ficou mais claro e preserva a referência anterior do Bling__ ✓
- O cabeçalho da sessão agora mostra explicitamente qual proposta do Bling está sendo editada, com número de referência e `id`.
- Os cards da lista passaram a exibir um título resumido do serviço e, logo abaixo, a identificação do cliente.
- Quando o Bling responde `numero = 0` após uma edição, o NEXA agora preserva localmente o número de referência anterior para não poluir modelos e sessões com um identificador pior que o já conhecido.
- Arquivos impactados:
- [confirm-ai-budget-proposal.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/confirm-ai-budget-proposal.ts)
- [create-ai-budget-model-from-session.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/create-ai-budget-model-from-session.ts)
- [app.html](/home/usuario/workspace/Antigravity/2026/NeXa/public/app.html)
- [confirm-ai-budget-proposal.use-case.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/confirm-ai-budget-proposal.use-case.test.ts)
- [create-ai-budget-model-from-session.use-case.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/create-ai-budget-model-from-session.use-case.test.ts)

### 2026-03-31 19:05:00 -03
- __Envio ao Bling passou a corrigir automaticamente a sequência quando a proposta nasce com número zero__ ✓
- O gateway do Bling agora tenta reaproveitar o número conhecido em edições e, quando uma proposta nova volta com `numero = 0`, consulta a sequência recente e corrige imediatamente a própria proposta com o próximo número válido.
- A validação prática na API confirmou que o Bling aceita ajuste manual de `numero` via `PUT` em propostas comerciais.
- Arquivos impactados:
- [bling-quote-gateway.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/gateways/bling-quote-gateway.ts)
- [confirm-ai-budget-proposal.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/confirm-ai-budget-proposal.ts)
- [bling-http-quote-gateway.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/infrastructure/integrations/bling/bling-http-quote-gateway.ts)
- [in-memory-bling-quote-gateway.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/infrastructure/integrations/bling/in-memory-bling-quote-gateway.ts)
- [bling-http-quote-gateway.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/bling-http-quote-gateway.test.ts)

### 2026-03-31 19:20:00 -03
- __Envio manual ao NEXA passou a exigir confirmação explícita e texto minimamente completo__ ✓
- O formulário principal agora mantém o botão `Enviar ao NEXA` desabilitado até que o operador marque a caixa `Terminado`.
- No envio, a interface agora valida se o texto possui pelo menos 30 palavras, evitando disparos acidentais com conteúdo curto demais, inclusive nos casos de fala convertida em uma única linha.
- A troca de sessão, abertura de modelo e limpeza de contexto passaram a resetar essa confirmação para forçar uma nova checagem consciente antes de cada envio.
- A tela de espera do processamento também deixou de citar a OpenAI explicitamente e agora se comunica apenas como NEXA para o operador.
- Arquivos impactados:
- [app.html](/home/usuario/workspace/Antigravity/2026/NeXa/public/app.html)
- [create-app.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/create-app.test.ts)

### 2026-03-30 18:41:00 -03
- __Confirmação da proposta passou a enviar o orçamento ao Bling no fluxo assistido__ ✓
- O botão final da proposta comercial deixou de apenas marcar a sessão e passou a criar efetivamente o orçamento no Bling usando o rascunho comercial gerado.
- O retorno do Bling agora fica salvo na sessão em `blingQuote`, com exibição de ID e número no bloco da proposta.
- A confirmação foi tornada idempotente no nível da sessão: se o orçamento já tiver sido enviado, o registro salvo é reutilizado em vez de criar duplicidade por nova confirmação.
- Arquivos impactados:
- [confirm-ai-budget-proposal.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/confirm-ai-budget-proposal.ts)
- [create-app.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/app/create-app.ts)
- [app.html](/home/usuario/workspace/Antigravity/2026/NeXa/public/app.html)
- [confirm-ai-budget-proposal.use-case.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/confirm-ai-budget-proposal.use-case.test.ts)
- [ai-assisted-agent-response-route.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/ai-assisted-agent-response-route.test.ts)
- [create-app.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/create-app.test.ts)

### 2026-03-30 18:22:00 -03
- __Biblioteca de modelos reaproveitáveis adicionada ao fluxo Web__ ✓
- Sessões finalizadas agora podem ser convertidas em modelos por `+ Modelo`.
- O salvamento como modelo ocorre em repositório próprio e, após confirmação e persistência bem-sucedida, a sessão correspondente é removida da lista de sessões.
- A interface ganhou uma aba separada de `Modelos`, com ações `Usar modelo` e `Apagar`.
- O texto comercial salvo no modelo usa o rascunho da proposta, permitindo carregar esse conteúdo de volta para edição antes de novo envio.
- Arquivos impactados:
- [ai-budget-model-repository.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/repositories/ai-budget-model-repository.ts)
- [create-ai-budget-model-from-session.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/create-ai-budget-model-from-session.ts)
- [list-ai-budget-models.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/list-ai-budget-models.ts)
- [get-ai-budget-model.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/get-ai-budget-model.ts)
- [delete-ai-budget-model.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/delete-ai-budget-model.ts)
- [file-system-ai-budget-model-repository.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/infrastructure/persistence/file-system/file-system-ai-budget-model-repository.ts)
- [in-memory-ai-budget-model-repository.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/infrastructure/persistence/in-memory/in-memory-ai-budget-model-repository.ts)
- [create-app.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/app/create-app.ts)
- [build-app-dependencies.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/app/build-app-dependencies.ts)
- [app.html](/home/usuario/workspace/Antigravity/2026/NeXa/public/app.html)

### 2026-03-30 17:54:00 -03
- __Confirmação da proposta comercial passou a exigir rascunho prévio__ ✓
- A ação `Confirmar proposta` deixou de ser apenas uma troca genérica de status.
- Agora o backend exige que a sessão já tenha um rascunho comercial gerado antes de permitir a confirmação.
- A confirmação também registra metadados próprios no payload da sessão, incluindo `confirmedAt`, e a interface passou a exibir essa informação no bloco da proposta comercial.
- Tentativas de confirmar sem rascunho passam a retornar conflito de fluxo em vez de avançar silenciosamente.
- Arquivos impactados:
- [confirm-ai-budget-proposal.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/confirm-ai-budget-proposal.ts)
- [create-app.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/app/create-app.ts)
- [app.html](/home/usuario/workspace/Antigravity/2026/NeXa/public/app.html)
- [confirm-ai-budget-proposal.use-case.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/confirm-ai-budget-proposal.use-case.test.ts)
- [ai-assisted-agent-response-route.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/ai-assisted-agent-response-route.test.ts)

### 2026-03-30 12:49:20 -03
- __Formato da resposta assistida pela IA simplificado para orçamento operacional__ ✓
- A interpretação final da IA foi ajustada para devolver blocos mais próximos do uso real:
- descrição do orçamento;
- descrição dos trabalhos;
- lista de materiais;
- lista de serviços;
- status resumido da pesquisa de mão de obra;
- pendências, pontos de atenção e sugestões.
- Essa mudança reduz ruído taxonômico e aproxima o retorno do formato operacional esperado para o NEXA.
- Arquivos impactados:
- [openai-budget-assistant-gateway.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/gateways/openai-budget-assistant-gateway.ts)
- [openai-http-budget-assistant-gateway.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/infrastructure/integrations/openai/openai-http-budget-assistant-gateway.ts)
- [in-memory-openai-budget-assistant-gateway.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/infrastructure/integrations/openai/in-memory-openai-budget-assistant-gateway.ts)
- [build-ai-assisted-agent-response.use-case.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/build-ai-assisted-agent-response.use-case.test.ts)
- [ai-assisted-agent-response-route.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/ai-assisted-agent-response-route.test.ts)
- [openai-http-budget-assistant-gateway.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/openai-http-budget-assistant-gateway.test.ts)
- [app.html](/home/usuario/workspace/Antigravity/2026/NeXa/public/app.html)

### 2026-03-30 12:32:03 -03
- __Parser da Responses API ajustado para resposta real observada__ ✓
- Durante o primeiro teste real com a OpenAI, a API não retornou `output_text` no formato esperado pelo gateway.
- O parser foi ajustado para aceitar também o texto vindo em `output[].content[].text` quando o campo `output_text` não vier preenchido.
- Isso alinha o projeto ao comportamento real observado no retorno da Responses API.
- Arquivos impactados:
- [openai-http-budget-assistant-gateway.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/infrastructure/integrations/openai/openai-http-budget-assistant-gateway.ts)
- [openai-http-budget-assistant-gateway.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/openai-http-budget-assistant-gateway.test.ts)

### 2026-03-30 12:27:15 -03
- __Comparação prática de modelos da OpenAI iniciada pelo baseline mais barato__ ✓
- Decisão tomada: começar os testes reais do fluxo assistido com `gpt-5-nano` para estabelecer a linha de base de menor custo antes de subir para modelos acima.
- Critério operacional definido: só trocar para um modelo mais caro se a qualidade de extração inicial ou interpretação final ficar insuficiente nos casos reais do NEXA.

### 2026-03-30 11:38:12 -03
- __Gateway real da OpenAI preparado com Responses API__ ✓
- O projeto agora possui um adaptador HTTP real para a OpenAI usando `POST /v1/responses`.
- A integração cobre duas operações estruturadas:
- extração inicial do texto natural para localizar cliente, materiais e pistas de serviço;
- interpretação final do contexto enriquecido do NEXA.
- A seleção por ambiente agora troca automaticamente do gateway em memória para o gateway HTTP quando `OPENAI_API_KEY` estiver configurada.
- A configuração do runtime também foi atualizada para repassar variáveis da OpenAI corretamente.
- Arquivos impactados:
- [openai-http-budget-assistant-gateway.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/infrastructure/integrations/openai/openai-http-budget-assistant-gateway.ts)
- [build-app-dependencies.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/app/build-app-dependencies.ts)
- [app-config.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/config/app-config.ts)
- [main.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/main.ts)
- [openai-http-budget-assistant-gateway.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/openai-http-budget-assistant-gateway.test.ts)
- [build-app-dependencies.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/build-app-dependencies.test.ts)
- [app-config.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/app-config.test.ts)
- [main.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/main.test.ts)

### 2026-03-30 11:29:04 -03
- __Captura de voz ajustada para iniciar e parar no mesmo botão__ ✓
- O microfone da Web App agora funciona como botão de alternância:
- primeiro clique inicia a escuta;
- segundo clique encerra a captura;
- o botão fica verde em repouso e vermelho enquanto estiver ouvindo.
- Também foi adicionado reinício automático da escuta quando o navegador encerra a sessão antes da parada manual, desde que o usuário ainda não tenha clicado para terminar.
- Arquivos impactados:
- [app.html](/home/usuario/workspace/Antigravity/2026/NeXa/public/app.html)
- [create-app.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/create-app.test.ts)

### 2026-03-30 11:21:34 -03
- __Web App consolidada no fluxo final de interação do NEXA__ ✓
- A interface web foi simplificada para trabalhar com uma única forma principal de uso: texto natural enviado ao fluxo assistido por IA.
- As áreas auxiliares de teste foram removidas da página principal.
- Foi adicionado botão de fala usando reconhecimento de voz do navegador quando disponível.
- A página agora mostra:
- um retorno legível do NEXA;
- e o JSON técnico completo logo abaixo para inspeção.
- Arquivos impactados:
- [app.html](/home/usuario/workspace/Antigravity/2026/NeXa/public/app.html)
- [create-app.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/create-app.test.ts)

### 2026-03-30 11:16:28 -03
- __Fluxo assistido por IA alterado para partir só de texto natural__ ✓
- A trilha assistida deixou de exigir campos manuais de cliente e materiais na Web App.
- Agora a sequência é:
- texto natural entra;
- a IA extrai cliente provável, materiais e pistas de serviço;
- o NEXA consulta a base local com essa extração;
- só depois monta a resposta local e a resposta assistida final.
- Essa mudança aproxima o console de testes do uso real com fala convertida em texto antes do envio ao NEXA.
- Arquivos impactados:
- [build-ai-assisted-agent-response.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/build-ai-assisted-agent-response.ts)
- [openai-budget-assistant-gateway.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/gateways/openai-budget-assistant-gateway.ts)
- [in-memory-openai-budget-assistant-gateway.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/infrastructure/integrations/openai/in-memory-openai-budget-assistant-gateway.ts)
- [create-app.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/app/create-app.ts)
- [app.html](/home/usuario/workspace/Antigravity/2026/NeXa/public/app.html)

### 2026-03-30 10:56:03 -03
- __Fluxo assistido por IA adicionado à Web App e ao backend__ ✓
- Foi criado um fluxo próprio de resposta assistida por IA, separado da resposta local determinística já existente.
- O backend agora consegue:
- montar o contexto local;
- calcular a análise financeira local;
- empacotar esse contexto para a IA;
- chamar um gateway de interpretação assistida;
- devolver lado a lado a resposta local e a resposta assistida.
- A Web App agora possui uma área específica de `Resposta Assistida por IA`.
- Nesta etapa, o gateway padrão continua em memória para exercitar o fluxo sem depender ainda de credenciais reais da OpenAI.
- Arquivos impactados:
- [build-ai-assisted-agent-response.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/build-ai-assisted-agent-response.ts)
- [openai-budget-assistant-gateway.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/gateways/openai-budget-assistant-gateway.ts)
- [in-memory-openai-budget-assistant-gateway.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/infrastructure/integrations/openai/in-memory-openai-budget-assistant-gateway.ts)
- [create-app.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/app/create-app.ts)
- [app.html](/home/usuario/workspace/Antigravity/2026/NeXa/public/app.html)
- [build-ai-assisted-agent-response.use-case.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/build-ai-assisted-agent-response.use-case.test.ts)
- [ai-assisted-agent-response-route.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/ai-assisted-agent-response-route.test.ts)

### 2026-03-30 10:44:32 -03
- __Fase inicial da integração com OpenAI documentada e preparada__ ✓
- Foi definido que a OpenAI entrará como camada de interpretação, estruturação e sugestão, e não como camada de execução operacional.
- A arquitetura híbrida ficou formalizada: IA propõe, backend valida, usuário aprova e backend executa.
- Também foi criado um pacote determinístico de contexto para futura chamada da IA, contendo texto original, cliente localizado, histórico resumido, candidatos de materiais, resumo financeiro local e regras operacionais.
- Arquivos impactados:
- [openai.md](/home/usuario/workspace/Antigravity/2026/NeXa/docs/integrations/openai.md)
- [backend.md](/home/usuario/workspace/Antigravity/2026/NeXa/docs/architecture/backend.md)
- [implementation-plan.md](/home/usuario/workspace/Antigravity/2026/NeXa/docs/implementation-plan.md)
- [build-ai-budget-assistant-context.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/build-ai-budget-assistant-context.ts)
- [build-ai-budget-assistant-context.use-case.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/build-ai-budget-assistant-context.use-case.test.ts)

### 2026-03-30 10:24:04 -03
- __Busca local de produtos endurecida para medidas compostas__ ✓
- A busca local do catálogo passou a exigir correspondência forte para consultas com medidas compostas como `3 x 1,5`.
- O ajuste foi feito para reduzir falsos positivos causados por fragmentos soltos como `3`, `x` ou `1,5`.
- Caso real reportado: a busca trazia primeiro os cabos corretos, mas depois misturava itens sem relação direta apenas por compartilhar partes da medida.
- Decisão tomada: quando a consulta contiver padrão composto como `3x1,5`, só entram resultados que também contenham essa composição normalizada.
- Arquivos impactados:
- [search-local-product-catalog.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/search-local-product-catalog.ts)
- [search-local-product-catalog.use-case.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/search-local-product-catalog.use-case.test.ts)

### 2026-03-30 10:13:05 -03
- __Web App inicial de testes disponibilizada__ ✓
- O backend agora serve uma interface web simples para testar o NEXA sem depender de WhatsApp.
- Página disponível em `GET /app`.
- Arquivo base da interface: [app.html](/home/usuario/workspace/Antigravity/2026/NeXa/public/app.html).
- A interface já consegue acionar:
- `POST /local/agent-response`
- `POST /local/budget-analysis`
- `GET /local/commercial-history/search`
- `GET /local/products/search`
- Essa interface passa a servir como canal rápido de teste e já pode evoluir depois para alternativa permanente de operação.

### 2026-03-30 10:08:28 -03
- __Primeira resposta operacional local do NEXA implementada__ ✓
- O backend agora consegue gerar uma resposta operacional estruturada a partir do texto original e do contexto local já calculado.
- A resposta já inclui:
- texto recebido;
- versão estruturada sugerida;
- itens possivelmente ausentes;
- pontos de atenção;
- sugestões;
- resumo financeiro dos materiais;
- base usada;
- nível de confiança;
- status final de aguardando aprovação.
- Caso de uso implementado em [build-local-agent-response.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/build-local-agent-response.ts).
- Rota interna exposta em [create-app.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/app/create-app.ts): `POST /local/agent-response`.

### 2026-03-30 09:48:32 -03
- __Primeira pré-análise local de orçamento implementada__ ✓
- O backend agora consegue montar uma análise local que combina o contexto do cliente com um resumo financeiro inicial dos materiais candidatos do catálogo local.
- A análise já retorna:
- itens materiais encontrados localmente;
- totais locais de venda, custo e lucro bruto estimado;
- contagem de itens com base financeira completa;
- alertas para materiais sem correspondência local;
- alertas para materiais sem preço de venda ou sem preço de custo no catálogo local.
- Caso de uso implementado em [analyze-local-budget-materials.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/analyze-local-budget-materials.ts).
- Rota interna exposta em [create-app.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/app/create-app.ts): `POST /local/budget-analysis`.

### 2026-03-30 09:44:57 -03
- __Primeiro contexto local de pré-orçamento implementado__ ✓
- O backend agora consegue montar um contexto local único contendo:
- contato mais aderente ao cliente pesquisado;
- histórico comercial resumido desse contato;
- propostas recentes;
- notas de serviço recentes;
- materiais candidatos do catálogo local para cada consulta informada.
- Caso de uso implementado em [build-local-budget-context.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/build-local-budget-context.ts).
- Rota interna exposta em [create-app.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/app/create-app.ts): `POST /local/budget-context`.

### 2026-03-30 09:40:16 -03
- __Busca local de materiais implementada__ ✓
- O backend agora consegue consultar o catálogo local de produtos sem depender da API do Bling em tempo real.
- Caso de uso implementado em [search-local-product-catalog.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/search-local-product-catalog.ts).
- Rota interna exposta em [create-app.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/app/create-app.ts): `GET /local/products/search`.
- A busca local considera nome e código do produto, com pontuação simples para priorizar resultados mais aderentes.

### 2026-03-30 09:33:01 -03
- __Cruzamento local ampliado para incluir notas de serviço__ ✓
- A busca local de histórico comercial agora retorna, para cada contato encontrado, tanto as propostas comerciais quanto as notas de serviço relacionadas.
- O resultado combinado ficou disponível na mesma rota interna [create-app.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/app/create-app.ts): `GET /local/commercial-history/search`.
- Essa estrutura já permite começar a comparar intenção comercial e execução operacional por contato.

### 2026-03-30 09:27:02 -03
- __Primeiro cruzamento entre bases locais implementado__ ✓
- O backend agora consegue buscar um contato no catálogo local e retornar junto o histórico local de propostas desse contato.
- Caso de uso implementado em [search-local-commercial-history.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/search-local-commercial-history.ts).
- Rota interna exposta em [create-app.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/app/create-app.ts): `GET /local/commercial-history/search`.
- A busca local faz correspondência por nome, código, documento e telefones, com normalização de texto e comparação numérica para documento/telefone.
- As propostas retornadas são ordenadas da mais recente para a mais antiga dentro de cada contato.

### 2026-03-30 04:05:38 -03
- __Catálogo local de contatos sincronizado com sucesso__ ✓
- Catálogo salvo em [catalog.json](/home/usuario/workspace/Antigravity/2026/NeXa/data/bling/contacts/catalog.json).
- Sincronização real concluída com `365` contatos.
- Schema local inicial confirmado com os campos: `id`, `name`, `code`, `status`, `documentNumber`, `phone`, `mobilePhone`.
- Endpoint validado na prática: `GET /Api/v3/contatos`.
- A sincronização completa foi executada com throttle entre páginas para respeitar o limite operacional do Bling.
- Arquivos impactados:
- [bling-contact-gateway.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/gateways/bling-contact-gateway.ts)
- [get-bling-contact-catalog.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/get-bling-contact-catalog.ts)
- [file-system-bling-contact-catalog-cache.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/infrastructure/persistence/file-system/file-system-bling-contact-catalog-cache.ts)
- [bling-http-contact-gateway.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/infrastructure/integrations/bling/bling-http-contact-gateway.ts)

### 2026-03-30 04:04:26 -03
- __Aprendizado registrado sobre limite de requisições do Bling durante sincronização de contatos__ ✓
- A leitura real de `GET /Api/v3/contatos` funcionou para amostra curta, mas a sincronização completa do catálogo local falhou com `429 TOO_MANY_REQUESTS`.
- O erro confirmou na prática o limite de `3 req/s` informado pela documentação do Bling.
- Decisão tomada: implementar throttle explícito no fluxo de sincronização paginada antes de tentar novamente a carga completa de contatos.

### 2026-03-30 03:34:50 -03
- __Histórico local de notas de serviço sincronizado com sucesso__ ✓
- Histórico salvo em [history.json](/home/usuario/workspace/Antigravity/2026/NeXa/data/bling/service-notes/history.json).
- Sincronização real concluída com `321` notas de serviço.
- Schema local inicial confirmado com os campos: `id`, `number`, `rpsNumber`, `series`, `status`, `issueDate`, `value`, `contactId`, `contactName`, `contactDocument`, `contactEmail`, `link`, `verificationCode`.
- Endpoint validado na prática: `GET /Api/v3/nfse`.
- Arquivos impactados:
- [bling-service-note-gateway.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/gateways/bling-service-note-gateway.ts)
- [get-bling-service-note-history.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/get-bling-service-note-history.ts)
- [file-system-bling-service-note-history-cache.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/infrastructure/persistence/file-system/file-system-bling-service-note-history-cache.ts)
- [bling-http-service-note-gateway.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/infrastructure/integrations/bling/bling-http-service-note-gateway.ts)

### 2026-03-30 03:34:50 -03
- __Aprendizado registrado sobre ordens de serviço na API pública atual do Bling__ ✓
- Na OpenAPI oficial consultada não apareceu um endpoint público claro de `ordem de serviço` equivalente ao que precisamos para histórico operacional.
- Foram encontrados módulos de `NFSe`, `pedidos de vendas`, `notas fiscais`, `ordens de produção` e `serviços de logística`, mas não um recurso explícito e documentado de `ordens de serviço`.
- Decisão tomada: seguir com `propostas comerciais` e `notas de serviço` como fontes históricas operacionais já confirmadas, e tratar `ordens de serviço` como pendência de investigação adicional.

### 2026-03-30 03:29:36 -03
- __Histórico local de propostas comerciais sincronizado com sucesso__ ✓
- Histórico salvo em [history.json](/home/usuario/workspace/Antigravity/2026/NeXa/data/bling/quotes/history.json).
- Sincronização real concluída com `98` propostas comerciais.
- Schema local inicial confirmado com os campos: `id`, `date`, `status`, `total`, `productsTotal`, `number`, `contactId`, `storeId`.
- Endpoint validado na prática: `GET /Api/v3/propostas-comerciais`.
- A documentação OpenAPI oficial confirmou os filtros `situacao`, `idContato`, `dataInicial`, `dataFinal`, `pagina` e `limite`.
- Arquivos impactados:
- [bling-quote-gateway.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/gateways/bling-quote-gateway.ts)
- [get-bling-quote-history.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/get-bling-quote-history.ts)
- [file-system-bling-quote-history-cache.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/infrastructure/persistence/file-system/file-system-bling-quote-history-cache.ts)
- [bling-http-quote-gateway.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/infrastructure/integrations/bling/bling-http-quote-gateway.ts)

### 2026-03-30 03:21:59 -03
- __Base local de produtos sincronizada com sucesso__ ✓
- Catálogo salvo em [catalog.json](/home/usuario/workspace/Antigravity/2026/NeXa/data/bling/products/catalog.json).
- Sincronização real concluída com `803` produtos.
- Schema local confirmado com os campos: `id`, `name`, `code`, `price`, `costPrice`, `stockQuantity`, `type`, `status`.
- A paginação da carga local foi ajustada para continuar até a primeira página com lote menor que o `pageSize`, porque a resposta observada do endpoint de produtos não trouxe `total` utilizável para controlar a iteração.
- Arquivos impactados:
- [get-bling-product-catalog.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/get-bling-product-catalog.ts)
- [get-bling-product-catalog.use-case.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/get-bling-product-catalog.use-case.test.ts)
- [bling-http-product-gateway.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/bling-http-product-gateway.test.ts)

### 2026-03-30 03:21:59 -03
- __Aprendizado registrado sobre busca de produtos no Bling__ ✓
- A forma de filtro textual inicialmente assumida para `GET /Api/v3/produtos` não se mostrou confiável na prática.
- Foram testadas as variantes: `cabo`, `cabos`, `*cabo*`, `%cabo%`, `?cabo?`, `CABO`, `cabo pp`, `cabo%`, `%cabo`, `pp`.
- Todas retornaram essencialmente a mesma listagem genérica, sem filtragem útil.
- Decisão tomada: não depender da busca textual remota para o fluxo principal de materiais; priorizar catálogo local diário para referência e busca futura no backend.
- Área impactada:
- integração Bling de produtos
- estratégia de catálogo local

### 2026-03-30 13:04:20 -03
- __Pipeline assistido por IA endurecido para o caso real do posto Alonso__ ✓
- A extração inicial da IA agora passa por sanitização local antes de consultar a base, reduzindo `customerQuery` verbose para o nome puro do cliente e encurtando consultas de materiais para termos operacionais curtos.
- Foram adicionadas regras locais para normalizar consultas como `cabo de cobre para internet (marca Furukawa)` para `cabo de rede furukawa`, `conectores RJ45` para `conector rj45`, `switch de 4 portas` para `switch 4 portas` e `câmera IP 2MP` para `camera ip 2mp`.
- O ranking do catálogo local foi endurecido para penalizar correspondências incompatíveis em materiais de rede, derrubando casos como extensão USB para busca de cabo de rede, módulo de tomada para `conector rj45` e `KVM 2 portas` para `switch 4 portas`.
- Esse ajuste foi guiado pelo retorno real da Web App e pela reprodução em teste do orçamento do `posto Alonso`.
- Arquivos impactados:
- [normalize-ai-budget-intake.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/normalize-ai-budget-intake.ts)
- [build-ai-assisted-agent-response.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/build-ai-assisted-agent-response.ts)
- [search-local-product-catalog.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/search-local-product-catalog.ts)
- [build-ai-assisted-agent-response.use-case.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/build-ai-assisted-agent-response.use-case.test.ts)
- [search-local-product-catalog.use-case.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/search-local-product-catalog.use-case.test.ts)

### 2026-03-30 13:13:40 -03
- __Normalização assistida refinada com apoio do texto cru original__ ✓
- A etapa de sanitização passou a usar o texto original para recuperar detalhes que a extração da IA pode omitir, como `4 portas`, `2MP` e `6 mm`.
- Com isso, consultas genéricas como `switch`, `camera ip` e `parafusos mm` passam a ser reescritas para formas mais úteis ao NEXA, como `switch 4 portas`, `camera ip 2mp` e `parafuso 6mm`, quando esses detalhes estiverem presentes no texto cru.
- O ranking local também passou a preferir explicitamente `2MP` em buscas de câmera quando essa medida estiver no pedido, reduzindo a chance de subir modelos `3MP` ou serviços genéricos como referência principal.
- Arquivos impactados:
- [normalize-ai-budget-intake.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/normalize-ai-budget-intake.ts)
- [build-ai-assisted-agent-response.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/build-ai-assisted-agent-response.ts)
- [search-local-product-catalog.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/search-local-product-catalog.ts)
- [build-ai-assisted-agent-response.use-case.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/build-ai-assisted-agent-response.use-case.test.ts)
- [search-local-product-catalog.use-case.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/search-local-product-catalog.use-case.test.ts)

### 2026-03-30 13:21:27 -03
- __Refino fino do pipeline local para cliente, marca e equivalência de switch__ ✓
- A limpeza do `customerQuery` passou a cortar também conteúdos depois de `:`, evitando retornos como `posto Alonso: instalação de duas câmeras IP` e preservando apenas o nome do cliente.
- Marcas soltas como `furukawa` passam a ser fundidas à consulta de material compatível, em vez de seguirem como item isolado de busca.
- A análise local agora recusa correspondências estruturalmente incompatíveis para `switch 4 portas`; se só existirem opções de `8` ou `24` portas, o material não entra como referência principal e deve virar pendência/alerta.
- Arquivos impactados:
- [normalize-ai-budget-intake.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/normalize-ai-budget-intake.ts)
- [analyze-local-budget-materials.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/analyze-local-budget-materials.ts)
- [build-ai-assisted-agent-response.use-case.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/build-ai-assisted-agent-response.use-case.test.ts)
- [analyze-local-budget-materials.use-case.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/analyze-local-budget-materials.use-case.test.ts)

### 2026-03-30 13:39:02 -03
- __Fluxo de retrieval + rerank assistido pela IA explicitado no contrato__ ✓
- A resposta final da IA agora pode indicar explicitamente qual item da shortlist do catálogo foi escolhido para cada material, via `catalogItemId` e `catalogItemName`.
- Com isso, o backend deixa de depender apenas de heurísticas locais para inferir o “item final” e passa a receber a decisão semântica do modelo sobre qual candidato do catálogo melhor representa o material do orçamento.
- Quando não houver aderência suficiente, a IA deve deixar esses campos como `null`, mantendo o item como pendência em vez de inventar correspondência.
- A Web App também passou a exibir, quando houver, o nome do item de catálogo escolhido ao lado do material sugerido.
- Arquivos impactados:
- [openai-budget-assistant-gateway.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/gateways/openai-budget-assistant-gateway.ts)
- [openai-http-budget-assistant-gateway.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/infrastructure/integrations/openai/openai-http-budget-assistant-gateway.ts)
- [app.html](/home/usuario/workspace/Antigravity/2026/NeXa/public/app.html)
- [build-ai-assisted-agent-response.use-case.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/build-ai-assisted-agent-response.use-case.test.ts)
- [openai-http-budget-assistant-gateway.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/openai-http-budget-assistant-gateway.test.ts)
- [ai-assisted-agent-response-route.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/ai-assisted-agent-response-route.test.ts)

### 2026-03-30 13:49:44 -03
- __Persistência real da sessão assistida de orçamento implementada__ ✓
- Cada chamada da rota `POST /local/ai-agent-response` agora salva uma sessão reaproveitável com `id`, timestamps, texto original, cliente detectado, confiança, status e payload completo da resposta assistida.
- Foram adicionadas rotas para retomada futura na própria interface/backend:
- `GET /local/ai-sessions`
- `GET /local/ai-sessions/:sessionId`
- A resposta da rota principal continua no mesmo formato assistido, mas agora inclui os metadados da sessão salva.
- O armazenamento padrão foi preparado em arquivo local em `data/nexa/ai-budget-sessions/sessions.json`.
- Arquivos impactados:
- [ai-budget-session-repository.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/repositories/ai-budget-session-repository.ts)
- [create-ai-budget-session.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/create-ai-budget-session.ts)
- [list-ai-budget-sessions.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/list-ai-budget-sessions.ts)
- [get-ai-budget-session.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/application/use-cases/get-ai-budget-session.ts)
- [file-system-ai-budget-session-repository.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/infrastructure/persistence/file-system/file-system-ai-budget-session-repository.ts)
- [in-memory-ai-budget-session-repository.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/infrastructure/persistence/in-memory/in-memory-ai-budget-session-repository.ts)
- [create-app.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/app/create-app.ts)
- [build-app-dependencies.ts](/home/usuario/workspace/Antigravity/2026/NeXa/src/app/build-app-dependencies.ts)
- [create-ai-budget-session.use-case.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/create-ai-budget-session.use-case.test.ts)
- [file-system-ai-budget-session-repository.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/file-system-ai-budget-session-repository.test.ts)
- [ai-assisted-agent-response-route.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/ai-assisted-agent-response-route.test.ts)

### 2026-03-30 13:54:49 -03
- __Retomada rápida de sessões assistidas adicionada à Web App__ ✓
- A interface principal agora mostra um painel de `Sessões Recentes`, com atualização manual e carregamento por clique.
- Cada item lista cliente detectado, timestamp e um trecho do texto original, permitindo reabrir rapidamente uma sessão assistida já salva sem reenviar o pedido.
- A própria resposta renderizada passou a exibir os metadados da sessão quando disponíveis.
- Arquivos impactados:
- [app.html](/home/usuario/workspace/Antigravity/2026/NeXa/public/app.html)
- [create-app.test.ts](/home/usuario/workspace/Antigravity/2026/NeXa/test/create-app.test.ts)
- 2026-03-30 15:47:03 -03
  - exclusão de sessão na Web App passou a exigir dupla confirmação.
  - primeira confirmação mostra cliente e breve resumo do orçamento; a segunda confirma com a data/hora de criação da sessão.
- 2026-03-30 16:17:21 -03
  - botão `Continuar` da Web App agora verifica o estado da caixa de texto antes de trocar de sessão.
  - se houver texto novo ainda não salvo, a interface pergunta se o usuário deseja guardá-lo antes de continuar.
  - se houver uma sessão carregada já alterada, a interface pergunta se o usuário deseja atualizá-la ou ignorar as alterações locais.
  - o backend passou a aceitar `sessionId` em `POST /local/ai-agent-response` para atualizar a mesma sessão em vez de sempre criar uma nova.
- 2026-03-30 16:34:55 -03
  - sessões assistidas agora podem ser marcadas como `Aprovado para proposta` ou `Cancelado`.
  - a Web App passou a renderizar botões `Aprovar` e `Cancelar` no card do retorno final quando existe uma sessão ativa.
  - novas rotas HTTP adicionadas para transição de status: `POST /local/ai-sessions/:sessionId/approve` e `POST /local/ai-sessions/:sessionId/cancel`.
  - o payload salvo da sessão também recebe o novo status para manter a renderização consistente entre recarga, listagem e reabertura.
- 2026-03-30 16:58:42 -03
  - sessões aprovadas agora podem gerar um rascunho inicial de proposta comercial sem integração com Bling.
  - a Web App passou a mostrar o botão `Gerar proposta comercial` quando a sessão estiver aprovada, além de renderizar o texto comercial gerado.
  - nova rota HTTP adicionada: `POST /local/ai-sessions/:sessionId/proposal-draft`.
  - o rascunho salvo inclui descrição principal, escopo, materiais, serviços, pontos de atenção e resumo financeiro preliminar.
- 2026-03-30 17:12:08 -03
  - proposta comercial pronta agora pode ser confirmada antes da futura integração com o Bling.
  - novo estado final do fluxo assistido consolidado como `Finalizada`.
  - nova rota HTTP adicionada: `POST /local/ai-sessions/:sessionId/confirm-proposal`.
  - a Web App passou a refletir esse estado com botão `Confirmar proposta` e badge dedicado.
- 2026-03-30 15:43:51 -03
  - sessões recentes da Web App agora exibem botões `Continuar` e `Apagar`.
  - `Continuar` carrega a sessão e recoloca o texto original no campo de entrada.
  - exclusão de sessão implementada no backend com `DELETE /local/ai-sessions/:sessionId`.
- 2026-03-30 15:05:01 -03
  - prompt do gateway assistido reforçado para exigir faixa inicial de mão de obra em reais brasileiros e horas estimadas.
  - fallback local fraco implementado no gateway HTTP para preencher faixa em reais, horas e base quando o modelo retornar `estimado` sem valor monetário.
- 2026-03-30 14:48:12 -03
  - contrato de `laborPriceResearch` ampliado para incluir faixa estimada de valor, horas estimadas, base usada e confiança no primeiro retorno assistido.
  - interface da Web App atualizada para exibir esses campos no bloco de pesquisa de mão de obra.
- 2026-03-30 14:31:37 -03
  - gateway assistido da OpenAI ajustado para pedir estimativa inicial fraca de mão de obra desde a primeira interação, com base nos materiais normalizados e na descrição do trabalho.
  - gateway em memória alinhado para sinalizar a nova política quando a OpenAI real não estiver ativa.
- 2026-03-30 14:22:33 -03
  - backlog registrado para uma camada futura de normalização canônica de materiais, com atributos técnicos e sinônimos, para melhorar o casamento entre texto livre e catálogo real.
# 2026-03-30

- 2026-04-01 15:55:00 -03
  - o orçamento agora persiste um `workflowState` explícito dentro da sessão, registrando a etapa atual e os marcos já concluídos do fluxo.
  - criação da sessão passou a gravar que o texto original e a interpretação inicial já foram persistidos, além de sinalizar se existem candidatos locais de cliente e material.
  - geração do rascunho, edição manual, solicitação de revisão, revisão concluída, aceite, rejeição, confirmação final e abertura por modelo agora atualizam o mesmo `workflowState`.
  - a revisão assistida passou a salvar primeiro o estado `proposal_review_requested` antes de chamar o gateway externo, o que melhora a retomada real quando a operação é interrompida no meio.
  - a camada de persistência continua usando o mesmo repositório de sessões, mas agora com metadados explícitos de continuidade para reabrir o orçamento no ponto correto.

- tratamento de timeout adicionado ao gateway HTTP de propostas do Bling, evitando que a confirmação da proposta fique presa indefinidamente quando a API externa travar.
- rota `/local/ai-sessions/:sessionId/confirm-proposal` ajustada para retornar `502` em falhas de envio ao Bling, em vez de cair como erro genérico de não encontrado.
- botões de ação da sessão protegidos com tratamento defensivo no frontend, para que a Web App exiba a mensagem real de falha do Bling em vez de ficar travada no texto de carregamento.
- criação da proposta no Bling corrigida para usar `POST /propostas-comerciais` em vez do endpoint inválido `/orcamentos`.
- resolução de contato do Bling adicionada antes do envio final, com bloqueio da confirmação quando a sessão ainda não tiver cliente resolvido na base local.
- após criar a proposta comercial no Bling, o NEXA agora busca o registro criado por `id` para persistir também o número da proposta na sessão.
- sessões assistidas passaram a persistir `resolvedCustomer` assim que o cliente for localizado no contexto local do Bling, para que geração de proposta e envio final reutilizem a mesma identidade do cliente.
- rascunhos de proposta passaram a ser editáveis na Web App enquanto a sessão estiver em `Proposta comercial pronta`, com ação explícita de `Salvar mudanças` antes do envio final ao Bling.
- a ação final `Confirmar e enviar ao Bling` agora fica desabilitada na etapa de proposta quando a sessão ainda não tem cliente Bling resolvido, evitando uma falha previsível no fim do fluxo.
- logging operacional amplo em JSONL foi adicionado ao MVP da Web App, incluindo tráfego HTTP, falhas, chamadas à OpenAI e chamadas ao Bling, para facilitar o diagnóstico durante a fase de testes.
- a revisão de proposta passou a suportar uma segunda passada de IA a partir do rascunho comercial editável: a Web App expõe `Mandar pra revisão`, persiste o retorno da revisão na sessão e renderiza a sugestão ajustada abaixo do texto atual para comparação manual.
- a Web App agora mantém um painel visível de `Configurações` como placeholder para controles futuros como nível de log, escolha de modelo, tema visual e comportamento de revisão, sem ativar essas opções no MVP.
- `Mandar pra revisão` foi movido para o rodapé do rascunho ao lado de `Salvar mudanças`, mantendo o ciclo de revisão junto do corpo comercial editável.
- o bloco de sugestão da revisão da IA também passou a ser editável, com ação explícita de `Aceitar revisão` para substituir o rascunho principal, limpar o bloco anterior e retornar a sessão à tela normal pronta para envio ao Bling.
- o bloco de revisão da IA também passou a suportar `Rejeitar revisão`, descartando a revisão pendente sem alterar o rascunho principal e retornando imediatamente à tela normal da proposta.
- o tratamento de token do Bling agora registra `BLING_ACCESS_TOKEN_EXPIRES_AT`, expõe o status do token no painel de configurações, permite renovação manual pela Web App e antecipa o refresh quando o token estiver vencido, próximo do vencimento ou sem validade registrada.
- a criação da proposta no Bling agora envia o texto comercial para `introducao` em vez de deixá-lo apenas em `observacoes`, e inclui `itens` para materiais que tenham produto de catálogo resolvido e preço de venda utilizável.
- cards de sessões finalizadas e cards de modelos salvos agora usam fundo verde claro completo, separado do badge menor de status, deixando o estado concluído visualmente evidente nas duas listas.
- o primeiro prompt de interpretação da IA agora exige uma lista estruturada de serviços com valores aproximados em reais, para que o orçamento assistido já traga linhas de serviço e mão de obra passíveis de revisão manual antes da aprovação.
- o prompt de revisão da proposta pela IA agora recalibra explicitamente os valores de serviço e mão de obra em direção ao mercado local e pede melhor espaçamento e agrupamento para o padrão visual do orçamento no Bling, reduzindo o retrabalho de acabamento manual.
- o seletor `Modelo de IA para revisão` agora funciona de fato: a Web App envia o modelo escolhido e o NEXA aplica esse override apenas na revisão do rascunho comercial, sem afetar o modelo padrão das demais etapas.
- o seletor `Modelo de IA` das configurações agora também é funcional: a escolha fica salva no navegador como padrão da interface e passa a definir o modelo usado nas etapas principais de análise do orçamento, enquanto a revisão do rascunho continua podendo usar um override local.
- a revisão assistida do rascunho agora também pede somas, subtotais e totais aproximados por agrupamento dentro do corpo comercial, para facilitar o retoque manual antes do envio final ao Bling.
- a interpretação inicial e a revisão do rascunho agora orientam a IA a estimar metragens e quantidades proporcionais com base em distâncias, tubulações, rotas e demais pistas do contexto técnico quando o texto não trouxer medidas fechadas.
- o primeiro prompt assistido agora também inclui heurísticas operacionais para infraestrutura com eletrodutos, conduletes, suportes e caixas de passagem, ajudando a IA a lembrar e estimar acessórios de fixação como abraçadeiras, buchas e parafusos a partir do contexto.
- backlog registrado para uma próxima camada heurística de fixação por porte físico do item, por exemplo caixas pequenas usando cerca de 2 pontos de fixação e itens maiores exigindo 4 ou mais, sempre com expansão contextual por superfície, peso e tipo de montagem.
- a habilitação do botão de envio ao Bling na etapa de proposta agora segue a mesma lógica do backend: se houver contexto suficiente de cliente para tentativa de resolução no envio, a interface não bloqueia prematuramente a ação só por faltar um `resolvedCustomer.id` explícito na tela.
- o fluxo de proposta agora reaproveita o cliente corrigido no próprio corpo comercial: ao salvar ou aceitar revisão, a linha `Cliente:` atualiza `customerQuery` da sessão e do rascunho; na confirmação final, o envio ao Bling também tenta resolver o contato a partir do rascunho e da revisão pendente antes de falhar por cliente não resolvido.
- a confirmação final ao Bling também passou a casar clientes por sobreposição de tokens relevantes, cobrindo nomes operacionais como `posto Alonso` contra cadastros formais do Bling como `ALONSO Y ALONSO AUTO POSTO LTDA`.
- ao aceitar a revisão do rascunho, o NEXA agora executa uma reconciliação assistida dos materiais antes de consolidar a proposta: ele envia ao modelo a lista anterior de materiais junto da shortlist local que o backend considera aderente, atualiza a lista final de materiais da sessão e substitui a seção `Materiais previstos` do rascunho para uma nova revisão manual antes do envio ao Bling.
- o timeout padrão das chamadas assistidas da OpenAI foi ampliado de 90 para 120 segundos, mantendo o mesmo modelo atual.
- a tela de espera do orçamento e a tela de espera da revisão agora mostram o tempo total restante da operação, enquanto o status continua sendo atualizado a cada 5 segundos.
- o envio final ao Bling agora também converte a mão de obra média estimada em item de proposta usando o produto cadastrado `Mão de Obra - SERVIÇOS DIVERSOS`, tratando o valor médio total como quantidade sobre o preço unitário de R$ 1,00.
- a composição do item de mão de obra no envio ao Bling agora prioriza exclusivamente a seção `Serviços contemplados` do rascunho final, ignorando subtotais gerais e totais mistos de materiais para não inflar o valor do serviço.
- a revisão final do rascunho agora pede explicitamente a linha `Soma mínima da mão de obra:` em reais, e o envio ao Bling passa a priorizar essa referência nomeada usando a soma dos menores valores estimados dos serviços, em vez da média.
- o envio final ao Bling agora faz uma validação conservadora do item de catálogo antes de montar os itens da proposta: ele reavalia a shortlist original do material e evita embalagens e correspondências semânticas incompatíveis, como kits de 1000 unidades para `bucha 6` ou abraçadeiras de organizar cabos quando o orçamento pede fixação de eletroduto.
- o botão `Salvar mudanças` agora executa uma nova reconciliação de materiais com o catálogo inteiro local: o NEXA relê a seção `Materiais previstos` do rascunho editado, gera candidatos a partir de toda a base local e atualiza a lista final de materiais antes do envio ao Bling.
- a tela de revisão da proposta agora decrementa corretamente o contador total de 120 segundos, mantendo a troca de etapa a cada 5 segundos e exibindo apenas a mensagem curta de que a comunicação com o NEXA está ativa.
- quando já existe proposta comercial gerada, a interface passa a exibir `Materiais Consolidados` com base em `proposalDraft.materialItems`, em vez de repetir a lista bruta da interpretação inicial.
- a seção `Materiais previstos` do rascunho agora é reescrita como fonte única, removendo duplicidades antes de inserir a lista reconciliada mais recente.
- o resumo financeiro dos materiais na etapa de proposta agora prioriza os preços reais dos itens vinculados ao catálogo local, recalculando venda, custo e lucro bruto a partir dos produtos corretamente ligados ao orçamento.
- o operador agora pode remover materiais de verdade do rascunho: ao apagar a seção `Materiais previstos` e salvar ou aceitar revisão, o NEXA limpa o bloco textual, zera a lista reconciliada e impede que itens antigos continuem indo ao Bling.
- o aceite da revisão agora usa os materiais presentes no texto efetivamente aceito, em vez de reaproveitar a lista antiga da interpretação; isso preserva inclusões, exclusões, renomeações e mudanças de quantidade feitas no editor da revisão.
- a confirmação final ao Bling agora respeita primeiro o `catalogItemId` já reconciliado e ainda existente no catálogo local, evitando que a shortlist antiga substitua ou descarte o produto correto escolhido nas etapas de save/revisão.
