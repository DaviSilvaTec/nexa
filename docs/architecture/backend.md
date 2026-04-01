# ARQUITETURA DO BACKEND

## FUNÇÃO DESTE ARQUIVO
Definir a arquitetura inicial do backend do projeto, as tecnologias-base, as responsabilidades centrais e a organização técnica principal.

## QUANDO CONSULTAR
Consultar este arquivo ao iniciar a implementação do backend, definir framework, módulos, responsabilidades e integração entre camadas.

## RELAÇÃO COM OUTROS ARQUIVOS
- É subordinado a `../../AGENTS.md`.
- É complementado por `project-structure.md`, `whatsapp.md`, `bling.md`, `conversation-flow.md`, `approval-flow.md`, `data-model.md` e `security.md`.

## OBJETIVO
Criar um backend central que seja a camada única de inteligência e execução do sistema.

## TECNOLOGIA INICIAL RECOMENDADA
- Node.js
- TypeScript
- Fastify
- estrutura preparada para PostgreSQL
- estrutura preparada para integrações externas

## PAPEL DO BACKEND
O backend deve:
- receber mensagens do WhatsApp;
- identificar usuário e contexto;
- processar linguagem natural;
- reescrever e estruturar o texto;
- analisar completude;
- consultar histórico do Bling;
- solicitar aprovação;
- executar ações após aprovação;
- registrar logs, contexto e feedback.

## PRINCÍPIO DE PROJETO
A inteligência do sistema fica no backend.
O WhatsApp é apenas canal de entrada e saída.
O Bling é a fonte operacional oficial.
A base interna do sistema guarda análise, contexto, aprendizado e rastreabilidade.

## CAMADA DE IA
Quando a OpenAI for integrada, ela deve funcionar como camada assistiva de interpretação e redação, nunca como substituta do backend determinístico.

Distribuição correta:
- OpenAI interpreta, estrutura e sugere;
- backend valida, calcula, controla estado e executa;
- usuário aprova antes de qualquer ação operacional real.
