'use client';
import React, { useState } from 'react';
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
  DollarSign
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';

export default function ModoAsistido({ onVolverHome, moneda = 'COP' }) {
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

  const [filas, setFilas] = useState([
    { id: 1, producto: 'Arroz', cantidad: 10, costo: 1800, precio: 3000 },
    { id: 2, producto: 'Arepas', cantidad: 10, costo: 1200, precio: 2000 },
    { id: 3, producto: 'Pan tajado', cantidad: 5, costo: 900, precio: 1500 }
  ]);

  const [reporteGenerado, setReporteGenerado] = useState(null);

  const handleAgregarFila = () => {
    setFilas([
      ...filas,
      { id: Date.now(), producto: `Producto ${String.fromCharCode(65 + filas.length)}`, cantidad: 1, costo: 0, precio: 0 }
    ]);
  };

  const handleEliminarFila = (id) => {
    if (filas.length <= 1) return;
    setFilas(filas.filter((f) => f.id !== id));
  };

  const handleCambioFila = (id, campo, valor) => {
    setFilas(
      filas.map((f) => {
        if (f.id === id) {
          return {
            ...f,
            [campo]: campo === 'producto' ? valor : Math.max(0, Number(valor) || 0)
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
      if (!mapaProductos[f.producto]) {
        mapaProductos[f.producto] = { 
          nombre: f.producto, 
          ventas: 0, 
          costos: 0,
          unidades: 0 
        };
      }
      mapaProductos[f.producto].ventas += f.cantidad * f.precio;
      mapaProductos[f.producto].costos += f.cantidad * f.costo;
      mapaProductos[f.producto].unidades += f.cantidad;
    });

    const ranking = Object.values(mapaProductos).map(p => ({
      ...p,
      ganancia: p.ventas - p.costos,
      margenPct: p.ventas > 0 ? ((p.ventas - p.costos) / p.ventas) * 100 : 0
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
      ranking: ranking.slice(0, 5),
      rey,
      hueso,
      recomendaciones
    });
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto pb-12">
      
      {/* Barra superior limpia */}
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
                const subtotal = fila.cantidad * fila.precio;
                const costoTotal = fila.cantidad * fila.costo;
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
                    <td className="p-2 w-24">
                      <input 
                        type="number" 
                        value={fila.cantidad} 
                        onChange={(e) => handleCambioFila(fila.id, 'cantidad', e.target.value)}
                        className="w-full bg-[#070D12] border border-[#1B2935] focus:border-[#CF9D7B] rounded-lg px-2.5 py-1.5 text-white outline-none"
                      />
                    </td>
                    <td className="p-2 w-32">
                      <input 
                        type="number" 
                        value={fila.costo} 
                        onChange={(e) => handleCambioFila(fila.id, 'costo', e.target.value)}
                        className="w-full bg-[#070D12] border border-[#1B2935] focus:border-[#CF9D7B] rounded-lg px-2.5 py-1.5 text-white outline-none"
                      />
                    </td>
                    <td className="p-2 w-32">
                      <input 
                        type="number" 
                        value={fila.precio} 
                        onChange={(e) => handleCambioFila(fila.id, 'precio', e.target.value)}
                        className="w-full bg-[#070D12] border border-[#1B2935] focus:border-[#CF9D7B] rounded-lg px-2.5 py-1.5 text-white outline-none"
                      />
                    </td>
                    <td className="p-3 font-semibold text-[#CF9D7B]">
                      {formatoMoneda(subtotal)}
                    </td>
                    <td className="p-3 font-mono">
                      <span className={`px-2 py-0.5 rounded text-[11px] ${margenFila >= 30 ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40' : 'bg-amber-950/60 text-amber-400 border border-amber-800/40'}`}>
                        {margenFila.toFixed(1)}%
                      </span>
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
          
          {/* Métricas Clave */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-5 rounded-2xl">
              <span className="text-xs text-gray-400 font-mono uppercase">Ventas Totales</span>
              <p className="text-2xl font-bold text-[#CF9D7B] mt-1 font-mono">{formatoMoneda(reporteGenerado.totalVentas)}</p>
            </div>
            <div className="bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-5 rounded-2xl">
              <span className="text-xs text-gray-400 font-mono uppercase">Costo Proveedores</span>
              <p className="text-2xl font-bold text-gray-300 mt-1 font-mono">{formatoMoneda(reporteGenerado.totalCostos)}</p>
            </div>
            <div className="bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-5 rounded-2xl">
              <span className="text-xs text-gray-400 font-mono uppercase">Ganancia Bruta</span>
              <p className="text-2xl font-bold text-emerald-400 mt-1 font-mono">{formatoMoneda(reporteGenerado.gananciaTotal)}</p>
            </div>
            <div className="bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-5 rounded-2xl">
              <span className="text-xs text-gray-400 font-mono uppercase">Precio Promedio</span>
              <p className="text-2xl font-bold text-white mt-1 font-mono">{formatoMoneda(reporteGenerado.precioPromedio)}</p>
            </div>
          </div>

          {/* Gráfico y Bloque Diagnóstico de 3 Columnas */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Gráfico de barras */}
            <div className="lg:col-span-6 bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-6 rounded-2xl space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-xs text-[#CF9D7B] font-mono uppercase font-semibold">Participación</span>
                  <h4 className="text-base font-bold text-white">Facturación por Producto</h4>
                </div>
                <BarChart3 className="w-5 h-5 text-[#CF9D7B]" />
              </div>
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reporteGenerado.ranking} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#16222A" vertical={false} />
                    <XAxis dataKey="nombre" stroke="#6B7280" fontSize={11} tickLine={false} axisLine={{ stroke: '#1E2E39' }} />
                    <YAxis stroke="#6B7280" fontSize={11} tickLine={false} axisLine={{ stroke: '#1E2E39' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0D161C', border: '1px solid rgba(207, 157, 123, 0.6)', borderRadius: '10px' }}
                      formatter={(val) => [formatoMoneda(val), 'Ventas']}
                    />
                    <Bar dataKey="ventas" fill="#CF9D7B" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Triada Diagnóstica: Estrella, Rendimiento Global y Crítico */}
            <div className="lg:col-span-6 grid grid-cols-1 gap-3.5">
              
              <div className="bg-[#081015]/90 backdrop-blur-xl border border-emerald-900/40 p-4 rounded-2xl space-y-1">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Award className="w-4 h-4" />
                  <span className="text-[11px] font-semibold uppercase font-mono">Producto Estrella</span>
                </div>
                <div className="flex justify-between items-center">
                  <h5 className="text-base font-bold text-white">{reporteGenerado.rey.nombre}</h5>
                  <span className="text-xs font-mono text-emerald-400 font-semibold">{formatoMoneda(reporteGenerado.rey.ventas)}</span>
                </div>
              </div>

              {/* Tarjeta Central: Margen y Eficiencia de Costos */}
              <div className="bg-[#081015]/90 backdrop-blur-xl border border-[#CF9D7B]/40 p-4 rounded-2xl space-y-1">
                <div className="flex items-center gap-2 text-[#CF9D7B]">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-[11px] font-semibold uppercase font-mono">Eficiencia del Catálogo</span>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-gray-400">Margen Comercial Promedio:</p>
                    <span className="text-lg font-bold text-white font-mono">{reporteGenerado.margenGlobalPct.toFixed(1)}%</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Ganancia Neta Base:</p>
                    <span className="text-sm font-bold text-emerald-400 font-mono">+{formatoMoneda(reporteGenerado.gananciaTotal)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#081015]/90 backdrop-blur-xl border border-rose-900/40 p-4 rounded-2xl space-y-1">
                <div className="flex items-center gap-2 text-rose-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-[11px] font-semibold uppercase font-mono">Producto Crítico</span>
                </div>
                <div className="flex justify-between items-center">
                  <h5 className="text-base font-bold text-white">{reporteGenerado.hueso.nombre}</h5>
                  <span className="text-xs font-mono text-rose-400 font-semibold">{formatoMoneda(reporteGenerado.hueso.ventas)}</span>
                </div>
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