"use client";

import { useRouter } from "next/navigation";
import { HardDrive, Users, UserSquare2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function AbasConfiguracoes({
  abaInicial,
  perfis,
  membros,
  sistema,
}: {
  abaInicial: string;
  perfis: React.ReactNode;
  membros: React.ReactNode;
  sistema?: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <Tabs
      defaultValue={abaInicial}
      onValueChange={(v) => router.replace(`/configuracoes?aba=${v}`, { scroll: false })}
      className="flex flex-col gap-5"
    >
      <TabsList className="self-start">
        <TabsTrigger value="perfis">
          <UserSquare2 /> Perfis
        </TabsTrigger>
        <TabsTrigger value="membros">
          <Users /> Membros
        </TabsTrigger>
        {sistema && (
          <TabsTrigger value="sistema">
            <HardDrive /> Sistema
          </TabsTrigger>
        )}
      </TabsList>
      <TabsContent value="perfis">{perfis}</TabsContent>
      <TabsContent value="membros">{membros}</TabsContent>
      {sistema && <TabsContent value="sistema">{sistema}</TabsContent>}
    </Tabs>
  );
}
