'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Building2, ArrowRight, BarChart3, Eye, Smartphone,
  DollarSign, Users, Globe, Check, Menu, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface LandingPageProps {
  onNavigate: (view: string) => void;
}

const features = [
  {
    icon: BarChart3,
    title: 'Panel de Control Personal',
    description: 'Dashboard completo con inventario de propiedades, metricas de visitantes y seguimiento de obligaciones fiscales en un solo lugar.'
  },
  {
    icon: Eye,
    title: 'Analitica de Visitantes',
    description: 'Sabes donde hacen clic, cuantas veces ven cada propiedad y cuanto tiempo pasan. Datos reales para servir mejor a tus prospectos.'
  },
  {
    icon: Smartphone,
    title: 'Funciona Sin Internet',
    description: 'PWA offline-first. Revisa tu inventario, clientes y datos clave incluso sin conexion. Sincroniza cuando vuelvas a estar en linea.'
  },
  {
    icon: Globe,
    title: 'Portal White-Label',
    description: 'Tu marca, tus colores, tu nombre. Tus clientes nunca sabran que usas una plataforma. Se ve como tu propio sitio web.'
  },
  {
    icon: DollarSign,
    title: 'Control de Impuestos',
    description: 'Lleva registro de BIR, impuesto a propiedades, NIS y mas. Alertas de vencimiento y recibos digitales.'
  },
  {
    icon: Users,
    title: 'Gestion de Clientes',
    description: 'CRM integrado con historial de consultas, seguimiento de tratos y conversion de leads a clientes.'
  }
];

const stats = [
  { value: '100%', label: 'Tu Marca' },
  { value: '24/7', label: 'Disponible' },
  { value: 'TTD', label: 'Moneda Local' },
  { value: '0', label: 'Comisiones Ocultas' }
];

export default function ProposLanding({ onNavigate }: LandingPageProps) {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* Nav */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-md shadow-sm' : 'bg-transparent'}`}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-[#1B4332] text-lg">PROPOS</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm text-[#6B7280] hover:text-[#1B4332] transition-colors">Caracteristicas</button>
            <button onClick={() => onNavigate('portal_laura')} className="text-sm text-[#6B7280] hover:text-[#1B4332] transition-colors">Ver Demo</button>
            <Button onClick={() => onNavigate('login')} className="bg-[#1B4332] hover:bg-[#2D6A4F] text-white">
              Iniciar Sesion
            </Button>
          </div>
          <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden text-[#1B4332]">
            {mobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
        {mobileMenu && (
          <div className="md:hidden bg-white border-t border-[#f0ece4] p-4 space-y-3">
            <button onClick={() => { document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); setMobileMenu(false); }} className="block w-full text-left py-2 text-sm text-[#6B7280]">Caracteristicas</button>
            <button onClick={() => { onNavigate('portal_laura'); setMobileMenu(false); }} className="block w-full text-left py-2 text-sm text-[#6B7280]">Ver Demo</button>
            <Button onClick={() => { onNavigate('login'); setMobileMenu(false); }} className="w-full bg-[#1B4332] hover:bg-[#2D6A4F] text-white">Iniciar Sesion</Button>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <Badge className="mb-6 bg-[#1B4332]/10 text-[#1B4332] hover:bg-[#1B4332]/15 border-0 px-4 py-1.5 text-sm font-medium">
              Disenado para Trinidad y el Caribe
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-[#1a1a1a] leading-tight mb-6">
              Tu negocio inmobiliario,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1B4332] to-[#D4A373]">
                potenciado con datos
              </span>
            </h1>
            <p className="text-lg md:text-xl text-[#6B7280] max-w-2xl mx-auto mb-10 leading-relaxed">
              La plataforma SaaS que te da un dashboard personal, analitica de visitantes en tiempo real, portal white-label y control total de tus propiedades y clientes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => onNavigate('login')}
                size="lg"
                className="bg-[#1B4332] hover:bg-[#2D6A4F] text-white h-13 px-8 text-base"
              >
                Comenzar Ahora <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                onClick={() => onNavigate('portal_laura')}
                variant="outline"
                size="lg"
                className="border-[#1B4332] text-[#1B4332] hover:bg-[#1B4332]/5 h-13 px-8 text-base"
              >
                Ver Portal de Ejemplo
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto"
          >
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-[#1B4332]">{stat.value}</div>
                <div className="text-sm text-[#9A9A9A] mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1a1a1a] mb-4">Todo lo que necesitas</h2>
            <p className="text-[#6B7280] max-w-xl mx-auto">Herramientas profesionales disenadas especificamente para agentes inmobiliarios en el Caribe.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Card className="border-0 shadow-md shadow-black/5 hover:shadow-lg hover:shadow-black/10 transition-all duration-300 h-full bg-white">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-[#1B4332]/10 flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6 text-[#1B4332]" />
                    </div>
                    <h3 className="font-semibold text-[#1a1a1a] text-lg mb-2">{feature.title}</h3>
                    <p className="text-[#6B7280] text-sm leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] rounded-3xl p-10 md:p-16 text-center text-white">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Comienza a gestionar mejor tu negocio</h2>
              <p className="text-white/80 mb-8 max-w-lg mx-auto">Unete a profesionales inmobiliarios que ya usan PROPOS para crecer su cartera y servir mejor a sus clientes.</p>
              <Button
                onClick={() => onNavigate('login')}
                size="lg"
                className="bg-white text-[#1B4332] hover:bg-white/90 h-13 px-8 text-base font-medium"
              >
                Crear Mi Cuenta <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#f0ece4] py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-[#1B4332] text-sm">PROPOS</span>
          </div>
          <p className="text-xs text-[#9A9A9A]">Plataforma SaaS para profesionales inmobiliarios en Trinidad y Tobago</p>
        </div>
      </footer>
    </div>
  );
}