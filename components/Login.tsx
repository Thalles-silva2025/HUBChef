import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { ChefHat, Loader2, Mail, Eye, EyeOff, Building2, Users, KeyRound } from 'lucide-react';

type AuthMode = 'login' | 'signup_owner' | 'signup_team';

export const Login: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } 
      else if (mode === 'signup_owner') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Cadastro de Restaurante realizado! Verifique seu email para confirmar ou faça login.');
        setMode('login');
      } 
      else if (mode === 'signup_team') {
        // 1. Validate Code First
        if (!invitationCode || invitationCode.length < 6) {
            throw new Error("Código de convite inválido.");
        }

        // Check if code exists and is unused
        const { data: inviteData, error: inviteError } = await supabase
            .from('team_members')
            .select('id, member_user_id')
            .eq('invitation_code', invitationCode.trim().toUpperCase())
            .single();

        if (inviteError || !inviteData) {
            throw new Error("Código de convite não encontrado. Verifique com seu administrador.");
        }

        if (inviteData.member_user_id) {
            throw new Error("Este código de convite já foi utilizado.");
        }

        // 2. Create User
        const { data: authData, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;

        if (authData.user) {
            // 3. Link User to Team immediately
            const { error: linkError } = await supabase
                .from('team_members')
                .update({ member_user_id: authData.user.id })
                .eq('id', inviteData.id);

            if (linkError) {
                console.error("Erro ao vincular (mas usuário criado):", linkError);
                alert("Conta criada, mas houve um erro ao vincular a equipe. Peça ao administrador para reenviar o convite.");
            } else {
                alert('Cadastro de Equipe realizado com sucesso! Faça login para acessar.');
                setMode('login');
            }
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        
        {/* Header Section */}
        <div className="bg-slate-50 p-8 text-center border-b border-slate-100">
            <div className="inline-flex bg-emerald-100 p-3 rounded-xl mb-4 shadow-sm">
                <ChefHat size={32} className="text-emerald-600" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">HUBChef</h1>
            <p className="text-slate-500 text-sm font-medium mt-1">Engenharia de Cardápio & Gestão</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100">
            <button 
                onClick={() => { setMode('login'); setError(null); }}
                className={`flex-1 py-3 text-sm font-bold transition-colors ${mode === 'login' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/30' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
            >
                Entrar
            </button>
            <button 
                onClick={() => { setMode('signup_owner'); setError(null); }}
                className={`flex-1 py-3 text-sm font-bold transition-colors ${mode === 'signup_owner' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/30' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
            >
                Sou Dono
            </button>
            <button 
                onClick={() => { setMode('signup_team'); setError(null); }}
                className={`flex-1 py-3 text-sm font-bold transition-colors ${mode === 'signup_team' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
            >
                Sou Equipe
            </button>
        </div>

        <div className="p-8">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                {mode === 'login' && 'Acesse sua conta'}
                {mode === 'signup_owner' && <><Building2 className="text-emerald-500" size={20}/> Novo Restaurante</>}
                {mode === 'signup_team' && <><Users className="text-blue-500" size={20}/> Cadastro de Equipe</>}
            </h2>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm mb-6 border border-red-100 flex items-start gap-2">
                    <div className="mt-0.5 min-w-[4px] h-[4px] rounded-full bg-red-500" />
                    {error}
                </div>
            )}

            <form onSubmit={handleAuth} className="space-y-5">
            {mode === 'signup_team' && (
                <div className="animate-in slide-in-from-top-2 fade-in duration-300">
                    <label className="block text-xs font-bold text-blue-600 uppercase tracking-wide mb-1.5">Código de Convite</label>
                    <div className="relative">
                        <KeyRound className="absolute left-3 top-3 text-blue-400" size={18}/>
                        <input
                            type="text"
                            required
                            maxLength={6}
                            className="w-full pl-10 pr-4 py-2.5 border border-blue-200 bg-blue-50/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-mono tracking-widest uppercase placeholder:normal-case placeholder:tracking-normal text-blue-900"
                            placeholder="Código de 6 letras"
                            value={invitationCode}
                            onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                        />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5">Peça o código ao administrador do restaurante.</p>
                </div>
            )}

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Email</label>
                <div className="relative">
                    <Mail className="absolute left-3 top-3 text-slate-400" size={18}/>
                    <input
                        type="email"
                        required
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all bg-slate-50 focus:bg-white"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Senha</label>
                <div className="relative">
                    <input
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full pl-4 pr-10 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all bg-slate-50 focus:bg-white"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className={`w-full font-bold py-3 rounded-lg transition-all flex justify-center items-center gap-2 shadow-lg transform active:scale-[0.98] ${
                    mode === 'signup_team' 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20' 
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                }`}
            >
                {loading && <Loader2 className="animate-spin" size={18} />}
                {mode === 'login' ? 'Acessar Sistema' : mode === 'signup_team' ? 'Vincular e Criar Conta' : 'Criar Conta Dono'}
            </button>
            </form>
        </div>
      </div>
    </div>
  );
};