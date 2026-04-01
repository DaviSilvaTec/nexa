# INTEGRAÇÃO COM BLING

## FUNÇÃO DESTE ARQUIVO
Definir o papel do Bling no sistema, as responsabilidades da integração e os usos principais da API.

## QUANDO CONSULTAR
Consultar este arquivo ao implementar autenticação, leitura do histórico e criação de orçamentos.

## RELAÇÃO COM OUTROS ARQUIVOS
- Complementa `backend.md`, `approval-flow.md` e `../../docs/integrations/bling-history.md`.
- Segue `../../AGENTS.md`.

## PAPEL DO BLING
O Bling é a fonte operacional oficial para:
- clientes
- itens
- propostas/orçamentos
- situações
- histórico comercial
- estados do fluxo

## RESPONSABILIDADES DO MÓDULO
- autenticar e renovar sessão, quando aplicável;
- consultar dados operacionais;
- consultar produtos cadastrados;
- consultar último custo e último preço de venda dos produtos;
- criar orçamentos;
- registrar IDs e estados;
- consultar histórico para análise;
- ler situações e transições.

## REGRA
O Bling não é a camada de inteligência do sistema. É a fonte operacional e documental oficial.

## USO DO CADASTRO DE PRODUTOS
Antes da criação do orçamento, a integração com o Bling deve suportar:
- busca de produtos do orçamento por nome, código ou referência compatível;
- leitura dos dados necessários para análise financeira dos materiais;
- apoio ao cálculo de custo total, venda total e lucro bruto estimado dos materiais;
- sinalização de itens não encontrados ou com histórico insuficiente.

## REGRA DE ENVIO
Se o orçamento contiver materiais, a criação no Bling só pode ocorrer após:
1. consulta dos produtos relacionados;
2. montagem do resumo financeiro dos materiais;
3. apresentação desse resumo ao usuário;
4. confirmação final explícita.
