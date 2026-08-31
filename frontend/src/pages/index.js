'use client';
import ModoAsistido from '../ModoAsistido';
import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'framer-motion';
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
  CartesianGrid,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
  Legend,
} from 'recharts';

export default function Home() {
  const [activeTab, setActiveTab] = useState('lobby');
  const [abrirChatIA, setAbrirChatIA] = useState(false);
  const [cargandoChat, setCargandoChat] = useState(false);
  const [animacionTarsCompletada, setAnimacionTarsCompletada] = useState(false);
  const [mensajeInput, setMensajeInput] = useState('');
  const [historialMensajes, setHistorialMensajes] = useState([]);
  const [moneda, setMoneda] = useState('COP');

  // Tasas de cambio (Base: 1 USD)
  const TASAS_CAMBIO = {
    USD: 1,
    COP: 3300, // 1 USD = 3.300 COP
    EUR: 0.92  // 1 USD = 0.92 EUR
  };

  // 1. Formateador con conversión (Para Detective CSV y datos en USD)
  const formatearDinero = (valor) => {
    const num = Number(valor) || 0;
    const valorConvertido = num * TASAS_CAMBIO[moneda];

    if (moneda === 'COP') {
      return new Intl.NumberFormat('es-CO', { 
        style: 'currency', 
        currency: 'COP', 
        maximumFractionDigits: 0 
      }).format(valorConvertido);
    } else if (moneda === 'USD') {
      return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD', 
        minimumFractionDigits: 2 
      }).format(valorConvertido);
    } else if (moneda === 'EUR') {
      return new Intl.NumberFormat('de-DE', { 
        style: 'currency', 
        currency: 'EUR', 
        minimumFractionDigits: 2 
      }).format(valorConvertido);
    }
    return `$ ${valorConvertido.toLocaleString()}`;
  };

  // 2. Formateador directo sin conversión (Para el Simulador y entradas manuales)
  const formatearDineroDirecto = (valor) => {
    const num = Number(valor) || 0;
    if (moneda === 'COP') {
      return new Intl.NumberFormat('es-CO', { 
        style: 'currency', 
        currency: 'COP', 
        maximumFractionDigits: 0 
      }).format(num);
    } else if (moneda === 'USD') {
      return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD', 
        minimumFractionDigits: 2 
      }).format(num);
    } else if (moneda === 'EUR') {
      return new Intl.NumberFormat('de-DE', { 
        style: 'currency', 
        currency: 'EUR', 
        minimumFractionDigits: 2 
      }).format(num);
    }
    return `$ ${num.toLocaleString()}`;
  };

  const canvasRef = useRef(null);
  const chatRef = useRef(null);

  // Estados del Detective CSV
  const [cargandoCSV, setCargandoCSV] = useState(false);
  const [datosAuditoria, setDatosAuditoria] = useState(null);
  const [errorCSV, setErrorCSV] = useState(null);
  
  // Selector para Análisis Profundo (Top 10)
  const [criterioAnalisis, setCriterioAnalisis] = useState('unidades'); // 'unidades' | 'facturacion' | 'clientes'

  // Paleta cromática exclusiva de alto contraste (Cyber-Slate Edition)
  const PALETA_COLORES = [
    '#38BDF8', // Cyan Eléctrico
    '#F472B6', // Rosa Neón / Fucsia
    '#34D399', // Menta Esmeralda
    '#FBBF24', // Ámbar Solar
    '#A78BFA', // Violeta Astral
    '#FB923C', // Naranja Mandarina
    '#2DD4BF', // Turquesa Glaciar
    '#E879F9', // Orquídea Neón
    '#4ADE80', // Lima Brillante
    '#60A5FA', // Azul Cobalto
    '#F87171', // Coral Fuego
    '#94A3B8'  // Acero Refinado
  ];

  // Estados del Simulador Temporal y Metas
  const [precioOriginal, setPrecioOriginal] = useState(10000);
  const [nuevoPrecio, setNuevoPrecio] = useState(15000);
  const [costoUnitario, setCostoUnitario] = useState(5000);
  const [ventasPorDia, setVentasPorDia] = useState(20);
  const [mesesProyeccion, setMesesProyeccion] = useState(2);
  const [metaIngreso, setMetaIngreso] = useState(5000000);

  // Factor de conversión monetaria reactiva
  const factorConversion = (typeof moneda !== 'undefined' && moneda === 'COP') ? 3300 : 1;

  // 1. Datos para la Matriz BCG (Rentabilidad vs Rotación)
  const datosMatrizBCG = React.useMemo(() => {
    const filas = datosAuditoria?.filas || datosAuditoria?.raw_data || datosAuditoria?.data || [];
    if (!Array.isArray(filas) || filas.length === 0) {
      if (datosAuditoria?.ranking_productos && Array.isArray(datosAuditoria.ranking_productos)) {
        return datosAuditoria.ranking_productos.map((p, idx) => ({
          nombre: p.nombre || p.producto,
          unidades: p.unidades || p.cantidad || (idx + 2),
          ventas: (parseFloat(p.ventas || p.total) || 0) * factorConversion,
          color: PALETA_COLORES[idx % PALETA_COLORES.length]
        }));
      }
      return [];
    }

    const mapaProductos = {};
    filas.forEach((fila) => {
      const claveProd = Object.keys(fila).find(k => {
        const norm = k.toLowerCase().trim().replace(/[\s_-]/g, '');
        return norm === 'productname' || norm === 'producto' || norm === 'articulo';
      });
      const claveVenta = Object.keys(fila).find(k => {
        const norm = k.toLowerCase().trim().replace(/[\s_-]/g, '');
        return norm === 'sales' || norm === 'ventas' || norm === 'total';
      });

      if (claveProd && fila[claveProd]) {
        const nombre = String(fila[claveProd]).trim();
        const venta = parseFloat(fila[claveVenta || 'Sales']) || 0;
        if (!mapaProductos[nombre]) {
          mapaProductos[nombre] = { nombre, unidades: 0, ventas: 0 };
        }
        mapaProductos[nombre].unidades += 1;
        mapaProductos[nombre].ventas += (venta * factorConversion);
      }
    });

    return Object.values(mapaProductos)
      .sort((a, b) => b.ventas - a.ventas)
      .slice(0, 10)
      .map((item, idx) => ({
        ...item,
        color: PALETA_COLORES[idx % PALETA_COLORES.length]
      }));
  }, [datosAuditoria, factorConversion]);

  // 2. Colecciones dinámicas para Análisis Profundo (Top 10)
  const top10ProductosUnidades = React.useMemo(() => {
    return [...datosMatrizBCG].sort((a, b) => b.unidades - a.unidades).slice(0, 10);
  }, [datosMatrizBCG]);

  const top10ProductosFacturacion = React.useMemo(() => {
    return [...datosMatrizBCG].sort((a, b) => b.ventas - a.ventas).slice(0, 10);
  }, [datosMatrizBCG]);

  const top10Clientes = React.useMemo(() => {
    const filas = datosAuditoria?.filas || datosAuditoria?.raw_data || datosAuditoria?.data || [];
    if (!Array.isArray(filas) || filas.length === 0) {
      if (datosAuditoria?.ranking_clientes && Array.isArray(datosAuditoria.ranking_clientes)) {
        return datosAuditoria.ranking_clientes.map((c, idx) => ({
          nombre: c.nombre || c.cliente || c['Customer Name'] || 'Cliente',
          ventas: (parseFloat(c.ventas || c.total || c.Sales) || 0) * factorConversion,
          color: PALETA_COLORES[idx % PALETA_COLORES.length]
        })).slice(0, 10);
      }
      return [];
    }

    const mapaClientes = {};
    let hayColumna = false;

    filas.forEach((fila) => {
      const claveCli = Object.keys(fila).find(k => {
        const norm = k.toLowerCase().trim().replace(/[\s_-]/g, '');
        return norm === 'customername' || norm === 'cliente' || norm === 'nombrecliente' || norm === 'customer';
      });
      const claveVenta = Object.keys(fila).find(k => {
        const norm = k.toLowerCase().trim().replace(/[\s_-]/g, '');
        return norm === 'sales' || norm === 'ventas' || norm === 'total';
      });

      if (claveCli && fila[claveCli]) {
        hayColumna = true;
        const nombre = String(fila[claveCli]).trim();
        const venta = parseFloat(fila[claveVenta || 'Sales']) || 0;
        mapaClientes[nombre] = (mapaClientes[nombre] || 0) + (venta * factorConversion);
      }
    });

    if (!hayColumna) return [];

    return Object.entries(mapaClientes)
      .map(([nombre, ventas], idx) => ({
        nombre,
        ventas,
        color: PALETA_COLORES[idx % PALETA_COLORES.length]
      }))
      .sort((a, b) => b.ventas - a.ventas)
      .slice(0, 10);
  }, [datosAuditoria, factorConversion]);

  const tieneClientes = top10Clientes.length > 0;

  // --- MATEMÁTICAS DEL SIMULADOR TEMPORAL, METAS Y GRÁFICOS ---
  const margenUnitarioActual = Math.max(0, precioOriginal - costoUnitario);
  const margenUnitarioSimulado = Math.max(0, nuevoPrecio - costoUnitario);

  // 1. Ritmo Diario
  const gananciaDiariaActual = ventasPorDia * margenUnitarioActual;
  const gananciaDiariaSimulada = ventasPorDia * margenUnitarioSimulado;
  const ventasDiariasSimuladas = ventasPorDia * nuevoPrecio;

  // 2. Proyección por Meses (30 días por mes comercial)
  const mesesValidos = Math.max(1, mesesProyeccion);
  const diasTotalesPeriodo = mesesValidos * 30;
  const unidadesTotalesPeriodo = ventasPorDia * diasTotalesPeriodo;
  const facturacionTotalPeriodo = unidadesTotalesPeriodo * nuevoPrecio;
  const gananciaTotalPeriodo = unidadesTotalesPeriodo * margenUnitarioSimulado;
  const gananciaBasePeriodo = unidadesTotalesPeriodo * margenUnitarioActual;
  const deltaPeriodo = gananciaTotalPeriodo - gananciaBasePeriodo;

  // 3. Calculadora de Meta
  const unidadesParaMeta = margenUnitarioSimulado > 0 ? Math.ceil(metaIngreso / margenUnitarioSimulado) : 0;
  const diasParaMeta = ventasPorDia > 0 ? (unidadesParaMeta / ventasPorDia).toFixed(1) : 0;
  const cumpleMetaEnPeriodo = diasParaMeta <= diasTotalesPeriodo;

  // 4. Datos para el Gráfico Comparativo Mes a Mes
  const datosGraficoSimulacion = Array.from({ length: mesesValidos }, (_, i) => {
    const mesNum = i + 1;
    const unidadesMes = ventasPorDia * (mesNum * 30);
    return {
      periodo: `Mes ${mesNum}`,
      actual: unidadesMes * margenUnitarioActual,
      simulado: unidadesMes * margenUnitarioSimulado
    };
  });

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
      const response = await fetch("https://simulador-saas-app.onrender.com/api/auditar-csv", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Error al procesar el archivo");
      }

      setDatosAuditoria(data);
    } catch (err) {
      setErrorCSV(err.message || "Error al conectar con el servidor.");
    } finally {
      setCargandoCSV(false);
    }
  };

  // Transferir datos al Simulador (Actualizado a ventas por día)
  const transferirAlSimulador = () => {
    if (!datosAuditoria) return;
    const precio = Math.round(datosAuditoria.precio_promedio) || 50000;
    const unidades = Math.round(datosAuditoria.unidades_historicas) || 100;

    setPrecioOriginal(precio);
    setNuevoPrecio(Math.round(precio * 1.10));
    setCostoUnitario(Math.round(precio * 0.50));
    setVentasPorDia(Math.max(1, Math.round(unidades / 30)));
    setMesesProyeccion(2);
    setActiveTab('simulador');
  };

  // Enviar consulta interactiva a Mini-TARS vía API Route interna
  const handleEnviarMensajeChat = async (e) => {
    if (e) e.preventDefault();
    if (!mensajeInput.trim() || cargandoChat) return;

    const textoUsuario = mensajeInput.trim();
    setMensajeInput('');

    const nuevoHistorial = [...historialMensajes, { remitente: 'usuario', texto: textoUsuario }];
    setHistorialMensajes(nuevoHistorial);
    setCargandoChat(true);

    try {
      const contextoNegocio = {
        monedaActiva: moneda,
        datosAuditoria: datosAuditoria || null,
        simulador: {
          precioOriginal,
          nuevoPrecio,
          costoUnitario,
          ventasPorDia,
          mesesProyeccion,
          metaIngreso,
          gananciaTotalPeriodo,
          margenUnitarioSimulado
        }
      };

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensaje: textoUsuario,
          contexto: contextoNegocio
        })
      });

      const data = await res.json();

      if (data.respuesta) {
        setHistorialMensajes(prev => [...prev, { remitente: 'tars', texto: data.respuesta }]);
      } else {
        setHistorialMensajes(prev => [...prev, { 
          remitente: 'tars', 
          texto: 'No pude obtener una respuesta válida. Revisa la configuración de la clave de Gemini.' 
        }]);
      }
    } catch (error) {
      console.error('Error comunicando con Mini-TARS:', error);
      setHistorialMensajes(prev => [...prev, { 
        remitente: 'tars', 
        texto: 'Hubo un error de conexión al consultar con Mini-TARS.' 
      }]);
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
      doc.text(`Fecha: ${new Date().toLocaleDateString('es-CO')} | Divisa: ${moneda} | Auditor Responsable: Emmanuel Tapasco`, 14, 26);

      doc.setTextColor(20, 30, 40);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('1. MÉTRICAS CLAVE DE RENDIMIENTO', 14, 48);

      const metricasData = [
        ['Total Registros Procesados', datosAuditoria.total_registros.toLocaleString('es-CO')],
        ['Facturación Total Acumulada', formatearDinero(datosAuditoria.ventas_historicas)],
        ['Unidades Vendidas', datosAuditoria.unidades_historicas.toLocaleString('es-CO')],
        ['Precio Promedio Ponderado', formatearDinero(datosAuditoria.precio_promedio)],
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
        ['Producto Estrella (Líder)', datosAuditoria.diagnostico?.rey?.nombre || 'N/A', formatearDinero(datosAuditoria.diagnostico?.rey?.ventas || 0)],
        ['Producto Crítico (Bajo Desempeño)', datosAuditoria.diagnostico?.hueso?.nombre || 'N/A', formatearDinero(datosAuditoria.diagnostico?.hueso?.ventas || 0)],
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
        formatearDinero(item.ventas),
      ]);

      autoTable(doc, {
        startY: rankingStartY + 5,
        head: [['Posición', 'Producto', 'Ventas']],
        body: rankingData,
        theme: 'striped',
        headStyles: { fillColor: [12, 18, 24], textColor: [207, 157, 123] },
        styles: { fontSize: 9, cellPadding: 3 },
      });

      if (historialMensajes && historialMensajes.length > 0) {
        let posY = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 14 : 200;

        if (posY > 240) {
          doc.addPage();
          posY = 20;
        }

        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text("4. BITÁCORA ESTRATÉGICA & DIÁLOGO CON COPILOTO AI (MINI TARS)", 14, posY);
        posY += 8;

        historialMensajes.forEach((msg) => {
          const esUsuario = msg.remitente === 'usuario';
          const emisor = esUsuario ? "USUARIO" : "MINI TARS";
          
          const textoLimpio = (typeof msg.texto === 'string' ? msg.texto : '')
            .replace(/\*\*/g, '')
            .replace(/\*/g, '');

          const lineasTexto = doc.splitTextToSize(textoLimpio, 175);
          const alturaBloque = lineasTexto.length * 4.5 + 8;

          if (posY + alturaBloque > 280) {
            doc.addPage();
            posY = 20;
          }

          doc.setFontSize(8.5);
          doc.setFont("helvetica", "bold");
          if (esUsuario) {
            doc.setTextColor(207, 157, 123);
          } else {
            doc.setTextColor(51, 65, 85);
          }
          doc.text(`[${emisor}]`, 14, posY);
          posY += 4.5;

          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(71, 85, 105);
          doc.text(lineasTexto, 14, posY);

          posY += lineasTexto.length * 4.2 + 4;
        });
      }

      doc.save('Reporte_Auditoria_Forense.pdf');
    } catch (error) {
      console.error('Error generando PDF:', error);
    }
  };

