# INTEGRAÇÃO COM OPENAI

## FUNÇÃO DESTE ARQUIVO
Definir como a OpenAI deve ser usada no NEXA, quais responsabilidades ficam na camada de IA e quais devem permanecer no backend determinístico.

## QUANDO CONSULTAR
Consultar este arquivo ao:
- planejar a integração com a API da OpenAI;
- definir prompts, contratos de saída e uso de contexto local;
- decidir o que a IA pode ou não pode fazer no fluxo do orçamento;
- implementar a interface web de testes com interpretação assistida.

## RELAÇÃO COM OUTROS ARQUIVOS
- É subordinado a `../../AGENTS.md`.
- Complementa `../architecture/backend.md`, `../architecture/conversation-flow.md`, `../architecture/approval-flow.md`, `../architecture/bling.md` e `../orcamento-engine.md`.
- Deve ser lido junto com `bling-api-map.md` quando a IA depender de contexto local sincronizado do Bling.

## OBJETIVO
Usar a OpenAI como camada de interpretação, estruturação e sugestão, sem transferir para a IA a responsabilidade por validação operacional, cálculo final, aprovação ou execução.

## PRINCÍPIO CENTRAL
A IA propõe.
O backend valida.
O usuário aprova.
O backend executa.

## PAPEL DA OPENAI NO NEXA
A OpenAI deve ser usada para:
- interpretar texto livre do usuário;
- estruturar a solicitação em formato operacional;
- sugerir materiais prováveis com base no contexto enviado;
- apontar ambiguidades e dados faltantes;
- sugerir itens possivelmente ausentes;
- redigir a resposta operacional do agente em linguagem natural clara e profissional;
- classificar confiança da interpretação com justificativa curta.

## O QUE NÃO DEVE FICAR COM A OPENAI
A OpenAI não deve:
- executar criação de orçamento;
- aprovar orçamento;
- definir preço final de forma autônoma;
- decidir sozinha quais itens entram como confirmados;
- substituir regras de estado, aprovação ou auditoria;
- assumir que custo, venda ou lucro são definitivos sem base do backend.

## ENTRADA IDEAL PARA A OPENAI
O backend deve montar um pacote estruturado contendo, no mínimo:
- texto original do usuário;
- contato localizado localmente, quando houver;
- resumo do histórico local de propostas e notas de serviço;
- lista de materiais pesquisados;
- candidatos de produtos do catálogo local;
- resumo financeiro local dos materiais encontrados;
- alertas já detectados localmente;
- regras operacionais que a IA deve respeitar.

## SAÍDA ESPERADA DA OPENAI
A saída da IA deve ser estruturada e previsível, contendo:
- versão estruturada sugerida;
- itens informados;
- itens inferidos;
- itens condicionais;
- itens possivelmente ausentes;
- pontos de atenção;
- sugestões textuais;
- nível de confiança;
- justificativa curta;
- ação esperada do usuário.

## DIVISÃO DE RESPONSABILIDADES

### Camada de IA
- interpretação de linguagem;
- extração e organização de intenção;
- ranqueamento semântico de materiais candidatos;
- formulação da resposta do agente.

### Backend determinístico
- busca local e integração com Bling;
- cálculo de custo, venda e lucro;
- controle de estado da conversa;
- regras de aprovação;
- registro de auditoria;
- execução operacional.

## MODELO DE INTEGRAÇÃO RECOMENDADO
Integração recomendada:
- usar a Responses API como endpoint principal;
- usar saída estruturada com schema definido;
- usar function calling apenas quando fizer sentido delegar ações determinísticas ao backend;
- manter a lógica crítica fora da IA.

Base oficial:
- Responses API: https://platform.openai.com/docs/api-reference/responses
- Structured Outputs: https://platform.openai.com/docs/guides/structured-outputs
- Function calling: https://platform.openai.com/docs/guides/function-calling

## FLUXO RECOMENDADO
1. Usuário envia mensagem em texto natural.
2. Backend localiza cliente, histórico e materiais candidatos.
3. Backend monta o pacote de contexto para a IA.
4. OpenAI devolve a interpretação estruturada.
5. Backend cruza a resposta com regras locais.
6. Backend calcula resumo financeiro e aplica alertas.
7. NEXA apresenta a resposta final para aprovação.
8. Somente após aprovação o backend executa a ação real.

## PRIMEIRO USO RECOMENDADO NO PROJETO
A primeira integração com OpenAI deve atender a interface web de testes, antes do WhatsApp.

Objetivos dessa etapa:
- validar a interpretação com contexto real local;
- comparar a saída da IA com a resposta local determinística já existente;
- ajustar contrato, schema e prompts antes de integrar ao canal oficial.

## CRITÉRIO DE QUALIDADE
A integração com OpenAI só deve avançar para o fluxo principal quando:
- a saída estruturada estiver estável;
- o schema estiver validado em teste;
- o backend continuar no controle das decisões críticas;
- a interface web permitir inspeção fácil da resposta da IA e da validação local lado a lado.
