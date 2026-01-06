import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { ChefHat, Loader2, Mail } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Cadastro realizado! Verifique seu email ou faça login.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
            <div className="bg-emerald-100 p-4 rounded-full mb-4">
                <ChefHat size={48} className="text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Bem-vindo ao HUBChef</h1>
            <p className="text-slate-500 text-sm">Sistema de Engenharia de Cardápio</p>
        </div>

        {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded text-sm mb-4 border border-red-200">
                {error}
            </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
            <div className="relative">
                <Mail className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                <input
                    type="email"
                    required
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Senha</label>
            <input
              type="password"
              required
              className="w-full px-4 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded transition-colors flex justify-center items-center gap-2"
          >
            {loading && <Loader2 className="animate-spin" size={18} />}
            {isSignUp ? 'Criar Conta' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-emerald-600 hover:underline font-medium"
          >
            {isSignUp ? 'Já tem uma conta? Entrar' : 'Não tem conta? Cadastre-se'}
          </button>
        </div>
      </div>
    </div>
  );
};