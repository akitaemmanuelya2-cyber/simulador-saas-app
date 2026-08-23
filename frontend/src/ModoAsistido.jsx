'use client';
import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Upload, 
  Download, 
  Sparkles, 
  BarChart3, 
  Award, 
  AlertTriangle, 
  TrendingUp, 
  Lightbulb, 
  CheckCircle2,
  RefreshCcw
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

export default function ModoAsistido({ onVolverHome, moneda = 'USD', formatearDinero }) {
  // Función auxiliar de respaldo por si no se pasa por props
  const formatoMoneda = (val) => {
    if (typeof formatearDinero === 'function') return formatearDinero(val);
    return `$ ${Number(val || 0).toLocaleString()}`;
  };

  const [filas, setFilas] = useState([
    { id: 1, producto: 'Producto A', cantidad: 10, precio: 50 },
    { id: 2, producto: 'Producto B', cantidad: 5, precio: 120 },
    { id: 3, producto: 'Producto C', cantidad: 20, precio: 15 }
  ]);

  const [reporteGenerado, setReporteGenerado] = useState(null);

  // Manejadores de la tabla
  const handleAgregarFila = () => {
    setFilas([
      ...filas,
      { id: Date.now(), producto: `Producto ${String.fromCharCode(65 + filas.length)}`, cantidad: 1, precio: 10 }
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

  // Descarga de Plantilla CSV
  const descargarPlantillaCSV = () => {
    const encabezados = 'Product,Units,UnitPrice\n';
    const filasEjemplo = 'Laptop,15,800\nMonitor,25,250\nTeclado,50,45\nMouse,60,25\n';
    const blob = new Blob([encabezados + filasEjemplo], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'plantilla_asistida.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Carga directa de CSV en Modo Asistido
  const handleCargarCSVManual = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const lineas = text.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lineas.length <= 1) return;

      const nuevasFilas = lineas.slice(1).map((linea, index) => {
        const cols = linea.split(',').map((c) => c.trim().replace(/"/g, ''));
        return {
          id: Date.now() + index,
          producto: cols[0] || `Item ${index + 1}`,
          cantidad: Number(cols[1]) || 1,
          precio: Number(cols[2]) || 10
        };
      });

      setFilas(nuevasFilas);
    };
    reader.readAsText(file);
  };

  // Procesamiento y Generación de Resultados en la misma vista
  const procesarEnLugar = () => {
    const totalVentas = filas.reduce((acc, d) => acc + d.cantidad * d.precio, 0);
    const totalUnidades = filas.reduce((acc, d) => acc + d.cantidad, 0);
    const precioPromedio = totalUnidades > 0 ? totalVentas / totalUnidades : 0;

    // Agrupar por producto
    const mapaProductos = {};
    filas.forEach((f) => {
      if (!mapaProductos[f.producto]) {
        mapaProductos[f.producto] = { nombre: f.producto, ventas: 0, unidades: 0 };
      }
      mapaProductos[f.producto].ventas += f.cantidad * f.precio;
      mapaProductos[f.producto].unidades += f.cantidad;
    });

    const ranking = Object.values(mapaProductos).sort((a, b) => b.ventas - a.ventas);
    const rey = ranking[0] || { nombre: 'N/A', ventas: 0, unidades: 0 };
    const hueso = ranking[ranking.length - 1] || { nombre: 'N/A', ventas: 0, unidades: 0 };

    // Generación de recomendaciones analíticas
    const pctRey = totalVentas > 0 ? (rey.ventas / totalVentas) * 100 : 0;
    const recomendaciones = [
      {
        tipo: pctRey > 40 ? 'alerta' : 'estrategia',
        titulo: pctRey > 40 ? 'Concentración Crítica de Catálogo' : 'Equilibrio de Portafolio',
        descripcion: pctRey > 40 
          ? `El producto "${rey.nombre}" genera el ${pctRey.toFixed(1)}% de todos tus ingresos. Se recomienda diversificar para reducir la vulnerabilidad comercial.`
          : `Tus ingresos están balanceados; ningún producto acapara un porcentaje de riesgo desmedido.`
      },
      {
        tipo: 'optimizacion',
        titulo: `Plan de Rescate o Depuración para "${hueso.nombre}"`,
        descripcion: `Registró la facturación más baja (${formatoMoneda(hueso.ventas)}). Considera crear bundles (paquetes combinados con ${rey.nombre}) o liquidar inventario para liberar capital de trabajo.`
      },
      {
        tipo: 'estrategia',
        titulo: 'Oportunidad de Elasticidad y Margen',
        descripcion: `Con un precio promedio ponderado de ${formatoMoneda(precioPromedio)}, simular un incremento del 5% al 8% en "${rey.nombre}" podría expandir tu margen neto sin fracturar la demanda base.`
      }
    ];

    setReporteGenerado({
      totalRegistros: filas.length,
      totalVentas,
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
      
      {/* Barra superior de navegación */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-6 rounded-2xl shadow-2xl">
        <div className="flex items-center gap-3">
          <button 
            onClick={onVolverHome}
            className="p-2 bg-[#0D151B] border border-[#18232B] hover:border-[#CF9D7B]/60 text-gray-300 hover:text-white rounded-xl transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Modo Asistido // Lienzo de Datos</h2>
            <p className="text-xs text-gray-400">Captura transacciones manuales o carga tu plantilla para auditar al instante.</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button 
            onClick={descargarPlantillaCSV}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0D151B] border border-[#18232B] hover:border-[#CF9D7B]/50 text-gray-300 hover:text-white rounded-xl text-xs font-mono transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#CF9D7B]" />
            Plantilla CSV
          </button>
          
          <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#0D151B] border border-[#18232B] hover:border-[#CF9D7B]/50 text-gray-300 hover:text-white rounded-xl text-xs font-mono transition-all cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-[#CF9D7B]" />
            Importar CSV
            <input type="file" accept=".csv" onChange={handleCargarCSVManual} className="hidden" />
          </label>
        </div>
      </div>

      {/* Grid de edición manual */}
      <div className="bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-6 md:p-8 rounded-2xl shadow-2xl space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-[11px] text-[#CF9D7B] font-mono uppercase tracking-wider font-semibold">Entrada Directa</span>
            <h3 className="text-lg font-bold text-white tracking-tight mt-0.5">Catálogo y Transacciones ({filas.length} filas)</h3>
          </div>
          <button 
            onClick={handleAgregarFila}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0D151B] text-[#CF9D7B] border border-[#CF9D7B]/40 hover:bg-[#16222C] text-xs font-semibold rounded-lg transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Añadir Fila
          </button>
        </div>

        {/* Tabla interactiva */}
        <div className="overflow-x-auto max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-[#1D2B36] border border-[#18232B] rounded-xl">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-[#0D151B] border-b border-[#18232B] text-gray-400 uppercase tracking-wider text-[10px]">
                <th className="p-3">#</th>
                <th className="p-3">Nombre del Producto</th>
                <th className="p-3">Unidades</th>
                <th className="p-3">Precio Unitario ({moneda})</th>
                <th className="p-3">Subtotal</th>
                <th className="p-3 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#141F28] text-gray-200">
              {filas.map((fila, index) => (
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
                  <td className="p-2 w-28">
                    <input 
                      type="number" 
                      value={fila.cantidad} 
                      onChange={(e) => handleCambioFila(fila.id, 'cantidad', e.target.value)}
                      className="w-full bg-[#070D12] border border-[#1B2935] focus:border-[#CF9D7B] rounded-lg px-2.5 py-1.5 text-white outline-none"
                    />
                  </td>
                  <td className="p-2 w-36">
                    <input 
                      type="number" 
                      value={fila.precio} 
                      onChange={(e) => handleCambioFila(fila.id, 'precio', e.target.value)}
                      className="w-full bg-[#070D12] border border-[#1B2935] focus:border-[#CF9D7B] rounded-lg px-2.5 py-1.5 text-white outline-none"
                    />
                  </td>
                  <td className="p-3 font-semibold text-[#CF9D7B]">
                    {formatoMoneda(fila.cantidad * fila.precio)}
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
              ))}
            </tbody>
          </table>
        </div>

        {/* Botón de Procesamiento */}
        <div className="flex justify-end pt-2">
          <button 
            onClick={procesarEnLugar}
            className="inline-flex items-center gap-2 px-7 py-3 bg-[#CF9D7B] text-[#05080A] text-xs font-bold uppercase tracking-wider rounded-full hover:shadow-[0_0_20px_rgba(207,157,123,0.4)] transition-all cursor-pointer font-sans"
          >
            <Sparkles className="w-4 h-4" />
            Auditar y Generar Recomendaciones
          </button>
        </div>
      </div>

      {/* ======================================================= */}
      {/* SECCIÓN DE RESULTADOS INTEGRADA EN LA MISMA PESTAÑA */}
      {/* ======================================================= */}
      {reporteGenerado && (
        <div className="space-y-8 animate-fadeIn">
          
          {/* Métricas Clave */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-5 rounded-2xl">
              <span className="text-xs text-gray-400 font-mono uppercase">Registros Procesados</span>
              <p className="text-2xl font-bold text-white mt-1 font-mono">{reporteGenerado.totalRegistros}</p>
            </div>
            <div className="bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-5 rounded-2xl">
              <span className="text-xs text-gray-400 font-mono uppercase">Ventas Totales</span>
              <p className="text-2xl font-bold text-[#CF9D7B] mt-1 font-mono">{formatoMoneda(reporteGenerado.totalVentas)}</p>
            </div>
            <div className="bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-5 rounded-2xl">
              <span className="text-xs text-gray-400 font-mono uppercase">Unidades Totales</span>
              <p className="text-2xl font-bold text-white mt-1 font-mono">{reporteGenerado.totalUnidades}</p>
            </div>
            <div className="bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-5 rounded-2xl">
              <span className="text-xs text-gray-400 font-mono uppercase">Precio Promedio</span>
              <p className="text-2xl font-bold text-white mt-1 font-mono">{formatoMoneda(reporteGenerado.precioPromedio)}</p>
            </div>
          </div>

          {/* Gráfica de Ranking y Diagnóstico */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Gráfico de barras */}
            <div className="lg:col-span-7 bg-[#081015]/90 backdrop-blur-xl border border-[#16222C] p-6 rounded-2xl space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-xs text-[#CF9D7B] font-mono uppercase font-semibold">Participación</span>
                  <h4 className="text-base font-bold text-white">Top Productos por Facturación</h4>
                </div>
                <BarChart3 className="w-5 h-5 text-[#CF9D7B]" />
              </div>
              <div className="h-60 w-full pt-2">
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

            {/* Diagnóstico Estrella vs Crítico */}
            <div className="lg:col-span-5 flex flex-col justify-between gap-4">
              <div className="bg-[#081015]/90 backdrop-blur-xl border border-emerald-900/40 p-5 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Award className="w-4 h-4" />
                  <span className="text-[11px] font-semibold uppercase font-mono">Producto Estrella</span>
                </div>
                <h5 className="text-lg font-bold text-white">{reporteGenerado.rey.nombre}</h5>
                <p className="text-xs text-gray-400">Facturación líder: <span className="text-white font-mono">{formatoMoneda(reporteGenerado.rey.ventas)}</span></p>
              </div>

              <div className="bg-[#081015]/90 backdrop-blur-xl border border-rose-900/40 p-5 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-rose-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-[11px] font-semibold uppercase font-mono">Producto Crítico</span>
                </div>
                <h5 className="text-lg font-bold text-white">{reporteGenerado.hueso.nombre}</h5>
                <p className="text-xs text-gray-400">Menor facturación: <span className="text-white font-mono">{formatoMoneda(reporteGenerado.hueso.ventas)}</span></p>
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
                <p className="text-xs text-gray-400">Directrices accionables generadas a partir del comportamiento de tus datos.</p>
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