# MODELO INICIAL DE DADOS

## FUNÇÃO DESTE ARQUIVO
Definir entidades e relacionamentos iniciais esperados para o backend.

## QUANDO CONSULTAR
Consultar este arquivo ao modelar banco de dados, repositórios ou objetos persistidos.

## RELAÇÃO COM OUTROS ARQUIVOS
- Complementa `backend.md` e `project-structure.md`.
- Apoia `learning/` e `integrations/bling-history.md`.

## ENTIDADES INICIAIS SUGERIDAS
- User
- AuthorizedChannel
- Conversation
- ConversationMessage
- DraftBudgetVersion
- DraftBudget
- ApprovalContext
- SuspendedAnalysis
- BlingQuoteReference
- FeedbackEvent
- LearningObservation
- PatternSuggestion
- AuditLog

## OBJETIVO
Permitir rastreabilidade, contexto de conversa, histórico de sugestões, feedback e vínculo com documentos do Bling.

## PRINCÍPIOS DE MODELAGEM
- preservar histórico, nunca sobrescrever versões aprovadas ou editadas;
- separar mensagem bruta, interpretação estruturada e ação executada;
- manter vínculo explícito entre aprovação e versão;
- permitir suspensão e retomada sem perda de contexto;
- registrar auditoria de toda ação crítica;
- modelar erro operacional como evento persistido.

## ENTIDADES E CAMPOS MÍNIMOS

### User
Representa o operador interno do sistema.

Campos mínimos:
- `id`
- `name`
- `status`
- `createdAt`
- `updatedAt`

### AuthorizedChannel
Representa um canal autorizado para operar o sistema.

Campos mínimos:
- `id`
- `userId`
- `channelType`
- `channelValue`
- `isActive`
- `createdAt`
- `updatedAt`

Observação:
- na fase inicial haverá um único número de WhatsApp autorizado.

### Conversation
Representa a sessão principal associada a uma solicitação operacional.

Campos mínimos:
- `id`
- `userId`
- `channelId`
- `status`
- `startedAt`
- `lastInteractionAt`
- `suspendedAt`
- `completedAt`
- `cancelledAt`
- `failureReason`
- `activeDraftVersionId`
- `approvedDraftVersionId`
- `latestApprovalContextId`
- `createdAt`
- `updatedAt`

Estados esperados:
- `collecting_input`
- `draft_ready`
- `awaiting_draft_decision`
- `awaiting_conflict_resolution`
- `awaiting_final_confirmation`
- `executing_bling_creation`
- `suspended`
- `completed`
- `cancelled`
- `failed`

### ConversationMessage
Representa cada mensagem trocada no fluxo.

Campos mínimos:
- `id`
- `conversationId`
- `direction`
- `rawText`
- `normalizedText`
- `messageType`
- `externalMessageId`
- `sentAt`
- `createdAt`

Valores esperados:
- `direction`: `inbound` ou `outbound`
- `messageType`: `text`, `command`, `system_status`, `error`

### DraftBudget
Representa o agrupador lógico das versões de orçamento de uma conversa.

Campos mínimos:
- `id`
- `conversationId`
- `currentVersionNumber`
- `createdAt`
- `updatedAt`

### DraftBudgetVersion
Representa cada versão imutável do rascunho.

Campos mínimos:
- `id`
- `draftBudgetId`
- `versionNumber`
- `sourceMessageId`
- `structuredText`
- `servicesSummary`
- `materialsSummary`
- `informedItemsJson`
- `inferredItemsJson`
- `conditionalItemsJson`
- `attentionPointsJson`
- `suggestionsJson`
- `confidenceLevel`
- `createdByEvent`
- `createdAt`

Valores esperados:
- `confidenceLevel`: `high`, `medium`, `low`
- `createdByEvent`: `initial_parse`, `user_edit`, `resume`, `manual_adjustment`

### ApprovalContext
Representa a trilha formal de aprovação.

Campos mínimos:
- `id`
- `conversationId`
- `draftBudgetVersionId`
- `approvalStage`
- `status`
- `requestedAt`
- `decidedAt`
- `decidedByChannelId`
- `decisionCommand`
- `notes`
- `createdAt`
- `updatedAt`

