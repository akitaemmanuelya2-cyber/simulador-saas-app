'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Sparkles, 
  BarChart3, 
  Award, 
  AlertTriangle, 
  TrendingUp, 
  Lightbulb, 
  CheckCircle2,
  DollarSign,
  PieChart,
  Target
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
  Legend
} from 'recharts';

export default function ModoAsistido({ onVolverHome, moneda = 'COP', onActualizarDatosAsistido }) {
  const formatoMoneda = (val) => {
    const num = Number(val || 0);
    if (moneda === 'COP') {
      return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
    } else if (moneda === 'USD') {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(num);
    } else if (moneda === 'EUR') {
      return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(num);
    }
    return `$ ${num.toLocaleString()}`;
  };

  // Paleta Cyber-Slate para consistencia de marca
  const PALETA_COLORES = [
    '#38BDF8', // Cyan Eléctrico
    '#F472B6', // Rosa Neón
    '#34D399', // Menta Esmeralda
    '#FBBF24', // Ámbar Solar
    '#A78BFA', // Violeta Astral
    '#FB923C', // Naranja Mandarina
    '#2DD4BF', // Turquesa Glaciar
    '#E879F9'  // Orquídea Neón
  ];

  // Estado inicial limpio para ingreso de datos
  const [filas, setFilas] = useState([
    { id: 1, producto: '', unidades: '', costo: '', precio: '' },
    { id: 2, producto: '', unidades: '', costo: '', precio: '' },
    { id: 3, producto: '', unidades: '', costo: '', precio: '' }
  ]);

  const [reporteGenerado, setReporteGenerado] = useState(null);
  const [tabGraficaAsistido, setTabGraficaAsistido] = useState('barras'); // 'barras' | 'matriz' | 'estructura'
  const [criterioBarras, setCriterioBarras] = useState('ventas'); // 'ventas' | 'unidades'

// Sincronizar datos con el padre sin generar loop de re-renders
  useEffect(() => {
    if (typeof onActualizarDatosAsistido === 'function') {
      onActualizarDatosAsistido({ filas, reporteGenerado });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filas, reporteGenerado]);

  const handleAgregarFila = () => {
    setFilas([
      ...filas,
      { id: Date.now(), producto: `Producto ${String.fromCharCode(65 + filas.length)}`, unidades: '', costo: '', precio: '' }
    ]);
  };

const handleCambioFila = (id, campo, valor) => {
    setFilas(
      filas.map((f) => {
        if (f.id === id) {
          if (campo === 'producto') {
            return { ...f, [campo]: valor };
          }
          // Si el usuario borra todo el input, dejamos el string vacío '' para que no force un 0
          if (valor === '') {
            return { ...f, [campo]: '' };
          }
          const valorNum = Number(valor);
          return {
            ...f,
            [campo]: isNaN(valorNum) ? '' : Math.max(0, valorNum)
          };
        }
        return f;
      })
    );
  };

  const procesarEnLugar = () => {
    const totalVentas = filas.reduce((acc, d) => acc + d.cantidad * d.precio, 0);
    const totalCostos = filas.reduce((acc, d) => acc + d.cantidad * d.costo, 0);
    const totalUnidades = filas.reduce((acc, d) => acc + d.cantidad, 0);
    const precioPromedio = totalUnidades > 0 ? totalVentas / totalUnidades : 0;
    const gananciaTotal = totalVentas - totalCostos;
    const margenGlobalPct = totalVentas > 0 ? (gananciaTotal / totalVentas) * 100 : 0;

    const mapaProductos = {};
    filas.forEach((f) => {
      if (!f.producto || !f.producto.trim()) return;
      const nom = f.producto.trim();
      if (!mapaProductos[nom]) {
        mapaProductos[nom] = { 
          nombre: nom, 
          ventas: 0, 
          costos: 0,
          unidades: 0,
          costoUnitario: f.costo,
          precioUnitario: f.precio
        };
      }
      mapaProductos[nom].ventas += f.cantidad * f.precio;
      mapaProductos[nom].costos += f.cantidad * f.costo;
      mapaProductos[nom].unidades += f.cantidad;
    });

    const ranking = Object.values(mapaProductos).map((p, idx) => ({
      ...p,
      ganancia: p.ventas - p.costos,
      margenPct: p.ventas > 0 ? ((p.ventas - p.costos) / p.ventas) * 100 : 0,
      color: PALETA_COLORES[idx % PALETA_COLORES.length]
    })).sort((a, b) => b.ventas - a.ventas);

    const rey = ranking[0] || { nombre: 'N/A', ventas: 0, unidades: 0, ganancia: 0, margenPct: 0 };
    const hueso = ranking[ranking.length - 1] || { nombre: 'N/A', ventas: 0, unidades: 0, ganancia: 0, margenPct: 0 };

    const pctRey = totalVentas > 0 ? (rey.ventas / totalVentas) * 100 : 0;
    const recomendaciones = [
      {
        titulo: pctRey > 40 ? 'Riesgo de Concentración de Ingresos' : 'Portafolio Diversificado',
        descripcion: pctRey > 40 
          ? `El producto "${rey.nombre}" aporta el ${pctRey.toFixed(1)}% de la facturación global. Es prioritario potenciar los demás ítems para mitigar dependencia.`
          : `Tus ventas presentan una distribución equilibrada en el catálogo ingresado.`
      },
      {
        titulo: `Rentabilidad y Margen Comercial (${margenGlobalPct.toFixed(1)}%)`,
        descripcion: margenGlobalPct < 25 
          ? `El margen bruto promedio es ajustado (${margenGlobalPct.toFixed(1)}%). Revisa negociaciones de costo con proveedores o ajusta el precio base.`
          : `Margen bruto saludable del ${margenGlobalPct.toFixed(1)}%. Tu estructura de precios cubre sólidamente los costos de adquisición.`
      },
      {
        titulo: `Estrategia para "${hueso.nombre}"`,
        descripcion: `Aporta la menor facturación (${formatoMoneda(hueso.ventas)}) con un margen de ${hueso.margenPct.toFixed(1)}%. Considera venderlo en combo o descontinuarlo.`
      }
    ];

    setReporteGenerado({
      totalRegistros: filas.length,
      totalVentas,
      totalCostos,
      gananciaTotal,
      margenGlobalPct,
      totalUnidades,
      precioPromedio,
      ranking,
      rey,
      hueso,
      recomendaciones
    });
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto pb-12">
      
      {/* Barra superior */}
      <div className="flex justify-between items-center bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-6 rounded-2xl shadow-2xl">
        <div className="flex items-center gap-3">
          <button 
            onClick={onVolverHome}
            className="p-2 bg-[#0D151B] border border-[#18232B] hover:border-[#CF9D7B]/60 text-gray-300 hover:text-white rounded-xl transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Modo Asistido // Captura de Operaciones</h2>
            <p className="text-xs text-gray-400">Ingresa tus productos, costos unitarios y precios para auditar márgenes y concentración.</p>
          </div>
        </div>

        <button 
          onClick={handleAgregarFila}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0D151B] text-[#CF9D7B] border border-[#CF9D7B]/40 hover:bg-[#16222C] text-xs font-semibold rounded-xl transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          Añadir Fila
        </button>
      </div>

      {/* Grid de edición manual */}
      <div className="bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-6 md:p-8 rounded-2xl shadow-2xl space-y-6">
        <div className="overflow-x-auto max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-[#1D2B36] border border-[#18232B] rounded-xl">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-[#0D151B] border-b border-[#18232B] text-gray-400 uppercase tracking-wider text-[10px]">
                <th className="p-3">#</th>
                <th className="p-3">Producto</th>
                <th className="p-3">Unidades</th>
                <th className="p-3">Costo Proveedor ({moneda})</th>
                <th className="p-3">Precio Venta ({moneda})</th>
                <th className="p-3">Subtotal Venta</th>
                <th className="p-3">Margen Estimado</th>
                <th className="p-3 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#141F28] text-gray-200">
              {filas.map((fila, index) => {
  const cant = Number(fila.unidades || fila.cantidad || 0);
  const prec = Number(fila.precio || 0);
  const cost = Number(fila.costo || 0);

  const subtotal = cant * prec;
  const costoTotal = cant * cost;
  const margenFila = subtotal > 0 ? ((subtotal - costoTotal) / subtotal) * 100 : 0;

                return (
                  <tr key={fila.id} className="hover:bg-[#0B1319]/80 transition-colors">
                    <td className="p-3 text-gray-500">{index + 1}</td>
                    <td className="p-2">
                      <input 
                        type="text" 
                        value={fila.producto} 
                        onChange={(e) => handleCambioFila(fila.id, 'producto', e.target.value)}
                        className="w-full bg-[#070D12] border border-[#1B2935] focus:border-[#CF9D7B] rounded-lg px-2.5 py-1.5 text-white outline-none"
                      />
                    </td>
                    {/* UNIDADES */}
              <td className="p-2 w-24">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={fila.unidades ?? fila.cantidad ?? ''}
                  onChange={(e) => handleCambioFila(fila.id, 'unidades', e.target.value)}
                  className="w-full bg-[#070D12] border border-[#1B2935] focus:border-[#CF9D7B] rounded-lg px-2.5 py-1.5 text-white outline-none text-right font-mono"
                />
              </td>

              {/* COSTO PROVEEDOR */}
              <td className="p-2 w-32">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={fila.costo ?? ''}
                  onChange={(e) => handleCambioFila(fila.id, 'costo', e.target.value)}
                  className="w-full bg-[#070D12] border border-[#1B2935] focus:border-[#CF9D7B] rounded-lg px-2.5 py-1.5 text-white outline-none text-right font-mono"
                />
              </td>

              {/* PRECIO VENTA */}
              <td className="p-2 w-32">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={fila.precio ?? ''}
                  onChange={(e) => handleCambioFila(fila.id, 'precio', e.target.value)}
                  className="w-full bg-[#070D12] border border-[#1B2935] focus:border-[#CF9D7B] rounded-lg px-2.5 py-1.5 text-white outline-none text-right font-mono"
                />
              </td>
                    {/* SUBTOTAL */}
              <td className="p-3 font-semibold text-[#CF9D7B]">
                {formatoMoneda((Number(fila.unidades || fila.cantidad || 0)) * (Number(fila.precio || 0)))}
              </td>

              {/* MARGEN */}
              <td className="p-3 font-mono">
                {(() => {
                  const p = Number(fila.precio || 0);
                  const c = Number(fila.costo || 0);
                  if (p <= 0) {
                    return (
                      <span className="px-2 py-0.5 rounded text-[11px] bg-amber-950/40 text-amber-400 border border-amber-800/40">
                        0.0%
                      </span>
                    );
                  }
                  const margen = ((p - c) / p) * 100;
                  return (
                    <span className={`px-2 py-0.5 rounded text-[11px] ${
                      margen >= 30 
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40' 
                        : 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                    }`}>
                      {margen.toFixed(1)}%
                    </span>
                  );
                })()}
              </td>
                    <td className="p-3 text-center">
                      <button 
                        onClick={() => handleEliminarFila(fila.id)}
                        className="p-1.5 hover:bg-rose-950/40 text-gray-500 hover:text-rose-400 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end pt-2">
          <button 
            onClick={procesarEnLugar}
            className="inline-flex items-center gap-2 px-7 py-3 bg-[#CF9D7B] text-[#05080A] text-xs font-bold uppercase tracking-wider rounded-full hover:shadow-[0_0_20px_rgba(207,157,123,0.4)] transition-all cursor-pointer font-sans"
          >
            <Sparkles className="w-4 h-4" />
            Auditar y Generar Diagnóstico
          </button>
        </div>
      </div>

      {/* RESULTADOS Y DIAGNÓSTICO ESTRATÉGICO */}
      {reporteGenerado && (
        <div className="space-y-8 animate-fadeIn">
          
          {/* Métricas Clave con Explicación Clara */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-5 rounded-2xl shadow-xl flex flex-col justify-between">
              <div>
                <span className="text-xs text-gray-400 font-mono uppercase tracking-wider">Ventas Totales</span>
                <p className="text-2xl font-bold text-[#CF9D7B] mt-1 font-mono">{formatoMoneda(reporteGenerado.totalVentas)}</p>
              </div>
              <p className="text-[11px] text-gray-400 mt-2">Dinero bruto ingresado por todas las ventas.</p>
            </div>

            <div className="bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-5 rounded-2xl shadow-xl flex flex-col justify-between">
              <div>
                <span className="text-xs text-gray-400 font-mono uppercase tracking-wider">Costo Proveedores</span>
                <p className="text-2xl font-bold text-gray-300 mt-1 font-mono">{formatoMoneda(reporteGenerado.totalCostos)}</p>
              </div>
              <p className="text-[11px] text-gray-400 mt-2">Lo que te costó comprar la mercancía.</p>
            </div>

            <div className="bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-5 rounded-2xl shadow-xl flex flex-col justify-between">
              <div>
                <span className="text-xs text-gray-400 font-mono uppercase tracking-wider">Ganancia Bruta</span>
                <p className="text-2xl font-bold text-emerald-400 mt-1 font-mono">{formatoMoneda(reporteGenerado.gananciaTotal)}</p>
              </div>
              <p className="text-[11px] text-gray-400 mt-2">La plata real que te queda en el bolsillo.</p>
            </div>

            <div className="bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-5 rounded-2xl shadow-xl flex flex-col justify-between">
              <div>
                <span className="text-xs text-gray-400 font-mono uppercase tracking-wider">Precio Promedio</span>
                <p className="text-2xl font-bold text-white mt-1 font-mono">{formatoMoneda(reporteGenerado.precioPromedio)}</p>
              </div>
              <p className="text-[11px] text-gray-400 mt-2">Ticket medio por cada unidad que vendes.</p>
            </div>
          </div>

          {/* SUITE GRÁFICA MULTI-PESTAÑA Y TRÍADA DE DIAGNÓSTICO */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Panel Gráfico Interactivo (7 cols) */}
            <div className="lg:col-span-7 bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-6 rounded-2xl shadow-xl space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#141F28] pb-3">
                  <div>
                    <span className="text-[10px] font-mono text-[#CF9D7B] uppercase tracking-wider font-semibold">
                      Vista Gráfica
                    </span>
                    <h4 className="text-base font-bold text-white tracking-tight">
                      {tabGraficaAsistido === 'barras' && '¿Cómo se reparten tus ventas?'}
                      {tabGraficaAsistido === 'matriz' && 'Costo vs. Precio de Venta (3D)'}
                      {tabGraficaAsistido === 'estructura' && '¿Cuánto se va al proveedor y cuánto te queda?'}
                    </h4>
                  </div>

                  {/* Selector de Pestañas */}
                  <div className="flex items-center gap-1.5 bg-[#0D151B] p-1 rounded-xl border border-[#18232B]">
                    <button
                      type="button"
                      onClick={() => setTabGraficaAsistido('barras')}
                      className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                        tabGraficaAsistido === 'barras'
                          ? 'bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40 font-bold shadow-sm'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Barras
                    </button>
                    <button
                      type="button"
                      onClick={() => setTabGraficaAsistido('matriz')}
                      className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                        tabGraficaAsistido === 'matriz'
                          ? 'bg-[#F472B6]/20 text-[#F472B6] border border-[#F472B6]/40 font-bold shadow-sm'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Matriz 3D
                    </button>
                    <button
                      type="button"
                      onClick={() => setTabGraficaAsistido('estructura')}
                      className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                        tabGraficaAsistido === 'estructura'
                          ? 'bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/40 font-bold shadow-sm'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Estructura
                    </button>
                  </div>
                </div>

                {/* Sub-selector para gráfico de barras */}
                {tabGraficaAsistido === 'barras' && (
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setCriterioBarras('ventas')}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${criterioBarras === 'ventas' ? 'bg-[#38BDF8]/20 text-[#38BDF8] font-bold' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      • Por Dinero ($)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCriterioBarras('unidades')}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${criterioBarras === 'unidades' ? 'bg-[#F472B6]/20 text-[#F472B6] font-bold' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      • Por Cantidad (Uds)
                    </button>
                  </div>
                )}
              </div>

              {/* RENDERIZADO DINÁMICO DE GRÁFICOS */}
              <div className="h-64 w-full pt-2">
                
                {/* 1. Vista de Barras */}
                {tabGraficaAsistido === 'barras' && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reporteGenerado.ranking} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#16222A" vertical={false} />
                      <XAxis dataKey="nombre" stroke="#6B7280" fontSize={11} tickLine={false} axisLine={{ stroke: '#1E2E39' }} />
                      <YAxis stroke="#6B7280" fontSize={11} tickLine={false} axisLine={{ stroke: '#1E2E39' }} tickFormatter={(v) => criterioBarras === 'unidades' ? v : `$${(v/1000).toFixed(0)}k`} />
                      <Tooltip 
                        cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            const esUds = criterioBarras === 'unidades';
                            return (
                              <div className="bg-[#0E171E] border border-[#1E2D3D] p-3 rounded-xl shadow-2xl text-xs space-y-1">
                                <p className="font-bold text-white flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
                                  {data.nombre}
                                </p>
                                <p className="text-gray-300">
                                  {esUds ? 'Unidades vendidas: ' : 'Ventas totales: '}
                                  <span className={`font-mono font-bold ${esUds ? 'text-[#F472B6]' : 'text-[#38BDF8]'}`}>
                                    {esUds ? `${data.unidades} uds` : formatoMoneda(data.ventas)}
                                  </span>
                                </p>
                                <p className="text-gray-400 text-[10px]">Margen de ganancia: {data.margenPct.toFixed(1)}%</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar 
                        dataKey={criterioBarras === 'unidades' ? 'unidades' : 'ventas'} 
                        radius={[6, 6, 0, 0]}
                      >
                        {reporteGenerado.ranking.map((entry, index) => (
                          <Cell key={`bar-asist-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}

                {/* 2. Vista de Matriz Costo vs Precio (3D) */}
                {tabGraficaAsistido === 'matriz' && (
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 10, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#16222A" />
                      <XAxis 
                        type="number" 
                        dataKey="costoUnitario" 
                        name="Costo Unitario" 
                        stroke="#6B7280" 
                        fontSize={11} 
                        tickLine={false}
                        tickFormatter={(v) => `$${v}`}
                      />
                      <YAxis 
                        type="number" 
                        dataKey="precioUnitario" 
                        name="Precio Venta" 
                        stroke="#6B7280" 
                        fontSize={11} 
                        tickLine={false}
                        tickFormatter={(v) => `$${v}`}
                      />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3', stroke: '#F472B6', strokeOpacity: 0.3 }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-[#0E171E] border border-[#1E2D3D] p-3 rounded-xl shadow-2xl text-xs space-y-1">
                                <p className="font-bold text-white flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
                                  {data.nombre}
                                </p>
                                <p className="text-gray-300">Te cuesta: <span className="font-mono text-gray-400">{formatoMoneda(data.costoUnitario)}</span></p>
                                <p className="text-gray-300">Lo vendes en: <span className="font-mono text-[#38BDF8]">{formatoMoneda(data.precioUnitario)}</span></p>
                                <p className="text-gray-300">Ganas por unidad: <span className="font-mono text-[#34D399] font-bold">+{formatoMoneda(data.precioUnitario - data.costoUnitario)} ({data.margenPct.toFixed(1)}%)</span></p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Scatter 
                        name="Productos" 
                        data={reporteGenerado.ranking}
                        shape={(props) => {
                          const { cx, cy, fill } = props;
                          return (
                            <g>
                              <circle cx={cx} cy={cy} r={14} fill="none" stroke="#FFFFFF" strokeWidth={2.5} opacity={0.85} />
                              <circle cx={cx} cy={cy} r={11} fill={fill} />
                              <circle cx={cx - 3.5} cy={cy - 3.5} r={3} fill="#FFFFFF" opacity={0.65} />
                            </g>
                          );
                        }}
                      >
                        {reporteGenerado.ranking.map((entry, index) => (
                          <Cell key={`scatter-asist-${index}`} fill={entry.color} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                )}

                {/* 3. Vista de Estructura de Costos vs Ganancia */}
                {tabGraficaAsistido === 'estructura' && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reporteGenerado.ranking} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#16222A" vertical={false} />
                      <XAxis dataKey="nombre" stroke="#6B7280" fontSize={11} tickLine={false} axisLine={{ stroke: '#1E2E39' }} />
                      <YAxis stroke="#6B7280" fontSize={11} tickLine={false} axisLine={{ stroke: '#1E2E39' }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                      <Tooltip 
                        cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-[#0E171E] border border-[#1E2D3D] p-3 rounded-xl shadow-2xl text-xs space-y-1">
                                <p className="font-bold text-white">{data.nombre}</p>
                                <p className="text-gray-300">Al proveedor: <span className="font-mono text-rose-400">{formatoMoneda(data.costos)}</span></p>
                                <p className="text-gray-300">Para tu bolsillo: <span className="font-mono text-[#34D399] font-bold">+{formatoMoneda(data.ganancia)}</span></p>
                                <p className="text-gray-400 text-[10px] border-t border-[#1E2D3D] pt-1">Total vendido: {formatoMoneda(data.ventas)}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="costos" name="Costo Proveedores" fill="#E11D48" stackId="a" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="ganancia" name="Ganancia Neta" fill="#34D399" stackId="a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}

              </div>

              {/* Descripción Clara y Relajada en Lenguaje Natural */}
              <div className="p-3.5 bg-[#0A1218] border border-[#182633] rounded-xl text-xs">
                {tabGraficaAsistido === 'barras' && (
                  <p className="text-gray-300 leading-relaxed">
                    <span className="text-[#38BDF8] font-bold">En resumen:</span> Tu producto más fuerte en ventas es <strong className="text-white">{reporteGenerado.rey.nombre}</strong> con <span className="text-[#38BDF8] font-mono font-bold">{formatoMoneda(reporteGenerado.rey.ventas)}</span> generados ({reporteGenerado.rey.unidades} unidades vendidas).
                  </p>
                )}
                {tabGraficaAsistido === 'matriz' && (
                  <p className="text-gray-300 leading-relaxed">
                    <span className="text-[#F472B6] font-bold">En resumen:</span> Las esferas más altas son las que más margen te dejan. El producto más rentable es <strong className="text-white">{[...reporteGenerado.ranking].sort((a,b) => b.margenPct - a.margenPct)[0]?.nombre}</strong> con un <span className="text-emerald-400 font-mono font-bold">{[...reporteGenerado.ranking].sort((a,b) => b.margenPct - a.margenPct)[0]?.margenPct.toFixed(1)}%</span> de ganancia limpia por unidad.
                  </p>
                )}
                {tabGraficaAsistido === 'estructura' && (
                  <p className="text-gray-300 leading-relaxed">
                    <span className="text-[#34D399] font-bold">En resumen:</span> De los <span className="text-white font-mono font-bold">{formatoMoneda(reporteGenerado.totalVentas)}</span> que vendiste, <span className="text-rose-400 font-mono">{formatoMoneda(reporteGenerado.totalCostos)}</span> se fueron pagando costos y te quedaron libres <span className="text-emerald-400 font-mono font-bold">+{formatoMoneda(reporteGenerado.gananciaTotal)}</span>.
                  </p>
                )}
              </div>
            </div>

            {/* Tríada de Resumen Rápido (5 cols) */}
            <div className="lg:col-span-5 grid grid-cols-1 gap-3.5">
              
              <div className="bg-[#081015]/90 backdrop-blur-xl border border-emerald-900/40 p-4 rounded-2xl space-y-1 shadow-lg">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Award className="w-4 h-4" />
                  <span className="text-[11px] font-semibold uppercase font-mono">El que más vende</span>
                </div>
                <div className="flex justify-between items-center">
                  <h5 className="text-base font-bold text-white">{reporteGenerado.rey.nombre}</h5>
                  <span className="text-xs font-mono text-emerald-400 font-semibold">{formatoMoneda(reporteGenerado.rey.ventas)}</span>
                </div>
                <p className="text-[11px] text-gray-400">Es el que te trae la mayor cantidad de dinero al negocio.</p>
              </div>

              <div className="bg-[#081015]/90 backdrop-blur-xl border border-[#CF9D7B]/40 p-4 rounded-2xl space-y-1 shadow-lg">
                <div className="flex items-center gap-2 text-[#CF9D7B]">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-[11px] font-semibold uppercase font-mono">Rendimiento General</span>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-gray-400">Margen promedio:</p>
                    <span className="text-lg font-bold text-white font-mono">{reporteGenerado.margenGlobalPct.toFixed(1)}%</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Ganancia limpia total:</p>
                    <span className="text-sm font-bold text-emerald-400 font-mono">+{formatoMoneda(reporteGenerado.gananciaTotal)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#081015]/90 backdrop-blur-xl border border-rose-900/40 p-4 rounded-2xl space-y-1 shadow-lg">
                <div className="flex items-center gap-2 text-rose-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-[11px] font-semibold uppercase font-mono">El más flojo en ventas</span>
                </div>
                <div className="flex justify-between items-center">
                  <h5 className="text-base font-bold text-white">{reporteGenerado.hueso.nombre}</h5>
                  <span className="text-xs font-mono text-rose-400 font-semibold">{formatoMoneda(reporteGenerado.hueso.ventas)}</span>
                </div>
                <p className="text-[11px] text-gray-400">El que menos ventas generó. Conviene impulsarlo o replantearlo.</p>
              </div>

            </div>

          </div>

          {/* RECOMENDACIONES ESTRATÉGICAS */}
          <div className="bg-[#081015]/90 backdrop-blur-xl border border-[#CF9D7B]/40 p-6 md:p-8 rounded-2xl shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#0D151B] border border-[#CF9D7B]/30 flex items-center justify-center text-[#CF9D7B]">
                <Lightbulb className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Recomendaciones Estratégicas Automatizadas</h4>
                <p className="text-xs text-gray-400">Directrices generadas considerando precios, costos y márgenes de rentabilidad.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {reporteGenerado.recomendaciones.map((rec, i) => (
                <div 
                  key={i} 
                  className="bg-[#0D151B] border border-[#1A2834] p-4 rounded-xl space-y-2 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[#CF9D7B]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold font-mono tracking-tight">{rec.titulo}</span>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">{rec.descripcion}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}