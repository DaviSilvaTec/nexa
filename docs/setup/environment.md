# AMBIENTE E CONFIGURAÇÃO

## FUNÇÃO DESTE ARQUIVO
Definir variáveis de ambiente, configurações mínimas e parâmetros sensíveis do projeto.

## QUANDO CONSULTAR
Consultar este arquivo ao configurar o ambiente local, homologação ou produção.

## RELAÇÃO COM OUTROS ARQUIVOS
- Complementa `../architecture/backend.md` e `../architecture/security.md`.

## VARIÁVEIS ESPERADAS
Exemplos conceituais:
- APP_PORT
- NODE_ENV
- DATABASE_URL
- WHATSAPP_API_TOKEN
- WHATSAPP_VERIFY_TOKEN
- BLING_CLIENT_ID
- BLING_CLIENT_SECRET
- BLING_REDIRECT_URI

## PADRÃO LOCAL ADOTADO
- o projeto passa a carregar automaticamente um arquivo local `.env.local` na raiz;
- use `.env.example` como modelo;
- os valores reais não devem ser versionados;
- `.env.local` deve concentrar:
  - OpenAI
  - Bling
  - canais autorizados
  - porta local, quando necessário

## REGRA
Este arquivo documenta o que deve existir. Os valores reais não devem ser versionados.
