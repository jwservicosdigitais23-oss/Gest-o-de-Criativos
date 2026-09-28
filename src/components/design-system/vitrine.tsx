"use client";

import { useState } from "react";
import {
  AlarmClock,
  CalendarDays,
  Columns3,
  FileSpreadsheet,
  Hourglass,
  Inbox,
  LayoutDashboard,
  List,
  Plus,
  RotateCcw,
  Send,
  Settings,
  Trash2,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, GlassCard } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Campo, Input, PasswordInput, SearchField, Select } from "@/components/ui/input";
import { KpiCard } from "@/components/ui/kpi-card";
import { NavItem } from "@/components/ui/nav-item";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import { StatusTile } from "@/components/ui/status-tile";
import { toast } from "@/components/ui/toast";
import { STATUS, type StatusVisual } from "@/lib/status";
import { cn } from "@/lib/utils";

const CORES: { grupo: string; itens: { nome: string; classe: string; valor: string; claro?: boolean }[] }[] = [
  {
    grupo: "Marca",
    itens: [
      { nome: "navy-900", classe: "bg-navy-900", valor: "#001F4D" },
      { nome: "navy-700", classe: "bg-navy-700", valor: "#03356E" },
      { nome: "blue-600", classe: "bg-blue-600", valor: "#004C97" },
      { nome: "blue-500", classe: "bg-blue-500", valor: "#1466D6" },
      { nome: "cyan-400", classe: "bg-cyan-400", valor: "#00AEEF" },
    ],
  },
  {
    grupo: "Neutros",
    itens: [
      { nome: "text", classe: "bg-text", valor: "#2E3A59" },
      { nome: "text-muted", classe: "bg-text-muted", valor: "#5E6D84" },
      { nome: "border", classe: "bg-border", valor: "#E3E8EF", claro: true },
      { nome: "surface-solid", classe: "bg-surface-solid", valor: "#FFFFFF", claro: true },
      { nome: "bg-app", classe: "bg-app", valor: "#EEF4FC → #DCE9FA", claro: true },
    ],
  },
  {
    grupo: "Gradientes",
    itens: [
      { nome: "sidebar", classe: "bg-gradiente-sidebar", valor: "navy-900 → navy-700" },
      { nome: "primário", classe: "bg-gradiente-primario", valor: "blue-600 → blue-500" },
      { nome: "marca", classe: "bg-gradiente-marca", valor: "navy → blue → cyan" },
    ],
  },
];

const STATUS_LISTA: StatusVisual[] = ["rascunho", "aguardando", "em_revisao", "atrasado", "aprovado", "reprovado", "publicado"];

function Secao({ id, titulo, children }: { id: string; titulo: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="mb-4 text-card-title text-navy-900">{titulo}</h2>
      <Card className="flex flex-col gap-6 p-5">{children}</Card>
    </section>
  );
}

function Linha({ rotulo, children, className }: { rotulo: string; children: React.ReactNode; className?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="rotulo text-text-muted">{rotulo}</p>
      <div className={cn("flex flex-wrap items-center gap-3", className)}>{children}</div>
    </div>
  );
}

