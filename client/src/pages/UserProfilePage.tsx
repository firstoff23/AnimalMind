import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, User, Mail } from "lucide-react";
import { supabase } from "@/contexts/AuthContext";

export default function UserProfilePage() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.user_metadata?.full_name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: name,
        },
      });

      if (error) throw error;

      toast.success("Perfil actualizado com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao actualizar perfil");
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Meu Perfil</h1>
        <p className="text-slate-400 mt-2">Gerencie as suas informações pessoais</p>
      </div>

      {/* Profile Information */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Informações Pessoais</CardTitle>
          <CardDescription className="text-slate-400">
            Atualize os seus dados de perfil
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <User className="w-4 h-4" />
                Nome
              </label>
              <Input
                type="text"
                placeholder="Seu nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={saving}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </label>
              <Input
                type="email"
                value={email}
                disabled
                className="bg-slate-800 border-slate-700 text-slate-400 cursor-not-allowed"
              />
              <p className="text-xs text-slate-500">O email não pode ser alterado</p>
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    A guardar...
                  </>
                ) : (
                  "Guardar Alterações"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Account Status */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Estado da Conta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-slate-300">Email Verificado</span>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                user.email_confirmed_at
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-yellow-500/20 text-yellow-400"
              }`}
            >
              {user.email_confirmed_at ? "Verificado" : "Pendente"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-300">Data de Criação</span>
            <span className="text-slate-400">
              {new Date(user.created_at).toLocaleDateString("pt-PT")}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-300">Último Acesso</span>
            <span className="text-slate-400">
              {user.last_sign_in_at
                ? new Date(user.last_sign_in_at).toLocaleDateString("pt-PT")
                : "Nunca"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
