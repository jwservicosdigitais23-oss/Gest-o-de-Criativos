# Plano · Redesign UX (Design System v2)

Branch: `redesign-ux`. Regra de todas as etapas: **só aparência e usabilidade** — nada de banco, RLS, migrações, API ou regras do fluxo de aprovação.

## Etapa 1 · Design System v2 (esta entrega)

- Tokens em `src/app/globals.css` (`@theme`). O projeto usa **Tailwind 4**, que é configurado direto no CSS — não existe `tailwind.config` (os tokens viram utilitários como `bg-navy-900`, `text-text-muted`, `shadow-card`, `rounded-[var(--radius-card)]`).
- Mapa único de status em `src/lib/status.ts` (rótulo, ícone Lucide, classes de texto/fundo/borda/ícone). `STATUS_LABEL/CLASSES/COR` em `constantes.ts` agora derivam dele.
- Componentes em `src/components/ui`: Button, Input, Select, SearchField, PasswordInput, StatusPill, KpiCard (glass/compact), StatusTile, Card/GlassCard, Avatar (sm/md/lg, cor por perfil), SegmentedControl, EmptyState, PageHeader, SectionHeader, NavItem, Toaster/toast, Dialog, Skeleton.
- Vitrine em `/design-system` (só admin).
- Telas antigas: apenas troca direta de token (nomes v1 viraram apelidos dos v2; raio 10px → 12px; textos de 10–11px → 12px; sidebar com gradiente). As telas serão refeitas nas próximas etapas.

## Conferência de cores nas imagens de referência

Amostragem (média de pixels) do mockup `01–04`:

| Token | Plano | Amostrado | Decisão |
| --- | --- | --- | --- |
| navy-700 (fim do gradiente da sidebar) | ≈ #0A3A8C | #013477 … #03356E | **#03356E** (imagem) |
| blue-500 (fim do gradiente do botão) | ≈ #1466D6 | #025ED4 … #1C67CC | #1466D6 (dentro da faixa amostrada) |
| bg-app | #EEF4FC → #DCE9FA | #F2F7FD … #E4F1FC | mantido (diferença imperceptível) |
| cyan-400 (item ativo) | #00AEEF | #0073D7 (misturado ao fundo translúcido) | mantido #00AEEF |

As demais cores (navy-900, blue-600, neutros, status) seguem o manual/plano.

## Ajustes de acessibilidade (para aprovação)

Algumas combinações do plano não atingem contraste **AA (4,5:1)** em texto de 12–14px. Mantive a cor do plano no **ícone e na borda** e usei um tom mais escuro só no **texto**:

| Uso | Plano | Contraste | Texto usado | Contraste |
| --- | --- | --- | --- | --- |
| text-muted sobre branco | #6B7A90 | 4,36 | #5E6D84 | 5,25 |
| Rascunho (texto/fundo) | #6B7A90/#EEF1F5 | 3,85 | #5E6D84 | 4,64 |
| Em revisão | #D97706/#FEF3C7 | 2,9 | #B45309 | 4,51 |
| Aprovado | #16A34A/#DCFCE7 | 3,0 | #15803D | 4,57 |
| Reprovado / Atrasado | #DC2626/#FEE2E2 | 3,95 | #B91C1C | 5,30 |
| Botões Aprovar / Revisar (texto branco) | #16A34A / #D97706 | 3,3 / 3,2 | #15803D / #B45309 | 5,0 / 5,0 |

- nav-section: o plano pede 11px, mas a regra "proibido texto abaixo de 12px" prevalece → 12px.
- A prévia do LinkedIn mantém as cores e fontes do próprio LinkedIn (é uma simulação do feed), por isso não usa tokens.

## Etapa 1 aprovada (28/09/2026)

Todos os pontos acima foram aprovados.

## Etapa 2 · Shell e Login (entregue)

- Logo: ~~triângulo provisório~~ → **logo oficial** enviado em 28/09 (`public/logo-adere.png` colorido e `public/logo-adere-branco.png` monocromático para fundos escuros).
- Sidebar: gradiente navy-900 → navy-700, `NavItem` com ícone/avatar, contador e item ativo em cyan; cartão "Criativos em dia" / "{n} aguardando aprovação" no rodapé.
- Topbar de vidro: `SearchField` em pílula, "+ Novo post" (admin), sino com contador e avatar com nome + papel.
- Menu inferior do celular com o gradiente da sidebar.
- Login: foto da cidade (`public/imagens/login-cidade.webp`) em tela cheia com sobreposição azul; textos à esquerda; formulário em cartão de vidro à direita (empilhado no celular).
- Banner do painel salvo em `public/imagens/banner-painel.webp` para a etapa 3.

## Etapa 3 · Painel e Por perfil (entregue)

- Banner com a arte da marca (`banner-painel.webp`), véu claro para leitura, saudação e os 5 KPIs em cartões de vidro (o mockup mostra 4; mantidos os 5 do blueprint: Aguardando, Em revisão, Atrasados, Aprovados para a semana, Tempo médio).
- "Precisa da sua ação" e "Próximos 7 dias" em cartões de vidro, com estado vazio ilustrado, horário em mini-cartão e selo de status.
- "Por perfil": um cartão por perfil com avatar, tipo, 6 mini-cartões de status (StatusTile) e "Ver posts"; filtro "Todos os meses" (conta só os posts do mês escolhido).
- Painel da aprovadora com o mesmo banner, KPI "Para você aprovar" e cartões de vidro.

## Etapa 4 · Perfil (Kanban) e detalhe do post (entregue)

- Cabeçalho do perfil: voltar, avatar grande, nome, tipo · modo de aprovação, aprovadoras; "Exportar cronograma" e "+ Novo post".
- KPIs compactos (Aguardando, Em revisão, Aprovados no mês, Próximos 7 dias).
- Filtros de status/formato/mês sem cortar texto + SegmentedControl Kanban/Lista.
- Kanban com colunas de vidro (selo com ícone + contagem) e cartões com miniatura, data · hora, tema, selo, formato e versão; selo "Atrasado" quando o prazo venceu (só visual, via `statusVisual`).
- Lista (e celular) com o mesmo padrão.
- Detalhe do post: voltar com avatar do perfil, seletor de versões, selo com ícone, cartões de vidro (Sua decisão, Linha do tempo, Detalhes fixo ao rolar no desktop, Ações do administrador).

## Etapa 5 · Calendário, Importar, Configurações e revisão mobile (entregue)

- Calendário: `SegmentedControl` Mês/Semana, grade em vidro, chips de perfil com avatar, filtro de status sem corte, lista agrupada por dia no celular.
- Importar cronograma, Configurações (Perfis, Membros, Sistema), Busca, Notificações, formulário de post e telas de erro/404: cartões de vidro, `StatusPill`, `EmptyState` e `PageHeader` no lugar dos componentes antigos; tokens no lugar de `bg-white`.
- Revisão em 360–390px: nenhuma tela com rolagem lateral; Membros mostra papel e situação no celular.

## Redesign concluído

Todas as etapas entregues na branch `redesign-ux` (PR #1). Nenhuma mudança em banco, RLS, migrações, API ou regras do fluxo de aprovação.
