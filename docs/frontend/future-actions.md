# PLANO DE AÇÕES FUTURAS — FRONTEND NEXA

Este documento organiza as melhorias sugeridas para a interface do NEXA, ordenadas da menor para a maior complexidade, focando inicialmente em ganhos rápidos de produtividade e evoluindo para refinamentos de UX e mudanças estruturais.

---

## FASE 1: Produtividade e Navegação (Baixa Complexidade — Grupo C)
*Foco: Melhorar o fluxo de trabalho diário do operador com intervenções pontuais.*

1.  **Botões de Cópia Rápida:** Adicionar ícones para copiar o "Corpo Comercial" e o "Resumo Financeiro" com um clique.
2.  **Contador de Palavras Dinâmico:** Feedback visual em tempo real no `textarea` para o limite mínimo de 30 palavras.
3.  **Atalhos de Teclado:** Implementar `Ctrl + Enter` para disparar o "Enviar ao NEXA".
4.  **Barra de Filtro na Lateral:** Busca rápida por nome de cliente ou título nos cards de Sessões/Modelos.
5.  **Indicador de Sessão Ativa:** Destacar visualmente na lateral qual card está carregado no formulário principal.
6.  **Tooltips de Ajuda:** Dicas flutuantes em botões de ícone e opções de configuração.

## FASE 2: Feedback Visual e Polimento (Média-Baixa Complexidade — Grupo B)
*Foco: Refinar a percepção de "produto acabado" e suavizar transições.*

1.  **Sistema de Notificações (Toasts):** Substituir logs brutos por mensagens flutuantes para sucessos, alertas e erros.
2.  **Skeleton Screens:** Mostrar placeholders pulsantes enquanto as listas laterais carregam.
3.  **Transições CSS Avançadas:** Refinar estados de `hover` e `active` em botões e cards para maior sensação tátil.
4.  **Âncoras de Navegação:** Botão discreto de "Voltar ao Topo" dentro dos blocos de resposta longa do NEXA.

## FASE 3: Acessibilidade e Padrões (Média Complexidade — Grupo D)
*Foco: Alinhamento com boas práticas de desenvolvimento moderno e inclusão.*

1.  **Reforço de Acessibilidade (A11y):** Implementar `aria-live` em regiões dinâmicas e garantir navegação completa via teclado.
2.  **Minificação Básica:** Criar script simples para comprimir CSS/JS antes da entrega em produção.
3.  **Padronização de Ícones:** Migrar ícones SVGs inline para uma biblioteca consistente ou sistema de sprites.

## FASE 4: Modularização e Organização (Média Complexidade — Grupo A Parte 1)
*Foco: Facilitar a manutenção e o trabalho colaborativo no código.*

1.  **Divisão de Arquivos:** Extrair o CSS e o JavaScript do `app.html` para arquivos `.css` e `.js` separados e organizados por responsabilidade.
2.  **Camada de API:** Centralizar as chamadas `fetch` em um módulo de serviço (`api.js`) com tratamento de erro padronizado.

## FASE 5: Interatividade e Recursos Avançados (Alta Complexidade — Grupo B & Novos)
*Foco: Recursos que exigem sincronização em tempo real ou processamento extra.*

1.  **WebSockets ou SSE:** Substituir o polling de 5 segundos por comunicação em tempo real para atualizações de status.
2.  **Modo Diferencial (Diff View):** Destacar visualmente as mudanças sugeridas pela IA em relação ao texto original ou rascunho anterior.
3.  **Drag & Drop OCR:** Permitir o upload de arquivos de imagem/PDF para extração automática de texto pelo NEXA.

## FASE 6: Modernização de Stack (Alta Complexidade — Grupo A Parte 2)
*Foco: Preparar a aplicação para escala e novos recursos complexos.*

1.  **Framework Reativo Leve:** Migrar a lógica de manipulação de DOM para um framework como **Alpine.js** ou **Petite-Vue**, tornando o estado da UI declarativo.
2.  **Build Tooling:** Implementar um bundler (Vite ou Esbuild) para gerenciar dependências, minificação e otimização automática.

---

## CRITÉRIOS DE SUCESSO
- Redução do tempo médio de operação por orçamento.
- Menor taxa de erros de envio devido a falta de revisão.
- Interface intuitiva que dispense treinamento manual para novos operadores.
- Código modular que permita correções rápidas sem efeitos colaterais.
