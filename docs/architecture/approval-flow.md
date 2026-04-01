# FLUXO DE APROVAÇÃO

## FUNÇÃO DESTE ARQUIVO
Definir como o sistema deve aguardar, registrar e aplicar a aprovação do usuário antes de executar ações críticas.

## QUANDO CONSULTAR
Consultar este arquivo ao implementar estados de aprovação, comandos de confirmação e validações antes da execução.

## RELAÇÃO COM OUTROS ARQUIVOS
- Complementa `conversation-flow.md`.
- Depende de `bling.md`.
- Segue `../../AGENTS.md`.

## REGRAS
- Nenhuma ação crítica pode ocorrer sem aprovação explícita.
- A aprovação deve estar associada a um contexto ativo.
- O sistema deve aceitar pelo menos:
  - aprovar
  - editar
  - cancelar
  - aprovar com ajustes

## AÇÕES CRÍTICAS
- criar orçamento no Bling
- alterar dados comerciais sensíveis
- gerar documento final
- emitir nota fiscal em versões futuras

## PREMISSAS INICIAIS
- na fase inicial, apenas o número que iniciou a conversa pode aprovar;
- a aprovação deve apontar para uma versão específica do rascunho;
- a aprovação simples vale para a versão ativa mais recente;
- toda aprovação precisa estar vinculada a um contexto ainda aberto;
- o sistema deve exigir dupla confirmação antes da criação no Bling.

## NÍVEIS DE APROVAÇÃO

### 1. Aprovação de rascunho
Confirma que a versão estruturada pode seguir para o resumo final.

Comandos aceitos:
- `aprovar`
- `aprovar vN`
- `aprovar com ajustes`

Resultado:
- o sistema registra a versão aprovada;
- gera o resumo final operacional;
- muda o contexto para `awaiting_final_confirmation`.

### 2. Confirmação final de execução
Confirma que o orçamento aprovado pode ser criado no Bling.

Comandos aceitos:
- `aprovar`
- `editar`
- `cancelar`

Resultado:
- `aprovar` executa a integração;
- `editar` reabre o rascunho;
- `cancelar` encerra o contexto sem criação.

## REGRAS DE VALIDAÇÃO
- não aceitar aprovação sem versão existente;
- não aceitar aprovação de versão inexistente;
- não aceitar aprovação de contexto já cancelado ou concluído;
- não aceitar confirmação final sem resumo final previamente emitido;
- não aceitar aprovação vinda de número diferente do dono do contexto;
- toda aprovação deve registrar data, hora, número e versão alvo.

## COMPORTAMENTO PARA NOVA MENSAGEM ANTES DA APROVAÇÃO
Se houver nova mensagem antes da decisão sobre o rascunho:
- abrir estado de resolução de conflito;
- perguntar se o usuário quer descartar a análise anterior ou suspendê-la;
- nunca executar aprovação implícita;
- nunca mover automaticamente para o Bling.

## CANCELAMENTO
- `cancelar` encerra o contexto ativo sem execução;
- o sistema deve registrar o motivo se o usuário o informar;
- o cancelamento deve manter histórico, mensagens e versões para auditoria;
- um contexto cancelado não pode ser retomado como ativo, apenas consultado.

## FALHAS E REPROCESSAMENTO
- se a criação no Bling falhar após a confirmação final, o contexto deve ir para `failed`;
- a falha deve registrar o erro técnico e uma mensagem amigável ao operador;
- o usuário pode escolher entre tentar novamente, editar a versão ou cancelar;
- a nova tentativa deve reaproveitar a mesma versão aprovada, salvo se houver nova edição.

## CENÁRIOS QUE DEVEM VIRAR TESTE
- aprovar a última versão ativa com sucesso;
- aprovar versão específica existente;
- rejeitar aprovação de versão inexistente;
- rejeitar aprovação de usuário diferente do dono do contexto;
- exigir segunda confirmação antes de criar no Bling;
- reabrir edição após resumo final;
- registrar cancelamento com contexto preservado;
- mover para `failed` quando a execução externa falhar.
