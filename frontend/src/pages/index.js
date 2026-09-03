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
  PieChart,
  Pie,
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
  const [datosModoAsistido, setDatosModoAsistido] = useState(null);
  // Estado para guardar el catálogo enviado por el backend
  const [catalogoSimulacion, setCatalogoSimulacion] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  // Lista de productos que el usuario está simulando activamente
  const [productosSimulacion, setProductosSimulacion] = useState([]);

  // Tasas de cambio (Base: 1 USD)
  const TASAS_CAMBIO = {
    USD: 1,
    COP: 3300, // 1 USD = 3.300 COP
    EUR: 0.92  // 1 USD = 0.92 EUR
  };

  // 1. Formateador con conversión (Para Detective CSV y datos en USD)
  // Formateador visual profesional según la moneda seleccionada en el Navbar
  const formatearDinero = (valor) => {
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
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(num);
    } else if (moneda === 'EUR') {
      return new Intl.NumberFormat('de-DE', { 
        style: 'currency', 
        currency: 'EUR', 
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(num);
    }
    return `$ ${num.toLocaleString()}`;
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

// Estados del Simulador Temporal y Metas (Inicializados en blanco/cero)
  const [precioOriginal, setPrecioOriginal] = useState(0);
  const [nuevoPrecio, setNuevoPrecio] = useState(0);
  const [costoUnitario, setCostoUnitario] = useState(0);
  const [ventasPorDia, setVentasPorDia] = useState(0);
  const [mesesProyeccion, setMesesProyeccion] = useState(1);
  const [metaIngreso, setMetaIngreso] = useState(0);

  // Factor de conversión monetaria reactiva
  const factorConversion = (typeof moneda !== 'undefined' && moneda === 'COP') ? 3300 : 1;

  // 1. Datos para la Matriz BCG (Rentabilidad vs Rotación)
  const datosMatrizBCG = React.useMemo(() => {
    const filas = datosAuditoria?.filas || datosAuditoria?.raw_data || datosAuditoria?.data || [];
    
    // Si viene directamente el ranking agrupado del backend
    if (!Array.isArray(filas) || filas.length === 0) {
      if (datosAuditoria?.ranking_productos && Array.isArray(datosAuditoria.ranking_productos)) {
        return datosAuditoria.ranking_productos.map((p, idx) => ({
          nombre: p.nombre || p.producto,
          unidades: Number(p.unidades || p.cantidad) || 0,
          ventas: Number(p.ventas || p.total) || 0,
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
        const venta = parseFloat(fila[claveVenta] || '0') || 0;
        if (!mapaProductos[nombre]) {
          mapaProductos[nombre] = { nombre, unidades: 0, ventas: 0 };
        }
        mapaProductos[nombre].unidades += 1;
        mapaProductos[nombre].ventas += venta;
      }
    });

    return Object.values(mapaProductos).map((p, idx) => ({
      ...p,
      color: PALETA_COLORES[idx % PALETA_COLORES.length]
    }));
  }, [datosAuditoria]);

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
          ventas: parseFloat(c.ventas || c.total || c.Sales) || 0,
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

  // --- CÁLCULOS DINÁMICOS CONSOLIDADOS DEL SIMULADOR MULTI-PRODUCTO ---
  const mesesValidos = Math.max(1, Number(mesesProyeccion) || 1);
  const diasTotalesPeriodo = mesesValidos * 30;

  // 1. Métricas diarias del portafolio simulado
  const rotacionTotalDia = productosSimulacion.reduce((acc, p) => acc + (Number(p.ventas_dia) || 0), 0);
  
  const ventasDiariasBase = productosSimulacion.reduce((acc, p) => 
    acc + (p.precio_base * (Number(p.ventas_dia) || 0)), 0);

  const ventasDiariasSimuladas = productosSimulacion.reduce((acc, p) => 
    acc + ((p.nuevo_precio || p.precio_base) * (Number(p.ventas_dia) || 0)), 0);

  const gananciaDiariaBase = productosSimulacion.reduce((acc, p) => 
    acc + ((p.precio_base - p.costo_unitario) * (Number(p.ventas_dia) || 0)), 0);

  const gananciaDiariaSimulada = productosSimulacion.reduce((acc, p) => 
    acc + (((p.nuevo_precio || p.precio_base) - p.costo_unitario) * (Number(p.ventas_dia) || 0)), 0);

  // 2. Acumulado en el horizonte de tiempo (Meses)
  const facturacionTotalPeriodo = ventasDiariasSimuladas * diasTotalesPeriodo;
  const gananciaTotalPeriodo = gananciaDiariaSimulada * diasTotalesPeriodo;
  const gananciaBasePeriodo = gananciaDiariaBase * diasTotalesPeriodo;
  const deltaPeriodo = Math.max(0, gananciaTotalPeriodo - gananciaBasePeriodo);
  const unidadesTotalesPeriodo = rotacionTotalDia * diasTotalesPeriodo;

  const margenUnitarioPromedio = rotacionTotalDia > 0 ? (gananciaDiariaSimulada / rotacionTotalDia) : 0;
  const margenUnitarioSimulado = margenUnitarioPromedio;

// 3. Plan de Meta Financiera
  const cumpleMetaEnPeriodo = gananciaTotalPeriodo >= metaIngreso;
  const diasParaMeta = gananciaDiariaSimulada > 0 ? Math.ceil(metaIngreso / gananciaDiariaSimulada) : 0;
  const unidadesParaMeta = margenUnitarioPromedio > 0 ? Math.ceil(metaIngreso / margenUnitarioPromedio) : 0;
  const ventasPorDiaConsolidadas = rotacionTotalDia;

  // Variables para la Hoja de Ruta Comercial 👇
  const porcentajeMeta = metaIngreso > 0 ? Math.min(100, Math.round((gananciaTotalPeriodo / metaIngreso) * 100)) : 0;
  const rotacionRequerida = Math.ceil(unidadesParaMeta / (diasTotalesPeriodo || 1));
  const productoLider = productosSimulacion.reduce((max, p) => {
    const ganancia = ((p.nuevo_precio || p.precio_base) - p.costo_unitario) * (Number(p.ventas_dia) || 0);
    return ganancia > (max?.ganancia || 0) ? { nombre: p.producto, ganancia } : max;
  }, null);
  // 4. Datos del Gráfico Comparativo Mes a Mes
  const datosGraficoSimulacion = Array.from({ length: Math.min(12, mesesValidos) }, (_, i) => {
    const mes = i + 1;
    const dias = mes * 30;
    return {
      periodo: `Mes ${mes}`,
      actual: Math.round(gananciaDiariaBase * dias),
      simulado: Math.round(gananciaDiariaSimulada * dias),
    };
  });

  // 5. Paleta y Datos para el Gráfico de Dona / Torta (Participación del Margen)
  const COLORES_DONA = ['#CF9D7B', '#38BDF8', '#34D399', '#FBBF24', '#A78BFA', '#F472B6'];

  const datosTortaGanancia = productosSimulacion.map((p) => {
    const margenUnit = (p.nuevo_precio || p.precio_base) - p.costo_unitario;
    const gananciaDiaProd = margenUnit * (Number(p.ventas_dia) || 0);
    return {
      name: p.producto,
      value: Math.max(0, Math.round(gananciaDiaProd)),
    };
  }).filter(d => d.value > 0);

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

  const transferirAlSimulador = () => {
    if (!datosAuditoria) return;

    if (datosAuditoria.catalogo_simulacion && datosAuditoria.catalogo_simulacion.length > 0) {
      const primerProd = datosAuditoria.catalogo_simulacion[0];
      
      // Inicializar con el primer producto auditado y +10% de margen sugerido
      setProductosSimulacion([
        {
          producto: primerProd.producto,
          precio_base: primerProd.precio_actual,
          costo_unitario: primerProd.costo_unitario,
          ventas_dia: primerProd.ventas_dia,
          porcentaje: 10,
          nuevo_precio: Math.round(primerProd.precio_actual * 1.10)
        }
      ]);
      
      // Mantener compatibilidad con inputs base
      setPrecioOriginal(primerProd.precio_actual);
      setNuevoPrecio(Math.round(primerProd.precio_actual * 1.10));
      setCostoUnitario(primerProd.costo_unitario);
      setVentasPorDia(primerProd.ventas_dia);
    }

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
        moduloActivo: activeTab,
        datosAuditoria: datosAuditoria || null,
        modoAsistido: datosModoAsistido ? {
          productos: datosModoAsistido.filas?.filter(f => f.producto && f.producto.trim() !== '') || [],
          resumenDiagnostico: datosModoAsistido.reporteGenerado || null
        } : null,
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

          <button 
            onClick={() => setActiveTab('simulador')}
            className={`px-4 py-1.5 rounded-full text-xs tracking-wide transition-all duration-200 ${
              activeTab === 'simulador' ? 'bg-[#CF9D7B] text-[#05080A] font-semibold shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            Simulador
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
                Tu copiloto financiero y estratégico
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight leading-tight">
                Claridad total sobre los <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#CF9D7B] via-[#E8C5AF] to-[#CF9D7B] drop-shadow-[0_0_25px_rgba(207,157,123,0.3)]">
                  números de tu negocio.
                </span>
              </h1>
              <p className="text-gray-400 text-sm md:text-base leading-relaxed max-w-2xl mx-auto">
                Descubre qué productos te dejan dinero real, cuáles te están costando de más y proyecta tus ganancias antes de mover un solo precio.
              </p>
            </div>

            {/* MÓDULOS DE ACCESO */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* MOD-01: MODO ASISTIDO */}
              <div 
                onClick={() => setActiveTab('asistido')}
                className="group relative bg-[#081015]/85 backdrop-blur-xl border border-[#16222C] hover:border-[#CF9D7B]/60 p-8 rounded-2xl transition-all duration-300 hover:-translate-y-1.5 cursor-pointer flex flex-col justify-between shadow-2xl hover:shadow-[0_15px_30px_rgba(207,157,123,0.12)]"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="text-[11px] px-2.5 py-1 bg-[#0F1A22] text-[#CF9D7B] rounded-md font-mono border border-[#CF9D7B]/20">
                      PASO 01
                    </span>
                    <ArrowUpRight className="w-5 h-5 text-gray-500 group-hover:text-[#CF9D7B] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <h3 className="text-xl font-bold text-white tracking-tight pt-1">Modo Asistido</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Escribe tus productos a mano o usa nuestra plantilla simple para analizar tu catálogo paso a paso, sin enredos.
                  </p>
                </div>
                <div className="flex gap-2 pt-6">
                  <span className="text-[10px] font-mono px-2 py-1 bg-[#0D151B] text-gray-400 rounded border border-[#18232B]">Paso a paso</span>
                  <span className="text-[10px] font-mono px-2 py-1 bg-[#0D151B] text-gray-400 rounded border border-[#18232B]">Plantilla</span>
                  <span className="text-[10px] font-mono px-2 py-1 bg-[#0D151B] text-gray-400 rounded border border-[#18232B]">Sin archivos</span>
                </div>
              </div>

              {/* MOD-02: DETECTIVE CSV */}
              <div 
                onClick={() => setActiveTab('auditoria')}
                className="group relative bg-[#081015]/85 backdrop-blur-xl border border-[#16222C] hover:border-[#CF9D7B]/60 p-8 rounded-2xl transition-all duration-300 hover:-translate-y-1.5 cursor-pointer flex flex-col justify-between shadow-2xl hover:shadow-[0_15px_30px_rgba(207,157,123,0.12)]"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="text-[11px] px-2.5 py-1 bg-[#0F1A22] text-[#CF9D7B] rounded-md font-mono border border-[#CF9D7B]/20">
                      PASO 02
                    </span>
                    <ArrowUpRight className="w-5 h-5 text-gray-500 group-hover:text-[#CF9D7B] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <h3 className="text-xl font-bold text-white tracking-tight pt-1">Detective CSV</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Sube tu historial de ventas en Excel o CSV y deja que el sistema identifique al instante tus productos estrella y los que van a pérdida.
                  </p>
                </div>
                <div className="flex gap-2 pt-6">
                  <span className="text-[10px] font-mono px-2 py-1 bg-[#0D151B] text-gray-400 rounded border border-[#18232B]">Automático</span>
                  <span className="text-[10px] font-mono px-2 py-1 bg-[#0D151B] text-gray-400 rounded border border-[#18232B]">Diagnóstico</span>
                  <span className="text-[10px] font-mono px-2 py-1 bg-[#0D151B] text-gray-400 rounded border border-[#18232B]">Excel / CSV</span>
                </div>
              </div>

              {/* MOD-03: SIMULADOR SAAS */}
              <div 
                onClick={() => setActiveTab('simulador')}
                className="group relative bg-[#081015]/85 backdrop-blur-xl border border-[#16222C] hover:border-[#CF9D7B]/60 p-8 rounded-2xl transition-all duration-300 hover:-translate-y-1.5 cursor-pointer flex flex-col justify-between shadow-2xl hover:shadow-[0_15px_30px_rgba(207,157,123,0.12)]"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="text-[11px] px-2.5 py-1 bg-[#0F1A22] text-[#CF9D7B] rounded-md font-mono border border-[#CF9D7B]/20">
                      PASO 03
                    </span>
                    <ArrowUpRight className="w-5 h-5 text-gray-500 group-hover:text-[#CF9D7B] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <h3 className="text-xl font-bold text-white tracking-tight pt-1">Simulador de Escenarios</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Experimenta con cambios de precio y metas de venta para ver exactamente cuánta ganancia de bolsillo obtendrías cada mes.
                  </p>
                </div>
                <div className="flex gap-2 pt-6">
                  <span className="text-[10px] font-mono px-2 py-1 bg-[#0D151B] text-gray-400 rounded border border-[#18232B]">Proyecciones</span>
                  <span className="text-[10px] font-mono px-2 py-1 bg-[#0D151B] text-gray-400 rounded border border-[#18232B]">Ganancia Neta</span>
                  <span className="text-[10px] font-mono px-2 py-1 bg-[#0D151B] text-gray-400 rounded border border-[#18232B]">Estrategia</span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* VISTA DEL MODO ASISTIDO */}
        <div className={activeTab === 'asistido' ? 'block' : 'hidden'}>
          {/* AHORA: referencia estática estable */}
<ModoAsistido
  onVolverHome={() => setActiveTab('lobby')}
  moneda={moneda}
  onActualizarDatosAsistido={setDatosModoAsistido}
/>
        </div>

        {/* VISTA DEL SIMULADOR PRO / TEMPORAL, METAS, GRÁFICOS Y DIAGNÓSTICO */}
        {activeTab === 'simulador' && (
          <div className="space-y-6">
            {/* ENCABEZADO GUÍA DEL SIMULADOR */}
            <div className="bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#CF9D7B] animate-pulse" />
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#CF9D7B] font-semibold">
                    PASO 03 // SIMULADOR ESTRATÉGICO
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Simulación y Proyección de Escenarios
                </h2>
                <p className="text-xs text-gray-400 max-w-2xl leading-relaxed">
                  Ajusta precios, costos y ritmo de venta para proyectar tus ganancias netas antes de tomar decisiones. Evalúa si tu portafolio actual alcanza la meta financiera o si necesitas acelerar la rotación.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start md:self-auto bg-[#0D151B] px-3.5 py-2 rounded-xl border border-[#1E2D3D] text-[11px] font-mono text-gray-300">
                <span className="text-emerald-400 font-bold">⚡ Modo Interactivo:</span>
                <span>Mueve los sliders y observa el impacto en tiempo real</span>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

              {/* PANEL IZQUIERDO: CONFIGURACIÓN OPERATIVA */}
              <div className="lg:col-span-5 bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-6 rounded-2xl space-y-4 shadow-2xl">
                <div>
                  <span className="text-[11px] text-[#CF9D7B] font-mono uppercase tracking-wider font-semibold">Configuración del Escenario</span>
                  <h2 className="text-xl font-bold text-white tracking-tight mt-0.5">Variables del Negocio</h2>
                </div>

                <div className="space-y-4">
                  {/* 1. HORIZONTE Y METAS */}
                  <div className="bg-[#0D151B] p-4 rounded-xl border border-[#1E2D3D] space-y-3">
                    <div>
                      <span className="text-[11px] font-mono text-[#CF9D7B] uppercase tracking-wider block font-semibold">
                        🎯 1. Define tu Meta y Plazo
                      </span>
                      <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                        Indica cuántos meses quieres evaluar y cuál es la ganancia limpia que deseas alcanzar.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-300 block mb-1">
                          Meses a Proyectar:
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="12"
                          placeholder="1"
                          value={mesesProyeccion}
                          onChange={(e) => {
                            const val = e.target.value;
                            setMesesProyeccion(val === '' ? '' : Math.max(1, Number(val)));
                          }}
                          className="w-full bg-[#081015] border border-[#18232B] rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#CF9D7B]"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-gray-300 block mb-1">
                          Meta de Ganancia ({moneda}):
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={metaIngreso === 0 || metaIngreso === '' ? '' : metaIngreso}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            setMetaIngreso(val === '' ? '' : Number(val));
                          }}
                          className="w-full bg-[#081015] border border-[#CF9D7B]/40 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#CF9D7B]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. SELECTOR DE PRODUCTOS */}
                  {datosAuditoria?.catalogo_simulacion && datosAuditoria.catalogo_simulacion.length > 0 && (
                    <div className="bg-[#0D151B] p-3 rounded-xl border border-[#1E2D3D] flex items-center justify-between gap-3">
                      <span className="text-[11px] font-mono text-[#CF9D7B] uppercase font-semibold">
                        ➕ Agregar Producto:
                      </span>
                      <select
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) return;
                          const yaExiste = productosSimulacion.some(p => p.producto === val);
                          if (!yaExiste) {
                            const prod = datosAuditoria.catalogo_simulacion.find(p => p.producto === val);
                            if (prod) {
                              setProductosSimulacion(prev => [
                                ...prev,
                                {
                                  producto: prod.producto,
                                  precio_base: prod.precio_actual,
                                  costo_unitario: prod.costo_unitario,
                                  ventas_dia: Math.max(1, Math.round(prod.ventas_dia || 1)),
                                  porcentaje: 10,
                                  nuevo_precio: Math.round(prod.precio_actual * 1.10)
                                }
                              ]);
                            }
                          }
                          e.target.value = "";
                        }}
                        className="bg-[#081015] border border-[#1E2D3D] text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#CF9D7B]"
                      >
                        <option value="">Seleccionar del catálogo...</option>
                        {datosAuditoria.catalogo_simulacion.map((item) => (
                          <option key={item.producto} value={item.producto}>
                            {item.producto} — {formatearDinero(item.precio_actual)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* 3. LISTA DE PRODUCTOS CON SLIDERS E INPUTS */}
                  <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                    {productosSimulacion.map((prod, idx) => {
                      const aumentoMoneda = Math.round(prod.precio_base * (prod.porcentaje / 100));
                      const nuevoPrecio = prod.precio_base + aumentoMoneda;
                      const margenUnitario = nuevoPrecio - prod.costo_unitario;

                      return (
                        <div key={prod.producto} className="bg-[#0D151B] p-3.5 rounded-xl border border-[#1E2D3D] space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-xs font-bold text-white tracking-wide">{prod.producto}</h4>
                              <p className="text-[10px] text-gray-400 font-mono">
                                Base: {formatearDinero(prod.precio_base)} | Costo: {formatearDinero(prod.costo_unitario)}
                              </p>
                            </div>
                            {productosSimulacion.length > 1 && (
                              <button
                                type="button"
                                title="Quitar producto"
                                onClick={() => setProductosSimulacion(prev => prev.filter((_, i) => i !== idx))}
                                className="text-gray-500 hover:text-rose-400 text-xs px-2 py-0.5 rounded bg-[#081015] border border-[#18232B] transition-colors"
                              >
                                ✕
                              </button>
                            )}
                          </div>

                          <div className="bg-[#081015] p-2.5 rounded-lg border border-[#16222C] space-y-1.5">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-400 text-[11px]">Ajuste de Precio:</span>
                              <div className="flex items-center gap-1.5 font-mono font-bold text-[11px]">
                                <span className={prod.porcentaje >= 0 ? "text-emerald-400" : "text-rose-400"}>
                                  {prod.porcentaje > 0 ? `+${prod.porcentaje}%` : `${prod.porcentaje}%`}
                                </span>
                                <span className="text-gray-600">|</span>
                                <span className="text-[#CF9D7B]">
                                  {prod.porcentaje >= 0 ? "+" : ""}{formatearDinero(aumentoMoneda)}
                                </span>
                              </div>
                            </div>

                            <input
                              type="range"
                              min="-50"
                              max="100"
                              step="1"
                              value={prod.porcentaje}
                              onChange={(e) => {
                                const pct = Number(e.target.value);
                                setProductosSimulacion(prev => prev.map((item, i) => {
                                  if (i !== idx) return item;
                                  return {
                                    ...item,
                                    porcentaje: pct,
                                    nuevo_precio: Math.round(item.precio_base * (1 + pct / 100))
                                  };
                                }));
                              }}
                              className="w-full accent-[#CF9D7B] cursor-pointer h-1.5 bg-[#16222C] rounded-lg appearance-none"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-[#081015] p-2 rounded-lg border border-[#18232B]">
                              <label className="text-[10px] text-gray-400 block mb-1">
                                Ventas / día (uds):
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                placeholder="0"
                                value={prod.ventas_dia === 0 || prod.ventas_dia === '' ? '' : prod.ventas_dia}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setProductosSimulacion(prev => prev.map((item, i) => {
                                    if (i !== idx) return item;
                                    return { ...item, ventas_dia: val === '' ? '' : Number(val) };
                                  }));
                                }}
                                className="w-full bg-[#0D151B] border border-[#1E2D3D] rounded px-2 py-1 text-xs text-white font-mono font-bold focus:outline-none focus:border-[#CF9D7B]"
                              />
                            </div>

                            <div className="bg-[#081015] p-2 rounded-lg border border-[#18232B] flex flex-col justify-center text-right">
                              <span className="text-[10px] text-gray-400">Margen por unidad:</span>
                              <span className="text-xs font-bold text-emerald-400 font-mono">
                                {formatearDinero(margenUnitario)}
                              </span>
                              <span className="text-[9px] text-gray-500 font-mono">
                                Precio: {formatearDinero(nuevoPrecio)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 4. TOTALIZADOR DE ROTACIÓN */}
                  <div className="bg-[#0D151B] p-3 rounded-xl border border-[#1E2D3D] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-gray-400 uppercase block">Rotación Total Portafolio:</span>
                      <span className="text-xs text-gray-300 font-medium">Suma diaria de unidades</span>
                    </div>
                    <div className="text-right font-mono font-bold text-sm text-[#38BDF8] bg-[#081015] px-3 py-1.5 rounded-lg border border-[#18232B]">
                      {rotacionTotalDia} uds / día
                    </div>
                  </div>
                </div>
              </div>

              {/* PANEL DERECHO: CONSOLIDADO COMPLETO + DOBLE GRÁFICO + EXPORTACIÓN */}
              <div className="lg:col-span-7 space-y-4">
                
                {/* 1. Tarjetas Superiores de Ganancia */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-4.5 rounded-2xl space-y-1 shadow-xl">
                    <span className="text-[11px] text-gray-400 font-mono uppercase tracking-wider">
                      GANANCIA POR DÍA
                    </span>
                    <div className="text-2xl font-bold text-white tracking-tight font-mono">
                      {formatearDineroDirecto(gananciaDiariaSimulada)}
                    </div>
                    <p className="text-[10px] text-gray-400 font-mono">
                      Facturación diaria: <span className="text-white font-semibold">{formatearDineroDirecto(ventasDiariasSimuladas)}</span>
                    </p>
                  </div>

                  <div className="bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-4.5 rounded-2xl space-y-1 shadow-xl">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-[#CF9D7B] font-mono uppercase tracking-wider font-semibold">
                        GANANCIA EN {mesesValidos} {mesesValidos === 1 ? 'MES' : 'MESES'}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">({diasTotalesPeriodo} días)</span>
                    </div>
                    <div className="text-2xl font-bold text-[#CF9D7B] tracking-tight font-mono">
                      {formatearDineroDirecto(gananciaTotalPeriodo)}
                    </div>
                    <span className={`text-[10px] font-mono font-semibold ${gananciaTotalPeriodo >= gananciaBasePeriodo ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {gananciaTotalPeriodo >= gananciaBasePeriodo ? '▲ +' : '▼ -'}
                      {formatearDineroDirecto(Math.abs(gananciaTotalPeriodo - gananciaBasePeriodo))} extra vs precio base
                    </span>
                  </div>
                </div>

                {/* 2. Resumen Operativo */}
                <div className="bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-4.5 rounded-2xl space-y-2.5 shadow-xl">
                  <span className="text-[11px] text-gray-400 font-mono uppercase tracking-wider block font-semibold">
                    RESUMEN OPERATIVO ({mesesValidos} {mesesValidos === 1 ? 'MES' : 'MESES'})
                  </span>
                  <div className="grid grid-cols-3 gap-3 text-center font-mono">
                    <div className="p-2.5 bg-[#0D151B] rounded-xl border border-[#18232B]">
                      <span className="text-[10px] text-gray-400 uppercase block">UNIDADES A VENDER</span>
                      <p className="text-sm font-bold text-white mt-1">{unidadesTotalesPeriodo.toLocaleString()} uds</p>
                    </div>
                    <div className="p-2.5 bg-[#0D151B] rounded-xl border border-[#18232B]">
                      <span className="text-[10px] text-gray-400 uppercase block">FACTURACIÓN TOTAL</span>
                      <p className="text-sm font-bold text-white mt-1">{formatearDineroDirecto(facturacionTotalPeriodo)}</p>
                    </div>
                    <div className="p-2.5 bg-[#0D151B] rounded-xl border border-[#18232B]">
                      <span className="text-[10px] text-gray-400 uppercase block">MARGEN UNITARIO</span>
                      <p className="text-sm font-bold text-emerald-400 mt-1">{formatearDineroDirecto(margenUnitarioPromedio)}</p>
                    </div>
                  </div>
                </div>

                {/* 3. Plan de Meta Financiera */}
                <div className="bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-4.5 rounded-2xl space-y-2.5 shadow-xl">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-[#34D399] font-mono uppercase tracking-wider font-semibold">
                      PLAN DE META FINANCIERA
                    </span>
                    <span className="text-[11px] font-mono text-gray-300">
                      Objetivo: <span className="text-white font-bold">{formatearDineroDirecto(metaIngreso)}</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 font-mono">
                    <div className="p-2.5 bg-[#0D151B] rounded-xl border border-[#18232B]">
                      <span className="text-[10px] text-gray-400 uppercase block">UNIDADES NECESARIAS</span>
                      <p className="text-base font-bold text-white mt-0.5">{unidadesParaMeta.toLocaleString()} unidades</p>
                      <span className="text-[9px] text-gray-500">Basado en {formatearDineroDirecto(margenUnitarioPromedio)} por unidad</span>
                    </div>
                    <div className="p-2.5 bg-[#0D151B] rounded-xl border border-[#18232B]">
                      <span className="text-[10px] text-gray-400 uppercase block">TIEMPO REQUERIDO</span>
                      <p className="text-base font-bold text-emerald-400 mt-0.5">{diasParaMeta} días</p>
                      <span className="text-[9px] text-gray-500">A {rotacionTotalDia} unidades por día</span>
                    </div>
                  </div>
                </div>

                {/* 4. Doble Gráfico (Torta + Barras) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  
                  {/* Torta de Concentración */}
                  <div className="bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-4 rounded-2xl space-y-2 shadow-xl flex flex-col justify-between">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-[#CF9D7B] font-mono uppercase font-semibold">
                        Concentración del Margen
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono">Diario</span>
                    </div>

                    <div className="h-40 w-full flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={datosTortaGanancia}
                            cx="50%"
                            cy="50%"
                            innerRadius={32}
                            outerRadius={56}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {datosTortaGanancia.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORES_DONA[index % COLORES_DONA.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: '#0D161C', border: '1px solid rgba(207, 157, 123, 0.6)', borderRadius: '8px', fontSize: '11px' }}
                            formatter={(val, name) => [formatearDineroDirecto(val), name]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex flex-wrap gap-x-2.5 gap-y-1 justify-center text-[10px] font-mono">
                      {datosTortaGanancia.slice(0, 4).map((d, i) => (
                        <div key={d.name} className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORES_DONA[i % COLORES_DONA.length] }}></span>
                          <span className="text-gray-300 truncate max-w-[80px]">{d.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Barras Comparativas */}
                  <div className="bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-4 rounded-2xl space-y-2 shadow-xl flex flex-col justify-between">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-[#CF9D7B] font-mono uppercase font-semibold">
                        Base vs. Simulado
                      </span>
                      <div className="flex items-center gap-2 text-[10px] font-mono">
                        <span className="flex items-center gap-1 text-gray-400">
                          <span className="w-2 h-2 rounded-full bg-[#1E293B] border border-gray-600"></span> Base
                        </span>
                        <span className="flex items-center gap-1 text-[#CF9D7B] font-bold">
                          <span className="w-2 h-2 rounded-full bg-[#CF9D7B]"></span> Simulado
                        </span>
                      </div>
                    </div>

                    <div className="h-40 w-full pt-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={datosGraficoSimulacion} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#16222A" vertical={false} />
                          <XAxis 
                            dataKey="periodo" 
                            stroke="#9CA3AF" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={{ stroke: '#1E2E39' }} 
                          />
                          <YAxis 
                            stroke="#9CA3AF" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={{ stroke: '#1E2E39' }} 
                            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} 
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#0D161C', 
                              border: '1px solid rgba(207, 157, 123, 0.6)', 
                              borderRadius: '8px', 
                              fontSize: '11px', 
                              color: '#FFFFFF' 
                            }}
                            formatter={(val, name) => [
                              formatearDineroDirecto(val), 
                              name === 'actual' ? 'Precio Base' : 'Precio Simulado'
                            ]}
                          />
                          <Bar dataKey="actual" fill="#1E293B" stroke="#334155" radius={[3, 3, 0, 0]} name="actual" />
                          <Bar dataKey="simulado" fill="#CF9D7B" radius={[3, 3, 0, 0]} name="simulado" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="text-center font-mono text-[10px] text-gray-400">
                      Impacto estimado: <span className="text-emerald-400 font-bold">+{formatearDineroDirecto(deltaPeriodo)}</span> en {mesesValidos} meses
                    </div>
                  </div>

                </div>

                {/* 5. Botón de Exportación */}
                <div className="bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-3 rounded-2xl shadow-xl flex items-center justify-between">
                  <div className="flex items-center gap-2 pl-2">
                    <span className="text-xs text-gray-300 font-medium">📄 Reporte Integral de Estrategia</span>
                    <span className="text-[10px] text-gray-500 font-mono">(Simulación + Diagnóstico TARS)</span>
                  </div>
                  <button
                    type="button"
                    onClick={exportarPDF}
                    className="flex items-center gap-2 bg-gradient-to-r from-[#CF9D7B] to-[#b38363] hover:brightness-110 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs font-mono transition-all shadow-lg shadow-[#CF9D7B]/20 cursor-pointer"
                  >
                    <span>Descargar PDF</span>
                    <span>↓</span>
                  </button>
                </div>

              </div> {/* Cierre lg:col-span-7 */}
            </div>   {/* Cierre grid-cols-12 superior */}

            {/* ============================================================ */}
            {/* 📊 PANEL INFERIOR: HOJA DE RUTA COMERCIAL (4 TARJETAS 2x2)    */}
            {/* ============================================================ */}
            <div className="bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-6 md:p-8 rounded-2xl shadow-2xl space-y-6">
              
              {/* Encabezado: Título con punto y Píldora de Meta */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#CF9D7B]"></span>
                  <span className="text-[11px] font-mono tracking-widest text-gray-300 uppercase font-semibold">
                    DIAGNÓSTICO EJECUTIVO // HOJA DE RUTA COMERCIAL
                  </span>
                </div>
                <div className="bg-[#0D151B] px-4 py-1.5 rounded-xl border border-[#1E2D3D] text-xs font-mono self-start sm:self-auto">
                  <span className="text-gray-400">Meta: </span>
                  <span className="text-white font-bold">{formatearDineroDirecto(metaIngreso)}</span>
                </div>
              </div>

              {/* Título de Diagnóstico y Subtítulo con valores resaltados */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <span className="text-amber-400 text-lg">⚠️</span>
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    {cumpleMetaEnPeriodo ? 'Objetivo en Trayectoria Óptima' : 'Brecha Detectada: Requiere Ajuste de Estrategia'}
                  </h3>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed font-sans">
                  Con los <strong className="text-white font-bold">{productosSimulacion.length} productos</strong> en análisis, tu portafolio genera un flujo de <strong className="text-emerald-400 font-mono font-bold">{formatearDineroDirecto(gananciaDiariaSimulada)} diarios</strong> respaldado por una venta constante de <strong className="text-[#38BDF8] font-mono font-bold">{rotacionTotalDia} unidades/día</strong>.
                </p>
              </div>

              {/* Cuadrícula 2x2: Las 4 Tarjetas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. Tiempo de Alcance */}
                <div className="bg-[#090E13] p-5 rounded-xl border border-[#16222C] space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <h4 className="text-xs font-mono font-bold text-[#CF9D7B] tracking-wide">
                      1. Tiempo de Alcance:
                    </h4>
                    <p className="text-xs text-gray-300 leading-relaxed font-sans">
                      Necesitas vender <strong className="text-white font-bold">{unidadesParaMeta.toLocaleString()} unidades totales</strong> para acumular tu meta de {formatearDineroDirecto(metaIngreso)}.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#0D161D] border border-[#1E2D3D] text-xs font-mono text-emerald-400 self-start">
                    <span>🎯</span>
                    <span>Meta lograda en: <strong className="text-emerald-400 font-bold">{diasParaMeta} días</strong></span>
                  </div>
                </div>

                {/* 2. Aceleración Comercial */}
                <div className="bg-[#090E13] p-5 rounded-xl border border-[#16222C] space-y-2">
                  <h4 className="text-xs font-mono font-bold text-[#CF9D7B] tracking-wide">
                    2. Aceleración Comercial:
                  </h4>
                  <p className="text-xs text-gray-300 leading-relaxed font-sans">
                    Para lograr la meta dentro del plazo de {mesesValidos} meses ({diasTotalesPeriodo} días), debes elevar la rotación diaria de {rotacionTotalDia} a <strong className="text-white font-bold">{rotacionRequerida} unidades/día</strong>.
                  </p>
                </div>

                {/* 3. Producto Motor del Margen */}
                <div className="bg-[#090E13] p-5 rounded-xl border border-[#16222C] space-y-2">
                  <h4 className="text-xs font-mono font-bold text-[#CF9D7B] tracking-wide">
                    3. Producto Motor del Margen:
                  </h4>
                  <p className="text-xs text-gray-300 leading-relaxed font-sans">
                    <strong className="text-white font-bold">{productoLider?.nombre || 'El catálogo'}</strong> lidera el aporte financiero generando <strong className="text-emerald-400 font-mono font-bold">+{formatearDineroDirecto(productoLider?.ganancia || 0)}/día</strong> al margen total.
                  </p>
                </div>

                {/* 4. Recomendación Táctica */}
                <div className="bg-[#090E13] p-5 rounded-xl border border-[#16222C] space-y-2">
                  <h4 className="text-xs font-mono font-bold text-[#CF9D7B] tracking-wide">
                    4. Recomendación Táctica:
                  </h4>
                  <p className="text-xs text-gray-300 leading-relaxed font-sans">
                    Ajusta ligeramente el precio de los productos de mayor volumen o implementa combos para subir el ticket promedio.
                  </p>
                </div>

              </div>

              {/* Barra de Progreso hacia el Objetivo */}
              <div className="space-y-2 pt-3 border-t border-[#16222C]/80">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-gray-400 font-sans">
                    Progreso hacia el Objetivo ({mesesValidos} {mesesValidos === 1 ? 'mes' : 'meses'}):
                  </span>
                  <div className="flex items-center gap-3 font-bold">
                    <span className="text-white">
                      {formatearDineroDirecto(gananciaTotalPeriodo)} / {formatearDineroDirecto(metaIngreso)}
                    </span>
                    <span className="text-[#CF9D7B]">{porcentajeMeta}%</span>
                  </div>
                </div>
                <div className="w-full bg-[#0D151B] h-2.5 rounded-full overflow-hidden border border-[#18232B]">
                  <div 
                    className="h-full bg-gradient-to-r from-[#CF9D7B] to-[#b88565] rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, porcentajeMeta))}%` }}
                  />
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
                        Generó el mayor volumen de facturación con <span className="text-white font-mono font-medium">{formatearDinero(datosAuditoria.diagnostico.rey.ventas)}</span>
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