Valores esperados:
- `approvalStage`: `draft_review`, `final_execution`
- `status`: `pending`, `approved`, `edited`, `cancelled`, `expired`, `rejected`

### SuspendedAnalysis
Representa o snapshot resumido de uma conversa pausada.

Campos mínimos:
- `id`
- `conversationId`
- `draftBudgetId`
- `lastDraftVersionId`
- `reason`
- `snapshotJson`
- `suspendedAt`
- `resumedAt`
- `status`
- `createdAt`
- `updatedAt`

Valores esperados:
- `reason`: `timeout`, `user_choice`, `execution_error`
- `status`: `open`, `resumed`, `closed`

### BlingQuoteReference
Representa o vínculo com o documento externo no Bling.

Campos mínimos:
- `id`
- `conversationId`
- `draftBudgetVersionId`
- `blingQuoteId`
- `blingQuoteNumber`
- `blingStatus`
- `pdfUrl`
- `lastSyncedAt`
- `createdAt`
- `updatedAt`

Observação:
- na fase inicial, o vínculo deve ser criado apenas após confirmação final e sucesso na integração.

### FeedbackEvent
Representa o feedback explícito do operador sobre a sugestão.

Campos mínimos:
- `id`
- `conversationId`
- `draftBudgetVersionId`
- `eventType`
- `reason`
- `detailsJson`
- `createdAt`

Valores esperados:
- `eventType`: `approved_without_change`, `approved_with_change`, `rejected`, `manual_item_added`, `suggested_item_removed`, `text_rewritten`, `stalled_reason_recorded`

### LearningObservation
Representa observações derivadas do uso real.

Campos mínimos:
- `id`
- `sourceType`
- `sourceReferenceId`
- `category`
- `observationKey`
- `observationValue`
- `confidenceLevel`
- `occurrenceCount`
- `isEligibleForSuggestion`
- `createdAt`
- `updatedAt`

Regra:
- uma observação só pode ser elegível para consolidação após no mínimo 3 recorrências relevantes.

### PatternSuggestion
Representa uma sugestão de padrão pronta para validação humana.

Campos mínimos:
- `id`
- `category`
- `title`
- `description`
- `supportingObservationIdsJson`
- `status`
- `createdAt`
- `updatedAt`

Valores esperados:
- `status`: `pending_review`, `approved`, `rejected`

### AuditLog
Representa rastreabilidade técnica e operacional.

Campos mínimos:
- `id`
- `entityType`
- `entityId`
- `action`
- `actorType`
- `actorReference`
- `metadataJson`
- `createdAt`

## RELACIONAMENTOS MÍNIMOS
- `User 1:N AuthorizedChannel`
- `User 1:N Conversation`
- `Conversation 1:N ConversationMessage`
- `Conversation 1:1 DraftBudget`
- `DraftBudget 1:N DraftBudgetVersion`
- `Conversation 1:N ApprovalContext`
- `Conversation 1:N SuspendedAnalysis`
- `Conversation 0:N BlingQuoteReference`
- `DraftBudgetVersion 0:N FeedbackEvent`
- `Conversation 0:N AuditLog`

## REGRAS DE INTEGRIDADE
- uma conversa pode ter apenas uma versão ativa por vez;
- uma versão aprovada não pode ser alterada, apenas sucedida por nova versão;
- uma aprovação sempre deve apontar para uma versão existente;
- uma análise suspensa aberta deve apontar para uma conversa em `suspended`;
- uma conversa `completed` ou `cancelled` não pode receber novas aprovações;
- um vínculo com Bling não deve existir antes da confirmação final, salvo decisão futura explícita.

## CENÁRIOS QUE DEVEM VIRAR TESTE
- criar conversa nova com draft inicial e `v1`;
- criar `v2` sem sobrescrever `v1`;
- associar aprovação a uma versão válida;
- impedir aprovação para versão inexistente;
- suspender conversa e persistir snapshot;
- retomar análise suspensa aberta;
- registrar referência do Bling após confirmação final;
- contar observações recorrentes até atingir o mínimo de 3;
- registrar auditoria em ação crítica.
