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
3. `branding/nexa.md`
4. `orcamento-engine.md`
5. `architecture/backend.md`
6. `architecture/project-structure.md`
7. `architecture/conversation-flow.md`
8. `architecture/approval-flow.md`
9. `architecture/whatsapp.md`
10. `architecture/bling.md`
11. `integrations/bling-history.md`
12. `learning/`
13. `patterns/`
14. `setup/`

## MAPA DA DOCUMENTAÇÃO

### Arquivo principal
- `../AGENTS.md`
  Regras centrais do agente, identidade do sistema, prioridades, escopo e comportamento obrigatório.

### Registro contínuo
- `changelog.md`
  Registro cronológico de mudanças, descobertas, limitações práticas e aprendizados do projeto com data e horário.

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
