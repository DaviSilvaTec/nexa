# MOTOR DE ESTRUTURAÇÃO DE ORÇAMENTOS

## FUNÇÃO DESTE ARQUIVO
Definir como o sistema deve transformar solicitações em linguagem natural em textos de orçamento mais claros, técnicos, profissionais e consistentes.

## QUANDO CONSULTAR
Consultar este arquivo quando for implementar:
- reescrita de texto;
- estruturação comercial;
- análise de completude;
- sugestão de itens possivelmente ausentes;
- apresentação do orçamento antes da aprovação.

## RELAÇÃO COM OUTROS ARQUIVOS
- Segue as regras centrais de `../AGENTS.md`.
- Usa padrões de `patterns/`.
- Usa políticas de aprendizado de `learning/`.
- Depende da arquitetura definida em `architecture/`.

## OBJETIVO
Padronizar a criação de descrições de orçamento com base em:
- histórico da empresa;
- histórico do Bling;
- boas práticas técnicas;
- clareza comercial.

## ESTRUTURA PADRÃO
Todo orçamento deve conter, quando aplicável:
1. Descrição principal
2. Escopo do serviço
3. Observações técnicas
4. Exclusões
5. Pontos de atenção

## REGRAS DE ESCRITA
- Linguagem técnica e clara
- Frases curtas e objetivas
- Evitar ambiguidades
- Não usar linguagem informal
- Não usar termos vagos sem explicação

## USO DE HISTÓRICO
O sistema deve:
- identificar padrões recorrentes;
- reutilizar estruturas de escrita;
- sugerir modelos por tipo de serviço;
- manter consistência entre orçamentos;
- priorizar o histórico do Bling como base operacional real.

## ANÁLISE DE COMPLETUDE DO ORÇAMENTO
O sistema deve verificar, com base no histórico e em padrões técnicos, se a solicitação aparenta estar incompleta.

Verificar possíveis ausências de:
- materiais principais;
- materiais auxiliares;
- fixadores;
- conectores;
- cabeamento;
- infraestrutura;
- consumíveis.

## SAÍDA DA ANÁLISE DE COMPLETUDE
Quando houver indícios de itens faltantes, retornar:
- itens possivelmente ausentes;
- base da sugestão;
- nível de confiança;
- ação esperada do usuário.

## REGRA DE NÃO ASSUNÇÃO
O sistema não deve transformar automaticamente itens inferidos em itens confirmados do orçamento.

## SUGESTÃO DE PREÇO
Quando solicitado:
- buscar histórico interno;
- complementar com histórico do Bling;
- complementar com pesquisa externa, se necessário;
- retornar faixa de valor;
- nunca definir valor final automaticamente.

## ANÁLISE FINANCEIRA DOS MATERIAIS
Quando o orçamento contiver materiais, o sistema deve:
- procurar os produtos correspondentes no cadastro do Bling;
- identificar o último valor de custo disponível de cada produto;
- identificar o último valor de venda disponível de cada produto;
- montar um resumo por item com custo, venda e lucro bruto estimado;
- consolidar custo total, venda total e lucro bruto total dos materiais;
- sinalizar itens sem custo, sem venda ou com correspondência incerta;
- permitir revisão manual do preço de venda antes do envio final.

## SAÍDA DA ANÁLISE FINANCEIRA
Antes da confirmação final, retornar:
- materiais encontrados no Bling;
- materiais sem correspondência clara;
- custo total estimado dos materiais;
- venda total estimada dos materiais;
- lucro bruto estimado dos materiais;
- base usada para cada valor;
- ação esperada do usuário.

## REGRA DE APROVAÇÃO FINANCEIRA
Se houver materiais no orçamento, o envio ao Bling deve depender da apresentação prévia do resumo financeiro dos materiais.

## OBJETIVO FINAL
Gerar orçamentos:
- claros
- profissionais
- consistentes
- replicáveis
