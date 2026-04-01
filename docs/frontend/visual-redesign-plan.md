# PLANO DE REDESIGN VISUAL DA WEB APP

## FUNÇÃO DESTE ARQUIVO
Este arquivo organiza, em passos, a frente de redesign visual da interface Web do NEXA sem misturar essa trilha com o fluxo funcional principal do MVP.

## QUANDO CONSULTAR
Consultar antes de iniciar mudanças visuais, ao priorizar melhorias de interface, ao revisar a ordem das entregas do redesign e ao validar se uma alteração visual ainda respeita o fluxo operacional já concluído.

## RELAÇÃO COM OUTROS ARQUIVOS
- É subordinado a `../../AGENTS.md`.
- Complementa `../implementation-plan.md`, mas restringe o foco apenas ao redesign visual.
- Usa `frontend/visual-redesign-changelog.md` como histórico separado dessa frente.
- Deve respeitar `../branding/nexa.md` e preservar o fluxo descrito em `../architecture/conversation-flow.md`.

## OBJETIVO DO REDESIGN
Melhorar a clareza visual, a hierarquia de uso, o acabamento editorial e a leitura operacional da Web App sem quebrar o fluxo funcional já validado do NEXA.

## PREMISSAS
- O fluxo operacional atual já é a base.
- Mudanças visuais não devem alterar regras de negócio sem necessidade explícita.
- A prioridade é leitura, hierarquia, identidade e ergonomia do operador.
- O redesign deve continuar compatível com futura adaptação para app cliente.

## ESCOPO DESTA FRENTE
- layout geral da página;
- hierarquia visual entre entrada, retorno, sessões, modelos e configurações;
- tipografia;
- superfícies, cores e contrastes;
- estados visuais dos botões;
- cards de sessões e modelos;
- ergonomia da etapa de revisão da proposta;
- consistência visual do painel de espera, retorno e proposta comercial.

## FORA DE ESCOPO NESTA ETAPA
- novas integrações;
- mudanças de regra comercial;
- mudanças profundas no fluxo do Bling;
- refatorações amplas de backend sem impacto visual direto.

## PLANO PASSO A PASSO

### ETAPA 1 — Direção visual e hierarquia
- definir uma linguagem visual única para o NEXA;
- reforçar a área principal de trabalho como foco visual;
- reduzir a competição entre formulário, retorno e barra lateral;
- organizar melhor a leitura da página sem depender de excesso de scroll.

### ETAPA 2 — Tipografia e escala
- revisar família tipográfica de títulos e corpo;
- melhorar contraste entre títulos, subtítulos, rótulos e metadados;
- padronizar pesos, tamanhos e espaçamentos verticais.

### ETAPA 3 — Estrutura de superfícies
- diferenciar melhor:
  - área de entrada;
  - painel de retorno;
  - cards laterais;
  - proposta comercial;
  - revisão temporária;
- dar mais contraste aos estados finalizados, em revisão e cancelados.

### ETAPA 4 — Sistema de botões e estados
- reorganizar hierarquia visual de:
  - ação principal;
  - ação secundária;
  - ação destrutiva;
- melhorar leitura de desabilitado, aguardando, finalizado e enviado;
- reforçar o peso visual do envio final ao Bling.

### ETAPA 5 — Sessões e modelos
- melhorar título, cliente, status e metadados dos cards;
- tornar o estado visual mais legível à primeira vista;
- revisar espaçamento e densidade das listas laterais;
- tornar o card finalizado claramente distinto sem poluir a interface.

### ETAPA 6 — Proposta comercial e revisão
- transformar o rascunho em um modo de conferência mais claro;
- melhorar ergonomia do editor principal;
- destacar melhor o bloco temporário da revisão;
- deixar o ciclo:
  - editar
  - revisar
  - aceitar/rejeitar
  - salvar
  - enviar
  mais natural visualmente.

### ETAPA 7 — Espera e feedback de processamento
- refinar as telas de espera para parecerem parte do produto e não apenas estados transitórios;
- melhorar animação, leitura de etapa e temporizador;
- manter mensagens curtas e operacionais.

### ETAPA 8 — Refinamento final
- revisar responsividade;
- revisar coerência de cores;
- revisar alinhamentos e espaçamentos residuais;
- ajustar detalhes finos antes de abrir nova rodada de testes.

## CRITÉRIOS DE CONCLUSÃO
Esta frente será considerada pronta quando:
- a interface tiver hierarquia visual clara;
- o operador identificar rapidamente onde escrever, revisar e finalizar;
- a proposta comercial estiver visualmente adequada para conferência;
- cards e estados estiverem consistentes;
- a UI parecer produto, não protótipo funcional.

## ORDEM DE EXECUÇÃO RECOMENDADA
1. Etapa 1
2. Etapa 2
3. Etapa 3
4. Etapa 4
5. Etapa 5
6. Etapa 6
7. Etapa 7
8. Etapa 8