return (
    <div className="relative min-h-screen bg-[#05080A] text-[#ECEFF1] font-sans px-6 py-10 md:px-16 flex flex-col justify-between selection:bg-[#CF9D7B] select-none">
      
      {/* 🌊 Olas del Mar de Datos FIJAS en toda la pantalla */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0 opacity-80"
      />

      {/* 💫 PULSO EXPANSIVO DIGITAL (Sutil al 30% y con ciclo pausado cada 40s) */}
      <div className="fixed top-[52%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0 flex items-center justify-center overflow-visible w-full h-[600px]">
        
        {/* Onda 1: Halo Cian Suave */}
        <motion.div
          initial={{ scale: 0.1, opacity: 0 }}
          animate={{
            scale: [0.1, 1.4, 2.6, 2.6],
            opacity: [0, 0.22, 0, 0],
            rotateX: 72,
          }}
          transition={{
            duration: 40,
            repeat: Infinity,
            ease: "easeOut",
            times: [0, 0.08, 0.20, 1] // La onda viaja en los primeros 8s y descansa el resto
          }}
          className="absolute w-[700px] h-[700px] rounded-full border border-[#38BDF8]/40 shadow-[0_0_25px_rgba(56,189,248,0.2)]"
        />

        {/* Onda 2: Eco Ámbar Tenue */}
        <motion.div
          initial={{ scale: 0.05, opacity: 0 }}
          animate={{
            scale: [0.05, 1.25, 2.3, 2.3],
            opacity: [0, 0.16, 0, 0],
            rotateX: 72,
          }}
          transition={{
            duration: 40,
            repeat: Infinity,
            ease: "easeOut",
            delay: 1.5,
            times: [0, 0.08, 0.20, 1]
          }}
          className="absolute w-[600px] h-[600px] rounded-full border border-[#CF9D7B]/30 shadow-[0_0_20px_rgba(207,157,123,0.15)]"
        />

        {/* Núcleo de resplandor ambiental tenue */}
        <motion.div
          animate={{
            scale: [0.9, 1.15, 0.9],
            opacity: [0.08, 0.18, 0.08]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute w-72 h-32 bg-gradient-to-r from-[#38BDF8]/15 to-[#CF9D7B]/15 rounded-full blur-[65px]"
        />
      </div>

      {/* VÓRTICE GRAVITACIONAL FIJO */}
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-[#CF9D7B]/20 via-[#133040]/30 to-transparent blur-[140px] pointer-events-none z-0" />
      <div className="fixed -bottom-32 right-10 w-[600px] h-[600px] bg-cyan-950/20 rounded-full blur-[160px] pointer-events-none z-0" />

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
            Simulador
          </button>
          
          <button 
            onClick={() => setActiveTab('asistido')}
            className={`px-4 py-1.5 rounded-full text-xs tracking-wide transition-all duration-200 ${
              activeTab === 'asistido' ? 'bg-[#CF9D7B] text-[#05080A] font-semibold shadow-md' : 'text-gray-400 hover:text-white'
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

          {/* SELECTOR DE DIVISA */}
          <div className="flex items-center gap-1 bg-[#0D151B]/80 border border-[#1E293B] p-1 rounded-full ml-2">
            {['COP', 'USD', 'EUR'].map((curr) => (
              <button
                key={curr}
                type="button"
                onClick={() => setMoneda(curr)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                  moneda === curr
                    ? 'bg-[#CF9D7B] text-[#05080A] font-semibold shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {curr === 'COP' ? '🇨🇴 COP' : curr === 'USD' ? '🇺🇸 USD' : '🇪🇺 EUR'}
              </button>
            ))}
          </div>
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
                onClick={() => setActiveTab('asistido')}
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
                    Completa manualmente tus datos o descarga la plantilla CSV para auditar tu catálogo sin depender de archivos previos.
                  </p>
                </div>
                <div className="flex gap-2 pt-6">
                  <span className="text-[10px] font-mono px-2 py-1 bg-[#0D151B] text-gray-400 rounded border border-[#18232B]">Plantilla</span>
                  <span className="text-[10px] font-mono px-2 py-1 bg-[#0D151B] text-gray-400 rounded border border-[#18232B]">Tabla</span>
                  <span className="text-[10px] font-mono px-2 py-1 bg-[#0D151B] text-gray-400 rounded border border-[#18232B]">Lienzo</span>
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
                  <h3 className="text-xl font-bold text-white tracking-tight pt-1">Simulador SaaS</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Simulación paramétrica de elasticidad de precios, estructura de costos y distribución óptima de presupuesto publicitario.
                  </p>
                </div>
                <div className="flex gap-2 pt-6">
                  <span className="text-[10px] font-mono px-2 py-1 bg-[#0D151B] text-gray-400 rounded border border-[#18232B]">Costos</span>
                  <span className="text-[10px] font-mono px-2 py-1 bg-[#0D151B] text-gray-400 rounded border border-[#18232B]">Margen</span>
                  <span className="text-[10px] font-mono px-2 py-1 bg-[#0D151B] text-gray-400 rounded border border-[#18232B]">CAC</span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* VISTA DEL MODO ASISTIDO */}
        {activeTab === 'asistido' && (
          <ModoAsistido 
            onVolverHome={() => setActiveTab('lobby')}
            moneda={moneda}
          />
        )}

        {/* VISTA DEL SIMULADOR PRO / TEMPORAL, METAS, GRÁFICOS Y DIAGNÓSTICO */}
        {activeTab === 'simulador' && (
          <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto">
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* PANEL DE CONFIGURACIÓN */}
              <div className="lg:col-span-5 bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-7 rounded-2xl space-y-5 shadow-2xl">
                <div>
                  <span className="text-[11px] text-[#CF9D7B] font-mono uppercase tracking-wider font-semibold">Parámetros Operativos</span>
                  <h2 className="text-xl font-bold text-white tracking-tight mt-0.5">Variables del Negocio</h2>
                </div>

                <div className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400">Precio Actual ({moneda})</label>
                      <input 
                        type="text" 
                        inputMode="numeric"
                        value={precioOriginal} 
                        onChange={(e) => setPrecioOriginal(Number(e.target.value.replace(/\D/g, '')) || 0)}
                        className="w-full bg-[#0D151B] border border-[#18232B] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#CF9D7B] mt-1 font-mono transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[#CF9D7B] font-medium">Nuevo Precio ({moneda})</label>
                      <input 
                        type="text" 
                        inputMode="numeric"
                        value={nuevoPrecio} 
                        onChange={(e) => setNuevoPrecio(Number(e.target.value.replace(/\D/g, '')) || 0)}
                        className="w-full bg-[#0D151B] border border-[#CF9D7B]/40 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#CF9D7B] mt-1 font-mono transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-400">Costo Unitario Proveedor ({moneda})</label>
                    <input 
                      type="text" 
                      inputMode="numeric"
                      value={costoUnitario} 
                      onChange={(e) => setCostoUnitario(Number(e.target.value.replace(/\D/g, '')) || 0)}
                      className="w-full bg-[#0D151B] border border-[#18232B] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#CF9D7B] mt-1 font-mono transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400">Ventas / Día</label>
                      <input 
                        type="text" 
                        inputMode="numeric"
                        value={ventasPorDia} 
                        onChange={(e) => setVentasPorDia(Number(e.target.value.replace(/\D/g, '')) || 0)}
                        className="w-full bg-[#0D151B] border border-[#18232B] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#CF9D7B] mt-1 font-mono transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Meses a Proyectar</label>
                      <input 
                        type="text" 
                        inputMode="numeric"
                        value={mesesProyeccion} 
                        onChange={(e) => setMesesProyeccion(Number(e.target.value.replace(/\D/g, '')) || 1)}
                        className="w-full bg-[#0D151B] border border-[#18232B] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#CF9D7B] mt-1 font-mono transition-colors"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#141F28]">
                    <label className="text-xs text-[#CF9D7B] font-medium">Meta de Ganancia Neta ({moneda})</label>
                    <input 
                      type="text" 
                      inputMode="numeric"
                      value={metaIngreso} 
                      onChange={(e) => setMetaIngreso(Number(e.target.value.replace(/\D/g, '')) || 0)}
                      className="w-full bg-[#0D151B] border border-[#CF9D7B]/30 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#CF9D7B] mt-1 font-mono transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* PANEL DE RESULTADOS Y METAS */}
              <div className="lg:col-span-7 space-y-5">
                
                {/* Ritmo Diario vs Acumulado en Meses */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-5 rounded-2xl space-y-1.5 shadow-xl">
                    <span className="text-xs text-gray-400 font-mono uppercase tracking-wider">Ganancia por Día</span>
                    <div className="text-2xl font-bold text-white tracking-tight font-mono">
                      {formatearDineroDirecto(gananciaDiariaSimulada)}
                    </div>
                    <span className="text-[11px] text-gray-400 font-mono">
                      Facturación diaria: <span className="text-white">{formatearDineroDirecto(ventasDiariasSimuladas)}</span>
                    </span>
                  </div>

                  <div className="bg-[#081015]/90 backdrop-blur-xl border border-[#CF9D7B]/40 p-5 rounded-2xl space-y-1.5 shadow-xl shadow-[#CF9D7B]/5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[#CF9D7B] font-mono uppercase tracking-wider font-semibold">
                        Ganancia en {mesesProyeccion} {mesesProyeccion === 1 ? 'Mes' : 'Meses'}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">({diasTotalesPeriodo} días)</span>
                    </div>
                    <div className="text-2xl font-bold text-[#CF9D7B] tracking-tight font-mono">
                      {formatearDineroDirecto(gananciaTotalPeriodo)}
                    </div>
                    <span className="text-[11px] font-mono text-emerald-400">
                      ▲ +{formatearDineroDirecto(deltaPeriodo)} extra vs precio base
                    </span>
                  </div>
                </div>

                {/* Balance General del Periodo */}
                <div className="bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-5 rounded-2xl space-y-3 shadow-xl">
                  <span className="text-xs text-[#CF9D7B] font-mono uppercase font-semibold">Resumen Operativo ({mesesProyeccion} {mesesProyeccion === 1 ? 'mes' : 'meses'})</span>
                  <div className="grid grid-cols-3 gap-3 pt-1 text-center font-mono">
                    <div className="p-3 bg-[#0D151B] rounded-xl border border-[#18232B]">
                      <span className="text-[10px] text-gray-400 uppercase">Unidades a Vender</span>
                      <p className="text-base font-bold text-white mt-1">{unidadesTotalesPeriodo.toLocaleString()} uds</p>
                    </div>
                    <div className="p-3 bg-[#0D151B] rounded-xl border border-[#18232B]">
                      <span className="text-[10px] text-gray-400 uppercase">Facturación Total</span>
                      <p className="text-base font-bold text-white mt-1">{formatearDineroDirecto(facturacionTotalPeriodo)}</p>
                    </div>
                    <div className="p-3 bg-[#0D151B] rounded-xl border border-[#18232B]">
                      <span className="text-[10px] text-gray-400 uppercase">Margen Unitario</span>
                      <p className="text-base font-bold text-emerald-400 mt-1">{formatearDineroDirecto(margenUnitarioSimulado)}</p>
                    </div>
                  </div>
                </div>

                {/* CALCULADORA DE META DE ADQUISICIÓN */}
                <div className="bg-[#081015]/90 backdrop-blur-xl border border-emerald-900/40 p-5 rounded-2xl space-y-2.5 shadow-xl">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-emerald-400 font-mono uppercase font-semibold">Plan de Meta Financiera</span>
                    <span className="text-xs text-gray-300 font-mono font-bold">Objetivo: {formatearDineroDirecto(metaIngreso)}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-1 font-mono">
                    <div className="p-3.5 bg-[#0D151B] rounded-xl border border-emerald-900/30">
                      <span className="text-[10px] text-gray-400 uppercase">Unidades Necesarias</span>
                      <p className="text-xl font-bold text-white mt-0.5">{unidadesParaMeta.toLocaleString()} unidades</p>
                      <span className="text-[10px] text-gray-500">Ganando {formatearDineroDirecto(margenUnitarioSimulado)} por unidad</span>
                    </div>
                    <div className="p-3.5 bg-[#0D151B] rounded-xl border border-emerald-900/30">
                      <span className="text-[10px] text-gray-400 uppercase">Tiempo Requerido</span>
                      <p className="text-xl font-bold text-emerald-400 mt-0.5">{diasParaMeta} días</p>
                      <span className="text-[10px] text-gray-500">A {ventasPorDia} unidades por día</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* SECCIÓN VISUAL: GRÁFICO COMPARATIVO Y RECOMENDACIÓN ESTRATÉGICA */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Gráfico Comparativo Acumulado */}
              <div className="lg:col-span-6 bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-6 rounded-2xl space-y-4 shadow-xl">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs text-[#CF9D7B] font-mono uppercase font-semibold">Evolución Acumulada</span>
                    <h4 className="text-base font-bold text-white">Precio Base vs. Precio Simulado</h4>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-mono">
                    <span className="flex items-center gap-1 text-gray-400"><span className="w-2.5 h-2.5 rounded-full bg-[#1E2E39]"></span> Actual</span>
                    <span className="flex items-center gap-1 text-[#CF9D7B]"><span className="w-2.5 h-2.5 rounded-full bg-[#CF9D7B]"></span> Simulado</span>
                  </div>
                </div>

                <div className="h-64 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={datosGraficoSimulacion} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#16222A" vertical={false} />
                      <XAxis dataKey="periodo" stroke="#6B7280" fontSize={11} tickLine={false} axisLine={{ stroke: '#1E2E39' }} />
                      <YAxis stroke="#6B7280" fontSize={11} tickLine={false} axisLine={{ stroke: '#1E2E39' }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0D161C', border: '1px solid rgba(207, 157, 123, 0.6)', borderRadius: '10px' }}
                        formatter={(val) => [formatearDineroDirecto(val), 'Ganancia Acumulada']}
                      />
                      <Bar dataKey="actual" fill="#1E2E39" radius={[4, 4, 0, 0]} name="Precio Actual" />
                      <Bar dataKey="simulado" fill="#CF9D7B" radius={[4, 4, 0, 0]} name="Precio Simulado" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Panel de Resumen Ejecutivo y Recomendaciones para la Meta */}
              <div className="lg:col-span-6 bg-[#081015]/90 backdrop-blur-xl border border-[#CF9D7B]/30 p-6 md:p-7 rounded-2xl space-y-4 shadow-2xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-[#CF9D7B] mb-2">
                    <span className="text-xs uppercase font-mono tracking-wider font-bold">Diagnóstico Ejecutivo // Hoja de Ruta</span>
                  </div>
                  <h4 className="text-lg font-bold text-white tracking-tight">
                    {cumpleMetaEnPeriodo 
                      ? 'Meta Financiera Totalmente Viable' 
                      : 'Ajuste de Estrategia Requerido para la Meta'}
                  </h4>
                  <p className="text-xs text-gray-300 mt-2 leading-relaxed">
                    Al pasar de <span className="text-white font-mono">{formatearDineroDirecto(precioOriginal)}</span> a <span className="text-[#CF9D7B] font-mono">{formatearDineroDirecto(nuevoPrecio)}</span>, tu margen unitario aumenta a <span className="text-emerald-400 font-mono">{formatearDineroDirecto(margenUnitarioSimulado)}</span> ({((margenUnitarioSimulado / nuevoPrecio) * 100).toFixed(1)}% de rentabilidad neta).
                  </p>
                </div>

                {/* Cuadro de recomendaciones accionables */}
                <div className="space-y-2.5 pt-2 border-t border-[#141F28]">
                  <div className="p-3 bg-[#0D151B] border border-[#1A2834] rounded-xl text-xs space-y-1">
                    <span className="font-bold text-[#CF9D7B] font-mono">1. Tiempo de Alcance:</span>
                    <p className="text-gray-400">
                      Necesitas vender <span className="text-white font-mono font-semibold">{unidadesParaMeta.toLocaleString()} unidades</span> para acumular tu meta de {formatearDineroDirecto(metaIngreso)}. Al ritmo de {ventasPorDia} unidades/día, te tomará exactamente <span className="text-emerald-400 font-mono font-semibold">{diasParaMeta} días</span>.
                    </p>
                  </div>

                  <div className="p-3 bg-[#0D151B] border border-[#1A2834] rounded-xl text-xs space-y-1">
                    <span className="font-bold text-[#CF9D7B] font-mono">2. Aceleración Comercial:</span>
                    <p className="text-gray-400">
                      {cumpleMetaEnPeriodo 
                        ? `Alcanzarás tu objetivo dentro de los ${mesesProyeccion} meses proyectados, dejando un remanente positivo de ${formatearDineroDirecto(Math.max(0, gananciaTotalPeriodo - metaIngreso))}.`
                        : `Para lograr la meta dentro del periodo de ${mesesProyeccion} meses (${diasTotalesPeriodo} días), debes elevar el ritmo diario de ${ventasPorDia} a ${Math.ceil(unidadesParaMeta / diasTotalesPeriodo)} unidades/día.`}
                    </p>
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

              <label className={`inline-flex items-center gap-2 px-7 py-3 bg-[#CF9D7B] text-[#05080A] text-xs font-bold uppercase tracking-wider rounded-full cursor-pointer hover:bg-[#b88565] transition-all duration-300 shadow-lg ${cargandoCSV ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {cargandoCSV ? 'Analizando registros...' : 'Seleccionar Archivo'}
              <input
                type="file"
                accept=".csv, .xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv, *.*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

              {errorCSV && (
                <div className="flex items-center justify-center gap-2 text-rose-400 text-xs mt-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errorCSV}</span>
                </div>
              )}
            </div>

            {/* SECCIÓN DETECTIVE CSV AUDITORÍA COMPLETA */}
            {datosAuditoria && (
              <div className="space-y-8">
                
                {/* 1. Panel de Métricas Clave y Botones de Acción */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-6 rounded-2xl shadow-xl">
                  <div>
                    <span className="text-xs font-mono text-[#CF9D7B] uppercase tracking-wider font-semibold">Resumen Forense</span>
                    <h3 className="text-xl font-bold text-white tracking-tight mt-0.5">Diagnóstico del Catálogo</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={exportarPDF}
                      className="flex items-center gap-2 px-4 py-2 bg-[#0D151B] border border-[#1E2D3D] hover:border-[#CF9D7B]/50 text-white rounded-xl text-xs font-medium transition-all"
                    >
                      <Download className="w-4 h-4 text-[#CF9D7B]" />
                      Descargar Reporte PDF
                    </button>
                    <button
                      onClick={transferirAlSimulador}
                      className="flex items-center gap-2 px-4 py-2 bg-[#CF9D7B] text-[#05080A] rounded-xl text-xs font-bold hover:shadow-[0_0_15px_rgba(207,157,123,0.4)] transition-all"
                    >
                      <PlayCircle className="w-4 h-4" />
                      Simular con estos datos
                    </button>
                  </div>
                </div>

                {/* Métricas en Tarjetas Rápidas */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-5 rounded-2xl space-y-1 shadow-lg">
                    <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Total Registros</span>
                    <p className="text-2xl font-bold text-white font-mono">{datosAuditoria.total_registros}</p>
                  </div>
                  <div className="bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-5 rounded-2xl space-y-1 shadow-lg">
                    <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Ventas Totales</span>
                    <p className="text-2xl font-bold text-[#CF9D7B] font-mono">{formatearDinero(datosAuditoria.ventas_historicas)}</p>
                  </div>
                  <div className="bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-5 rounded-2xl space-y-1 shadow-lg">
                    <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Unidades Vendidas</span>
                    <p className="text-2xl font-bold text-white font-mono">{datosAuditoria.unidades_historicas}</p>
                  </div>
                  <div className="bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-5 rounded-2xl space-y-1 shadow-lg">
                    <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Precio Promedio</span>
                    <p className="text-2xl font-bold text-white font-mono">{formatearDinero(datosAuditoria.precio_promedio)}</p>
                  </div>
                </div>

                {/* 2. SUITE DE CONSULTORÍA VISUAL: MATRIZ BCG */}
                {datosMatrizBCG.length > 0 && (
                  <div className="bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-6 md:p-8 rounded-2xl shadow-2xl">
                    <div className="flex items-center gap-2 mb-6">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8] animate-pulse" />
                      <h3 className="text-lg font-bold text-white tracking-tight">
                        3. Matriz BCG: Rentabilidad vs. Rotación
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
                      {/* Scatter Chart */}
                      <div className="lg:col-span-3 h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <ScatterChart margin={{ top: 25, right: 35, bottom: 20, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#16222C" />
                        <XAxis 
                          type="number" 
                          dataKey="unidades" 
                          name="Unidades Vendidas" 
                          stroke="#64748B" 
                          fontSize={11} 
                          tickLine={false}
                          label={{ value: 'Unidades Vendidas (Rotación)', position: 'insideBottom', offset: -10, fill: '#64748B', fontSize: 11 }}
                        />
                        <YAxis 
                          type="number" 
                          dataKey="ventas" 
                          name="Facturación" 
                          stroke="#64748B" 
                          fontSize={11} 
                          tickLine={false}
                          tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                          label={{ value: 'Facturación / Ganancia Neta', angle: -90, position: 'insideLeft', fill: '#64748B', fontSize: 11 }}
                        />
                        <Tooltip 
                          cursor={{ strokeDasharray: '3 3', stroke: '#38BDF8', strokeOpacity: 0.3 }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-[#0E171E] border border-[#1E2D3D] p-3 rounded-xl shadow-2xl text-xs space-y-1">
                                  <p className="font-bold text-white flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
                                    {data.nombre}
                                  </p>
                                  <p className="text-gray-300">Rotación: <span className="font-mono text-[#38BDF8] font-bold">{data.unidades} uds</span></p>
                                  <p className="text-gray-300">Facturación: <span className="font-mono text-[#34D399] font-bold">{formatearDinero(data.ventas)}</span></p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Scatter 
                          name="Productos" 
                          data={datosMatrizBCG}
                          shape={(props) => {
                            const { cx, cy, fill } = props;
                            return (
                              <g>
                                {/* Anillo exterior / Aura */}
                                <circle cx={cx} cy={cy} r={14} fill="none" stroke="#FFFFFF" strokeWidth={2.5} opacity={0.85} />
                                {/* Esfera interior sólida */}
                                <circle cx={cx} cy={cy} r={11} fill={fill} />
                                {/* Brillo especular 3D */}
                                <circle cx={cx - 3.5} cy={cy - 3.5} r={3} fill="#FFFFFF" opacity={0.65} />
                              </g>
                            );
                          }}
                        >
                          {datosMatrizBCG.map((entry, index) => (
                            <Cell key={`cell-scatter-${index}`} fill={entry.color} />
                          ))}
                        </Scatter>
                      </ScatterChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Leyenda lateral */}
                      <div className="lg:col-span-1 bg-[#050B0E]/80 border border-[#16222C] p-4 rounded-xl max-h-80 overflow-y-auto custom-scrollbar">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-[#64748B] block mb-3">
                          Catálogo Analizado
                        </span>
                        <div className="space-y-2">
                          {datosMatrizBCG.map((item, idx) => (
                            <div key={`legend-${idx}`} className="flex items-center gap-2 text-xs">
                              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: item.color }} />
                              <span className="text-gray-300 truncate font-medium" title={item.nombre}>
                                {item.nombre}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Panel: Análisis Profundo del Negocio con Selector */}
                <div className="bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-6 md:p-8 rounded-2xl shadow-2xl space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#16222C] pb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white tracking-tight">
                        4. Análisis Profundo del Negocio
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">
                        Explora el desglose clasificado por volumen de unidades, facturación total o clientes clave.
                      </p>
                    </div>

                    {/* Selector tipo Radio / Píldoras */}
                    <div className="flex flex-wrap items-center gap-2 bg-[#0E171E] p-1.5 rounded-xl border border-[#1E2D3D]">
                      <button
                        onClick={() => setCriterioAnalisis('unidades')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
                          criterioAnalisis === 'unidades'
                            ? 'bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40 font-bold shadow-sm'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${criterioAnalisis === 'unidades' ? 'bg-[#38BDF8]' : 'border border-gray-500'}`} />
                        Top 10 Productos (Unidades)
                      </button>

                      <button
                        onClick={() => setCriterioAnalisis('facturacion')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
                          criterioAnalisis === 'facturacion'
                            ? 'bg-[#F472B6]/20 text-[#F472B6] border border-[#F472B6]/40 font-bold shadow-sm'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${criterioAnalisis === 'facturacion' ? 'bg-[#F472B6]' : 'border border-gray-500'}`} />
                        Top 10 Productos (Facturación)
                      </button>

                      {tieneClientes && (
                        <button
                          onClick={() => setCriterioAnalisis('clientes')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
                            criterioAnalisis === 'clientes'
                              ? 'bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/40 font-bold shadow-sm'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${criterioAnalisis === 'clientes' ? 'bg-[#34D399]' : 'border border-gray-500'}`} />
                          Top 10 Clientes
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Gráfico de Barras Horizontales con Paleta Categórica */}
                  <div className="h-96 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={
                          criterioAnalisis === 'unidades'
                            ? top10ProductosUnidades
                            : criterioAnalisis === 'facturacion'
                            ? top10ProductosFacturacion
                            : top10Clientes
                        }
                        margin={{ top: 10, right: 30, left: 40, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#16222C" horizontal={false} />
                        <XAxis 
                          type="number" 
                          stroke="#64748B" 
                          fontSize={11} 
                          tickLine={false} 
                          tickFormatter={(val) => criterioAnalisis === 'unidades' ? val : `$${(val / 1000).toFixed(0)}k`} 
                        />
                        <YAxis 
                          dataKey="nombre" 
                          type="category" 
                          stroke="#94A3B8" 
                          fontSize={11} 
                          tickLine={false} 
                          width={160} 
                        />
                        <Tooltip
                      cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const esUnidades = criterioAnalisis === 'unidades';
                          return (
                            <div className="bg-[#0E171E] border border-[#1E2D3D] p-3 rounded-xl shadow-2xl text-xs space-y-1">
                              <p className="font-bold text-white flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
                                {data.nombre}
                              </p>
                              <p className="text-gray-300">
                                {esUnidades ? 'Rotación: ' : 'Facturación Total: '}
                                <span className={`font-mono font-bold ${esUnidades ? 'text-[#38BDF8]' : 'text-[#34D399]'}`}>
                                  {esUnidades ? `${data.unidades} unidades` : formatearDinero(data.ventas)}
                                </span>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                        <Bar 
                          dataKey={criterioAnalisis === 'unidades' ? 'unidades' : 'ventas'} 
                          radius={[0, 6, 6, 0]}
                        >
                          {(
                            criterioAnalisis === 'unidades'
                              ? top10ProductosUnidades
                              : criterioAnalisis === 'facturacion'
                              ? top10ProductosFacturacion
                              : top10Clientes
                          ).map((entry, index) => (
                            <Cell 
                              key={`bar-deep-${index}`} 
                              fill={entry.color || PALETA_COLORES[index % PALETA_COLORES.length]} 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 4. Diagnóstico Rey vs Hueso */}
                {datosAuditoria.diagnostico?.rey && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-[#081015]/90 backdrop-blur-xl border border-emerald-900/40 p-6 rounded-2xl space-y-3 shadow-xl">
                      <div className="flex items-center gap-2 text-emerald-400">
                        <Award className="w-5 h-5" />
                        <span className="text-xs font-semibold uppercase tracking-wider font-mono">Producto Estrella (Líder)</span>
                      </div>
                      <h4 className="text-xl font-bold text-white tracking-tight">{datosAuditoria.diagnostico.rey.nombre}</h4>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        Generó el mayor volumen de facturación con <span className="text-white font-mono font-medium">{formatearDinero(datosAuditoria.diagnostico.rey.ventas)}</span> en ventas.
                      </p>
                    </div>

                    <div className="bg-[#081015]/90 backdrop-blur-xl border border-rose-900/40 p-6 rounded-2xl space-y-3 shadow-xl">
                      <div className="flex items-center gap-2 text-rose-400">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="text-xs font-semibold uppercase tracking-wider font-mono">Producto de Bajo Desempeño</span>
                      </div>
                      <h4 className="text-xl font-bold text-white tracking-tight">{datosAuditoria.diagnostico.hueso.nombre}</h4>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        Menor facturación del período con apenas <span className="text-white font-mono font-medium">{formatearDinero(datosAuditoria.diagnostico.hueso.ventas)}</span>.
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
      {/* 🤖 WIDGET INTERACTIVO & CINEMÁTICA DE MINI-TARS (FRAMER MOTION) */}
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

            {/* Historial de Chat */}
            <div ref={chatRef} className="space-y-3.5 text-xs font-mono leading-relaxed max-h-64 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-[#1D2B36] scrollbar-track-transparent">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-[#0E171E] border border-[#1D2B36] flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5 text-[#CF9D7B]" />
                </div>
                <div className="bg-[#0E171E] p-3 rounded-r-xl rounded-bl-xl border border-[#1D2B36] text-gray-300">
                  <p className="text-[#CF9D7B] font-semibold text-[11px] mb-1">⚡ Diagnóstico Inicial:</p>
                  {datosAuditoria ? (
                    <p>
                      Estimado(a) empresario(a), cargaste una base de datos con {datosAuditoria.total_registros} registros. He detectado que tu producto estrella es '{datosAuditoria.diagnostico?.rey?.nombre}' con facturación total de {formatearDinero(datosAuditoria.diagnostico?.rey?.ventas || 0)}. ¿Qué estrategia o duda analítica quieres consultar hoy?
                    </p>
                  ) : (
                    <p>
                      ¡Hola! Estimado(a) empresario(a), aún no tenemos datos cargados en el sistema. Puedes subir tu archivo CSV en el <em>Detective CSV</em> o proyectar escenarios en el <em>Modo Asistido</em>. Estoy a tu disposición para analizar márgenes, rentabilidad y adquisición de clientes con franqueza. ¿Por dónde empezamos?
                    </p>
                  )}
                </div>
              </div>

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
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {typeof msg.texto === 'string'
                        ? msg.texto.split(/(\*\*.*?\*\*|\*.*?\*)/g).map((parte, i) => {
                            if (parte.startsWith('**') && parte.endsWith('**') && parte.length > 4) {
                              return (
                                <strong key={i} className={msg.remitente === 'usuario' ? 'font-bold text-black' : 'text-[#CF9D7B] font-bold'}>
                                  {parte.slice(2, -2)}
                                </strong>
                              );
                            }
                            if (parte.startsWith('*') && parte.endsWith('*') && parte.length > 2) {
                              return (
                                <span key={i} className={msg.remitente === 'usuario' ? 'italic' : 'text-[#CF9D7B] font-medium italic'}>
                                  {parte.slice(1, -1)}
                                </span>
                              );
                            }
                            return parte;
                          })
                        : msg.texto}
                    </p>
                  </div>
                </div>
              ))}

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

            {/* Input del Chat */}
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

        {/* 🚀 Cinemática: Anclaje Nativo en la Esquina con Desplazamientos Numéricos Fluidos */}
        {activeTab === 'lobby' && !animacionTarsCompletada ? (
          <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            
            <motion.div
              initial={{ 
                x: '-105vw', 
                y: '-80vh', 
                scale: 0.6, 
                rotate: 15, 
                opacity: 0 
              }}
              animate={{
                // Coordenadas relativas continuas respecto a la base de aterrizaje (0, 0 es el botón exacto):
                // 1. Entra arriba izq -> 2. Sobre Asistido -> 3. Detective CSV -> 4. Curva Simulador SaaS -> 5. Rizo de aproximación -> 6. Carril vertical -> 7. Descenso 1 -> 8. Descenso 2 -> 9. Aterriza en 0
                x: [
                  '-105vw', 
                  '-70vw', 
                  '-45vw', 
                  '-18vw', 
                  '-4vw', 
                  '0vw', 
                  '0vw', 
                  '0vw', 
                  '0vw'
                ],
                y: [
                  '-80vh', 
                  '-72vh', 
                  '-55vh', 
                  '-65vh', 
                  '-50vh', 
                  '-42vh', 
                  '-25vh', 
                  '-10vh', 
                  '0vh'
                ],
                // Rotaciones continuas en grados:
                rotate: [15, 30, 50, 20, 360, 720, 0, 0, 0],
                scale: [0.6, 1.05, 1.15, 1.1, 1.05, 1, 1, 1, 1],
                opacity: [0, 1, 1, 1, 1, 1, 1, 1, 1]
              }}
              transition={{
                duration: 8.4,
                times: [0, 0.16, 0.32, 0.46, 0.58, 0.70, 0.80, 0.92, 1],
                ease: 'easeInOut'
              }}
              onAnimationComplete={() => setAnimacionTarsCompletada(true)}
              className="absolute right-6 bottom-6 flex items-center justify-center pointer-events-auto cursor-pointer"
              onClick={() => setAbrirChatIA(!abrirChatIA)}
            >
              {/* Contenedor del Cohete Retro */}
              <div className="relative w-16 h-24 flex items-center justify-center">
                <svg viewBox="0 0 100 150" className="w-full h-full overflow-visible drop-shadow-[0_0_20px_rgba(56,189,248,0.4)]">
                  {/* Aletas traseras */}
                  <path d="M22 95 Q5 115 10 135 Q28 128 32 110 Z" fill="#CF9D7B" stroke="#05080A" strokeWidth="2" />
                  <path d="M78 95 Q95 115 90 135 Q72 128 68 110 Z" fill="#CF9D7B" stroke="#05080A" strokeWidth="2" />
                  <path d="M44 98 L56 98 L53 125 L47 125 Z" fill="#B38160" stroke="#05080A" strokeWidth="1.5" />

                  {/* Fuselaje */}
                  <path d="M50 15 C75 40 78 85 70 115 L30 115 C22 85 25 40 50 15 Z" fill="#E2E8F0" stroke="#05080A" strokeWidth="2.5" />
                  <path d="M50 15 C60 27 67 42 68 50 L32 50 C33 42 40 27 50 15 Z" fill="#F97316" stroke="#05080A" strokeWidth="2" />
                  <path d="M30 102 L70 102 L69 110 L31 110 Z" fill="#CF9D7B" />
                  <ellipse cx="50" cy="115" rx="18" ry="5" fill="#1E293B" />

                  {/* Ventanilla circular */}
                  <circle cx="50" cy="72" r="15" fill="#0E171E" stroke="#CF9D7B" strokeWidth="3" />
                  <circle cx="50" cy="72" r="12" fill="#04070A" stroke="#38BDF8" strokeWidth="1" />
                </svg>

                {/* 👁️ Ojitos luminosos de Mini-TARS */}
                <div className="absolute top-[40px] flex items-center gap-1.5 pointer-events-none">
                  <motion.div 
                    animate={{ scaleY: [1, 1, 0.1, 1] }} 
                    transition={{ repeat: Infinity, duration: 2.6, times: [0, 0.85, 0.9, 1] }}
                    className="w-2 h-2.5 bg-[#38BDF8] rounded-full shadow-[0_0_6px_#38BDF8]"
                  />
                  <motion.div 
                    animate={{ scaleY: [1, 1, 0.1, 1] }} 
                    transition={{ repeat: Infinity, duration: 2.6, times: [0, 0.85, 0.9, 1] }}
                    className="w-2 h-2.5 bg-[#38BDF8] rounded-full shadow-[0_0_6px_#38BDF8]"
                  />
                </div>

                {/* 🔥 Fuego de combustión continuo */}
                <motion.div
                  animate={{
                    scale: [0.85, 1.25, 0.85],
                    opacity: [0.85, 1, 0.85]
                  }}
                  transition={{ repeat: Infinity, duration: 0.14, ease: "linear" }}
                  className="absolute -bottom-7 w-10 h-10 pointer-events-none flex items-center justify-center"
                >
                  <svg viewBox="0 0 80 80" className="w-full h-full overflow-visible drop-shadow-[0_0_12px_rgba(249,115,22,0.9)]">
                    <path d="M25 0 Q10 40 40 75 Q70 40 55 0 Z" fill="#F97316" />
                    <path d="M32 0 Q20 28 40 55 Q60 28 48 0 Z" fill="#FACC15" />
                    <path d="M37 0 Q30 18 40 38 Q50 18 43 0 Z" fill="#38BDF8" />
                  </svg>
                </motion.div>

                {/* 💨 Nube de Humo Vectorial Continua durante el Descenso */}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: [0, 0, 0, 0, 0.3, 0.7, 1.2, 1.6, 0.9],
                    opacity: [0, 0, 0, 0, 0.25, 0.5, 0.8, 0.9, 0],
                    y: [0, 0, 0, 0, 3, 8, 14, 22, 28]
                  }}
                  transition={{
                    duration: 8.4,
                    times: [0, 0.30, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95, 1],
                    ease: "easeOut"
                  }}
                  className="absolute -bottom-10 w-36 h-24 pointer-events-none flex items-center justify-center"
                >
                  <svg viewBox="0 0 160 100" className="w-full h-full overflow-visible">
                    <circle cx="80" cy="50" r="32" fill="#F8FAFC" opacity="0.85" />
                    <circle cx="50" cy="60" r="26" fill="#E2E8F0" opacity="0.9" />
                    <circle cx="110" cy="60" r="26" fill="#E2E8F0" opacity="0.9" />
                    <circle cx="30" cy="72" r="20" fill="#CBD5E1" opacity="0.8" />
                    <circle cx="130" cy="72" r="20" fill="#CBD5E1" opacity="0.8" />
                    <circle cx="80" cy="45" r="18" fill="#F97316" opacity="0.45" />
                    <circle cx="80" cy="42" r="10" fill="#FACC15" opacity="0.55" />
                  </svg>
                </motion.div>

              </div>
            </motion.div>

          </div>
        ) : (
          <button
            onClick={() => setAbrirChatIA(!abrirChatIA)}
            className="group relative flex items-center justify-center w-14 h-14 rounded-2xl bg-[#090F14]/90 backdrop-blur-xl border border-[#CF9D7B]/60 shadow-[0_0_25px_rgba(207,157,123,0.35)] hover:shadow-[0_0_35px_rgba(207,157,123,0.6)] transition-all duration-300 hover:scale-110 cursor-pointer"
          >
            <span className="absolute inset-0 rounded-2xl border border-[#CF9D7B]/50 animate-ping opacity-40 pointer-events-none"></span>
            <Bot className="w-7 h-7 text-[#CF9D7B] group-hover:rotate-12 transition-transform duration-300" />
            <span className={`absolute -top-1 -right-1 w-3.5 h-3.5 border-2 border-[#05080A] rounded-full ${cargandoChat ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></span>
          </button>
        )}

      </div>

    </div>
  );
}