import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, CheckCircle2, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AttendanceLog {
  id: string;
  pedido_nome: string | null;
  status_recebido: string;
  status_mapeado: string | null;
  matched_by: string | null;
  success: boolean;
  error_message: string | null;
  created_at: string;
  payload: any;
}

export default function AttendanceWebhookHistory() {
  const { user } = useAuth();

  const { data: logs, isLoading } = useQuery({
    queryKey: ["attendance-webhook-logs", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("webhook_logs")
        .select("id, pedido_nome, status_recebido, status_mapeado, matched_by, success, error_message, created_at, payload")
        .eq("webhook_type", "atendimento")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as AttendanceLog[];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const matchLabel: Record<string, string> = {
    cedula: "CPF/Cédula",
    telefone: "Telefone",
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent/10">
            <History className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <CardTitle className="text-lg">Histórico de Webhooks de Atendimento</CardTitle>
            <p className="text-sm text-muted-foreground">
              Atualizações de status de cobrança e WPP recebidas da plataforma de atendimento
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Clock className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !logs || logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhum webhook de atendimento recebido ainda.
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {logs.map((log) => {
                const wppCobranca = log.payload?.wpp_cobranca;
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 rounded-lg border p-3 text-sm"
                  >
                    <div className="mt-0.5">
                      {log.success ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">
                          {log.pedido_nome || "Pedido não identificado"}
                        </span>
                        {log.status_mapeado && (
                          <Badge variant={log.success ? "default" : "destructive"} className="text-xs">
                            {log.status_mapeado}
                          </Badge>
                        )}
                        {wppCobranca && (
                          <Badge variant="secondary" className="text-xs">
                            WPP: {wppCobranca}
                          </Badge>
                        )}
                      </div>
                      {log.matched_by && (
                        <p className="text-xs text-muted-foreground">
                          Match por: {matchLabel[log.matched_by] || log.matched_by}
                        </p>
                      )}
                      {log.error_message && (
                        <p className="text-xs text-destructive">{log.error_message}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
