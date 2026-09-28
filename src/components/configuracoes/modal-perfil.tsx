"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { salvarPerfil } from "@/app/(app)/configuracoes/actions";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Campo, Input, Select } from "@/components/ui/input";
import { BUCKET_MIDIAS } from "@/lib/constantes";
import { createClient } from "@/lib/supabase/client";
import type { MembroConfig, PerfilConfig } from "./tipos";

export function ModalPerfil({
  aberto,
  onOpenChange,
  perfil,
  aprovadorasDisponiveis,
}: {
  aberto: boolean;
  onOpenChange: (v: boolean) => void;
  perfil: PerfilConfig | null;
  aprovadorasDisponiveis: MembroConfig[];
}) {
  const router = useRouter();
  const novo = !perfil;
  const [id] = useState(() => perfil?.id ?? crypto.randomUUID());
  const [nome, setNome] = useState(perfil?.nome ?? "");
  const [tipo, setTipo] = useState(perfil?.tipo ?? "pessoal");
  const [linkedin, setLinkedin] = useState(perfil?.linkedin_url ?? "");
  const [modo, setModo] = useState(perfil?.modo_aprovacao ?? "qualquer_uma");
  const [aprovadoras, setAprovadoras] = useState<string[]>(perfil?.aprovadoras ?? []);
  const [avatarPath, setAvatarPath] = useState<string | null>(perfil?.avatar_url ?? null);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(perfil?.avatarSrc ?? null);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const inputFoto = useRef<HTMLInputElement>(null);

  async function enviarFoto(arquivo: File) {
    if (!arquivo.type.startsWith("image/")) return toast.error("Envie uma imagem (JPG, PNG ou WebP).");
    if (arquivo.size > 5 * 1024 * 1024) return toast.error("A foto deve ter até 5 MB.");
    setEnviandoFoto(true);
    const ext = arquivo.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const caminho = `perfis/${id}/avatar-${Date.now()}.${ext}`;
    const { error } = await createClient().storage.from(BUCKET_MIDIAS).upload(caminho, arquivo, {
      contentType: arquivo.type,
      upsert: false,
    });
    setEnviandoFoto(false);
    if (error) return toast.error("Falha ao enviar a foto: " + error.message);
    setAvatarPath(caminho);
    setAvatarSrc(URL.createObjectURL(arquivo));
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    iniciar(async () => {
      const r = await salvarPerfil(
        {
          id,
          nome,
          tipo,
          linkedin_url: linkedin,
          avatar_url: avatarPath,
          modo_aprovacao: modo,
          aprovadoras,
        },
        novo,
      );
      if (!r.ok) return setErro(r.erro);
      toast.success(novo ? "Perfil criado" : "Perfil atualizado");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent titulo={novo ? "Novo perfil" : "Editar perfil"} telaCheiaNoCelular>
        <form onSubmit={salvar} className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Avatar nome={nome || "?"} src={avatarSrc} tamanho={64} />
            <input
              ref={inputFoto}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => e.target.files?.[0] && enviarFoto(e.target.files[0])}
            />
            <Button type="button" variant="secondary" size="sm" onClick={() => inputFoto.current?.click()} disabled={enviandoFoto}>
              {enviandoFoto ? <Loader2 className="animate-spin" /> : <ImagePlus />}
              {avatarSrc ? "Trocar foto" : "Enviar foto"}
            </Button>
          </div>
          <Campo label="Nome *" htmlFor="perfil-nome">
            <Input id="perfil-nome" value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={80} />
          </Campo>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Tipo" htmlFor="perfil-tipo">
              <Select id="perfil-tipo" value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
                <option value="pessoal">Pessoal</option>
                <option value="empresa">Empresa</option>
              </Select>
            </Campo>
            <Campo label="Modo de aprovação" htmlFor="perfil-modo">
              <Select id="perfil-modo" value={modo} onChange={(e) => setModo(e.target.value as typeof modo)}>
                <option value="todas">Todas precisam aprovar</option>
                <option value="qualquer_uma">Qualquer uma aprova</option>
              </Select>
            </Campo>
          </div>
          <Campo label="URL do LinkedIn" htmlFor="perfil-linkedin">
            <Input
              id="perfil-linkedin"
              type="url"
              placeholder="https://www.linkedin.com/in/..."
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
            />
          </Campo>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-sm font-semibold text-azul-escuro">Aprovadoras</legend>
            {aprovadorasDisponiveis.length === 0 && (
              <p className="text-sm text-texto-2">Nenhuma aprovadora cadastrada ainda. Convide na aba Membros.</p>
            )}
            {aprovadorasDisponiveis.map((m) => (
              <label key={m.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[10px] border border-borda px-3 hover:bg-fundo">
                <Checkbox
                  checked={aprovadoras.includes(m.id)}
                  onChange={(e) =>
                    setAprovadoras((atual) => (e.target.checked ? [...atual, m.id] : atual.filter((x) => x !== m.id)))
                  }
                />
                <Avatar nome={m.nome} src={m.avatarSrc} tamanho={26} />
                <span className="text-sm font-medium">{m.nome}</span>
                {!m.ativo && <span className="text-xs text-texto-2">(inativa)</span>}
              </label>
            ))}
          </fieldset>
          {erro && <p role="alert" className="text-sm text-vermelho">{erro}</p>}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pendente || enviandoFoto}>
              {pendente && <Loader2 className="animate-spin" />}
              {novo ? "Criar perfil" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
