import React, { useState, useMemo } from 'react';
import { ArrowLeft, TrendingUp, AlertTriangle, Flame, DollarSign, Target, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function SimuladorPublicidad({
  onVolverHome,
  moneda = 'COP',
  datosAuditoria = null,
  datosModoAsistido = null,
  onConsultarMiniTars
}) {
  // 1. Extraer catálogo de productos disponibles desde CSV o Modo Asistido
  const productosDisponibles = useMemo(() => {
    // Si viene de Detective CSV
    if (datosAuditoria?.rankingProductos && Array.isArray(datosAuditoria.rankingProductos)) {
      return datosAuditoria.rankingProductos.map((p, idx) => ({
        id: `csv-${idx}`,
        nombre: p.nombre || p.producto || `Producto ${idx + 1}`,
        precio: Number(p.precioPromedio || p.precioUnitario || p.ventas / (p.unidades || 1) || 0),
        costo: Number(p.costoUnitario || p.costos / (p.unidades || 1) || 0),
        origen: 'Detective CSV'
      }));
    }

    // Si viene de Modo Asistido
    if (datosModoAsistido?.filas && Array.isArray(datosModoAsistido.filas)) {
      return datosModoAsistido.filas
        .filter(f => f.producto && f.producto.trim() !== '')
        .map((f, idx) => ({
          id: f.id || `asistido-${idx}`,
          nombre: f.producto,
          precio: Number(f.precio || 0),
          costo: Number(f.costo || 0),
          origen: 'Modo Asistido'
        }));
    }

    // Valores por defecto si aún no ha subido datos
    return [
      { id: 'demo-1', nombre: 'Producto Ejemplo A (Alto Margen)', precio: 50000, costo: 18000, origen: 'Ejemplo' },
      { id: 'demo-2', nombre: 'Producto Ejemplo B (Margen Ajustado)', precio: 30000, costo: 24000, origen: 'Ejemplo' }
    ];
  }, [datosAuditoria, datosModoAsistido]);

  // 2. Estados para los controles interactivos (Permitiendo inputs limpios sin ceros atrapados)
  const [productoSeleccionadoId, setProductoSeleccionadoId] = useState(productosDisponibles[0]?.id || '');
  const [presupuestoPauta, setPresupuestoPauta] = useState(500000); // 500.000 COP por defecto
  const [costoAdquisicionEstimado, setCostoAdquisicionEstimado] = useState(15000); // Lo que cuesta conseguir 1 compra

  // Producto activo para la simulación
  const productoActivo = useMemo(() => {
    return productosDisponibles.find(p => p.id === productoSeleccionadoId) || productosDisponibles[0];
  }, [productosDisponibles, productoSeleccionadoId]);

  // Formateador monetario
  const formatoMoneda = (val) => {
    const n = Math.round(Number(val) || 0);
    return `$ ${n.toLocaleString('es-CO')}`;
  };

  // 3. Cálculos de Unit Economics y los 3 Escenarios
  const calculos = useMemo(() => {
    const precio = Number(productoActivo?.precio || 0);
    const costo = Number(productoActivo?.costo || 0);
    const margenUnitarioDinero = Math.max(0, precio - costo);
    const margenUnitarioPct = precio > 0 ? (margenUnitarioDinero / precio) * 100 : 0;

    const pauta = Number(presupuestoPauta || 0);
    const cpaBase = Math.max(1, Number(costoAdquisicionEstimado || 1));

    // ROAS de equilibrio (lo mínimo para no perder ni un peso)
    // Fórmula: 1 / (% Margen Bruto)
    const roasEquilibrio = margenUnitarioPct > 0 ? (100 / margenUnitarioPct) : 0;
    const cpaMaximoPermitido = margenUnitarioDinero; // Si el anuncio cuesta más que esto, se pierde plata por venta

    // Escenario 1: RENTABLE (Campaña optimizada, CAC 25% más barato)
    const cpaRentable = Math.max(1, cpaBase * 0.75);
    const ventasRentable = Math.floor(pauta / cpaRentable);
    const ingresoRentable = ventasRentable * precio;
    const costoMercanciaRentable = ventasRentable * costo;
    const gananciaNetaRentable = ingresoRentable - costoMercanciaRentable - pauta;
    const roasRentable = pauta > 0 ? ingresoRentable / pauta : 0;

    // Escenario 2: ZONA DE EMPATE / RIESGO (Justo sales tablas)
    const ventasEquilibrio = margenUnitarioDinero > 0 ? Math.ceil(pauta / margenUnitarioDinero) : 0;
    const ingresoEquilibrio = ventasEquilibrio * precio;
    const costoMercanciaEquilibrio = ventasEquilibrio * costo;
    const gananciaNetaEquilibrio = ingresoEquilibrio - costoMercanciaEquilibrio - pauta;

    // Escenario 3: CAMPAÑA QUEMA-BOLSILLO (El costo de anuncio sube 50% o no convierte)
    const cpaDestructivo = cpaBase * 1.5;
    const ventasDestructivo = Math.floor(pauta / cpaDestructivo);
    const ingresoDestructivo = ventasDestructivo * precio;
    const costoMercanciaDestructivo = ventasDestructivo * costo;
    const gananciaNetaDestructivo = ingresoDestructivo - costoMercanciaDestructivo - pauta;
    const roasDestructivo = pauta > 0 ? ingresoDestructivo / pauta : 0;

    return {
      precio,
      costo,
      margenUnitarioDinero,
      margenUnitarioPct,
      roasEquilibrio,
      cpaMaximoPermitido,
      rentable: {
        ventas: ventasRentable,
        ingreso: ingresoRentable,
        gananciaNeta: gananciaNetaRentable,
        roas: roasRentable
      },
      empate: {
        ventas: ventasEquilibrio,
        ingreso: ingresoEquilibrio,
        gananciaNeta: gananciaNetaEquilibrio,
        roas: roasEquilibrio
      },
      destructivo: {
        ventas: ventasDestructivo,
        ingreso: ingresoDestructivo,
        gananciaNeta: gananciaNetaDestructivo,
        roas: roasDestructivo
      }
    };
  }, [productoActivo, presupuestoPauta, costoAdquisicionEstimado]);

  // Datos para el gráfico comparativo
  const datosGrafico = [
    {
      nombre: 'Rentable',
      'Ganancia Neta': Math.max(0, calculos.rentable.gananciaNeta),
      'Costo Anuncios': Number(presupuestoPauta || 0),
      fill: '#10B981'
    },
    {
      nombre: 'Empate (Tablas)',
      'Ganancia Neta': Math.max(0, calculos.empate.gananciaNeta),
      'Costo Anuncios': Number(presupuestoPauta || 0),
      fill: '#F59E0B'
    },
    {
      nombre: 'Quema-Bolsillo',
      'Ganancia Neta': Math.max(0, calculos.destructivo.gananciaNeta),
      'Costo Anuncios': Number(presupuestoPauta || 0),
      fill: '#EF4444'
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-4 text-white">
      {/* ENCABEZADO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#081015]/90 border border-[#16222C] p-6 rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <button
              onClick={onVolverHome}
              className="p-2 bg-[#0E171F] hover:bg-[#16222C] border border-[#1B2935] rounded-xl text-gray-400 hover:text-white transition-colors"
              title="Volver al inicio"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold tracking-tight text-white">
              Simulador de Crecimiento // ¿Conviene Pautar?
            </h2>
          </div>
          <p className="text-gray-400 text-xs pl-10">
            Descubre si meterle plata a anuncios en redes te dejará ganancias reales o terminará quemando tu capital.
          </p>
        </div>

        {/* Botón para pedir diagnóstico a Mini-TARS */}
        <button
          onClick={() => {
            if (typeof onConsultarMiniTars === 'function') {
              onConsultarMiniTars({
                producto: productoActivo?.nombre,
                precio: calculos.precio,
                costo: calculos.costo,
                margenPct: calculos.margenUnitarioPct,
                presupuesto: presupuestoPauta,
                roasMinimo: calculos.roasEquilibrio,
                cpaMaximo: calculos.cpaMaximoPermitido
              });
            }
          }}
          className="flex items-center justify-center gap-2 bg-[#CF9D7B] hover:bg-[#b88563] text-black font-semibold px-4 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-[#CF9D7B]/10"
        >
          <Sparkles className="w-4 h-4 text-black" />
          <span>Interpretar viabilidad con Mini-TARS</span>
        </button>
      </div>

      {/* CONTROLES Y SELECCIÓN */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Selector de Producto */}
        <div className="bg-[#081015]/80 border border-[#16222C] p-4 rounded-xl space-y-2">
          <label className="text-xs text-gray-400 font-medium flex items-center justify-between">
            <span>1. Elige el producto a empujar:</span>
            <span className="text-[10px] text-[#CF9D7B]">{productoActivo?.origen}</span>
          </label>
          <select
            value={productoSeleccionadoId}
            onChange={(e) => setProductoSeleccionadoId(e.target.value)}
            className="w-full bg-[#0E171F] border border-[#1B2935] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#CF9D7B]"
          >
            {productosDisponibles.map((prod) => (
              <option key={prod.id} value={prod.id}>
                {prod.nombre} (Venta: {formatoMoneda(prod.precio)})
              </option>
            ))}
          </select>
          <div className="flex justify-between text-[11px] text-gray-400 pt-1">
            <span>Costo proveedor: <strong className="text-gray-200">{formatoMoneda(calculos.costo)}</strong></span>
            <span>Margen: <strong className="text-emerald-400">{calculos.margenUnitarioPct.toFixed(1)}%</strong></span>
          </div>
        </div>

        {/* Input Presupuesto Pauta */}
        <div className="bg-[#081015]/80 border border-[#16222C] p-4 rounded-xl space-y-2">
          <label className="text-xs text-gray-400 font-medium">
            2. ¿Cuánta plata vas a meter en publicidad ({moneda})?
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={presupuestoPauta === '' ? '' : presupuestoPauta}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              setPresupuestoPauta(val === '' ? '' : Number(val));
            }}
            placeholder="0"
            className="w-full bg-[#0E171F] border border-[#1B2935] rounded-lg px-3 py-2 text-xs text-white font-mono text-right outline-none focus:border-[#CF9D7B]"
          />
          <p className="text-[10px] text-gray-500">Total presupuestado para Meta Ads, TikTok o Google.</p>
        </div>

        {/* Input Costo por Adquisición (CPA estimado) */}
        <div className="bg-[#081015]/80 border border-[#16222C] p-4 rounded-xl space-y-2">
          <label className="text-xs text-gray-400 font-medium">
            3. ¿Cuánto esperas que te cueste cada cliente ({moneda})?
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={costoAdquisicionEstimado === '' ? '' : costoAdquisicionEstimado}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              setCostoAdquisicionEstimado(val === '' ? '' : Number(val));
            }}
            placeholder="0"
            className="w-full bg-[#0E171F] border border-[#1B2935] rounded-lg px-3 py-2 text-xs text-white font-mono text-right outline-none focus:border-[#CF9D7B]"
          />
          <p className="text-[10px] text-gray-500">Costo promedio de anuncio para cerrar una venta.</p>
        </div>
      </div>

      {/* REGLA DE ORO DE LA PAUTA: TARJETA DE VIABILIDAD RÁPIDA */}
      <div className="bg-[#0E171F] border border-[#1B2935] p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#CF9D7B]/10 border border-[#CF9D7B]/30 text-[#CF9D7B]">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Tu límite para no perder dinero</h4>
            <p className="text-xs text-gray-400">
              Lo máximo que puedes pagar por un cliente es{' '}
              <strong className="text-white">{formatoMoneda(calculos.cpaMaximoPermitido)}</strong>. Si un anuncio te cuesta más que eso, estás subsidiando la compra.
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Retorno mínimo exigido (ROAS)</span>
          <span className="text-lg font-bold font-mono text-[#CF9D7B]">{calculos.roasEquilibrio.toFixed(2)}x</span>
        </div>
      </div>

      {/* LOS 3 ESCENARIOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. ESCENARIO RENTABLE */}
        <div className="bg-[#081015] border border-emerald-900/40 rounded-2xl p-5 space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" /> Escenario Rentable
            </span>
            <span className="text-[10px] bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 px-2 py-0.5 rounded-full font-mono">
              ROAS {calculos.rentable.roas.toFixed(2)}x
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-gray-400">Ganancia limpia a tu bolsillo:</span>
            <div className={`text-2xl font-bold font-mono ${calculos.rentable.gananciaNeta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatoMoneda(calculos.rentable.gananciaNeta)}
            </div>
            <p className="text-[11px] text-gray-400">
              Generando unas <strong className="text-white font-mono">{calculos.rentable.ventas} ventas</strong> ({formatoMoneda(calculos.rentable.ingreso)} facturados).
            </p>
          </div>

          <div className="text-[11px] bg-[#0E171F] p-3 rounded-lg border border-[#1B2935] text-gray-300 space-y-1">
            <div className="flex justify-between">
              <span>Plata a los anuncios:</span>
              <span className="font-mono text-gray-400">{formatoMoneda(presupuestoPauta)}</span>
            </div>
            <div className="flex justify-between">
              <span>Reposición de inventario:</span>
              <span className="font-mono text-gray-400">{formatoMoneda(calculos.rentable.ventas * calculos.costo)}</span>
            </div>
          </div>
        </div>

        {/* 2. ZONA DE EMPATE (TABLAS) */}
        <div className="bg-[#081015] border border-amber-900/40 rounded-2xl p-5 space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Zona de Empate (Tablas)
            </span>
            <span className="text-[10px] bg-amber-950/60 border border-amber-800/40 text-amber-400 px-2 py-0.5 rounded-full font-mono">
              ROAS {calculos.empate.roas.toFixed(2)}x
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-gray-400">Resultado operativo:</span>
            <div className="text-2xl font-bold font-mono text-amber-400">
              $ 0 COP
            </div>
            <p className="text-[11px] text-gray-400">
              Necesitas mínimo <strong className="text-white font-mono">{calculos.empate.ventas} ventas</strong> para cubrir la inversión en anuncios y producto.
            </p>
          </div>

          <div className="text-[11px] bg-[#0E171F] p-3 rounded-lg border border-[#1B2935] text-gray-300 space-y-1">
            <div className="flex justify-between">
              <span>Facturación requerida:</span>
              <span className="font-mono text-gray-400">{formatoMoneda(calculos.empate.ingreso)}</span>
            </div>
            <div className="flex justify-between">
              <span>Utilidad de bolsillo:</span>
              <span className="font-mono text-amber-400">Quedas en ceros</span>
            </div>
          </div>
        </div>

        {/* 3. CAMPAÑA QUEMA-BOLSILLO */}
        <div className="bg-[#081015] border border-rose-900/40 rounded-2xl p-5 space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="w-4 h-4" /> Campaña Quema-Bolsillo
            </span>
            <span className="text-[10px] bg-rose-950/60 border border-rose-800/40 text-rose-400 px-2 py-0.5 rounded-full font-mono">
              ROAS {calculos.destructivo.roas.toFixed(2)}x
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-gray-400">Pérdida neta estimada:</span>
            <div className="text-2xl font-bold font-mono text-rose-400">
              {formatoMoneda(calculos.destructivo.gananciaNeta)}
            </div>
            <p className="text-[11px] text-gray-400">
              Si tus anuncios se ponen caros y solo logras <strong className="text-white font-mono">{calculos.destructivo.ventas} ventas</strong>.
            </p>
          </div>

          <div className="text-[11px] bg-[#0E171F] p-3 rounded-lg border border-[#1B2935] text-gray-300 space-y-1">
            <div className="flex justify-between">
              <span>Dinero quemado:</span>
              <span className="font-mono text-rose-400">{formatoMoneda(Math.abs(calculos.destructivo.gananciaNeta))}</span>
            </div>
            <div className="flex justify-between">
              <span>Riesgo principal:</span>
              <span className="font-mono text-rose-400">CAC supera el margen</span>
            </div>
          </div>
        </div>
      </div>

      {/* COMPARATIVA GRÁFICA */}
      <div className="bg-[#081015] border border-[#16222C] p-5 rounded-2xl space-y-3">
        <h4 className="text-xs font-semibold text-gray-300">
          Comparativa Visual: Ganancia neta frente a la inversión publicitaria
        </h4>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={datosGrafico}>
              <XAxis dataKey="nombre" stroke="#4B5563" fontSize={11} />
              <YAxis stroke="#4B5563" fontSize={11} tickFormatter={(val) => `$${val / 1000}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#070D12', borderColor: '#1B2935', borderRadius: '8px', fontSize: '11px' }}
                formatter={(value) => [formatoMoneda(value), '']}
              />
              <Bar dataKey="Ganancia Neta" radius={[4, 4, 0, 0]}>
                {datosGrafico.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}