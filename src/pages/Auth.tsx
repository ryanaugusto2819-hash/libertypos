import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Mail, Lock, User } from "lucide-react";
import sidebarLogo from "@/assets/sidebar-logo.png";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Login realizado com sucesso!");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Verifique seu e-mail para confirmar.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro na autenticação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "hsl(258 35% 5%)" }}
    >
      {/* Background blobs */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, hsl(271 76% 53% / 0.18) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <div
        className="absolute bottom-0 right-0 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, hsl(300 76% 55% / 0.10) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      <div
        className="absolute bottom-0 left-0 w-72 h-72 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, hsl(271 76% 53% / 0.08) 0%, transparent 70%)",
          filter: "blur(50px)",
        }}
      />

      {/* Card */}
      <div
        className="relative w-full max-w-md rounded-3xl overflow-hidden"
        style={{
          background: "hsl(258 35% 8%)",
          border: "1px solid hsl(271 30% 18%)",
          boxShadow: "0 25px 60px -12px hsl(271 76% 53% / 0.25), 0 0 0 1px hsl(271 30% 15%)",
        }}
      >
        {/* Top gradient bar */}
        <div
          className="h-1 w-full"
          style={{ background: "linear-gradient(90deg, hsl(271 76% 53%), hsl(300 76% 55%))" }}
        />

        <div className="px-8 pt-8 pb-10">
          {/* Logo + Brand */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-4">
              <div
                className="absolute inset-0 rounded-2xl"
                style={{
                  background: "linear-gradient(135deg, hsl(271 76% 53%), hsl(300 76% 55%))",
                  filter: "blur(12px)",
                  opacity: 0.5,
                }}
              />
              <img
                src={sidebarLogo}
                alt="Group Liberty"
                className="relative h-16 w-16 rounded-2xl object-cover"
                style={{ border: "2px solid hsl(271 76% 53% / 0.4)" }}
              />
            </div>
            <h1
              className="text-2xl font-black tracking-tight"
              style={{
                background: "linear-gradient(135deg, hsl(271 76% 75%), hsl(300 76% 72%))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Group Liberty
            </h1>
            <p className="text-sm mt-1" style={{ color: "hsl(270 15% 55%)" }}>
              {isLogin ? "Acesse sua conta" : "Crie sua conta de afiliado"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-widest" style={{ color: "hsl(270 15% 60%)" }}>
                  Nome
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "hsl(270 15% 50%)" }} />
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Seu nome completo"
                    required
                    className="pl-9 rounded-xl h-11 border-0 text-sm"
                    style={{
                      background: "hsl(258 35% 12%)",
                      color: "hsl(270 20% 92%)",
                    }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-widest" style={{ color: "hsl(270 15% 60%)" }}>
                E-mail
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "hsl(270 15% 50%)" }} />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="pl-9 rounded-xl h-11 border-0 text-sm"
                  style={{
                    background: "hsl(258 35% 12%)",
                    color: "hsl(270 20% 92%)",
                  }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-widest" style={{ color: "hsl(270 15% 60%)" }}>
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "hsl(270 15% 50%)" }} />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="pl-9 rounded-xl h-11 border-0 text-sm"
                  style={{
                    background: "hsl(258 35% 12%)",
                    color: "hsl(270 20% 92%)",
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl font-bold text-sm text-white mt-2 transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2"
              style={{
                background: "linear-gradient(135deg, hsl(271 76% 53%), hsl(300 76% 50%))",
                boxShadow: "0 4px 16px hsl(271 76% 53% / 0.4)",
              }}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLogin ? "Entrar" : "Criar Conta"}
            </button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm transition-colors duration-200 hover:opacity-80"
              style={{ color: "hsl(271 76% 68%)" }}
            >
              {isLogin ? "Não tem conta? " : "Já tem conta? "}
              <span className="font-semibold underline underline-offset-2">
                {isLogin ? "Criar conta" : "Fazer login"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
