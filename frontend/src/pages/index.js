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
  Zap,
  Sparkles
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
      doc.setFillColor(10, 16, 20);
      doc.rect(0, 0, 210, 35, 'F');

      doc.setTextColor(207, 157, 123);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('PLATAFORMA ANALÍTICA SaaS - AUDITORÍA FORENSE', 14, 18);

      doc.setTextColor(200, 205, 210);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Fecha: ${new Date().toLocaleDateString('es-CO')} | Auditor Responsable: Emmanuel Tapasco`, 14, 26);

      // Resumen Ejecutivo de Métricas
      doc.setTextColor(20, 30, 40);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('1. MÉTRICAS CLAVE DE RENDIMIENTO', 14, 48);

      const metricasData = [
        ['Total Registros Procesados', datosAuditoria.total_registros.toLocaleString('es-CO')],
        ['Facturación Total Acumulada', `$${datosAuditoria.ventas_historicas.toLocaleString('es-CO')}`],
        ['Unidades Vendidas', datosAuditoria.unidades_historicas.toLocaleString('es-CO')],
        ['Precio Promedio Ponderado', `$${Math.round(datosAuditoria.precio_promedio).toLocaleString('es-CO')}`],
      ];

      autoTable(doc, {
        startY: 53,
        head: [['Indicador', 'Valor']],
        body: metricasData,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 30], textColor: [207, 157, 123] },
        styles: { fontSize: 9, cellPadding: 4 },
      });

      // Diagnóstico Rey vs Hueso
      const diagStartY = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 12 : 110;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('2. DIAGNÓSTICO ESTRATÉGICO DE CATÁLOGO', 14, diagStartY);

      const diagData = [
        ['Producto Estrella (Líder)', datosAuditoria.diagnostico?.rey?.nombre || 'N/A', `$${datosAuditoria.diagnostico?.rey?.ventas?.toLocaleString('es-CO') || '0'}`],
        ['Producto Crítico (Bajo Desempeño)', datosAuditoria.diagnostico?.hueso?.nombre || 'N/A', `$${datosAuditoria.diagnostico?.hueso?.ventas?.toLocaleString('es-CO') || '0'}`],
      ];

      autoTable(doc, {
        startY: diagStartY + 5,
        head: [['Clasificación', 'Producto', 'Ventas']],
        body: diagData,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 30], textColor: [207, 157, 123] },
        styles: { fontSize: 9, cellPadding: 4 },
      });

      // Top 5 Productos
      const rankingStartY = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 12 : 170;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('3. TOP 5 PRODUCTOS POR PARTICIPACIÓN', 14, rankingStartY);

      const rankingData = (datosAuditoria.ranking_productos || []).map((item, idx) => [
        `#0${idx + 1}`,
        item.nombre,
        `$${item.ventas.toLocaleString('es-CO')}`,
      ]);

      autoTable(doc, {
        startY: rankingStartY + 5,
        head: [['Posición', 'Producto', 'Ventas']],
        body: rankingData,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 30], textColor: [207, 157, 123] },
        styles: { fontSize: 9, cellPadding: 3 },
      });

      doc.save('Reporte_Auditoria_Forense.pdf');
    } catch (error) {
      console.error('Error generando PDF:', error);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#06090C] text-[#ECEFF1] font-sans px-6 py-10 md:px-16 flex flex-col justify-between selection:bg-[#CF9D7B] selection:text-[#06090C] overflow-hidden">
      
      {/* INYECCIÓN DE ANIMACIONES CSS DIRECTAS */}
      <style>{`
        @keyframes floatFlowA {
          0% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(60px, -40px) scale(1.12); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes floatFlowB {
          0% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(-70px, 50px) scale(1.18); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes waveScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes scanBeam {
          0% { top: -10%; opacity: 0; }
          40% { opacity: 0.8; }
          100% { top: 110%; opacity: 0; }
        }
        .anim-orb-a { animation: floatFlowA 16s ease-in-out infinite; }
        .anim-orb-b { animation: floatFlowB 20s ease-in-out infinite; }
        .anim-wave { animation: waveScroll 28s linear infinite; }
        .anim-scan { animation: scanBeam 7s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
      `}</style>

      {/* ============================================================ */}
      {/* 🌌 FONDO DINÁMICO CON MOVIMIENTO CONTINUO */}
      {/* ============================================================ */}

      {/* Orbes de luz líquida en órbita */}
      <div className="anim-orb-a absolute -top-24 -left-24 w-[650px] h-[650px] bg-gradient-to-br from-[#CF9D7B]/25 via-amber-900/10 to-transparent rounded-full blur-[140px] pointer-events-none" />
      <div className="anim-orb-b absolute top-1/3 -right-32 w-[700px] h-[700px] bg-gradient-to-tl from-[#1B3545]/30 via-cyan-950/20 to-transparent rounded-full blur-[160px] pointer-events-none" />
      <div className="anim-orb-a absolute -bottom-32 left-1/4 w-[600px] h-[600px] bg-[#CF9D7B]/15 rounded-full blur-[150px] pointer-events-none" />

      {/* Retícula técnica de alta resolución con escáner vertical */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-25"
        style={{
          backgroundImage: `
            linear-gradient(to right, #17232B 1px, transparent 1px),
            linear-gradient(to bottom, #17232B 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse 85% 75% at 50% 45%, #000 65%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 85% 75% at 50% 45%, #000 65%, transparent 100%)'
        }}
      >
        <div className="anim-scan absolute left-0 right-0 h-32 bg-gradient-to-b from-transparent via-[#CF9D7B]/10 to-transparent pointer-events-none" />
      </div>

      {/* Ondas vectoriales de datos con traslación continua */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30 select-none">
        <div className="anim-wave flex w-[200%] h-full">
          <svg className="w-1/2 h-full flex-shrink-0" viewBox="0 0 1200 800" fill="none" preserveAspectRatio="none">
            <path d="M 0 500 C 300 350, 600 650, 900 420 C 1050 300, 1150 480, 1200 400 L 1200 800 L 0 800 Z" fill="url(#gradWaveA)" />
            <path d="M 0 550 C 250 420, 550 720, 850 490 C 1000 380, 1120 540, 1200 480" stroke="#CF9D7B" strokeWidth="1.5" strokeDasharray="6 6" />
            <defs>
              <linearGradient id="gradWaveA" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#CF9D7B" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#06090C" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
          <svg className="w-1/2 h-full flex-shrink-0" viewBox="0 0 1200 800" fill="none" preserveAspectRatio="none">
            <path d="M 0 500 C 300 350, 600 650, 900 420 C 1050 300, 1150 480, 1200 400 L 1200 800 L 0 800 Z" fill="url(#gradWaveA)" />
            <path d="M 0 550 C 250 420, 550 720, 850 490 C 1000 380, 1120 540, 1200 480" stroke="#CF9D7B" strokeWidth="1.5" strokeDasharray="6 6" />
          </svg>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 🧭 NAVBAR EJECUTIVO */}
      {/* ============================================================ */}
      <header className="relative z-20 flex justify-between items-center max-w-6xl mx-auto w-full pb-8 border-b border-[#162128]">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setActiveTab('lobby')}>
          <div className="relative flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-[#CF9D7B] shadow-[0_0_15px_#CF9D7B]"></div>
            <div className="absolute w-5 h-5 rounded-full border border-[#CF9D7B]/40 animate-ping"></div>
          </div>
          <span className="font-semibold text-lg tracking-tight text-white uppercase">
            Simulador <span className="text-[#CF9D7B] font-mono font-normal">SaaS</span>
          </span>
        </div>

        <nav className="flex items-center gap-1.5 md:gap-2 bg-[#0B1216]/90 backdrop-blur-xl p-1.5 rounded-full border border-[#1C2830] shadow-2xl">
          <button 
            onClick={() => setActiveTab('lobby')}
            className={`px-4 py-1.5 rounded-full text-xs tracking-wide transition-all duration-200 ${
              activeTab === 'lobby' ? 'bg-[#CF9D7B] text-[#06090C] font-semibold shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            Lobby
          </button>
          <button 
            onClick={() => setActiveTab('simulador')}
            className={`px-4 py-1.5 rounded-full text-xs tracking-wide transition-all duration-200 ${
              activeTab === 'simulador' ? 'bg-[#CF9D7B] text-[#06090C] font-semibold shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            Modo Asistido
          </button>
          <button 
            onClick={() => setActiveTab('auditoria')}
            className={`px-4 py-1.5 rounded-full text-xs tracking-wide transition-all duration-200 ${
              activeTab === 'auditoria' ? 'bg-[#CF9D7B] text-[#06090C] font-semibold shadow-md' : 'text-gray-400 hover:text-white'
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
            
            {/* HERO SECTION */}
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0E171C] border border-[#1F2C35] text-[#CF9D7B] text-[11px] font-mono tracking-wider uppercase shadow-inner">
                <Zap className="w-3.5 h-3.5" />
                Motor de Inteligencia de Negocios
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight leading-tight">
                Decisiones basadas en <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#CF9D7B] via-[#E8C5AF] to-[#CF9D7B]">
                  datos cuantitativos reales.
                </span>
              </h1>
              <p className="text-gray-400 text-sm md:text-base leading-relaxed max-w-2xl mx-auto">
                Auditoría algorítmica de transacciones, análisis de concentración de cartera y modelado paramétrico de elasticidad de precios.
              </p>
            </div>

            {/* MÓDULOS DE ACCESO */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div 
                onClick={() => setActiveTab('simulador')}
                className="group relative bg-[#0A1014]/85 backdrop-blur-xl border border-[#18232B] hover:border-[#CF9D7B]/60 p-8 rounded-2xl transition-all duration-300 hover:-translate-y-1.5 cursor-pointer flex flex-col justify-between shadow-2xl hover:shadow-[0_15px_30px_rgba(207,157,123,0.1)]"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="text-[11px] px-2.5 py-1 bg-[#121B21] text-[#CF9D7B] rounded-md font-mono border border-[#CF9D7B]/20">
                      MOD-01
                    </span>
                    <ArrowUpRight className="w-5 h-5 text-gray-500 group-hover:text-[#CF9D7B] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <h3 className="text-xl font-bold text-white tracking-tight pt-1">Modo Asistido</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Simulación paramétrica de elasticidad de precios, estructura de costos y distribución óptima de presupuesto publicitario.
                  </p>
                </div>
                <div className="flex gap-2 pt-6">
                  <span className="text-[10px] font-mono px-2 py-1 bg-[#11191F] text-gray-400 rounded border border-[#1A252C]">Costos</span>
                  <span className="text-[10px] font-mono px-2 py-1 bg-[#11191F] text-gray-400 rounded border border-[#1A252C]">Margen</span>
                  <span className="text-[10px] font-mono px-2 py-1 bg-[#11191F] text-gray-400 rounded border border-[#1A252C]">Proyección</span>
                </div>
              </div>

              <div 
                onClick={() => setActiveTab('auditoria')}
                className="group relative bg-[#0A1014]/85 backdrop-blur-xl border border-[#18232B] hover:border-[#CF9D7B]/60 p-8 rounded-2xl transition-all duration-300 hover:-translate-y-1.5 cursor-pointer flex flex-col justify-between shadow-2xl hover:shadow-[0_15px_30px_rgba(207,157,123,0.1)]"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="text-[11px] px-2.5 py-1 bg-[#121B21] text-[#CF9D7B] rounded-md font-mono border border-[#CF9D7B]/20">
                      MOD-02
                    </span>
                    <ArrowUpRight className="w-5 h-5 text-gray-500 group-hover:text-[#CF9D7B] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <h3 className="text-xl font-bold text-white tracking-tight pt-1">Detective CSV</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Auditoría automatizada de transacciones históricas. Identifica productos estrella, concentración de ingresos y anomalías de catálogo.
                  </p>
                </div>
                <div className="flex gap-2 pt-6">
                  <span className="text-[10px] font-mono px-2 py-1 bg-[#11191F] text-gray-400 rounded border border-[#1A252C]">Pandas</span>
                  <span className="text-[10px] font-mono px-2 py-1 bg-[#11191F] text-gray-400 rounded border border-[#1A252C]">Top 5</span>
                  <span className="text-[10px] font-mono px-2 py-1 bg-[#11191F] text-gray-400 rounded border border-[#1A252C]">FastAPI</span>
                </div>
              </div>

              <div 
                onClick={() => setActiveTab('simulador')}
                className="group relative bg-[#0A1014]/85 backdrop-blur-xl border border-[#18232B] hover:border-[#CF9D7B]/60 p-8 rounded-2xl transition-all duration-300 hover:-translate-y-1.5 cursor-pointer flex flex-col justify-between shadow-2xl hover:shadow-[0_15px_30px_rgba(207,157,123,0.1)]"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="text-[11px] px-2.5 py-1 bg-[#121B21] text-[#CF9D7B] rounded-md font-mono border border-[#CF9D7B]/20">
                      MOD-03
                    </span>
                    <ArrowUpRight className="w-5 h-5 text-gray-500 group-hover:text-[#CF9D7B] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <h3 className="text-xl font-bold text-white tracking-tight pt-1">Mix de Marketing</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Cálculo predictivo del Costo de Adquisición de Clientes (CAC) y retorno esperado sobre inversión en pauta digital.
                  </p>
                </div>
                <div className="flex gap-2 pt-6">
                  <span className="text-[10px] font-mono px-2 py-1 bg-[#11191F] text-gray-400 rounded border border-[#1A252C]">Meta Ads</span>
                  <span className="text-[10px] font-mono px-2 py-1 bg-[#11191F] text-gray-400 rounded border border-[#1A252C]">Google Ads</span>
                  <span className="text-[10px] font-mono px-2 py-1 bg-[#11191F] text-gray-400 rounded border border-[#1A252C]">CAC</span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* VISTA DEL SIMULADOR ASISTIDO */}
        {activeTab === 'simulador' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            <div className="lg:col-span-5 bg-[#0A1014]/90 backdrop-blur-xl border border-[#18232B] p-8 rounded-2xl space-y-6 shadow-2xl">
              <div>
                <span className="text-[11px] text-[#CF9D7B] font-mono uppercase tracking-wider font-semibold">Parámetros Operativos</span>
                <h2 className="text-2xl font-bold text-white tracking-tight mt-1">Configuración</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400">Precio Actual ($ COP)</label>
                  <input 
                    type="number" 
                    value={precioOriginal}
                    onChange={(e) => setPrecioOriginal(Number(e.target.value))}
                    className="w-full bg-[#11191F] border border-[#1F2C35] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#CF9D7B] mt-1 transition-colors font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400">Nuevo Precio Simulado ($ COP)</label>
                  <input 
                    type="number" 
                    value={nuevoPrecio}
                    onChange={(e) => setNuevoPrecio(Number(e.target.value))}
                    className="w-full bg-[#11191F] border border-[#1F2C35] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#CF9D7B] mt-1 transition-colors font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400">Costo Unitario ($ COP)</label>
                  <input 
                    type="number" 
                    value={costoUnitario}
                    onChange={(e) => setCostoUnitario(Number(e.target.value))}
                    className="w-full bg-[#11191F] border border-[#1F2C35] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#CF9D7B] mt-1 transition-colors font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400">Unidades Históricas</label>
                  <input 
                    type="number" 
                    value={unidadesHistoricas}
                    onChange={(e) => setUnidadesHistoricas(Number(e.target.value))}
                    className="w-full bg-[#11191F] border border-[#1F2C35] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#CF9D7B] mt-1 transition-colors font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400">Presupuesto de Marketing ($ COP)</label>
                  <input 
                    type="number" 
                    value={presupuestoMkt}
                    onChange={(e) => setPresupuestoMkt(Number(e.target.value))}
                    className="w-full bg-[#11191F] border border-[#1F2C35] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#CF9D7B] mt-1 transition-colors font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#0A1014]/90 backdrop-blur-xl border border-[#18232B] p-6 rounded-2xl space-y-2 shadow-xl">
                  <span className="text-xs text-gray-400 font-mono uppercase tracking-wider">Ganancia Histórica</span>
                  <div className="text-3xl font-bold text-white tracking-tight font-mono">
                    ${gananciaBase.toLocaleString('es-CO')}
                  </div>
                  <span className="text-[10px] text-gray-500">Línea base sin modificaciones</span>
                </div>

                <div className="bg-[#0A1014]/90 backdrop-blur-xl border border-[#CF9D7B]/40 p-6 rounded-2xl space-y-2 shadow-xl shadow-[#CF9D7B]/5">
                  <span className="text-xs text-[#CF9D7B] font-mono uppercase tracking-wider font-semibold">Ganancia Proyectada</span>
                  <div className="text-3xl font-bold text-white tracking-tight font-mono">
                    ${gananciaProyectada.toLocaleString('es-CO')}
                  </div>
                  <span className={`text-[11px] font-mono font-medium ${deltaGanancia >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {deltaGanancia >= 0 ? '▲ +' : '▼ -'}${Math.abs(deltaGanancia).toLocaleString('es-CO')} vs Base
                  </span>
                </div>
              </div>

              <div className="bg-[#0A1014]/90 backdrop-blur-xl border border-[#18232B] p-6 rounded-2xl space-y-4 shadow-xl">
                <h3 className="text-lg font-bold text-white tracking-tight">Impacto en Adquisición de Clientes</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 bg-[#11191F] rounded-xl border border-[#1F2C35]">
                    <span className="text-[10px] text-gray-400 uppercase font-mono">CAC Estimado</span>
                    <p className="text-base font-bold text-white mt-1 font-mono">${costoAdquisicion.toLocaleString('es-CO')}</p>
                  </div>
                  <div className="p-4 bg-[#11191F] rounded-xl border border-[#1F2C35]">
                    <span className="text-[10px] text-gray-400 uppercase font-mono">Nuevos Clientes</span>
                    <p className="text-base font-bold text-[#CF9D7B] mt-1 font-mono">+{nuevosClientes}</p>
                  </div>
                  <div className="p-4 bg-[#11191F] rounded-xl border border-[#1F2C35]">
                    <span className="text-[10px] text-gray-400 uppercase font-mono">Volumen Total</span>
                    <p className="text-base font-bold text-white mt-1 font-mono">{Math.round(unidadesTotales)} uds</p>
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
            <div className="bg-[#0A1014]/90 backdrop-blur-xl border border-[#18232B] p-10 rounded-2xl max-w-2xl mx-auto text-center space-y-6 shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-[#11191F] border border-[#CF9D7B]/30 flex items-center justify-center mx-auto text-[#CF9D7B] shadow-[0_0_20px_rgba(207,157,123,0.15)]">
                {cargandoCSV ? <Loader2 className="w-7 h-7 animate-spin" /> : <Upload className="w-7 h-7" />}
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white tracking-tight">Auditoría Forense CSV</h2>
                <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
                  Carga tu conjunto de transacciones históricas. El motor Python auditará ingresos, márgenes y concentración de catálogo.
                </p>
              </div>

              <label className={`inline-flex items-center gap-2 px-7 py-3 bg-[#CF9D7B] text-[#06090C] text-xs font-bold uppercase tracking-wider rounded-full hover:shadow-[0_0_20px_rgba(207,157,123,0.4)] transition-all cursor-pointer ${cargandoCSV ? 'opacity-50 pointer-events-none' : ''}`}>
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
                <div className="bg-[#0A1014]/90 backdrop-blur-xl border border-[#CF9D7B]/40 p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4 shadow-2xl">
                  <div>
                    <h4 className="text-lg font-bold text-white tracking-tight">¿Listo para proyectar nuevos escenarios?</h4>
                    <p className="text-xs text-gray-400">Pasa el precio promedio (${Math.round(datosAuditoria.precio_promedio).toLocaleString('es-CO')}) y volumen histórico al Simulador.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button 
                      onClick={exportarPDF}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#11191F] text-[#CF9D7B] border border-[#CF9D7B]/40 text-xs font-semibold rounded-full hover:bg-[#18232B] transition-all cursor-pointer whitespace-nowrap"
                    >
                      <Download className="w-4 h-4" />
                      Descargar Reporte PDF
                    </button>
                    <button 
                      onClick={transferirAlSimulador}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#CF9D7B] text-[#06090C] text-xs font-bold rounded-full hover:shadow-[0_0_15px_rgba(207,157,123,0.4)] transition-all cursor-pointer whitespace-nowrap"
                    >
                      <PlayCircle className="w-4 h-4" />
                      Simular con estos datos
                    </button>
                  </div>
                </div>

                {/* Métricas Generales */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="bg-[#0A1014]/90 backdrop-blur-xl border border-[#18232B] p-5 rounded-2xl">
                    <span className="text-xs text-gray-400 font-mono uppercase">Total Registros</span>
                    <p className="text-2xl font-bold text-white mt-1 font-mono">{datosAuditoria.total_registros.toLocaleString('es-CO')}</p>
                  </div>
                  <div className="bg-[#0A1014]/90 backdrop-blur-xl border border-[#18232B] p-5 rounded-2xl">
                    <span className="text-xs text-gray-400 font-mono uppercase">Ventas Totales</span>
                    <p className="text-2xl font-bold text-[#CF9D7B] mt-1 font-mono">${datosAuditoria.ventas_historicas.toLocaleString('es-CO')}</p>
                  </div>
                  <div className="bg-[#0A1014]/90 backdrop-blur-xl border border-[#18232B] p-5 rounded-2xl">
                    <span className="text-xs text-gray-400 font-mono uppercase">Unidades Vendidas</span>
                    <p className="text-2xl font-bold text-white mt-1 font-mono">{datosAuditoria.unidades_historicas.toLocaleString('es-CO')}</p>
                  </div>
                  <div className="bg-[#0A1014]/90 backdrop-blur-xl border border-[#18232B] p-5 rounded-2xl">
                    <span className="text-xs text-gray-400 font-mono uppercase">Precio Promedio</span>
                    <p className="text-2xl font-bold text-white mt-1 font-mono">${Math.round(datosAuditoria.precio_promedio).toLocaleString('es-CO')}</p>
                  </div>
                </div>

                {/* Gráfico Recharts con Gradientes Volumétricos */}
                {datosAuditoria.ranking_productos?.length > 0 && (
                  <div className="bg-[#0A1014]/90 backdrop-blur-xl border border-[#18232B] p-6 md:p-8 rounded-2xl space-y-4 shadow-2xl relative overflow-hidden">
                    <div className="flex justify-between items-center relative z-10">
                      <div>
                        <span className="text-xs text-[#CF9D7B] font-semibold uppercase tracking-wider font-mono">Distribución de Ingresos</span>
                        <h3 className="text-xl font-bold text-white tracking-tight mt-1">Top 5 Productos más Vendidos</h3>
                      </div>
                      <BarChart3 className="w-5 h-5 text-[#CF9D7B]" />
                    </div>

                    <div className="h-72 w-full pt-4 relative z-10">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={datosAuditoria.ranking_productos} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
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

                          <CartesianGrid strokeDasharray="3 3" stroke="#16222A" vertical={false} />
                          <XAxis dataKey="nombre" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={{ stroke: '#1E2E39' }} />
                          <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={{ stroke: '#1E2E39' }} tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`} />
                          <Tooltip 
                            cursor={{ fill: 'rgba(207, 157, 123, 0.05)' }}
                            contentStyle={{ 
                              backgroundColor: '#0A1014', 
                              borderColor: '#CF9D7B', 
                              borderRadius: '12px', 
                              color: '#FFF',
                              boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
                              fontFamily: 'monospace'
                            }}
                            formatter={(value) => [`$${value.toLocaleString('es-CO')}`, 'Ventas Totales']}
                          />
                          <Bar dataKey="ventas" radius={[8, 8, 0, 0]} animationDuration={1000}>
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
                    <div className="bg-[#0A1014]/90 backdrop-blur-xl border border-emerald-900/40 p-6 rounded-2xl space-y-3 shadow-xl">
                      <div className="flex items-center gap-2 text-emerald-400">
                        <Award className="w-5 h-5" />
                        <span className="text-xs font-semibold uppercase tracking-wider font-mono">Producto Estrella (Líder)</span>
                      </div>
                      <h4 className="text-xl font-bold text-white tracking-tight">{datosAuditoria.diagnostico.rey.nombre}</h4>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        Generó el mayor volumen de facturación con <span className="text-white font-mono font-medium">${datosAuditoria.diagnostico.rey.ventas.toLocaleString('es-CO')}</span> en ventas.
                      </p>
                    </div>

                    <div className="bg-[#0A1014]/90 backdrop-blur-xl border border-rose-900/40 p-6 rounded-2xl space-y-3 shadow-xl">
                      <div className="flex items-center gap-2 text-rose-400">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="text-xs font-semibold uppercase tracking-wider font-mono">Producto de Bajo Desempeño</span>
                      </div>
                      <h4 className="text-xl font-bold text-white tracking-tight">{datosAuditoria.diagnostico.hueso.nombre}</h4>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        Menor facturación del período con apenas <span className="text-white font-mono font-medium">${datosAuditoria.diagnostico.hueso.ventas.toLocaleString('es-CO')}</span>.
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
      <footer className="relative z-20 max-w-6xl mx-auto w-full pt-8 border-t border-[#162128] flex flex-col sm:flex-row justify-between items-center text-xs text-gray-500 gap-4 font-mono">
        <div>Plataforma Analítica SaaS • Emmanuel Tapasco</div>
        <div className="flex gap-4">
          <span className="hover:text-gray-400 cursor-pointer">Documentación</span>
          <span className="hover:text-gray-400 cursor-pointer text-emerald-400">● API Status: Online</span>
        </div>
      </footer>

    </div>
  );
}