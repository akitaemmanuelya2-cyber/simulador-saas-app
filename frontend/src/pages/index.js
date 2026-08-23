'use client';
import ModoAsistido from '../ModoAsistido';
import React, { useState, useEffect, useRef } from 'react';
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
  Sparkles,
  MessageSquare,
  X,
  Bot,
  Send
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
  const [abrirChatIA, setAbrirChatIA] = useState(false);
  const [cargandoChat, setCargandoChat] = useState(false);
  const [mensajeInput, setMensajeInput] = useState('');
  const [historialMensajes, setHistorialMensajes] = useState([]);
  
  const canvasRef = useRef(null);
  const chatRef = useRef(null);

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

  // Auto-scroll del chat al agregar mensajes
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [historialMensajes, cargandoChat, abrirChatIA]);

  // MOTOR DE MAR DE DATOS CUÁNTICO
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const cols = 45;
    const rows = 30;
    let step = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      step += 0.015;

      const fov = 350;
      const points = [];

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const xPos = (x - cols / 2) * 55;
          const zPos = (y - rows / 2) * 55 + 200;

          const distFromCenter = Math.sqrt(xPos * xPos + zPos * zPos);
          const yPos =
            Math.sin(x * 0.25 + step) * 28 +
            Math.cos(y * 0.25 + step) * 28 +
            Math.sin(distFromCenter * 0.012 - step * 2) * 45 + 160;

          const scale = fov / (fov + zPos);
          const x2d = width / 2 + xPos * scale;
          const y2d = height / 2 + yPos * scale;

          points.push({ x: x2d, y: y2d, scale, distFromCenter });
        }
      }

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const idx = y * cols + x;
          const p = points[idx];

          if (p.x < 0 || p.x > width || p.y < 0 || p.y > height) continue;

          if (x < cols - 1) {
            const right = points[idx + 1];
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(right.x, right.y);
            const alpha = Math.max(0.02, Math.min(0.35, p.scale * 0.45));
            ctx.strokeStyle = `rgba(207, 157, 123, ${alpha})`;
            ctx.lineWidth = p.scale * 1.2;
            ctx.stroke();
          }

          if (y < rows - 1) {
            const bottom = points[idx + cols];
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(bottom.x, bottom.y);
            const alpha = Math.max(0.01, Math.min(0.25, p.scale * 0.35));
            ctx.strokeStyle = `rgba(30, 75, 95, ${alpha})`;
            ctx.lineWidth = p.scale * 0.8;
            ctx.stroke();
          }

          if (x % 3 === 0 && y % 3 === 0) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(1, p.scale * 2.2), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(240, 200, 170, ${p.scale * 0.6})`;
            ctx.fill();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

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

  // Transferir datos al Simulador
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

  // Enviar consulta interactiva a Mini-TARS
  const handleEnviarMensajeChat = async (e) => {
    if (e) e.preventDefault();
    if (!mensajeInput.trim() || cargandoChat) return;

    const textoUsuario = mensajeInput.trim();
    setMensajeInput('');
    
    // Agregar el mensaje del usuario al historial
    const nuevoHistorial = [...historialMensajes, { remitente: 'usuario', texto: textoUsuario }];
    setHistorialMensajes(nuevoHistorial);
    setCargandoChat(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://simulador-saas-app.onrender.com';
      
      // Construir contexto actual del negocio para alimentar la IA
      const contextoNegocio = {
        datosAuditoria: datosAuditoria || null,
        simulador: {
          precioOriginal,
          nuevoPrecio,
          costoUnitario,
          unidadesHistoricas,
          presupuestoMkt,
          gananciaBase,
          gananciaProyectada,
          deltaGanancia,
          costoAdquisicion,
          nuevosClientes
        }
      };

      const response = await fetch(`${apiUrl}/api/tars-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensaje: textoUsuario,
          contexto: contextoNegocio
        })
      });

      if (!response.ok) throw new Error('Error en la respuesta de Mini-TARS');

      const data = await response.json();
      setHistorialMensajes([...nuevoHistorial, { remitente: 'tars', texto: data.respuesta || data.mensaje || 'Listo, analizado.' }]);
    } catch (err) {
      setHistorialMensajes([
        ...nuevoHistorial, 
        { 
          remitente: 'tars', 
          texto: 'Disculpa, tuve un microcorte con el enlace cuántico en el servidor. Verifica que la API de Render esté activa e inténtalo de nuevo.' 
        }
      ]);
    } finally {
      setCargandoChat(false);
    }
  };

  // Generador de Reporte PDF
  const exportarPDF = () => {
    try {
      if (!datosAuditoria) return;

      const doc = new jsPDF();

      doc.setFillColor(8, 12, 16);
      doc.rect(0, 0, 210, 35, 'F');

      doc.setTextColor(207, 157, 123);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('PLATAFORMA ANALÍTICA SaaS - AUDITORÍA FORENSE', 14, 18);

      doc.setTextColor(200, 205, 210);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Fecha: ${new Date().toLocaleDateString('es-CO')} | Auditor Responsable: Emmanuel Tapasco`, 14, 26);

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
        headStyles: { fillColor: [12, 18, 24], textColor: [207, 157, 123] },
        styles: { fontSize: 9, cellPadding: 4 },
      });

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
        headStyles: { fillColor: [12, 18, 24], textColor: [207, 157, 123] },
        styles: { fontSize: 9, cellPadding: 4 },
      });

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
        headStyles: { fillColor: [12, 18, 24], textColor: [207, 157, 123] },
        styles: { fontSize: 9, cellPadding: 3 },
      });

      doc.save('Reporte_Auditoria_Forense.pdf');
    } catch (error) {
      console.error('Error generando PDF:', error);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#05080A] text-[#ECEFF1] font-sans px-6 py-10 md:px-16 flex flex-col justify-between selection:bg-[#CF9D7B] selection:text-[#05080A] overflow-hidden">
      
      {/* CANVAS DINÁMICO */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 pointer-events-none z-0 opacity-80" 
      />

      {/* VÓRTICE GRAVITACIONAL */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-[#CF9D7B]/20 via-[#133040]/30 to-transparent rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="absolute -bottom-32 right-10 w-[600px] h-[600px] bg-cyan-950/20 rounded-full blur-[160px] pointer-events-none z-0" />

      {/* HEADER / NAVBAR */}
      <header className="relative z-20 flex justify-between items-center max-w-6xl mx-auto w-full pb-8 border-b border-[#141E26]/80">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setActiveTab('lobby')}>
          <div className="relative flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-[#CF9D7B] shadow-[0_0_18px_#CF9D7B]"></div>
            <div className="absolute w-5 h-5 rounded-full border border-[#CF9D7B]/40 animate-ping"></div>
          </div>
          <span className="font-semibold text-lg tracking-tight text-white uppercase">
            Simulador <span className="text-[#CF9D7B] font-mono font-normal">SaaS</span>
          </span>
        </div>

        <nav className="flex items-center gap-1.5 md:gap-2 bg-[#090F13]/85 backdrop-blur-xl p-1.5 rounded-full border border-[#182631] shadow-2xl">
          <button 
            onClick={() => setActiveTab('lobby')}
            className={`px-4 py-1.5 rounded-full text-xs tracking-wide transition-all duration-200 ${
              activeTab === 'lobby' ? 'bg-[#CF9D7B] text-[#05080A] font-semibold shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            Lobby
          </button>
          <button 
            onClick={() => setActiveTab('simulador')}
            className={`px-4 py-1.5 rounded-full text-xs tracking-wide transition-all duration-200 ${
              activeTab === 'simulador' ? 'bg-[#CF9D7B] text-[#05080A] font-semibold shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            Modo Asistido
          </button>
          <button 
            onClick={() => setActiveTab('auditoria')}
            className={`px-4 py-1.5 rounded-full text-xs tracking-wide transition-all duration-200 ${
              activeTab === 'auditoria' ? 'bg-[#CF9D7B] text-[#05080A] font-semibold shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            Detective CSV
          </button>
        </nav>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="relative z-20 max-w-6xl mx-auto w-full my-auto py-12">
        {activeTab === 'lobby' && (
          <div className="space-y-16">
            
            {/* HERO SECTION */}
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#081015]/80 backdrop-blur-md border border-[#1B2A36] text-[#CF9D7B] text-[11px] font-mono tracking-wider uppercase shadow-inner">
                <Zap className="w-3.5 h-3.5" />
                Motor de Inteligencia Cuantitativa
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight leading-tight">
                Decisiones basadas en <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#CF9D7B] via-[#E8C5AF] to-[#CF9D7B] drop-shadow-[0_0_25px_rgba(207,157,123,0.3)]">
                  datos cuantitativos reales.
                </span>
              </h1>
              <p className="text-gray-400 text-sm md:text-base leading-relaxed max-w-2xl mx-auto">
                Auditoría algorítmica de transacciones, análisis de concentración de catálogo y modelado paramétrico de elasticidad de precios.
              </p>
            </div>

            {/* MÓDULOS DE ACCESO */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div 
                onClick={() => setActiveTab('simulador')}
                className="group relative bg-[#081015]/85 backdrop-blur-xl border border-[#16222C] hover:border-[#CF9D7B]/60 p-8 rounded-2xl transition-all duration-300 hover:-translate-y-1.5 cursor-pointer flex flex-col justify-between shadow-2xl hover:shadow-[0_15px_30px_rgba(207,157,123,0.12)]"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="text-[11px] px-2.5 py-1 bg-[#0F1A22] text-[#CF9D7B] rounded-md font-mono border border-[#CF9D7B]/20">
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
                  <span className="text-[10px] font-mono px-2 py-1 bg-[#0D151B] text-gray-400 rounded border border-[#18232B]">Costos</span>
                  <span className="text-[10px] font-mono px-2 py-1 bg-[#0D151B] text-gray-400 rounded border border-[#18232B]">Margen</span>
                  <span className="text-[10px] font-mono px-2 py-1 bg-[#0D151B] text-gray-400 rounded border border-[#18232B]">Proyección</span>
                </div>
              </div>

              <div 
                onClick={() => setActiveTab('auditoria')}
                className="group relative bg-[#081015]/85 backdrop-blur-xl border border-[#16222C] hover:border-[#CF9D7B]/60 p-8 rounded-2xl transition-all duration-300 hover:-translate-y-1.5 cursor-pointer flex flex-col justify-between shadow-2xl hover:shadow-[0_15px_30px_rgba(207,157,123,0.12)]"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="text-[11px] px-2.5 py-1 bg-[#0F1A22] text-[#CF9D7B] rounded-md font-mono border border-[#CF9D7B]/20">
                      MOD-02
                    </span>
                    <ArrowUpRight className="w-5 h-5 text-gray-500 group-hover:text-[#CF9D7B] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <h3 className="text-xl font-bold text-white tracking-tight pt-1">Detective CSV</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Auditoría automatizada de transacciones históricas. Identifica productos estrella, concentración de ingresos y anomalías con Pandas.
                  </p>
                </div>
                <div className="flex gap-2 pt-6">
                  <span className="text-[10px] font-mono px-2 py-1 bg-[#0D151B] text-gray-400 rounded border border-[#18232B]">Pandas</span>
                  <span className="text-[10px] font-mono px-2 py-1 bg-[#0D151B] text-gray-400 rounded border border-[#18232B]">Top 5</span>
                  <span className="text-[10px] font-mono px-2 py-1 bg-[#0D151B] text-gray-400 rounded border border-[#18232B]">FastAPI</span>
                </div>
              </div>

              <div 
                onClick={() => setActiveTab('simulador')}
                className="group relative bg-[#081015]/85 backdrop-blur-xl border border-[#16222C] hover:border-[#CF9D7B]/60 p-8 rounded-2xl transition-all duration-300 hover:-translate-y-1.5 cursor-pointer flex flex-col justify-between shadow-2xl hover:shadow-[0_15px_30px_rgba(207,157,123,0.12)]"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="text-[11px] px-2.5 py-1 bg-[#0F1A22] text-[#CF9D7B] rounded-md font-mono border border-[#CF9D7B]/20">
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
                  <span className="text-[10px] font-mono px-2 py-1 bg-[#0D151B] text-gray-400 rounded border border-[#18232B]">Meta Ads</span>
                  <span className="text-[10px] font-mono px-2 py-1 bg-[#0D151B] text-gray-400 rounded border border-[#18232B]">Google Ads</span>
                  <span className="text-[10px] font-mono px-2 py-1 bg-[#0D151B] text-gray-400 rounded border border-[#18232B]">CAC</span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* VISTA DEL SIMULADOR ASISTIDO */}
        {activeTab === 'simulador' && (
          <ModoAsistido 
          onVolverHome={() => setActiveTab('lobby')}
          onProcesarDatos={(datos) => {
            const totalVentas = datos.reduce((acc, d) => acc + (d.cantidad * d.precio), 0);
            const totalUnidades = datos.reduce((acc, d) => acc + d.cantidad, 0);
            const precioPromedio = totalUnidades > 0 ? (totalVentas / totalUnidades) : 0;
            
            const ranking = datos.map(d => ({
              nombre: d.producto,
              ventas: d.cantidad * d.precio
            })).sort((a, b) => b.ventas - a.ventas);

            const nuevoReporte = {
              total_registros: datos.length,
              ventas_historicas: totalVentas,
              unidades_historicas: totalUnidades,
              precio_promedio: precioPromedio,
              ranking_productos: ranking.slice(0, 5),
              diagnostico: {
                rey: ranking[0] || { nombre: 'N/A', ventas: 0 },
                hueso: ranking[ranking.length - 1] || { nombre: 'N/A', ventas: 0 }
              }
            };

            if (typeof setAuditData === 'function') setAuditData(nuevoReporte);
            if (typeof setReporteAuditoria === 'function') setReporteAuditoria(nuevoReporte);

            setActiveTab('auditoria');
          }}
        />
      )}

      {/* VISTA DEL SIMULADOR ASISTIDO */}
      {activeTab === 'simulador' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            <div className="lg:col-span-5 bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-8 rounded-2xl space-y-6 shadow-2xl">
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
                    className="w-full bg-[#0D151B] border border-[#18232B] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#CF9D7B] mt-1 transition-colors font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400">Nuevo Precio Simulado ($ COP)</label>
                  <input 
                    type="number" 
                    value={nuevoPrecio}
                    onChange={(e) => setNuevoPrecio(Number(e.target.value))}
                    className="w-full bg-[#0D151B] border border-[#18232B] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#CF9D7B] mt-1 transition-colors font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400">Costo Unitario ($ COP)</label>
                  <input 
                    type="number" 
                    value={costoUnitario}
                    onChange={(e) => setCostoUnitario(Number(e.target.value))}
                    className="w-full bg-[#0D151B] border border-[#18232B] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#CF9D7B] mt-1 transition-colors font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400">Unidades Históricas</label>
                  <input 
                    type="number" 
                    value={unidadesHistoricas}
                    onChange={(e) => setUnidadesHistoricas(Number(e.target.value))}
                    className="w-full bg-[#0D151B] border border-[#18232B] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#CF9D7B] mt-1 transition-colors font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400">Presupuesto de Marketing ($ COP)</label>
                  <input 
                    type="number" 
                    value={presupuestoMkt}
                    onChange={(e) => setPresupuestoMkt(Number(e.target.value))}
                    className="w-full bg-[#0D151B] border border-[#18232B] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#CF9D7B] mt-1 transition-colors font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-6 rounded-2xl space-y-2 shadow-xl">
                  <span className="text-xs text-gray-400 font-mono uppercase tracking-wider">Ganancia Histórica</span>
                  <div className="text-3xl font-bold text-white tracking-tight font-mono">
                    ${gananciaBase.toLocaleString('es-CO')}
                  </div>
                  <span className="text-[10px] text-gray-500">Línea base sin modificaciones</span>
                </div>

                <div className="bg-[#081015]/90 backdrop-blur-xl border border-[#CF9D7B]/40 p-6 rounded-2xl space-y-2 shadow-xl shadow-[#CF9D7B]/5">
                  <span className="text-xs text-[#CF9D7B] font-mono uppercase tracking-wider font-semibold">Ganancia Proyectada</span>
                  <div className="text-3xl font-bold text-white tracking-tight font-mono">
                    ${gananciaProyectada.toLocaleString('es-CO')}
                  </div>
                  <span className={`text-[11px] font-mono font-medium ${deltaGanancia >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {deltaGanancia >= 0 ? '▲ +' : '▼ -'}${Math.abs(deltaGanancia).toLocaleString('es-CO')} vs Base
                  </span>
                </div>
              </div>

              <div className="bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-6 rounded-2xl space-y-4 shadow-xl">
                <h3 className="text-lg font-bold text-white tracking-tight">Impacto en Adquisición de Clientes</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 bg-[#0D151B] rounded-xl border border-[#18232B]">
                    <span className="text-[10px] text-gray-400 uppercase font-mono">CAC Estimado</span>
                    <p className="text-base font-bold text-white mt-1 font-mono">${costoAdquisicion.toLocaleString('es-CO')}</p>
                  </div>
                  <div className="p-4 bg-[#0D151B] rounded-xl border border-[#18232B]">
                    <span className="text-[10px] text-gray-400 uppercase font-mono">Nuevos Clientes</span>
                    <p className="text-base font-bold text-[#CF9D7B] mt-1 font-mono">+{nuevosClientes}</p>
                  </div>
                  <div className="p-4 bg-[#0D151B] rounded-xl border border-[#18232B]">
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
            <div className="bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-10 rounded-2xl max-w-2xl mx-auto text-center space-y-6 shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-[#0D151B] border border-[#CF9D7B]/30 flex items-center justify-center mx-auto text-[#CF9D7B] shadow-[0_0_20px_rgba(207,157,123,0.15)]">
                {cargandoCSV ? <Loader2 className="w-7 h-7 animate-spin" /> : <Upload className="w-7 h-7" />}
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white tracking-tight">Auditoría Forense CSV</h2>
                <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
                  Carga tu conjunto de transacciones históricas. El motor Python auditará ingresos, márgenes y concentración de catálogo.
                </p>
              </div>

              <label className={`inline-flex items-center gap-2 px-7 py-3 bg-[#CF9D7B] text-[#05080A] text-xs font-bold uppercase tracking-wider rounded-full hover:shadow-[0_0_20px_rgba(207,157,123,0.4)] transition-all cursor-pointer ${cargandoCSV ? 'opacity-50 pointer-events-none' : ''}`}>
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
                <div className="bg-[#081015]/90 backdrop-blur-xl border border-[#CF9D7B]/40 p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4 shadow-2xl">
                  <div>
                    <h4 className="text-lg font-bold text-white tracking-tight">¿Listo para proyectar nuevos escenarios?</h4>
                    <p className="text-xs text-gray-400">Pasa el precio promedio (${Math.round(datosAuditoria.precio_promedio).toLocaleString('es-CO')}) y volumen histórico al Simulador.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button 
                      onClick={exportarPDF}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0D151B] text-[#CF9D7B] border border-[#CF9D7B]/40 text-xs font-semibold rounded-full hover:bg-[#16222C] transition-all cursor-pointer whitespace-nowrap"
                    >
                      <Download className="w-4 h-4" />
                      Descargar Reporte PDF
                    </button>
                    <button 
                      onClick={transferirAlSimulador}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#CF9D7B] text-[#05080A] text-xs font-bold rounded-full hover:shadow-[0_0_15px_rgba(207,157,123,0.4)] transition-all cursor-pointer whitespace-nowrap"
                    >
                      <PlayCircle className="w-4 h-4" />
                      Simular con estos datos
                    </button>
                  </div>
                </div>

                {/* Métricas Generales */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-5 rounded-2xl">
                    <span className="text-xs text-gray-400 font-mono uppercase">Total Registros</span>
                    <p className="text-2xl font-bold text-white mt-1 font-mono">{datosAuditoria.total_registros.toLocaleString('es-CO')}</p>
                  </div>
                  <div className="bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-5 rounded-2xl">
                    <span className="text-xs text-gray-400 font-mono uppercase">Ventas Totales</span>
                    <p className="text-2xl font-bold text-[#CF9D7B] mt-1 font-mono">${datosAuditoria.ventas_historicas.toLocaleString('es-CO')}</p>
                  </div>
                  <div className="bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-5 rounded-2xl">
                    <span className="text-xs text-gray-400 font-mono uppercase">Unidades Vendidas</span>
                    <p className="text-2xl font-bold text-white mt-1 font-mono">{datosAuditoria.unidades_historicas.toLocaleString('es-CO')}</p>
                  </div>
                  <div className="bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-5 rounded-2xl">
                    <span className="text-xs text-gray-400 font-mono uppercase">Precio Promedio</span>
                    <p className="text-2xl font-bold text-white mt-1 font-mono">${Math.round(datosAuditoria.precio_promedio).toLocaleString('es-CO')}</p>
                  </div>
                </div>

                {/* Gráfico Recharts */}
                {datosAuditoria.ranking_productos?.length > 0 && (
                  <div className="bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-6 md:p-8 rounded-2xl space-y-4 shadow-2xl relative overflow-hidden">
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
                            cursor={{ fill: 'rgba(207, 157, 123, 0.08)' }}
                            contentStyle={{ 
                              backgroundColor: '#0D161C', 
                              border: '1px solid rgba(207, 157, 123, 0.6)', 
                              borderRadius: '12px', 
                              padding: '10px 14px',
                              boxShadow: '0 12px 30px rgba(0,0,0,0.85)'
                            }}
                            labelStyle={{
                              color: '#FFFFFF',
                              fontWeight: '700',
                              fontSize: '13px',
                              marginBottom: '4px',
                              fontFamily: 'monospace'
                            }}
                            itemStyle={{
                              color: '#CF9D7B',
                              fontWeight: '600',
                              fontSize: '12px',
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
                    <div className="bg-[#081015]/90 backdrop-blur-xl border border-emerald-900/40 p-6 rounded-2xl space-y-3 shadow-xl">
                      <div className="flex items-center gap-2 text-emerald-400">
                        <Award className="w-5 h-5" />
                        <span className="text-xs font-semibold uppercase tracking-wider font-mono">Producto Estrella (Líder)</span>
                      </div>
                      <h4 className="text-xl font-bold text-white tracking-tight">{datosAuditoria.diagnostico.rey.nombre}</h4>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        Generó el mayor volumen de facturación con <span className="text-white font-mono font-medium">${datosAuditoria.diagnostico.rey.ventas.toLocaleString('es-CO')}</span> en ventas.
                      </p>
                    </div>

                    <div className="bg-[#081015]/90 backdrop-blur-xl border border-rose-900/40 p-6 rounded-2xl space-y-3 shadow-xl">
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
      {/* 🤖 WIDGET FLOTANTE INTERACTIVO MINI-TARS */}
      {/* ============================================================ */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        
        {/* Panel de Diálogo de Mini-TARS */}
        {abrirChatIA && (
          <div className="w-80 sm:w-96 bg-[#081015]/95 backdrop-blur-2xl border border-[#CF9D7B]/50 rounded-2xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.85)] animate-fadeIn flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1A2630]">
              <div className="flex items-center gap-2.5">
                <div className={`w-2.5 h-2.5 rounded-full ${cargandoChat ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Mini-TARS // Copiloto AI</h4>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {cargandoChat ? 'Analizando escenarios...' : 'Socio Analítico Activo'}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setAbrirChatIA(false)}
                className="text-gray-400 hover:text-white transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Historial de Chat Dinámico */}
            <div ref={chatRef} className="space-y-3.5 text-xs font-mono leading-relaxed max-h-64 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-[#1D2B36] scrollbar-track-transparent">
              
              {/* Mensaje de Bienvenida Inicial */}
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-[#0E171E] border border-[#1D2B36] flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5 text-[#CF9D7B]" />
                </div>
                <div className="bg-[#0E171E] p-3 rounded-r-xl rounded-bl-xl border border-[#1D2B36] text-gray-300">
                  <p className="text-[#CF9D7B] font-semibold text-[11px] mb-1">⚡ Diagnóstico Inicial:</p>
                  {datosAuditoria ? (
                    <p>
                      Estimado(a) empresario(a), cargaste una base de datos con {datosAuditoria.total_registros} registros. He detectado que tu producto estrella es '{datosAuditoria.diagnostico?.rey?.nombre}' con facturación total de ${datosAuditoria.diagnostico?.rey?.ventas?.toLocaleString('es-CO')} COP. Por otro lado, tu producto más lento es '{datosAuditoria.diagnostico?.hueso?.nombre}' con ${datosAuditoria.diagnostico?.hueso?.ventas?.toLocaleString('es-CO')} COP. ¿Qué estrategia o duda analítica quieres consultar hoy?
                    </p>
                  ) : (
                    <p>
                      ¡Hola! Estimado(a) empresario(a), aún no tenemos datos cargados en el sistema. Puedes subir tu archivo CSV en el <em>Detective CSV</em> o proyectar escenarios en el <em>Modo Asistido</em>. Estoy a tu disposición para analizar márgenes, rentabilidad y adquisición de clientes con franqueza. ¿Por dónde empezamos?
                    </p>
                  )}
                </div>
              </div>

              {/* Mensajes del Historial */}
              {historialMensajes.map((msg, index) => (
                <div 
                  key={index} 
                  className={`flex items-start gap-2.5 ${msg.remitente === 'usuario' ? 'flex-row-reverse' : ''}`}
                >
                  {msg.remitente === 'tars' ? (
                    <div className="w-6 h-6 rounded-lg bg-[#0E171E] border border-[#1D2B36] flex items-center justify-center flex-shrink-0">
                      <Bot className="w-3.5 h-3.5 text-[#CF9D7B]" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-lg bg-[#CF9D7B]/20 border border-[#CF9D7B]/40 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-[#CF9D7B]">
                      TÚ
                    </div>
                  )}

                  <div 
                    className={`p-3 rounded-xl max-w-[80%] ${
                      msg.remitente === 'usuario'
                        ? 'bg-[#CF9D7B] text-[#05080A] rounded-tr-none font-medium'
                        : 'bg-[#0E171E] text-gray-300 border border-[#1D2B36] rounded-tl-none'
                    }`}
                  >
                    <p>{msg.texto}</p>
                  </div>
                </div>
              ))}

              {/* Indicador de pensamiento de IA */}
              {cargandoChat && (
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-[#0E171E] border border-[#1D2B36] flex items-center justify-center flex-shrink-0">
                    <Loader2 className="w-3.5 h-3.5 text-[#CF9D7B] animate-spin" />
                  </div>
                  <div className="bg-[#0E171E] p-3 rounded-r-xl rounded-bl-xl border border-[#1D2B36] text-gray-400 text-[11px] italic">
                    Mini-TARS está calculando escenarios...
                  </div>
                </div>
              )}

            </div>

            {/* Input y Botón de Enviar (Interactivos con Formulario) */}
            <form onSubmit={handleEnviarMensajeChat} className="pt-2 border-t border-[#1A2630] flex gap-2">
              <input 
                type="text" 
                value={mensajeInput}
                onChange={(e) => setMensajeInput(e.target.value)}
                placeholder="Preguntar a Mini-TARS..." 
                disabled={cargandoChat}
                className="w-full bg-[#0E171E] border border-[#1D2B36] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#CF9D7B] font-mono disabled:opacity-50"
              />
              <button 
                type="submit"
                disabled={cargandoChat || !mensajeInput.trim()}
                className={`px-3 py-2 bg-[#CF9D7B] text-[#05080A] rounded-xl text-xs font-bold font-mono hover:opacity-90 transition-opacity flex items-center gap-1.5 ${
                  cargandoChat || !mensajeInput.trim() ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                {cargandoChat ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : 'Enviar'}
              </button>
            </form>
          </div>
        )}

        {/* Botón flotante con animación orbital */}
        <button
          onClick={() => setAbrirChatIA(!abrirChatIA)}
          className="group relative flex items-center justify-center w-14 h-14 rounded-2xl bg-[#090F14]/90 backdrop-blur-xl border border-[#CF9D7B]/60 shadow-[0_0_25px_rgba(207,157,123,0.35)] hover:shadow-[0_0_35px_rgba(207,157,123,0.6)] transition-all duration-300 hover:scale-110 cursor-pointer"
        >
          <span className="absolute inset-0 rounded-2xl border border-[#CF9D7B]/50 animate-ping opacity-40 pointer-events-none"></span>
          <Bot className="w-7 h-7 text-[#CF9D7B] group-hover:rotate-12 transition-transform duration-300" />
          <span className={`absolute -top-1 -right-1 w-3.5 h-3.5 border-2 border-[#05080A] rounded-full ${cargandoChat ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></span>
        </button>
      </div>

    </div>
  );
}