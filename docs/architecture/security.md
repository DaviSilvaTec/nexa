# SEGURANÇA

## FUNÇÃO DESTE ARQUIVO
Definir regras mínimas de segurança para o projeto.

## QUANDO CONSULTAR
Consultar este arquivo ao implementar autenticação, autorização, gestão de segredos e logs.

## RELAÇÃO COM OUTROS ARQUIVOS
- Complementa `backend.md` e `../setup/environment.md`.
- Segue `../../AGENTS.md`.

## REGRAS MÍNIMAS
- aceitar comandos apenas de usuários/números autorizados;
- nunca expor tokens no código;
- usar variáveis de ambiente para segredos;
- registrar ações críticas;
- separar logs operacionais e segredos;
- proteger dados do usuário e histórico comercial.
