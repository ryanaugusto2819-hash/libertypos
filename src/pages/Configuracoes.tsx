import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Webhook, TestTube2, CheckCircle2, XCircle } from "lucide-react";
import WebhookHistory from "@/components/webhook/WebhookHistory";

export default function Configuracoes() {
  const { user } = useAuth();
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [attendanceWebhookUrl, setAttendanceWebhookUrl] = useState("");
  const [attendanceWebhookActive, setAttendanceWebhookActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    loadConfig();
  }, [user]);

  async function loadConfig() {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("webhook_config")
      .select("*")
      .eq("user_id", user!.id)
      .maybeSingle();

    if (data) {
      setWebhookUrl(data.webhook_url || "");
      setIsActive(data.is_active ?? true);
      setAttendanceWebhookUrl(data.attendance_webhook_url || "");
      setAttendanceWebhookActive(data.attendance_webhook_active ?? false);
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setTestResult(null);

    const { data: existing } = await (supabase as any)
      .from("webhook_config")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    let error;
    if (existing) {
      ({ error } = await (supabase as any)
        .from("webhook_config")
        .update({
          webhook_url: webhookUrl.trim(),
          is_active: isActive,
          attendance_webhook_url: attendanceWebhookUrl.trim(),
          attendance_webhook_active: attendanceWebhookActive,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id));
    } else {
      ({ error } = await (supabase as any)
        .from("webhook_config")
        .insert({
          user_id: user.id,
          webhook_url: webhookUrl.trim(),
          is_active: isActive,
          attendance_webhook_url: attendanceWebhookUrl.trim(),
          attendance_webhook_active: attendanceWebhookActive,
        }));
    }

    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Configuração salva com sucesso!");
    }
    setSaving(false);
  }

  async function handleTest() {
    if (!webhookUrl) {
      toast.error("Insira uma URL de webhook primeiro");
      return;
    }
    setTesting(true);
    setTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("send-webhook", {
        body: {
          pedido: {
            id: "TEST-" + Date.now(),
            nome: "Teste Webhook",
            telefone: "5599999999",
            cedula: "12345678",
            produto: "Gota Prosta",
            quantidade: 1,
            valor: 100,
            cidade: "Montevideo",
            departamento: "Montevideo",
            cep: "00000-000",
            rua: "Rua Teste",
            numero: "123",
            complemento: "Apto 1",
            bairro: "Centro",
            email: "teste@teste.com",
          },
        },
      });

      if (error) throw error;

      if (data?.success) {
        setTestResult({ success: true, message: `Webhook enviado! Status: ${data.status}` });
        toast.success("Webhook de teste enviado com sucesso!");
      } else {
        setTestResult({ success: false, message: data?.response || data?.message || "Falha ao enviar" });
        toast.error("Falha no teste do webhook");
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message });
      toast.error("Erro: " + err.message);
    }
    setTesting(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground text-sm">Gerencie integrações e webhooks</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Webhook className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Webhook de Logística</CardTitle>
              <CardDescription>
                Configure a URL do webhook para enviar pedidos automaticamente à plataforma de logística ao criar um novo pedido.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="webhook-url">URL do Webhook</Label>
            <Input
              id="webhook-url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://app.logzz.com.br/api/expedicao-tradicional/webhook/..."
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Cole aqui a URL do webhook fornecida pela plataforma de logística.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Webhook Ativo</Label>
              <p className="text-xs text-muted-foreground">
                Quando ativo, cada novo pedido criado será enviado automaticamente.
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          {testResult && (
            <div
              className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${
                testResult.success
                  ? "border-green-500/30 bg-green-500/10 text-green-400"
                  : "border-destructive/30 bg-destructive/10 text-destructive"
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar Configuração
            </Button>
            <Button variant="outline" onClick={handleTest} disabled={testing || !webhookUrl}>
              {testing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <TestTube2 className="h-4 w-4 mr-2" />
              )}
              Testar Webhook
            </Button>
          </div>

          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">Exemplo do payload enviado:</p>
            <pre className="text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap">
{JSON.stringify(
  {
    id: "PED-123456",
    customer_name: "Nome do cliente",
    customer_phone: "Telefone do cliente",
    customer_city: "Cidade do cliente",
    customer_state: "Departamento",
    customer_document: "Cédula do cliente",
    products: [{ name: "Nome do produto", quantity: 1 }],
    amount: 7000,
  },
  null,
  2
)}
            </pre>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10">
              <Webhook className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">Webhook de Atendimento</CardTitle>
              <CardDescription>
                Dispara automaticamente um webhook para sua plataforma de atendimento quando o status de envio mudar para: <strong>A Enviar</strong>, <strong>Enviado</strong> ou <strong>Entregue</strong>.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="attendance-webhook-url">URL do Webhook de Atendimento</Label>
            <Input
              id="attendance-webhook-url"
              value={attendanceWebhookUrl}
              onChange={(e) => setAttendanceWebhookUrl(e.target.value)}
              placeholder="https://sua-plataforma.com/webhook/..."
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Cole aqui a URL do webhook da sua plataforma de atendimento.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Webhook Ativo</Label>
              <p className="text-xs text-muted-foreground">
                Quando ativo, mudanças de status dispararão o webhook automaticamente.
              </p>
            </div>
            <Switch checked={attendanceWebhookActive} onCheckedChange={setAttendanceWebhookActive} />
          </div>

          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">Payload enviado:</p>
            <pre className="text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap">
{JSON.stringify(
  {
    id: "uuid-do-pedido",
    nome: "Nome do cliente",
    telefone: "Telefone",
    produto: "Nome do produto",
    status_envio: "enviado",
    codigo_rastreamento: "AB123456789BR",
    valor: 100,
    cidade: "Cidade",
    departamento: "Estado/Departamento",
    pais: "BR",
    cedula: "CPF/Cédula",
    email: "email@exemplo.com",
  },
  null,
  2
)}
            </pre>
          </div>
        </CardContent>
      </Card>


    </div>
  );
}
