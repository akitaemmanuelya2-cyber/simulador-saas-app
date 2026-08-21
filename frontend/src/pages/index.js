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
  DollarSign,
  Layers,
  Zap
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell 
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
    <div className="relative min-h-screen bg-[#070D10] text-[#E5E7EB] px-6 py-10 md:px-16 flex flex-col justify-between selection:bg-[#CF9D7B] selection:text-[#0C1519] overflow-hidden">
      
      {/* CAPA DE FONDO: RETÍCULA DINÁMICA CON GRADIENTE ISOMÉTRICO */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-25"
        style={{
          backgroundImage: `
            linear-gradient(to right, #1E2D36 1px, transparent 1px),
            linear-gradient(to bottom, #1E2D36 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 75% 65% at 50% 45%, #000 60%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 75% 65% at 50% 45%, #000 60%, transparent 100%)'
        }}
      />

      {/* ELEMENTOS VECTORIALES DE NEGOCIOS FLOTANTES (BACKGROUND HUD) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        
        {/* Curva de Tendencia y Crecimiento SVG */}
        <svg className="absolute -top-10 -right-20 w-[600px] h-[400px] opacity-15 stroke-[#CF9D7B] fill-none" viewBox="0 0 500 300">
          <path d="M 0,220 Q 120,240 200,160 T 380,80 T 500,20" strokeWidth="2" strokeDasharray="6 6" />
          <path d="M 0,220 Q 120,240 200,160 T 380,80 T 500,20 L 500,300 L 0,300 Z" fill="url(#gradienteTendencia)" opacity="0.4" />
          <defs>
            <linearGradient id="gradienteTendencia" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#CF9D7B" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#070D10" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* Tarjeta Flotante: Indicador de Liquidez / Margen */}
        <div className="hidden xl:flex absolute top-36 left-12 bg-[#0D181E]/80 backdrop-blur-md border border-[#243540] p-4 rounded-2xl flex-col gap-1.5 shadow-2xl animate-bounce [animation-duration:6s]">
          <div className="flex items-center gap-2 text-[#CF9D7B]">
            <Activity className="w-4 h-4" />
            <span className="text-[10px] font-mono tracking-wider uppercase">Margen Bruto</span>
          </div>
          <div className="text-lg font-serif text-white flex items-center gap-2">
            64.8% <span className="text-[10px] text-emerald-400 font-mono font-normal">▲ +3.2%</span>
          </div>
        </div>

        {/* Tarjeta Flotante: Volumen de Transacciones */}
        <div className="hidden xl:flex absolute bottom-32 right-12 bg-[#0D181E]/80 backdrop-blur-md border border-[#243540] p-4 rounded-2xl flex-col gap-1.5 shadow-2xl animate-bounce [animation-duration:8s]">
          <div className="flex items-center gap-2 text-[#CF9D7B]">
            <TrendingUp className="w-4 h-4" />
            <span className="text-[10px] font-mono tracking-wider uppercase">Retorno Estimado</span>
          </div>
          <div className="text-lg font-serif text-white flex items-center gap-2">
            3.8x ROAS <span className="text-[10px] text-emerald-400 font-mono font-normal">Optimo</span>
          </div>
        </div>

        {/* Nodos de Conexión Activa */}
        <div className="absolute top-1/3 left-1/4 w-2 h-2 rounded-full bg-[#CF9D7B] animate-ping opacity-75" />
        <div className="absolute bottom-1/3 right-1/3 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping [animation-duration:3s] opacity-50" />
      </div>

      {/* ORBES DE LUZ AMBIENTAL */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[400px] bg-[#CF9D7B]/10 rounded-full blur-[140px] pointer-events-none animate-pulse [animation-duration:5s]" />
      <div className="absolute top-3/4 right-1/4 w-[450px] h-[350px] bg-[#122A36]/30 rounded-full blur-[120px] pointer-events-none" />

      {/* HEADER / NAVBAR */}
      <header className="relative z-10 flex justify-between items-center max-w-6xl mx-auto w-full pb-8 border-b border-[#1E2D36]">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setActiveTab('lobby')}>
          <div className="w-3.5 h-3.5 rounded-full bg-[#CF9D7B] shadow-[0_0_15px_#CF9D7B] group-hover:scale-125 transition-all duration-300"></div>
          <span className="font-serif text-xl tracking-tight text-white font-medium">
            Simulador <span className="text-[#CF9D7B] italic">SaaS</span>
          </span>
        </div>

        <nav className="flex items-center gap-2 md:gap-4 bg-[#0E171C]/90 backdrop-blur-md p-1.5 rounded-full border border-[#1E2D36] shadow-xl">
          <button 
            onClick={() => setActiveTab('lobby')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeTab === 'lobby' ? 'bg-[#CF9D7B] text-[#0C1519] shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            Lobby
          </button>
          <button 
            onClick={() => setActiveTab('simulador')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeTab === 'simulador' ? 'bg-[#CF9D7B] text-[#0C1519] shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            Modo Asistido
          </button>
          <button 
            onClick={() => setActiveTab('auditoria')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeTab === 'auditoria' ? 'bg-[#CF9D7B] text-[#0C1519] shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            Detective CSV
          </button>
        </nav>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="relative z-10 max-w-6xl mx-auto w-full my-auto py-12">
        {activeTab === 'lobby' && (
          <div className="space-y-16">
            
            {/* HERO SECTION */}
            <div className="text-center space-y-4 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#142027] border border-[#243540] text-[#CF9D7B] text-[11px] font-mono uppercase tracking-widest shadow-inner">
                <Zap className="w-3.5 h-3.5" />
                Centro de Operaciones Estratégicas
              </div>
              <h1 className="text-4xl md:text-6xl font-serif text-white leading-tight">
                Decisiones basadas en <span className="italic text-[#CF9D7B]">datos reales.</span>
              </h1>
              <p className="text-gray-400 text-sm md:text-base leading-relaxed">
                Auditoría forense de transacciones, arquitectura de elasticidad y distribución algorítmica de presupuesto publicitario.
              </p>
            </div>

            {/* MÓDULOS ACTIVOS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div 
                onClick={() => setActiveTab('simulador')}
                className="group relative bg-[#0E171C]/80 backdrop-blur-md border border-[#1E2D36] hover:border-[#CF9D7B]/60 p-8 rounded-3xl transition-all duration-300 hover:-translate-y-2 cursor-pointer flex flex-col justify-between shadow-2xl hover:shadow-[0_12px_35px_rgba(207,157,123,0.12)] overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#CF9D7B]/5 rounded-bl-full pointer-events-none transition-all group-hover:scale-125" />
                <div className="space-y-4 relative z-10">
                  <div className="flex justify-between items-start">
                    <span className="text-xs px-3 py-1 bg-[#16232B] text-[#CF9D7B] rounded-full font-mono border border-[#CF9D7B]/20">
                      MOD-01
                    </span>
                    <ArrowUpRight className="w-5 h-5 text-gray-500 group-hover:text-[#CF9D7B] group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                  </div>
                  <h3 className="text-2xl font-serif text-white pt-2">Modo Asistido</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Simulación paramétrica de elasticidad de precios, estructura de costos y distribución óptima de presupuesto.
                  </p>
                </div>
                <div className="flex gap-2 pt-6 relative z-10">
                  <span className="text-[10px] px-2.5 py-1 bg-[#142027] text-gray-400 rounded-md border border-[#1E2D36]">Costos</span>
                  <span className="text-[10px] px-2.5 py-1 bg-[#142027] text-gray-400 rounded-md border border-[#1E2D36]">Margen</span>
                  <span className="text-[10px] px-2.5 py-1 bg-[#142027] text-gray-400 rounded-md border border-[#1E2D36]">Proyección</span>
                </div>
              </div>

              <div 
                onClick={() => setActiveTab('auditoria')}
                className="group relative bg-[#0E171C]/80 backdrop-blur-md border border-[#1E2D36] hover:border-[#CF9D7B]/60 p-8 rounded-3xl transition-all duration-300 hover:-translate-y-2 cursor-pointer flex flex-col justify-between shadow-2xl hover:shadow-[0_12px_35px_rgba(207,157,123,0.12)] overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#CF9D7B]/5 rounded-bl-full pointer-events-none transition-all group-hover:scale-125" />
                <div className="space-y-4 relative z-10">
                  <div className="flex justify-between items-start">
                    <span className="text-xs px-3 py-1 bg-[#16232B] text-[#CF9D7B] rounded-full font-mono border border-[#CF9D7B]/20">
                      MOD-02
                    </span>
                    <ArrowUpRight className="w-5 h-5 text-gray-500 group-hover:text-[#CF9D7B] group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                  </div>
                  <h3 className="text-2xl font-serif text-white pt-2">Detective CSV</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Auditoría automatizada de transacciones históricas. Identifica productos estrella, huesos y anomalías de margen.
                  </p>
                </div>
                <div className="flex gap-2 pt-6 relative z-10">
                  <span className="text-[10px] px-2.5 py-1 bg-[#142027] text-gray-400 rounded-md border border-[#1E2D36]">Pandas</span>
                  <span className="text-[10px] px-2.5 py-1 bg-[#142027] text-gray-400 rounded-md border border-[#1E2D36]">Top 5</span>
                  <span className="text-[10px] px-2.5 py-1 bg-[#142027] text-gray-400 rounded-md border border-[#1E2D36]">FastAPI</span>
                </div>
              </div>

              <div 
                onClick={() => setActiveTab('simulador')}
                className="group relative bg-[#0E171C]/80 backdrop-blur-md border border-[#1E2D36] hover:border-[#CF9D7B]/60 p-8 rounded-3xl transition-all duration-300 hover:-translate-y-2 cursor-pointer flex flex-col justify-between shadow-2xl hover:shadow-[0_12px_35px_rgba(207,157,123,0.12)] overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#CF9D7B]/5 rounded-bl-full pointer-events-none transition-all group-hover:scale-125" />
                <div className="space-y-4 relative z-10">
                  <div className="flex justify-between items-start">
                    <span className="text-xs px-3 py-1 bg-[#16232B] text-[#CF9D7B] rounded-full font-mono border border-[#CF9D7B]/20">
                      MOD-03
                    </span>
                    <ArrowUpRight className="w-5 h-5 text-gray-500 group-hover:text-[#CF9D7B] group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                  </div>
                  <h3 className="text-2xl font-serif text-white pt-2">Mix de Marketing</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Cálculo predictivo del Costo de Adquisición de Clientes (CAC) y retorno estimado sobre pauta digital.
                  </p>
                </div>
                <div className="flex gap-2 pt-6 relative z-10">
                  <span className="text-[10px] px-2.5 py-1 bg-[#142027] text-gray-400 rounded-md border border-[#1E2D36]">Meta Ads</span>
                  <span className="text-[10px] px-2.5 py-1 bg-[#142027] text-gray-400 rounded-md border border-[#1E2D36]">TikTok</span>
                  <span className="text-[10px] px-2.5 py-1 bg-[#142027] text-gray-400 rounded-md border border-[#1E2D36]">CAC</span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* VISTA DEL SIMULADOR ASISTIDO */}
        {activeTab === 'simulador' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            <div className="lg:col-span-5 bg-[#0E171C]/90 backdrop-blur-md border border-[#1E2D36] p-8 rounded-3xl space-y-6 shadow-2xl">
              <div>
                <span className="text-xs text-[#CF9D7B] font-semibold tracking-wider uppercase">Parámetros Base</span>
                <h2 className="text-2xl font-serif text-white mt-1">Configuración</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400">Precio Actual ($ COP)</label>
                  <input 
                    type="number" 
                    value={precioOriginal}
                    onChange={(e) => setPrecioOriginal(Number(e.target.value))}
                    className="w-full bg-[#142027] border border-[#243540] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#CF9D7B] mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400">Nuevo Precio Simulado ($ COP)</label>
                  <input 
                    type="number" 
                    value={nuevoPrecio}
                    onChange={(e) => setNuevoPrecio(Number(e.target.value))}
                    className="w-full bg-[#142027] border border-[#243540] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#CF9D7B] mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400">Costo Unitario ($ COP)</label>
                  <input 
                    type="number" 
                    value={costoUnitario}
                    onChange={(e) => setCostoUnitario(Number(e.target.value))}
                    className="w-full bg-[#142027] border border-[#243540] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#CF9D7B] mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400">Unidades Históricas</label>
                  <input 
                    type="number" 
                    value={unidadesHistoricas}
                    onChange={(e) => setUnidadesHistoricas(Number(e.target.value))}
                    className="w-full bg-[#142027] border border-[#243540] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#CF9D7B] mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400">Presupuesto de Marketing ($ COP)</label>
                  <input 
                    type="number" 
                    value={presupuestoMkt}
                    onChange={(e) => setPresupuestoMkt(Number(e.target.value))}
                    className="w-full bg-[#142027] border border-[#243540] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#CF9D7B] mt-1"
                  />
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#0E171C]/90 backdrop-blur-md border border-[#1E2D36] p-6 rounded-3xl space-y-2 shadow-xl">
                  <span className="text-xs text-gray-400">Ganancia Histórica</span>
                  <div className="text-2xl font-serif text-white">
                    ${gananciaBase.toLocaleString('es-CO')}
                  </div>
                  <span className="text-[10px] text-gray-500">Sin ajustes de precio ni pauta</span>
                </div>

                <div className="bg-[#0E171C]/90 backdrop-blur-md border border-[#CF9D7B]/40 p-6 rounded-3xl space-y-2 shadow-xl shadow-[#CF9D7B]/5">
                  <span className="text-xs text-[#CF9D7B] font-medium">Ganancia Proyectada</span>
                  <div className="text-2xl font-serif text-white">
                    ${gananciaProyectada.toLocaleString('es-CO')}
                  </div>
                  <span className={`text-[11px] font-medium ${deltaGanancia >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {deltaGanancia >= 0 ? '▲ +' : '▼ -'}${Math.abs(deltaGanancia).toLocaleString('es-CO')} vs Base
                  </span>
                </div>
              </div>

              <div className="bg-[#0E171C]/90 backdrop-blur-md border border-[#1E2D36] p-6 rounded-3xl space-y-4 shadow-xl">
                <h3 className="font-serif text-lg text-white">Impacto en Adquisición de Clientes</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-[#142027] rounded-2xl border border-[#243540]/60">
                    <span className="text-[10px] text-gray-400 uppercase">CAC Estimado</span>
                    <p className="text-sm font-semibold text-white mt-1">${costoAdquisicion.toLocaleString('es-CO')}</p>
                  </div>
                  <div className="p-3 bg-[#142027] rounded-2xl border border-[#243540]/60">
                    <span className="text-[10px] text-gray-400 uppercase">Nuevos Clientes</span>
                    <p className="text-sm font-semibold text-[#CF9D7B] mt-1">+{nuevosClientes}</p>
                  </div>
                  <div className="p-3 bg-[#142027] rounded-2xl border border-[#243540]/60">
                    <span className="text-[10px] text-gray-400 uppercase">Volumen Total</span>
                    <p className="text-sm font-semibold text-white mt-1">{Math.round(unidadesTotales)} uds</p>
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
            <div className="bg-[#0E171C]/90 backdrop-blur-md border border-[#1E2D36] p-10 rounded-3xl max-w-2xl mx-auto text-center space-y-6 shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-[#142027] border border-[#243540] flex items-center justify-center mx-auto text-[#CF9D7B]">
                {cargandoCSV ? <Loader2 className="w-7 h-7 animate-spin" /> : <Upload className="w-7 h-7" />}
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-serif text-white">Auditoría Forense CSV</h2>
                <p className="text-xs text-gray-400 max-w-md mx-auto">
                  Carga tu conjunto de transacciones históricas. El motor Python auditará ingresos, márgenes y concentración de catálogo.
                </p>
              </div>

              <label className={`inline-flex items-center gap-2 px-6 py-3 bg-[#CF9D7B] text-[#0C1519] text-xs font-semibold rounded-full hover:opacity-90 transition-all cursor-pointer ${cargandoCSV ? 'opacity-50 pointer-events-none' : ''}`}>
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
                <div className="bg-[#0E171C]/90 backdrop-blur-md border border-[#CF9D7B]/40 p-6 rounded-3xl flex flex-col sm:flex-row justify-between items-center gap-4 shadow-2xl">
                  <div>
                    <h4 className="text-lg font-serif text-white">¿Listo para proyectar nuevos escenarios?</h4>
                    <p className="text-xs text-gray-400">Pasa el precio promedio (${Math.round(datosAuditoria.precio_promedio).toLocaleString('es-CO')}) y volumen histórico directamente al Modo Asistido.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button 
                      onClick={exportarPDF}
                      className="inline-flex items-center gap-2 px-5 py-3 bg-[#142027] text-[#CF9D7B] border border-[#CF9D7B]/40 text-xs font-semibold rounded-full hover:bg-[#1E2D36] transition-all cursor-pointer whitespace-nowrap"
                    >
                      <Download className="w-4 h-4" />
                      Descargar Reporte PDF
                    </button>
                    <button 
                      onClick={transferirAlSimulador}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#CF9D7B] text-[#0C1519] text-xs font-bold rounded-full hover:opacity-90 transition-all cursor-pointer whitespace-nowrap shadow-[0_0_15px_rgba(207,157,123,0.3)]"
                    >
                      <PlayCircle className="w-4 h-4" />
                      Simular con estos datos
                    </button>
                  </div>
                </div>

                {/* Métricas Generales */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="bg-[#0E171C]/90 backdrop-blur-md border border-[#1E2D36] p-5 rounded-2xl">
                    <span className="text-xs text-gray-400">Total Registros</span>
                    <p className="text-xl font-serif text-white mt-1">{datosAuditoria.total_registros.toLocaleString('es-CO')}</p>
                  </div>
                  <div className="bg-[#0E171C]/90 backdrop-blur-md border border-[#1E2D36] p-5 rounded-2xl">
                    <span className="text-xs text-gray-400">Ventas Totales</span>
                    <p className="text-xl font-serif text-[#CF9D7B] mt-1">${datosAuditoria.ventas_historicas.toLocaleString('es-CO')}</p>
                  </div>
                  <div className="bg-[#0E171C]/90 backdrop-blur-md border border-[#1E2D36] p-5 rounded-2xl">
                    <span className="text-xs text-gray-400">Unidades Vendidas</span>
                    <p className="text-xl font-serif text-white mt-1">{datosAuditoria.unidades_historicas.toLocaleString('es-CO')}</p>
                  </div>
                  <div className="bg-[#0E171C]/90 backdrop-blur-md border border-[#1E2D36] p-5 rounded-2xl">
                    <span className="text-xs text-gray-400">Precio Promedio</span>
                    <p className="text-xl font-serif text-white mt-1">${Math.round(datosAuditoria.precio_promedio).toLocaleString('es-CO')}</p>
                  </div>
                </div>

                {/* Gráfico Top 5 de Productos */}
                {datosAuditoria.ranking_productos?.length > 0 && (
                  <div className="bg-[#0E171C]/90 backdrop-blur-md border border-[#1E2D36] p-6 md:p-8 rounded-3xl space-y-4 shadow-xl">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-xs text-[#CF9D7B] font-semibold uppercase tracking-wider">Distribución de Ingresos</span>
                        <h3 className="text-xl font-serif text-white mt-1">Top 5 Productos más Vendidos</h3>
                      </div>
                      <BarChart3 className="w-5 h-5 text-[#CF9D7B]" />
                    </div>

                    <div className="h-64 w-full pt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={datosAuditoria.ranking_productos}>
                          <XAxis dataKey="nombre" stroke="#6B7280" fontSize={12} tickLine={false} />
                          <YAxis stroke="#6B7280" fontSize={12} tickLine={false} tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#142027', borderColor: '#243540', borderRadius: '12px', color: '#FFF' }}
                            formatter={(value) => [`$${value.toLocaleString('es-CO')}`, 'Ventas']}
                          />
                          <Bar dataKey="ventas" radius={[6, 6, 0, 0]}>
                            {datosAuditoria.ranking_productos.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={index === 0 ? '#CF9D7B' : '#22333E'} />
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
                    <div className="bg-[#0E171C]/90 backdrop-blur-md border border-emerald-900/40 p-6 rounded-3xl space-y-3 shadow-xl">
                      <div className="flex items-center gap-2 text-emerald-400">
                        <Award className="w-5 h-5" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Producto Estrella (Rey)</span>
                      </div>
                      <h4 className="text-xl font-serif text-white">{datosAuditoria.diagnostico.rey.nombre}</h4>
                      <p className="text-xs text-gray-400">
                        Generó el mayor volumen de facturación con <span className="text-white font-medium">${datosAuditoria.diagnostico.rey.ventas.toLocaleString('es-CO')}</span> en ventas.
                      </p>
                    </div>

                    <div className="bg-[#0E171C]/90 backdrop-blur-md border border-rose-900/40 p-6 rounded-3xl space-y-3 shadow-xl">
                      <div className="flex items-center gap-2 text-rose-400">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Producto de Bajo Desempeño (Hueso)</span>
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

      {/* FOOTER */}
      <footer className="relative z-10 max-w-6xl mx-auto w-full pt-8 border-t border-[#1E2D36] flex flex-col sm:flex-row justify-between items-center text-xs text-gray-500 gap-4">
        <div>Plataforma Analítica SaaS • Emmanuel Tapasco</div>
        <div className="flex gap-4">
          <span className="hover:text-gray-400 cursor-pointer">Documentación</span>
          <span className="hover:text-gray-400 cursor-pointer">API Status: Online</span>
        </div>
      </footer>

    </div>
  );
}