# ÍNDICE GERAL DA DOCUMENTAÇÃO

## FUNÇÃO DESTE ARQUIVO
Este arquivo explica a estrutura documental do projeto, a função de cada arquivo e a ordem recomendada de consulta.

## QUANDO CONSULTAR
Consultar este arquivo ao iniciar o projeto, ao orientar o Codex, ao revisar a arquitetura documental ou ao procurar rapidamente onde determinada regra está definida.

## RELAÇÃO COM OUTROS ARQUIVOS
- É subordinado a `../AGENTS.md`.
- Serve como mapa geral dos arquivos em `docs/`.

## ORDEM DE LEITURA RECOMENDADA
1. `../AGENTS.md`
2. `changelog.md`
3. `architecture/system-walkthrough.md`
4. `implementation-plan.md`
5. `README.md`
6. `branding/nexa.md`
7. `orcamento-engine.md`
8. `architecture/backend.md`
9. `architecture/project-structure.md`
10. `architecture/git-workflow.md`
11. `architecture/padrao-codex-e-documentacao.md`
12. `architecture/conversation-flow.md`
13. `architecture/approval-flow.md`
14. `architecture/whatsapp.md`
15. `architecture/bling.md`
16. `integrations/bling-history.md`
17. `learning/`
18. `patterns/`
19. `setup/`

## ARQUIVOS DE REGISTRO PRIORITÁRIOS
Todo agente que for retomar o projeto, carregar contexto ou decidir a próxima etapa deve reler primeiro estes quatro arquivos:
- `changelog.md`
- `architecture/system-walkthrough.md`
- `implementation-plan.md`
- `README.md`

Objetivo:
- recuperar o estado factual do sistema;
- entender o comportamento atual real;
- localizar o plano de continuação;
- encontrar rapidamente o restante da documentação relevante.

## MAPA DA DOCUMENTAÇÃO

### Arquivo principal
- `../AGENTS.md`
  Regras centrais do agente, identidade do sistema, prioridades, escopo e comportamento obrigatório.

### Registro contínuo
- `changelog.md`
  Registro cronológico de mudanças, descobertas, limitações práticas e aprendizados do projeto com data e horário.

### Frente visual
- `frontend/visual-redesign-plan.md`
  Plano passo a passo da trilha de redesign visual da Web App.
- `frontend/visual-redesign-changelog.md`
  Registro isolado das mudanças visuais feitas durante a frente de redesign.

### Branding
- `branding/nexa.md`
  Identidade do nome NEXA, significado, posicionamento e nomenclatura interna recomendada.

### Motor de orçamento
- `orcamento-engine.md`
  Define como estruturar, revisar, complementar e apresentar orçamentos.

### Arquitetura técnica
- `architecture/backend.md`
  Visão geral do backend, tecnologias-base e responsabilidades centrais.
- `architecture/project-structure.md`
  Estrutura recomendada de pastas, módulos e camadas.
- `architecture/git-workflow.md`
  Padrão oficial de branches, commits, nomenclatura e merge para a `main`.
- `architecture/padrao-codex-e-documentacao.md`
  Diretriz padrão de trabalho do Codex, com branches por etapa, commits em português, ciclo Red/Green/Refactor e regra de documentação incremental com trechos curtos de código.
- `architecture/system-walkthrough.md`
  Explica o funcionamento atual do sistema ponta a ponta, os principais casos de uso, as rotas HTTP, o bootstrap do runtime e a relação entre as funções centrais do NEXA.
- `architecture/conversation-flow.md`
  Fluxo da conversa entre usuário, agente, aprovação e execução.
- `architecture/approval-flow.md`
  Regras do fluxo de aprovação.
- `architecture/whatsapp.md`
  Integração conceitual com WhatsApp.
- `architecture/bling.md`
  Integração conceitual com Bling.
- `architecture/data-model.md`
  Modelo inicial de dados e entidades principais.
- `architecture/security.md`
  Regras de segurança, acesso e proteção de segredos.

### Integrações
- `integrations/bling-history.md`
  Uso do Bling como fonte principal de histórico operacional e analítico.
- `integrations/bling-api-map.md`
  Mapa operacional da API do Bling para o NEXA, com módulos prioritários, status e ordem recomendada de integração.
- `integrations/openai.md`
  Define o papel da OpenAI no NEXA, a divisão entre IA e backend determinístico e o fluxo recomendado da integração.

### Aprendizado
- `learning/learning-policy.md`
  Política de aprendizado assistido.
- `learning/confidence-rules.md`
  Regras para classificar confiança.
- `learning/feedback-model.md`
  Uso de feedback do usuário.
- `learning/approval-analysis.md`
  Análise de aprovação e não aprovação.

### Padrões por tipo de serviço
- `patterns/camera.md`
- `patterns/interfone.md`
- `patterns/iluminacao.md`
- `patterns/eletrica.md`
- `patterns/rede.md`

### Setup e ambiente
- `setup/environment.md`
- `setup/local-development.md`
- `setup/deployment-notes.md`

## REGRA DE USO
Os nomes dos arquivos ajudam na orientação, mas cada arquivo também deve conter:
- função do arquivo;
- quando consultar;
- relação com outros arquivos.

## OBJETIVO
Permitir que o Codex e o usuário naveguem o projeto de forma previsível, sem ambiguidade documental.
