'use client';

import React, { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  BarChart3, 
  ArrowUpRight, 
  Upload, 
  Loader2, 
  AlertCircle, 
  TrendingUp, 
  Award, 
  AlertTriangle,
  PlayCircle,
  Download,
  Activity,
  Zap,
  Sparkles,
  Compass,
  Database
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell,
  CartesianGrid
} from 'recharts';

export default function Home() {
  const [activeTab, setActiveTab] = useState('lobby');

  // Estados del Detective CSV
  const [cargandoCSV, setCargandoCSV] = useState(false);
  const [datosAuditoria, setDatosAuditoria] = useState(null);
  const [errorCSV, setErrorCSV] = useState(null);

  // Estados del Modo Asistido (Simulador)
  const [precioOriginal, setPrecioOriginal] = useState(50000);
  const [nuevoPrecio, setNuevoPrecio] = useState(55000);
  const [costoUnitario, setCostoUnitario] = useState(25000);
  const [unidadesHistoricas, setUnidadesHistoricas] = useState(200);
  const [presupuestoMkt, setPresupuestoMkt] = useState(500000);

  // Cálculos reactivos en tiempo real
  const cambioPrecioPct = ((nuevoPrecio - precioOriginal) / (precioOriginal || 1)) * 100;
  const factorDemanda = Math.max(0, 1 + (cambioPrecioPct * -0.5) / 100);
  const unidadesBase = unidadesHistoricas * factorDemanda;
  
  const costoAdquisicion = Math.max(nuevoPrecio * 0.20, 1000);
  const nuevosClientes = presupuestoMkt > 0 ? Math.floor(presupuestoMkt / costoAdquisicion) : 0;
  const unidadesTotales = unidadesBase + nuevosClientes;

  const ventasBase = unidadesHistoricas * precioOriginal;
  const costosBase = unidadesHistoricas * costoUnitario;
  const gananciaBase = ventasBase - costosBase;

  const ventasProyectadas = unidadesTotales * nuevoPrecio;
  const costosProyectados = (unidadesTotales * costoUnitario) + presupuestoMkt;
  const gananciaProyectada = ventasProyectadas - costosProyectados;
  const deltaGanancia = gananciaProyectada - gananciaBase;

  // Enviar CSV a FastAPI
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setCargandoCSV(true);
    setErrorCSV(null);

    const formData = new FormData();
    formData.append('archivo', file);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://simulador-saas-app.onrender.com';
      const response = await fetch(`${apiUrl}/api/auditar-csv`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Error al procesar el archivo');

      const data = await response.json();
      setDatosAuditoria(data);
    } catch (err) {
      setErrorCSV('No se pudo conectar con el motor analítico. Verifica que FastAPI esté encendido.');
    } finally {
      setCargandoCSV(false);
    }
  };

  // Función para transferir datos del CSV al Simulador
  const transferirAlSimulador = () => {
    if (!datosAuditoria) return;
    const precio = Math.round(datosAuditoria.precio_promedio) || 50000;
    const unidades = Math.round(datosAuditoria.unidades_historicas) || 100;
    
    setPrecioOriginal(precio);
    setNuevoPrecio(Math.round(precio * 1.10));
    setCostoUnitario(Math.round(precio * 0.50));
    setUnidadesHistoricas(unidades);
    setActiveTab('simulador');
  };

  // Generador de Reporte PDF
  const exportarPDF = () => {
    try {
      if (!datosAuditoria) return;

      const doc = new jsPDF();

      // Fondo y Encabezado
      doc.setFillColor(12, 21, 25);
      doc.rect(0, 0, 210, 35, 'F');

      doc.setTextColor(207, 157, 123);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Simulador SaaS - Auditoria Forense', 14, 18);

      doc.setTextColor(229, 231, 235);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')} | Auditor: Emmanuel Tapasco`, 14, 26);

      // Resumen Ejecutivo de Métricas
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('1. Metricas Clave de Rendimiento', 14, 48);

      const metricasData = [
        ['Total Registros', datosAuditoria.total_registros.toLocaleString('es-CO')],
        ['Ventas Totales', `$${datosAuditoria.ventas_historicas.toLocaleString('es-CO')}`],
        ['Unidades Vendidas', datosAuditoria.unidades_historicas.toLocaleString('es-CO')],
        ['Precio Promedio', `$${Math.round(datosAuditoria.precio_promedio).toLocaleString('es-CO')}`],
      ];

      autoTable(doc, {
        startY: 53,
        head: [['Metrica', 'Valor']],
        body: metricasData,
        theme: 'grid',
        headStyles: { fillColor: [20, 30, 36], textColor: [207, 157, 123] },
        styles: { fontSize: 10, cellPadding: 4 },
      });

      // Diagnóstico Rey vs Hueso
      const diagStartY = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 12 : 110;
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('2. Diagnostico de Catalogo', 14, diagStartY);

      const diagData = [
        ['Producto Estrella (Rey)', datosAuditoria.diagnostico?.rey?.nombre || 'N/A', `$${datosAuditoria.diagnostico?.rey?.ventas?.toLocaleString('es-CO') || '0'}`],
        ['Producto Critico (Hueso)', datosAuditoria.diagnostico?.hueso?.nombre || 'N/A', `$${datosAuditoria.diagnostico?.hueso?.ventas?.toLocaleString('es-CO') || '0'}`],
      ];

      autoTable(doc, {
        startY: diagStartY + 5,
        head: [['Categoria', 'Producto', 'Ventas']],
        body: diagData,
        theme: 'grid',
        headStyles: { fillColor: [20, 30, 36], textColor: [207, 157, 123] },
        styles: { fontSize: 10, cellPadding: 4 },
      });

      // Top 5 Productos
      const rankingStartY = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 12 : 170;
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('3. Top 5 Productos por Facturacion', 14, rankingStartY);

      const rankingData = (datosAuditoria.ranking_productos || []).map((item, idx) => [
        `#${idx + 1}`,
        item.nombre,
        `$${item.ventas.toLocaleString('es-CO')}`,
      ]);

      autoTable(doc, {
        startY: rankingStartY + 5,
        head: [['Rank', 'Producto', 'Ventas Totales']],
        body: rankingData,
        theme: 'striped',
        headStyles: { fillColor: [20, 30, 36], textColor: [207, 157, 123] },
        styles: { fontSize: 9, cellPadding: 3 },
      });

      doc.save('Reporte_Auditoria_Forense.pdf');
    } catch (error) {
      console.error('Error generando PDF:', error);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#060A0D] text-[#E5E7EB] px-6 py-10 md:px-16 flex flex-col justify-between selection:bg-[#CF9D7B] selection:text-[#060A0D] overflow-hidden">
      
      {/* ============================================================ */}
      {/* 🌌 FONDO DINÁMICO NIVEL MOTION SITE (CANVAS CINEMATOGRÁFICO) */}
      {/* ============================================================ */}

      {/* Capa 1: Luces Radiales Giratorias en Vórtice */}
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-gradient-to-tr from-[#CF9D7B]/20 to-amber-600/10 rounded-full blur-[140px] pointer-events-none animate-spin [animation-duration:25s]" />
      <div className="absolute top-1/2 -right-40 w-[650px] h-[650px] bg-gradient-to-bl from-teal-500/15 via-[#163544]/20 to-transparent rounded-full blur-[160px] pointer-events-none animate-spin [animation-duration:35s]" />
      <div className="absolute -bottom-40 left-1/3 w-[500px] h-[500px] bg-[#CF9D7B]/10 rounded-full blur-[150px] pointer-events-none animate-pulse [animation-duration:8s]" />

      {/* Capa 2: Malla Geométrica Holográfica con Respiración */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 50%, #CF9D7B 1px, transparent 1px),
            linear-gradient(to right, #1A2832 1px, transparent 1px),
            linear-gradient(to bottom, #1A2832 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px, 48px 48px, 48px 48px',
          maskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%, #000 60%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%, #000 60%, transparent 100%)'
        }}
      />

      {/* Capa 3: Ondas Vectoriales Líquidas Flotantes */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
        <svg className="absolute w-[180%] h-[120%] -left-[40%] -top-[10%] opacity-15 animate-pulse [animation-duration:12s]" viewBox="0 0 1440 900" fill="none">
          <path 
            d="M -100 450 C 300 200, 600 650, 1000 350 C 1300 150, 1500 500, 1800 300" 
            stroke="url(#neonAntique)" 
            strokeWidth="3" 
            strokeDasharray="12 8" 
          />
          <path 
            d="M -100 550 C 400 350, 700 750, 1100 450 C 1400 250, 1600 600, 1900 400" 
            stroke="url(#neonTeal)" 
            strokeWidth="2" 
          />
          <defs>
            <linearGradient id="neonAntique" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#CF9D7B" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#E5B898" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#CF9D7B" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="neonTeal" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#14B8A6" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#2DD4BF" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#0F766E" stopOpacity="0.1" />
            </linearGradient>
          </defs>
        </svg>

        {/* HUD Widgets Flotantes con Animación Suave */}
        <div className="hidden 2xl:flex absolute top-32 left-10 bg-[#0C151B]/70 backdrop-blur-xl border border-[#CF9D7B]/30 px-4 py-3 rounded-2xl items-center gap-3 shadow-[0_8px_32px_rgba(0,0,0,0.4)] animate-bounce [animation-duration:8s]">
          <div className="w-8 h-8 rounded-xl bg-[#CF9D7B]/15 flex items-center justify-center text-[#CF9D7B]">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono tracking-widest text-gray-400 block">Eficiencia Modelo</span>
            <span className="text-sm font-semibold text-white font-mono">99.4% ROC-AUC</span>
          </div>
        </div>

        <div className="hidden 2xl:flex absolute bottom-28 right-10 bg-[#0C151B]/70 backdrop-blur-xl border border-teal-500/30 px-4 py-3 rounded-2xl items-center gap-3 shadow-[0_8px_32px_rgba(0,0,0,0.4)] animate-bounce [animation-duration:10s]">
          <div className="w-8 h-8 rounded-xl bg-teal-500/15 flex items-center justify-center text-teal-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono tracking-widest text-gray-400 block">Latencia Motor</span>
            <span className="text-sm font-semibold text-white font-mono">14ms Inferencia</span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 🧭 HEADER / NAVBAR CON GLASSMORPHISM ULTRA ELEGANTE */}
      {/* ============================================================ */}
      <header className="relative z-20 flex justify-between items-center max-w-6xl mx-auto w-full pb-8 border-b border-[#1A2832]/80">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setActiveTab('lobby')}>
          <div className="relative">
            <div className="w-3.5 h-3.5 rounded-full bg-[#CF9D7B] shadow-[0_0_20px_#CF9D7B] group-hover:scale-125 transition-transform duration-300"></div>
            <div className="absolute inset-0 w-3.5 h-3.5 rounded-full bg-[#CF9D7B] animate-ping opacity-75"></div>
          </div>
          <span className="font-serif text-xl tracking-tight text-white font-medium">
            Simulador <span className="text-[#CF9D7B] italic">SaaS</span>
          </span>
        </div>

        <nav className="flex items-center gap-2 md:gap-3 bg-[#0C151B]/80 backdrop-blur-xl p-1.5 rounded-full border border-[#1E2E39] shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
          <button 
            onClick={() => setActiveTab('lobby')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
              activeTab === 'lobby' ? 'bg-[#CF9D7B] text-[#060A0D] shadow-[0_0_15px_rgba(207,157,123,0.4)] font-bold' : 'text-gray-400 hover:text-white'
            }`}
          >
            Lobby
          </button>
          <button 
            onClick={() => setActiveTab('simulador')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
              activeTab === 'simulador' ? 'bg-[#CF9D7B] text-[#060A0D] shadow-[0_0_15px_rgba(207,157,123,0.4)] font-bold' : 'text-gray-400 hover:text-white'
            }`}
          >
            Modo Asistido
          </button>
          <button 
            onClick={() => setActiveTab('auditoria')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
              activeTab === 'auditoria' ? 'bg-[#CF9D7B] text-[#060A0D] shadow-[0_0_15px_rgba(207,157,123,0.4)] font-bold' : 'text-gray-400 hover:text-white'
            }`}
          >
            Detective CSV
          </button>
        </nav>
      </header>

      {/* ============================================================ */}
      {/* 🚀 CONTENIDO PRINCIPAL */}
      {/* ============================================================ */}
      <main className="relative z-20 max-w-6xl mx-auto w-full my-auto py-12">
        {activeTab === 'lobby' && (
          <div className="space-y-16">
            
            {/* HERO SECTION DE IMPACTO */}
            <div className="text-center space-y-5 max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0C151B]/80 backdrop-blur-md border border-[#CF9D7B]/30 text-[#CF9D7B] text-xs font-mono tracking-widest shadow-[0_0_20px_rgba(207,157,123,0.15)]">
                <Sparkles className="w-3.5 h-3.5 animate-spin [animation-duration:6s]" />
                CENTRO DE ESTRATEGIA EJECUTIVA
              </div>
              <h1 className="text-4xl md:text-6xl font-serif text-white leading-tight tracking-tight">
                Decisiones basadas en <br/>
                <span className="italic bg-gradient-to-r from-[#CF9D7B] via-[#E8C5AF] to-[#CF9D7B] bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(207,157,123,0.3)]">
                  datos reales y algoritmos.
                </span>
              </h1>
              <p className="text-gray-400 text-sm md:text-base leading-relaxed max-w-2xl mx-auto">
                Auditoría forense de transacciones históricas, simulación de elasticidad de precios en tiempo real y optimización de CAC publicitario.
              </p>
            </div>

            {/* MÓDULOS ACTIVOS (TARJETAS GLASSMORPHISM CON BORDE NEÓN) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div 
                onClick={() => setActiveTab('simulador')}
                className="group relative bg-[#0C151B]/70 backdrop-blur-xl border border-[#1E2E39] hover:border-[#CF9D7B] p-8 rounded-3xl transition-all duration-500 hover:-translate-y-2.5 cursor-pointer flex flex-col justify-between shadow-[0_10px_30px_rgba(0,0,0,0.5)] hover:shadow-[0_20px_40px_rgba(207,157,123,0.15)] overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#CF9D7B]/15 to-transparent rounded-bl-full pointer-events-none transition-all group-hover:scale-150" />
                <div className="space-y-4 relative z-10">
                  <div className="flex justify-between items-start">
                    <span className="text-xs px-3 py-1 bg-[#14222B] text-[#CF9D7B] rounded-full font-mono border border-[#CF9D7B]/30 shadow-inner">
                      MOD-01
                    </span>
                    <ArrowUpRight className="w-5 h-5 text-gray-500 group-hover:text-[#CF9D7B] group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-300" />
                  </div>
                  <h3 className="text-2xl font-serif text-white pt-2 group-hover:text-[#CF9D7B] transition-colors">Modo Asistido</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Simulación paramétrica de elasticidad de precios, estructura de costos y distribución óptima de presupuesto publicitario.
                  </p>
                </div>
                <div className="flex gap-2 pt-6 relative z-10">
                  <span className="text-[10px] px-2.5 py-1 bg-[#121E26] text-gray-300 rounded-lg border border-[#1A2832]">Costos</span>
                  <span className="text-[10px] px-2.5 py-1 bg-[#121E26] text-gray-300 rounded-lg border border-[#1A2832]">Margen</span>
                  <span className="text-[10px] px-2.5 py-1 bg-[#121E26] text-gray-300 rounded-lg border border-[#1A2832]">Proyección</span>
                </div>
              </div>

              <div 
                onClick={() => setActiveTab('auditoria')}
                className="group relative bg-[#0C151B]/70 backdrop-blur-xl border border-[#1E2E39] hover:border-[#CF9D7B] p-8 rounded-3xl transition-all duration-500 hover:-translate-y-2.5 cursor-pointer flex flex-col justify-between shadow-[0_10px_30px_rgba(0,0,0,0.5)] hover:shadow-[0_20px_40px_rgba(207,157,123,0.15)] overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#CF9D7B]/15 to-transparent rounded-bl-full pointer-events-none transition-all group-hover:scale-150" />
                <div className="space-y-4 relative z-10">
                  <div className="flex justify-between items-start">
                    <span className="text-xs px-3 py-1 bg-[#14222B] text-[#CF9D7B] rounded-full font-mono border border-[#CF9D7B]/30 shadow-inner">
                      MOD-02
                    </span>
                    <ArrowUpRight className="w-5 h-5 text-gray-500 group-hover:text-[#CF9D7B] group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-300" />
                  </div>
                  <h3 className="text-2xl font-serif text-white pt-2 group-hover:text-[#CF9D7B] transition-colors">Detective CSV</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Auditoría automatizada de transacciones históricas. Identifica productos estrella, huesos y concentración de catálogo con Pandas.
                  </p>
                </div>
                <div className="flex gap-2 pt-6 relative z-10">
                  <span className="text-[10px] px-2.5 py-1 bg-[#121E26] text-gray-300 rounded-lg border border-[#1A2832]">Pandas</span>
                  <span className="text-[10px] px-2.5 py-1 bg-[#121E26] text-gray-300 rounded-lg border border-[#1A2832]">Top 5</span>
                  <span className="text-[10px] px-2.5 py-1 bg-[#121E26] text-gray-300 rounded-lg border border-[#1A2832]">FastAPI</span>
                </div>
              </div>

              <div 
                onClick={() => setActiveTab('simulador')}
                className="group relative bg-[#0C151B]/70 backdrop-blur-xl border border-[#1E2E39] hover:border-[#CF9D7B] p-8 rounded-3xl transition-all duration-500 hover:-translate-y-2.5 cursor-pointer flex flex-col justify-between shadow-[0_10px_30px_rgba(0,0,0,0.5)] hover:shadow-[0_20px_40px_rgba(207,157,123,0.15)] overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#CF9D7B]/15 to-transparent rounded-bl-full pointer-events-none transition-all group-hover:scale-150" />
                <div className="space-y-4 relative z-10">
                  <div className="flex justify-between items-start">
                    <span className="text-xs px-3 py-1 bg-[#14222B] text-[#CF9D7B] rounded-full font-mono border border-[#CF9D7B]/30 shadow-inner">
                      MOD-03
                    </span>
                    <ArrowUpRight className="w-5 h-5 text-gray-500 group-hover:text-[#CF9D7B] group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-300" />
                  </div>
                  <h3 className="text-2xl font-serif text-white pt-2 group-hover:text-[#CF9D7B] transition-colors">Mix de Marketing</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Cálculo predictivo del Costo de Adquisición de Clientes (CAC) y retorno esperado sobre pauta digital en canales pagos.
                  </p>
                </div>
                <div className="flex gap-2 pt-6 relative z-10">
                  <span className="text-[10px] px-2.5 py-1 bg-[#121E26] text-gray-300 rounded-lg border border-[#1A2832]">Meta Ads</span>
                  <span className="text-[10px] px-2.5 py-1 bg-[#121E26] text-gray-300 rounded-lg border border-[#1A2832]">TikTok</span>
                  <span className="text-[10px] px-2.5 py-1 bg-[#121E26] text-gray-300 rounded-lg border border-[#1A2832]">CAC</span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* VISTA DEL SIMULADOR ASISTIDO */}
        {activeTab === 'simulador' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            <div className="lg:col-span-5 bg-[#0C151B]/80 backdrop-blur-xl border border-[#1E2E39] p-8 rounded-3xl space-y-6 shadow-2xl">
              <div>
                <span className="text-xs text-[#CF9D7B] font-semibold tracking-wider uppercase font-mono">Parámetros Base</span>
                <h2 className="text-2xl font-serif text-white mt-1">Configuración</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400">Precio Actual ($ COP)</label>
                  <input 
                    type="number" 
                    value={precioOriginal}
                    onChange={(e) => setPrecioOriginal(Number(e.target.value))}
                    className="w-full bg-[#121E26] border border-[#1E2E39] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#CF9D7B] mt-1 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400">Nuevo Precio Simulado ($ COP)</label>
                  <input 
                    type="number" 
                    value={nuevoPrecio}
                    onChange={(e) => setNuevoPrecio(Number(e.target.value))}
                    className="w-full bg-[#121E26] border border-[#1E2E39] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#CF9D7B] mt-1 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400">Costo Unitario ($ COP)</label>
                  <input 
                    type="number" 
                    value={costoUnitario}
                    onChange={(e) => setCostoUnitario(Number(e.target.value))}
                    className="w-full bg-[#121E26] border border-[#1E2E39] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#CF9D7B] mt-1 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400">Unidades Históricas</label>
                  <input 
                    type="number" 
                    value={unidadesHistoricas}
                    onChange={(e) => setUnidadesHistoricas(Number(e.target.value))}
                    className="w-full bg-[#121E26] border border-[#1E2E39] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#CF9D7B] mt-1 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400">Presupuesto de Marketing ($ COP)</label>
                  <input 
                    type="number" 
                    value={presupuestoMkt}
                    onChange={(e) => setPresupuestoMkt(Number(e.target.value))}
                    className="w-full bg-[#121E26] border border-[#1E2E39] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#CF9D7B] mt-1 transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#0C151B]/80 backdrop-blur-xl border border-[#1E2E39] p-6 rounded-3xl space-y-2 shadow-xl">
                  <span className="text-xs text-gray-400 font-mono uppercase tracking-wider">Ganancia Histórica</span>
                  <div className="text-3xl font-serif text-white">
                    ${gananciaBase.toLocaleString('es-CO')}
                  </div>
                  <span className="text-[10px] text-gray-500">Sin ajustes de precio ni pauta</span>
                </div>

                <div className="bg-[#0C151B]/80 backdrop-blur-xl border border-[#CF9D7B]/40 p-6 rounded-3xl space-y-2 shadow-xl shadow-[#CF9D7B]/10">
                  <span className="text-xs text-[#CF9D7B] font-medium font-mono uppercase tracking-wider">Ganancia Proyectada</span>
                  <div className="text-3xl font-serif text-white">
                    ${gananciaProyectada.toLocaleString('es-CO')}
                  </div>
                  <span className={`text-[11px] font-medium font-mono ${deltaGanancia >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {deltaGanancia >= 0 ? '▲ +' : '▼ -'}${Math.abs(deltaGanancia).toLocaleString('es-CO')} vs Base
                  </span>
                </div>
              </div>

              <div className="bg-[#0C151B]/80 backdrop-blur-xl border border-[#1E2E39] p-6 rounded-3xl space-y-4 shadow-xl">
                <h3 className="font-serif text-lg text-white">Impacto en Adquisición de Clientes</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 bg-[#121E26] rounded-2xl border border-[#1E2E39]">
                    <span className="text-[10px] text-gray-400 uppercase font-mono">CAC Estimado</span>
                    <p className="text-base font-semibold text-white mt-1">${costoAdquisicion.toLocaleString('es-CO')}</p>
                  </div>
                  <div className="p-4 bg-[#121E26] rounded-2xl border border-[#1E2E39]">
                    <span className="text-[10px] text-gray-400 uppercase font-mono">Nuevos Clientes</span>
                    <p className="text-base font-semibold text-[#CF9D7B] mt-1">+{nuevosClientes}</p>
                  </div>
                  <div className="p-4 bg-[#121E26] rounded-2xl border border-[#1E2E39]">
                    <span className="text-[10px] text-gray-400 uppercase font-mono">Volumen Total</span>
                    <p className="text-base font-semibold text-white mt-1">{Math.round(unidadesTotales)} uds</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* VISTA DEL DETECTIVE CSV */}
        {activeTab === 'auditoria' && (
          <div className="space-y-8">
            
            {/* Panel de Carga */}
            <div className="bg-[#0C151B]/80 backdrop-blur-xl border border-[#1E2E39] p-10 rounded-3xl max-w-2xl mx-auto text-center space-y-6 shadow-2xl">
              <div className="w-16 h-16 rounded-2xl bg-[#121E26] border border-[#CF9D7B]/30 flex items-center justify-center mx-auto text-[#CF9D7B] shadow-[0_0_20px_rgba(207,157,123,0.2)]">
                {cargandoCSV ? <Loader2 className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8" />}
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-serif text-white">Auditoría Forense CSV</h2>
                <p className="text-xs text-gray-400 max-w-md mx-auto">
                  Carga tu conjunto de transacciones históricas. El motor Python auditará ingresos, márgenes y concentración de catálogo.
                </p>
              </div>

              <label className={`inline-flex items-center gap-2 px-8 py-3.5 bg-[#CF9D7B] text-[#060A0D] text-xs font-bold uppercase tracking-wider rounded-full hover:shadow-[0_0_25px_rgba(207,157,123,0.5)] transition-all duration-300 cursor-pointer ${cargandoCSV ? 'opacity-50 pointer-events-none' : ''}`}>
                {cargandoCSV ? 'Analizando registros...' : 'Seleccionar Archivo CSV'}
                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              </label>

              {errorCSV && (
                <div className="flex items-center justify-center gap-2 text-rose-400 text-xs mt-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errorCSV}</span>
                </div>
              )}
            </div>

            {/* Resultados de la Auditoría */}
            {datosAuditoria && (
              <div className="space-y-8 animate-fadeIn">
                
                {/* Barra de Acciones */}
                <div className="bg-[#0C151B]/80 backdrop-blur-xl border border-[#CF9D7B]/40 p-6 rounded-3xl flex flex-col sm:flex-row justify-between items-center gap-4 shadow-2xl">
                  <div>
                    <h4 className="text-lg font-serif text-white">¿Listo para proyectar nuevos escenarios?</h4>
                    <p className="text-xs text-gray-400">Pasa el precio promedio (${Math.round(datosAuditoria.precio_promedio).toLocaleString('es-CO')}) y volumen histórico directamente al Modo Asistido.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button 
                      onClick={exportarPDF}
                      className="inline-flex items-center gap-2 px-5 py-3 bg-[#121E26] text-[#CF9D7B] border border-[#CF9D7B]/40 text-xs font-semibold rounded-full hover:bg-[#1A2832] transition-all cursor-pointer whitespace-nowrap shadow-lg"
                    >
                      <Download className="w-4 h-4" />
                      Descargar Reporte PDF
                    </button>
                    <button 
                      onClick={transferirAlSimulador}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#CF9D7B] text-[#060A0D] text-xs font-bold rounded-full hover:shadow-[0_0_20px_rgba(207,157,123,0.5)] transition-all cursor-pointer whitespace-nowrap"
                    >
                      <PlayCircle className="w-4 h-4" />
                      Simular con estos datos
                    </button>
                  </div>
                </div>

                {/* Métricas Generales */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="bg-[#0C151B]/80 backdrop-blur-xl border border-[#1E2E39] p-5 rounded-2xl">
                    <span className="text-xs text-gray-400 font-mono uppercase">Total Registros</span>
                    <p className="text-2xl font-serif text-white mt-1">{datosAuditoria.total_registros.toLocaleString('es-CO')}</p>
                  </div>
                  <div className="bg-[#0C151B]/80 backdrop-blur-xl border border-[#1E2E39] p-5 rounded-2xl">
                    <span className="text-xs text-gray-400 font-mono uppercase">Ventas Totales</span>
                    <p className="text-2xl font-serif text-[#CF9D7B] mt-1">${datosAuditoria.ventas_historicas.toLocaleString('es-CO')}</p>
                  </div>
                  <div className="bg-[#0C151B]/80 backdrop-blur-xl border border-[#1E2E39] p-5 rounded-2xl">
                    <span className="text-xs text-gray-400 font-mono uppercase">Unidades Vendidas</span>
                    <p className="text-2xl font-serif text-white mt-1">{datosAuditoria.unidades_historicas.toLocaleString('es-CO')}</p>
                  </div>
                  <div className="bg-[#0C151B]/80 backdrop-blur-xl border border-[#1E2E39] p-5 rounded-2xl">
                    <span className="text-xs text-gray-400 font-mono uppercase">Precio Promedio</span>
                    <p className="text-2xl font-serif text-white mt-1">${Math.round(datosAuditoria.precio_promedio).toLocaleString('es-CO')}</p>
                  </div>
                </div>

                {/* ============================================================ */}
                {/* 📊 GRÁFICO RECHARTS ELEVADO: GRADIENTES NEÓN + GRID LUMINOSO */}
                {/* ============================================================ */}
                {datosAuditoria.ranking_productos?.length > 0 && (
                  <div className="bg-[#0C151B]/80 backdrop-blur-xl border border-[#1E2E39] p-6 md:p-8 rounded-3xl space-y-4 shadow-2xl relative overflow-hidden">
                    <div className="flex justify-between items-center relative z-10">
                      <div>
                        <span className="text-xs text-[#CF9D7B] font-semibold uppercase tracking-wider font-mono">Distribución de Ingresos</span>
                        <h3 className="text-xl font-serif text-white mt-1">Top 5 Productos más Vendidos</h3>
                      </div>
                      <BarChart3 className="w-5 h-5 text-[#CF9D7B]" />
                    </div>

                    <div className="h-72 w-full pt-4 relative z-10">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={datosAuditoria.ranking_productos} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
                          
                          {/* Definición de Gradientes Volumétricos */}
                          <defs>
                            <linearGradient id="barRey" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#E5B898" stopOpacity={1} />
                              <stop offset="100%" stopColor="#8F5D38" stopOpacity={0.8} />
                            </linearGradient>
                            <linearGradient id="barNormal" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#2A4354" stopOpacity={0.9} />
                              <stop offset="100%" stopColor="#121F28" stopOpacity={0.8} />
                            </linearGradient>
                          </defs>

                          <CartesianGrid strokeDasharray="3 3" stroke="#1A2832" vertical={false} />
                          <XAxis dataKey="nombre" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={{ stroke: '#1E2E39' }} />
                          <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={{ stroke: '#1E2E39' }} tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`} />
                          <Tooltip 
                            cursor={{ fill: 'rgba(207, 157, 123, 0.05)' }}
                            contentStyle={{ 
                              backgroundColor: '#0C151B', 
                              borderColor: '#CF9D7B', 
                              borderRadius: '16px', 
                              color: '#FFF',
                              boxShadow: '0 8px 32px rgba(0,0,0,0.8)'
                            }}
                            formatter={(value) => [`$${value.toLocaleString('es-CO')}`, 'Ventas Totales']}
                          />
                          <Bar dataKey="ventas" radius={[10, 10, 0, 0]} animationDuration={1200}>
                            {datosAuditoria.ranking_productos.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={index === 0 ? 'url(#barRey)' : 'url(#barNormal)'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Diagnóstico Rey vs Hueso */}
                {datosAuditoria.diagnostico?.rey && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-[#0C151B]/80 backdrop-blur-xl border border-emerald-900/40 p-6 rounded-3xl space-y-3 shadow-xl">
                      <div className="flex items-center gap-2 text-emerald-400">
                        <Award className="w-5 h-5" />
                        <span className="text-xs font-semibold uppercase tracking-wider font-mono">Producto Estrella (Rey)</span>
                      </div>
                      <h4 className="text-xl font-serif text-white">{datosAuditoria.diagnostico.rey.nombre}</h4>
                      <p className="text-xs text-gray-400">
                        Generó el mayor volumen de facturación con <span className="text-white font-medium">${datosAuditoria.diagnostico.rey.ventas.toLocaleString('es-CO')}</span> en ventas.
                      </p>
                    </div>

                    <div className="bg-[#0C151B]/80 backdrop-blur-xl border border-rose-900/40 p-6 rounded-3xl space-y-3 shadow-xl">
                      <div className="flex items-center gap-2 text-rose-400">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="text-xs font-semibold uppercase tracking-wider font-mono">Producto de Bajo Desempeño (Hueso)</span>
                      </div>
                      <h4 className="text-xl font-serif text-white">{datosAuditoria.diagnostico.hueso.nombre}</h4>
                      <p className="text-xs text-gray-400">
                        Menor facturación del período con apenas <span className="text-white font-medium">${datosAuditoria.diagnostico.hueso.ventas.toLocaleString('es-CO')}</span>.
                      </p>
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>
        )}
      </main>

      {/* ============================================================ */}
      {/* ⚓ FOOTER */}
      {/* ============================================================ */}
      <footer className="relative z-20 max-w-6xl mx-auto w-full pt-8 border-t border-[#1A2832]/80 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-500 gap-4">
        <div>Plataforma Analítica SaaS • Emmanuel Tapasco</div>
        <div className="flex gap-4">
          <span className="hover:text-gray-400 cursor-pointer">Documentación</span>
          <span className="hover:text-gray-400 cursor-pointer">API Status: Online</span>
        </div>
      </footer>

    </div>
  );
}