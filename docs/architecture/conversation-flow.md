# FLUXO DE CONVERSAÇÃO

## FUNÇÃO DESTE ARQUIVO
Definir o fluxo padrão entre mensagem recebida, tratamento do texto, aprovação e execução.

## QUANDO CONSULTAR
Consultar este arquivo ao implementar o estado da conversa, o ciclo de revisão e a transição para execução.

## RELAÇÃO COM OUTROS ARQUIVOS
- Complementa `approval-flow.md`.
- Depende de `whatsapp.md` e `bling.md`.
- Segue as regras de `../../AGENTS.md`.

## FLUXO PADRÃO
1. Usuário envia mensagem no WhatsApp
2. NEXA Bridge recebe o webhook
3. NEXA Core identifica usuário autorizado
4. NEXA Bridge sinaliza "digitando" (typing) para o usuário
5. NEXA Flow registra mensagem e contexto
6. NEXA Budget interpreta e reescreve o texto
7. NEXA Insight e NEXA Learn apoiam análise de histórico e completude
8. Sistema devolve a proposta estruturada
9. Sistema aguarda aprovação, edição ou cancelamento
10. Somente após aprovação executa integração com Bling
11. Sistema registra resultado e responde ao usuário

## PREMISSAS INICIAIS DE OPERAÇÃO
- fase inicial com operador único;
- cada conversa pertence ao número que a iniciou;
- números não autorizados devem ser ignorados;
- toda sessão gera versões numeradas de rascunho;
- o usuário aprova, por padrão, a versão mais recente;
- versões anteriores podem ser retomadas explicitamente.

## MÁQUINA DE ESTADOS INICIAL

### Estados principais
- `idle`
  Sem conversa ativa para o número.
- `collecting_input`
  Mensagem recebida e contexto inicial aberto, ainda sem rascunho estruturado final.
- `draft_ready`
  Existe ao menos uma versão estruturada pronta para revisão.
- `awaiting_draft_decision`
  O sistema aguarda `aprovar`, `editar`, `cancelar` ou `aprovar com ajustes`.
- `awaiting_conflict_resolution`
  O usuário enviou uma nova solicitação antes de decidir o rascunho atual.
- `awaiting_final_confirmation`
  O sistema exibiu o resumo final antes de criar no Bling.
- `executing_bling_creation`
  O orçamento está sendo criado no Bling.
- `suspended`
  A análise foi pausada por inatividade ou por escolha do usuário.
- `completed`
  O fluxo terminou com criação bem-sucedida ou encerramento explícito.
- `cancelled`
  O contexto foi encerrado sem execução.
- `failed`
  Houve erro operacional e o sistema precisa registrar falha e orientar retomada.

### Regras de transição
- `idle -> collecting_input`
  Quando um número autorizado envia uma nova solicitação.
- `collecting_input -> draft_ready`
  Quando o sistema gera a primeira versão estruturada.
- `draft_ready -> awaiting_draft_decision`
  Quando a versão é enviada ao usuário.
- `awaiting_draft_decision -> collecting_input`
  Quando o usuário pede edição da versão atual.
- `awaiting_draft_decision -> awaiting_conflict_resolution`
  Quando o usuário envia uma nova solicitação sem decidir a atual.
- `awaiting_draft_decision -> awaiting_final_confirmation`
  Quando o usuário aprova a versão de trabalho.
- `awaiting_draft_decision -> cancelled`
  Quando o usuário cancela.
- `awaiting_conflict_resolution -> suspended`
  Quando o usuário escolhe guardar a sessão atual para continuar depois.
- `awaiting_conflict_resolution -> collecting_input`
  Quando o usuário escolhe desconsiderar a sessão anterior e iniciar nova análise.
- `awaiting_final_confirmation -> executing_bling_creation`
  Quando o usuário confirma o envio ao Bling.
- `awaiting_final_confirmation -> collecting_input`
  Quando o usuário pede nova edição após ver o resumo final.
- `awaiting_final_confirmation -> cancelled`
  Quando o usuário cancela.
- `executing_bling_creation -> completed`
  Quando o Bling confirma a criação do orçamento.
- `executing_bling_creation -> failed`
  Quando a integração falha.
- `collecting_input -> suspended`
  Após 10 minutos sem interação do usuário.
- `draft_ready -> suspended`
  Após 10 minutos sem interação do usuário.
- `awaiting_draft_decision -> suspended`
  Após 10 minutos sem interação do usuário.
- `awaiting_final_confirmation -> suspended`
  Após 10 minutos sem interação do usuário.
- `suspended -> collecting_input`
  Quando o usuário escolhe retomar uma análise suspensa.
- `failed -> collecting_input`
  Quando o usuário pede nova tentativa ou edição.

## VERSIONAMENTO DE RASCUNHO
- Cada conversa deve manter versões numeradas sequencialmente: `v1`, `v2`, `v3`.
- A versão ativa é sempre a mais recente, salvo comando explícito para retomar outra.
- Toda edição deve gerar nova versão, nunca sobrescrever a anterior.
- A aprovação simples deve apontar para a última versão ativa.
- A aprovação explícita de versão anterior deve ser suportada no formato `aprovar v2`.
- O resumo final deve sempre informar qual versão está sendo confirmada.

## CONFLITO DE CONTEXTO
Se o usuário enviar uma nova solicitação antes de aprovar, editar ou cancelar o rascunho atual:
- o sistema não deve presumir descarte automático;
- deve informar que existe uma sessão ativa;
- deve perguntar se o usuário quer descartar a sessão atual ou colocá-la em suspensão;
- se a sessão for suspensa, o sistema deve informar o identificador interno da análise e, futuramente, o número do orçamento no Bling se existir vínculo externo.

## SUSPENSÃO E RETOMADA
- Após 10 minutos sem resposta, a sessão ativa deve ir para `suspended`.
- A suspensão deve persistir uma cópia do contexto, versões e pendências em uma tabela própria de análises em andamento.
- Na próxima interação do mesmo número, o sistema deve listar as análises suspensas mais recentes ainda abertas.
- A listagem inicial recomendada deve mostrar as 5 análises mais recentes.
- O usuário pode escolher uma análise para continuar ou iniciar um fluxo novo.
- O sistema deve permitir retomar a versão ativa mais recente da análise suspensa.

## RESUMO FINAL ANTES DO BLING
Antes de criar o orçamento no Bling, o sistema deve apresentar:
- versão aprovada;
- cliente, se identificado;
- grupo de serviços;
- grupo de materiais;
- itens inferidos que foram confirmados;
- custo total estimado dos materiais, quando aplicável;
- venda total estimada dos materiais, quando aplicável;
- lucro bruto estimado dos materiais, quando aplicável;
- materiais sem correspondência clara no Bling ou sem base financeira suficiente;
- pontos de atenção remanescentes;
- ação seguinte esperada: `aprovar`, `editar` ou `cancelar`.

Sem essa confirmação final, a criação no Bling não pode ocorrer.

## CENÁRIOS QUE DEVEM VIRAR TESTE
- iniciar conversa nova com número autorizado;
- ignorar mensagem de número não autorizado;
- gerar `v1` após texto livre do usuário;
- gerar `v2` após pedido de edição;
- suspender sessão após 10 minutos sem resposta;
- listar análises suspensas na próxima interação;
- aprovar a última versão ativa;
- aprovar versão anterior explicitamente;
- abrir resolução de conflito ao receber nova solicitação durante revisão;
- bloquear envio ao Bling sem confirmação final;
- registrar estado `failed` quando a integração externa falhar.
