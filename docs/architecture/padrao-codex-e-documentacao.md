# PADRÃO DO CODEX E DA DOCUMENTAÇÃO

## FUNÇÃO DESTE ARQUIVO
Este arquivo consolida o padrão de trabalho que deve ser seguido pelo Codex neste projeto e reutilizado como base em outros projetos futuros.

## QUANDO CONSULTAR
Consultar este arquivo:
- ao iniciar uma nova frente de trabalho;
- ao definir branches, commits e merge;
- ao planejar refatorações incrementais;
- ao atualizar documentação técnica;
- ao preparar um novo projeto para seguir o mesmo padrão operacional.

## RELAÇÃO COM OUTROS ARQUIVOS
- É subordinado a `../../AGENTS.md`.
- Complementa `../README.md`.
- Complementa `git-workflow.md`.
- Deve orientar a produção e manutenção de `system-walkthrough.md` e documentos equivalentes em outros projetos.

## OBJETIVO
Garantir um padrão único de:
- organização do trabalho em branches;
- evolução incremental segura;
- documentação técnica baseada no comportamento real do código;
- uso disciplinado de testes no ciclo Red, Green, Refactor.

## REGRA DE TRABALHO EM BRANCHES
- Nunca trabalhar diretamente na `main`.
- Toda mudança deve começar em uma branch própria.
- Cada branch deve representar uma etapa, ajuste ou frente bem definida.
- O merge para a `main` só deve acontecer após implementação, teste e validação da etapa.
- Depois do merge, a branch de trabalho deve ser apagada.

## NOMES DE BRANCHES
Os nomes devem ser claros, significativos e em português.

Prefixos recomendados:
- `ui/` → mudanças visuais e de comportamento do front-end
- `fluxo/` → mudanças de fluxo operacional
- `integracao/` → integrações externas e sincronizações
- `arquitetura/` → mudanças estruturais, desacoplamento e reorganização interna
- `docs/` → mudanças exclusivamente documentais
- `ajuste/` → correções pequenas e pontuais
- `analise/` → investigação técnica e mapeamento arquitetural

## NOMES DE COMMITS
- Devem estar em português.
- Devem descrever a mudança real de forma objetiva.
- Devem ser feitos somente após a etapa estar implementada e validada.

## REGRA DE IMPLEMENTAÇÃO INCREMENTAL
Mudanças estruturais devem seguir a ordem:
1. acrescentar a estrutura nova;
2. manter a estrutura antiga funcionando;
3. migrar usos gradualmente;
4. validar o sistema inteiro em cada etapa;
5. remover o legado apenas quando a migração estiver concluída.

## REGRA DE STASH
- `stash` não deve ser criado automaticamente.
- Antes de criar um `stash`, deve ser mostrado:
  - quais arquivos entrariam;
  - que mudança é essa;
  - por que o `stash` está sendo considerado.
- O `stash` só deve ser criado após aprovação explícita do usuário.

## REGRA DE TESTES
Toda mudança deve seguir, sempre que fizer sentido, o ciclo:

### Red
- ajustar ou criar o teste para expor o comportamento esperado;
- validar que ele falha pelo motivo correto.

### Green
- implementar o mínimo necessário para fazer o teste passar.

### Refactor
- reorganizar o código sem mudar o comportamento;
- manter os testes passando.

## REGRA DE DOCUMENTAÇÃO
A documentação deve refletir:
- o comportamento real do sistema;
- o fluxo real do código;
- o estado validado da implementação.

Não documentar:
- intenção futura como se já existisse;
- comportamento desejado que ainda não foi implementado.

## PADRÃO DE DOCUMENTAÇÃO TÉCNICA
Documentos que explicam o funcionamento do sistema, especialmente walkthroughs, devem incluir quando fizer sentido:
- nome da função ou caso de uso;
- papel da função;
- entrada esperada;
- saída esperada;
- trecho curto de código;
- explicação objetiva do que aquele trecho está fazendo.

## REGRA PARA TRECHOS DE CÓDIGO NA DOCUMENTAÇÃO
- usar apenas trechos curtos e relevantes;
- não copiar arquivos longos;
- usar o código para explicar comportamento, não para duplicar implementação;
- priorizar funções de entrada, saída, composição de dependências e transições de estado.

## APLICAÇÃO EM OUTROS PROJETOS
Este padrão deve servir como base para novos projetos do Codex.

Em novos projetos, o mínimo esperado é:
- branch por etapa;
- commit em português após validação;
- merge controlado para `main`;
- documentação incremental;
- walkthrough técnico com função, entrada, saída e trecho curto de código;
- uso disciplinado do ciclo Red, Green, Refactor.
