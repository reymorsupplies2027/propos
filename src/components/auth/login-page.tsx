'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface LoginPageProps {
  onNavigate: (view: string) => void;
  onLogin: (user: { id: string; email: string; name: string; role: string }) => void;
}

export default function LoginPage({ onNavigate, onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al iniciar sesion');
        return;
      }

      onLogin(data.user);
    } catch {
      setError('Error de conexion. Intente de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] flex items-center justify-center mx-auto mb-4 cursor-pointer"
            onClick={() => onNavigate('landing')}
          >
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#1B4332]">PROPOS</h1>
          <p className="text-[#6B7280] mt-1">Plataforma para profesionales inmobiliarios</p>
        </div>

        <Card className="border-0 shadow-lg shadow-black/5">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl text-[#1a1a1a]">Iniciar Sesion</CardTitle>
            <CardDescription>Accede a tu panel de gestion</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Correo electronico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A9A9A]" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contrasena</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A9A9A]" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Tu contrasena"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A9A9A] hover:text-[#1a1a1a]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1B4332] hover:bg-[#2D6A4F] text-white h-12 text-base font-medium"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Ingresar
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-[#f0ece4] text-center">
              <p className="text-sm text-[#6B7280]">
                <button
                  onClick={() => onNavigate('portal_laura')}
                  className="text-[#D4A373] hover:underline font-medium"
                >
                  Ver portal de agente de ejemplo
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