export function Vitrine() {
  const [vista, setVista] = useState<"kanban" | "lista">("kanban");
  const [modo, setModo] = useState<"mes" | "semana">("mes");
  const [dialogo, setDialogo] = useState(false);
  const [carregando, setCarregando] = useState(false);

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        titulo="Design System v2"
        subtitulo="Tokens, tipografia e componentes do CRM Adere. Aprove aqui antes da aplicação nas telas."
        acoes={
          <Button onClick={() => toast.success("Post enviado para aprovação", { description: "As aprovadoras foram notificadas." })}>
            <Send /> Testar toast
          </Button>
        }
      />

      <nav aria-label="Seções da vitrine" className="flex flex-wrap gap-2">
        {["cores", "status", "tipografia", "forma", "botoes", "campos", "dados", "navegacao", "feedback"].map((s) => (
          <a key={s} href={`#${s}`} className="transicao rounded-full border border-border bg-surface-solid px-3 py-1 text-label font-semibold capitalize text-blue-600 hover:border-blue-600">
            {s === "botoes" ? "botões" : s === "navegacao" ? "navegação" : s}
          </a>
        ))}
      </nav>

      <Secao id="cores" titulo="Cores">
        {CORES.map((g) => (
          <Linha key={g.grupo} rotulo={g.grupo}>
            {g.itens.map((c) => (
              <div key={c.nome} className="w-36">
                <div className={cn("h-16 rounded-[var(--radius-control)] border border-border", c.classe)} />
                <p className="mt-1.5 text-label font-semibold text-navy-900">{c.nome}</p>
                <p className="text-label text-text-muted">{c.valor}</p>
              </div>
            ))}
          </Linha>
        ))}
        <Linha rotulo="Vidro (surface-glass sobre bg-app)">
          <div className="bg-app flex w-full max-w-xl items-center justify-center rounded-[var(--radius-card)] p-6">
            <GlassCard className="w-full p-5">
              <p className="text-card-title text-navy-900">Cartão de vidro</p>
              <p className="text-body text-text-muted">Branco 85%, blur de 16px e borda branca 60%. Sem suporte a blur, vira branco sólido.</p>
            </GlassCard>
          </div>
        </Linha>
      </Secao>

      <Secao id="status" titulo="Status (lib/status.ts)">
        <Linha rotulo="StatusPill">
          {STATUS_LISTA.map((s) => (
            <StatusPill key={s} status={s} />
          ))}
        </Linha>
        <Linha rotulo="Sem ícone">
          {STATUS_LISTA.map((s) => (
            <StatusPill key={s} status={s} semIcone />
          ))}
        </Linha>
        <Linha rotulo="StatusTile (mini-cartão do Por perfil)">
          <div className="grid w-full max-w-md grid-cols-3 gap-2">
            {(["rascunho", "aguardando", "em_revisao", "aprovado", "publicado", "reprovado"] as StatusVisual[]).map((s, i) => (
              <StatusTile key={s} status={s} valor={i} />
            ))}
          </div>
        </Linha>
        <Linha rotulo="Tabela de valores">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-body">
              <thead>
                <tr className="rotulo text-text-muted">
                  <th className="py-2">Status</th>
                  <th>Ícone</th>
                  <th>Classe de texto (AA)</th>
                  <th>Fundo</th>
                </tr>
              </thead>
              <tbody>
                {STATUS_LISTA.map((s) => {
                  const Icone = STATUS[s].icone;
                  return (
                    <tr key={s} className="border-t border-border">
                      <td className="py-2 font-semibold text-navy-900">{STATUS[s].rotulo}</td>
                      <td><Icone className={cn("size-5", STATUS[s].corIcone)} /></td>
                      <td className="text-label text-text-muted">{STATUS[s].texto}</td>
                      <td className="text-label text-text-muted">{STATUS[s].fundo}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Linha>
      </Secao>

      <Secao id="tipografia" titulo="Tipografia · Montserrat">
        <div className="flex flex-col gap-4">
          <div><p className="text-page-title text-navy-900">Bom dia, Jonathan</p><p className="text-label text-text-muted">page-title · 28/700</p></div>
          <div><p className="text-kpi text-navy-900">128</p><p className="text-label text-text-muted">kpi · 28/700</p></div>
          <div><p className="text-card-title text-navy-900">Próximos 7 dias</p><p className="text-label text-text-muted">card-title · 16/700</p></div>
          <div><p className="text-body text-text">Aqui está o status dos seus criativos hoje.</p><p className="text-label text-text-muted">body · 14/400</p></div>
          <div><p className="text-label text-text">Aguardando aprovação</p><p className="text-label text-text-muted">label · 12/500</p></div>
          <div><p className="rotulo text-text-muted">Planejamento</p><p className="text-label text-text-muted">nav-section · maiúsculas, tracking 0.08em (12px — mínimo do sistema)</p></div>
        </div>
      </Secao>

      <Secao id="forma" titulo="Forma, sombra e espaçamento">
        <Linha rotulo="Raios">
          <div className="flex size-24 items-center justify-center rounded-[var(--radius-card)] border border-border bg-surface-solid text-label">16px cartão</div>
          <div className="flex size-24 items-center justify-center rounded-[var(--radius-control)] border border-border bg-surface-solid text-label">12px controle</div>
          <div className="flex h-10 w-28 items-center justify-center rounded-full border border-border bg-surface-solid text-label">full selo</div>
        </Linha>
        <Linha rotulo="Sombras">
          <div className="flex size-28 items-center justify-center rounded-[var(--radius-card)] bg-surface-solid text-label shadow-card">card</div>
          <div className="flex size-28 items-center justify-center rounded-[var(--radius-card)] bg-surface-solid text-label shadow-elevated">elevated</div>
        </Linha>
        <Linha rotulo="Espaçamento (múltiplos de 4)">
          {[4, 8, 12, 16, 24, 32].map((n) => (
            <div key={n} className="flex flex-col items-center gap-1">
              <div className="bg-cyan-400" style={{ width: n, height: n }} />
              <span className="text-label text-text-muted">{n}</span>
            </div>
          ))}
        </Linha>
      </Secao>

      <Secao id="botoes" titulo="Botões">
        {(["primary", "secondary", "ghost", "danger"] as const).map((v) => (
          <Linha key={v} rotulo={v}>
            <Button variant={v} size="sm">Pequeno</Button>
            <Button variant={v}>Médio</Button>
            <Button variant={v} size="lg">Grande</Button>
            <Button variant={v}><Plus /> Com ícone</Button>
            <Button variant={v} className="outline-2 outline-offset-2 outline-cyan-400">Foco</Button>
            <Button variant={v} disabled>Desabilitado</Button>
            <Button variant={v} carregando>Carregando</Button>
            <Button variant={v} size="icon" aria-label="Excluir"><Trash2 /></Button>
          </Linha>
        ))}
        <Linha rotulo="Decisão (aprovadoras)">
          <Button variant="aprovar" size="decisao">Aprovar</Button>
          <Button variant="revisar" size="decisao"><RotateCcw /> Revisar</Button>
          <Button variant="reprovar" size="decisao">Reprovar</Button>
        </Linha>
        <Linha rotulo="Interativo">
          <Button
            carregando={carregando}
            onClick={() => {
              setCarregando(true);
              setTimeout(() => setCarregando(false), 1500);
            }}
          >
            Clique para carregar
          </Button>
        </Linha>
      </Secao>

      <Secao id="campos" titulo="Campos">
        <div className="grid gap-4 md:grid-cols-2">
          <Campo label="Input" htmlFor="ds-1"><Input id="ds-1" placeholder="Tema do post" /></Campo>
          <Campo label="Input com foco" htmlFor="ds-2"><Input id="ds-2" defaultValue="Liderança" className="border-cyan-400 outline-2 outline-cyan-400/40" /></Campo>
          <Campo label="Com erro" htmlFor="ds-3" erro="Informe o tema."><Input id="ds-3" aria-invalid /></Campo>
          <Campo label="Desabilitado" htmlFor="ds-4" ajuda="Texto de ajuda."><Input id="ds-4" disabled defaultValue="Não editável" /></Campo>
          <Campo label="Select (não corta o texto)" htmlFor="ds-5">
            <Select id="ds-5" className="w-40">
              <option>Todos os status</option>
              <option>Aguardando aprovação</option>
              <option>Em revisão</option>
            </Select>
          </Campo>
          <Campo label="PasswordInput" htmlFor="ds-6"><PasswordInput id="ds-6" defaultValue="segredo123" /></Campo>
          <Campo label="SearchField" htmlFor="ds-7"><SearchField id="ds-7" placeholder="Buscar post, tema, legenda..." /></Campo>
          <Campo label="SearchField desabilitado" htmlFor="ds-8"><SearchField id="ds-8" disabled placeholder="Buscar..." /></Campo>
        </div>
      </Secao>

      <Secao id="dados" titulo="Dados">
        <Linha rotulo="KpiCard · glass">
          <div className="bg-app grid w-full grid-cols-2 gap-3 rounded-[var(--radius-card)] p-4 lg:grid-cols-4">
            <KpiCard variante="glass" icone={Hourglass} rotulo="Aguardando aprovação" valor={2} tom="aguardando" />
            <KpiCard variante="glass" icone={RotateCcw} rotulo="Em revisão" valor={0} tom="revisao" />
            <KpiCard variante="glass" icone={AlarmClock} rotulo="Atrasados" valor={1} tom="atrasado" />
            <KpiCard variante="glass" icone={CalendarDays} rotulo="Próximos 7 dias" valor={2} tom="proximos" />
          </div>
        </Linha>
        <Linha rotulo="KpiCard · compact">
          <div className="grid w-full grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard icone={Hourglass} rotulo="Aguardando" valor={1} tom="aguardando" />
            <KpiCard icone={RotateCcw} rotulo="Em revisão" valor={0} tom="revisao" />
            <KpiCard icone={Send} rotulo="Publicados" valor={4} tom="publicado" />
            <KpiCard icone={CalendarDays} rotulo="Próximos 7 dias" valor={1} tom="proximos" />
          </div>
        </Linha>
        <Linha rotulo="Avatar (sm / md / lg — cor por perfil)">
          {["Edna Queiroz", "Daniela Quintana", "Grupo Adere", "Jonathan Oliveira"].map((n) => (
            <div key={n} className="flex items-center gap-2">
              <Avatar nome={n} size="sm" />
              <Avatar nome={n} size="md" />
              <Avatar nome={n} size="lg" />
            </div>
          ))}
        </Linha>
        <Linha rotulo="SectionHeader">
          <div className="w-full max-w-md">
            <SectionHeader titulo="Precisa da sua ação" contador={3} rotuloContador="posts" link={<a href="#dados">Ver todos</a>} />
          </div>
        </Linha>
      </Secao>

      <Secao id="navegacao" titulo="Navegação">
        <Linha rotulo="NavItem (sidebar)">
          <div className="bg-gradiente-sidebar flex w-64 flex-col gap-1 rounded-[var(--radius-card)] p-3 pl-6">
            <p className="rotulo px-3 pb-1 text-white/60">Principal</p>
            <NavItem href="#navegacao" icone={LayoutDashboard} rotulo="Painel" ativo />
            <p className="rotulo px-3 pb-1 pt-3 text-white/60">Perfis</p>
            <NavItem href="#navegacao" prefixo={<Avatar nome="Edna Queiroz" size="sm" className="ring-0" />} rotulo="Edna Queiroz" />
            <NavItem href="#navegacao" prefixo={<Avatar nome="Daniela Quintana" size="sm" className="ring-0" />} rotulo="Daniela Quintana" contador={1} />
            <p className="rotulo px-3 pb-1 pt-3 text-white/60">Planejamento</p>
            <NavItem href="#navegacao" icone={CalendarDays} rotulo="Calendário" />
            <NavItem href="#navegacao" icone={FileSpreadsheet} rotulo="Importar cronograma" />
            <NavItem href="#navegacao" icone={Settings} rotulo="Configurações" />
          </div>
        </Linha>
        <Linha rotulo="SegmentedControl">
          <SegmentedControl
            rotulo="Visualização"
            valor={vista}
            onChange={setVista}
            opcoes={[
              { valor: "kanban", rotulo: "Kanban", icone: Columns3 },
              { valor: "lista", rotulo: "Lista", icone: List },
            ]}
          />
          <SegmentedControl
            rotulo="Período"
            valor={modo}
            onChange={setModo}
            opcoes={[
              { valor: "mes", rotulo: "Mês" },
              { valor: "semana", rotulo: "Semana" },
            ]}
          />
        </Linha>
      </Secao>

      <Secao id="feedback" titulo="Feedback">
        <Linha rotulo="EmptyState">
          <EmptyState
            className="w-full"
            icone={Inbox}
            titulo="Nenhum post em revisão"
            descricao="Tudo em dia por aqui!"
            acao={<Button variant="secondary">Ver calendário</Button>}
          />
        </Linha>
        <Linha rotulo="Dialog e Toast">
          <Button variant="secondary" onClick={() => setDialogo(true)}>Abrir diálogo</Button>
          <Button variant="secondary" onClick={() => toast("Revisão enviada ao Jonathan")}>Toast neutro</Button>
          <Button variant="secondary" onClick={() => toast.error("Não foi possível salvar o post.")}>Toast de erro</Button>
        </Linha>
        <Linha rotulo="Skeleton">
          <div className="grid w-full grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
          </div>
        </Linha>
        <Linha rotulo="Cartão sólido">
          <Card className="w-full max-w-md">
            <CardHeader><CardTitle>Próximos 7 dias</CardTitle></CardHeader>
            <CardContent className="text-body text-text-muted">Conteúdo do cartão com raio de 16px e sombra card.</CardContent>
          </Card>
        </Linha>
      </Secao>

      <Dialog open={dialogo} onOpenChange={setDialogo}>
        <DialogContent titulo="Aprovar este post?" descricao="Sua aprovação fica registrada na versão v2.">
          <Campo label="Observação (opcional)" htmlFor="ds-obs"><Input id="ds-obs" /></Campo>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialogo(false)}>Cancelar</Button>
            <Button variant="aprovar" onClick={() => { setDialogo(false); toast.success("Post aprovado"); }}>Confirmar aprovação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
