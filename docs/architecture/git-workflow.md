# FLUXO DE GIT E NOMENCLATURA DE BRANCHES

## FUNÇÃO DESTE ARQUIVO
Este arquivo define o padrão oficial de trabalho com Git no projeto, incluindo regras para criação de branches, nomenclatura, commits e momento correto de merge para a `main`.

## QUANDO CONSULTAR
Consultar este arquivo antes de iniciar uma nova frente de trabalho, abrir uma branch nova, definir o nome de um commit, preparar um merge para a `main` ou revisar a organização do histórico do projeto.

## RELAÇÃO COM OUTROS ARQUIVOS
- É subordinado a `../../AGENTS.md`.
- Complementa `../README.md` como regra operacional de desenvolvimento.
- Deve refletir o fluxo real adotado no repositório.

## REGRA CENTRAL
Não trabalhar diretamente na `main`.

A `main` deve ser tratada como branch de integração estável.

Toda mudança nova deve começar em uma branch própria.

## FLUXO OBRIGATÓRIO
1. Criar uma branch nova a partir da `main`.
2. Dar um nome significativo em português para a branch.
3. Implementar apenas a frente relacionada àquela branch.
4. Testar a mudança.
5. Fazer commit sempre que uma mudança ficar concluída e validada.
6. Repetir o ciclo de ajuste, teste e commit dentro da mesma branch.
7. Quando a seção ou mudança significativa estiver concluída, validar o conjunto final.
8. Somente depois fazer merge na `main`.

## PAPEL DE CADA TIPO DE BRANCH

### `main`
Significado:
- branch principal do projeto;
- deve representar o estado estável atual;
- deve receber apenas mudanças já validadas.

Uso correto:
- integrar mudanças prontas;
- servir como base para novas branches;
- refletir o estado mais confiável do sistema.

Não usar para:
- desenvolver diretamente;
- acumular testes incompletos;
- misturar várias frentes ainda não validadas.

### Branch de trabalho
Significado:
- branch criada para uma seção específica de trabalho;
- concentra uma única frente relevante ou um conjunto pequeno e coerente de mudanças.

Uso correto:
- desenvolver;
- testar;
- commitar incrementalmente;
- amadurecer a mudança antes do merge.

## PADRÃO DE NOMES DAS BRANCHES
Os nomes devem ser significativos, em português e orientados pelo tipo de trabalho.

Formato recomendado:
- `ajuste/<tema>`
- `fluxo/<tema>`
- `ui/<tema>`
- `docs/<tema>`
- `integracao/<tema>`
- `analise/<tema>`

## SIGNIFICADO DE CADA PREFIXO

### `ajuste/`
Usar para:
- correções pontuais;
- comportamentos incorretos;
- pequenos refinamentos técnicos ou funcionais.

Exemplos:
- `ajuste/timer-retorno-nexa`
- `ajuste/quantidade-preview-bling`

### `fluxo/`
Usar para:
- mudanças na sequência operacional;
- aprovação, revisão, persistência por etapas;
- reorganização de estados e transições do sistema.

Exemplos:
- `fluxo/revisao-materiais-finais`
- `fluxo/primeira-interacao-provisoria`

### `ui/`
Usar para:
- interface;
- layout;
- experiência de uso;
- componentes visuais;
- ajustes de navegação e foco.

Exemplos:
- `ui/aba-preview-bling`
- `ui/foco-janela-de-status`

### `docs/`
Usar para:
- documentação;
- walkthroughs;
- explicações de arquitetura;
- registro documental de contexto técnico.

Exemplos:
- `docs/disclaimer-estranho`
- `docs/fluxo-git`

### `integracao/`
Usar para:
- mudanças em integrações externas;
- Bling;
- OpenAI;
- gateways;
- contratos de APIs;
- autenticação e transporte.

Exemplos:
- `integracao/revisao-openai-estruturada`
- `integracao/envio-bling-final`

### `analise/`
Usar para:
- investigação técnica;
- observabilidade;
- diagnósticos;
- coleta de dados para correção posterior.

Exemplos:
- `analise/revisao-sem-materiais`
- `analise/logs-confirmacao-bling`

## REGRA DE NOME
O nome da branch deve indicar:
- o tipo de trabalho;
- o assunto principal;
- sem abreviações ambíguas;
- sem nomes genéricos como `teste`, `nova`, `ajustes`, `coisas`.

## PADRÃO DE COMMITS
Os commits também devem ser escritos em português.

Devem ser:
- claros;
- curtos;
- específicos;
- coerentes com a mudança validada.

Formato recomendado:
- `ajusta ...`
- `cria ...`
- `refatora ...`
- `documenta ...`
- `integra ...`
- `persiste ...`
- `organiza ...`

Exemplos:
- `cria aba de preview do bling`
- `persiste candidatos da revisao apos interpretacao inicial`
- `documenta baseline anterior ao commit estranho`

## REGRA DE COMMITS DENTRO DA BRANCH
Fazer commit somente quando:
- a mudança estiver concluída naquele recorte;
- os testes relevantes tiverem sido executados;
- o comportamento tiver sido validado de forma suficiente para salvar aquele ponto.

Não usar commit para:
- salvar tentativa incompleta sem contexto claro;
- misturar mudanças não relacionadas;
- registrar estado provisório confuso.

## REGRA DE MERGE
O merge na `main` deve acontecer apenas quando:
- a branch estiver validada;
- os testes importantes da frente tiverem passado;
- o comportamento tiver sido conferido;
- a mudança fizer sentido como bloco integrado.

## OBJETIVO DESTE PADRÃO
Este padrão existe para:
- proteger a `main`;
- melhorar a rastreabilidade;
- deixar o histórico legível;
- separar frentes de trabalho;
- facilitar rollback, auditoria e continuidade futura.
