# INTEGRAÇÃO COM WHATSAPP

## FUNÇÃO DESTE ARQUIVO
Definir o papel do WhatsApp como canal inicial, o fluxo conceitual do webhook e as responsabilidades do módulo de integração.

## QUANDO CONSULTAR
Consultar este arquivo ao implementar o recebimento e envio de mensagens do canal principal.

## RELAÇÃO COM OUTROS ARQUIVOS
- Complementa `backend.md` e `conversation-flow.md`.
- Depende das regras de `../../AGENTS.md`.

## PAPEL DO WHATSAPP
- canal inicial de entrada e saída;
- interface principal de conversa com o usuário;
- não contém a lógica de negócio principal.

## RESPONSABILIDADES DO MÓDULO
- receber mensagens
- validar origem/autorização
- encaminhar payload para o backend central
- enviar respostas estruturadas
- manter separação entre canal e regras de negócio

## GESTÃO DE LATÊNCIA
Para mitigar a percepção de demora em processamentos mais longos (análise de histórico, consulta Bling, refinamento LLM):
- **Sinal de Digitando:** O Bridge deve enviar o evento de "typing" logo após a validação da mensagem.
- **Respostas Intermediárias:** Se o processo exceder o tempo limite esperado (ex: 5 segundos), o sistema pode enviar uma mensagem curta de status ("Analisando histórico...", "Sugerindo itens faltantes...") para manter o engajamento.

