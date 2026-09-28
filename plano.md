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

## Próximas etapas (a aprovar)

2. Shell (sidebar com gradiente, topbar de vidro, SearchField) e Login.
3. Painel (KpiCard glass, banner) e Por perfil (StatusTile).
4. Página do perfil / Kanban e detalhe do post.
5. Calendário, Importar, Configurações e revisão mobile.
