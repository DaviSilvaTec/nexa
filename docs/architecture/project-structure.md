# ESTRUTURA DO PROJETO

## FUNÇÃO DESTE ARQUIVO
Definir a estrutura recomendada de pastas, módulos e responsabilidades do projeto de backend.

## QUANDO CONSULTAR
Consultar este arquivo ao criar o repositório, iniciar o backend ou reorganizar a estrutura do código.

## RELAÇÃO COM OUTROS ARQUIVOS
- Complementa `backend.md`.
- Usa os fluxos de `conversation-flow.md` e `approval-flow.md`.
- Usa a nomenclatura de `../branding/nexa.md`.

## ESTRUTURA SUGERIDA

```text
src/
  app/
  modules/
    nexa-core/
    nexa-flow/
    nexa-budget/
    nexa-learn/
    nexa-insight/
    nexa-bridge/
      whatsapp/
      bling/
  services/
  repositories/
  integrations/
  utils/
  config/
  types/

docs/
  branding/
  architecture/
  integrations/
  learning/
  patterns/
  setup/
```

## OBSERVAÇÕES
- `nexa-core/` concentra a orquestração central.
- `nexa-flow/` cuida do contexto de conversa, estado e aprovação.
- `nexa-budget/` cuida da estruturação do orçamento.
- `nexa-learn/` cuida do aprendizado assistido.
- `nexa-insight/` cuida da análise de histórico e padrões.
- `nexa-bridge/` cuida das integrações externas.
