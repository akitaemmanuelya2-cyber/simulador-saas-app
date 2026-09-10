import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, TrendingUp, AlertTriangle, Flame, Target, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';

export default function SimuladorPublicidad({
  onVolverHome,
  moneda = 'COP',
  datosAuditoria = null,
  datosModoAsistido = null,
  onConsultarMiniTars
}) {
  // 1. Extracción segura y compatible con el backend Python
  const productosDisponibles = useMemo(() => {
    const lista = [];

    try {
      // 1. Lista de posibles nombres que entrega el motor Python
      const itemsCSV = 
        datosAuditoria?.ranking_productos ||
        datosAuditoria?.rankingProductos ||
        datosAuditoria?.productos ||
        datosAuditoria?.productos_estrella ||
        datosAuditoria?.top_rentables ||
        datosAuditoria?.topRentables ||
        datosAuditoria?.datos_grafica ||
        datosAuditoria?.datosGraficaRentabilidad ||
        (Array.isArray(datosAuditoria) ? datosAuditoria : []);

      if (Array.isArray(itemsCSV) && itemsCSV.length > 0) {
        itemsCSV.forEach((p, idx) => {
          if (!p || typeof p !== 'object') return;
          
          const nombre = p.nombre || p.producto || p.Producto || p.Item || p.item || `Producto ${idx + 1}`;
          const unidades = Math.max(1, Number(p.unidades || p.cantidad || p.Cantidad || p.ventas_cantidad || 1));
          const ventas = Number(p.ventas || p.subtotalVenta || p.subtotal_venta || p.Ingresos || p.ingresos || p.Total || 0);
          const costos = Number(p.costos || p.subtotalCosto || p.subtotal_costo || p.Costos || p.costos_totales || 0);

          const precio = Number(p.precio_unitario || p.precioUnitario || p.precio_promedio || p.precio || (ventas > 0 ? ventas / unidades : 0));
          const costo = Number(p.costo_unitario || p.costoUnitario || p.costo_promedio || p.costo || (costos > 0 ? costos / unidades : 0));

          lista.push({
            id: `csv-${idx}-${nombre}`,
            nombre: String(nombre),
            precio: Math.round(precio),
            costo: Math.round(costo),
            origen: 'Detective CSV'
          });
        });
      }

      // 2. Si no viene como lista sino con un producto estrella destacado
      if (lista.length === 0 && datosAuditoria?.producto_estrella) {
        const estrella = datosAuditoria.producto_estrella;
        lista.push({
          id: 'csv-estrella',
          nombre: typeof estrella === 'string' ? estrella : (estrella.nombre || 'Producto Estrella'),
          precio: Number(estrella.precio || datosAuditoria.precio_promedio || 0),
          costo: Number(estrella.costo || datosAuditoria.costo_promedio || 0),
          origen: 'Detective CSV'
        });
      }

      // 3. Revisar Modo Asistido
      if (datosModoAsistido?.filas && Array.isArray(datosModoAsistido.filas)) {
        datosModoAsistido.filas
          .filter(f => f && f.producto && String(f.producto).trim() !== '')
          .forEach((f, idx) => {
            lista.push({
              id: f.id || `asistido-${idx}`,
              nombre: String(f.producto).trim(),
              precio: Number(f.precio || 0),
              costo: Number(f.costo || 0),
              origen: 'Modo Asistido'
            });
          });
      }
    } catch (err) {
      console.error("Error procesando productos:", err);
    }

    if (lista.length === 0) {
      return [
        { id: 'custom-1', nombre: 'Ingresar Producto Manualmente', precio: 0, costo: 0, origen: 'Manual' }
      ];
    }

    return lista;
  }, [datosAuditoria, datosModoAsistido]);

  // 2. Estados para los campos (inician vacíos para que no haya que borrar ceros)
  const [productoSeleccionadoId, setProductoSeleccionadoId] = useState('');
  const [precioManual, setPrecioManual] = useState('');
  const [costoManual, setCostoManual] = useState('');
  const [presupuestoPauta, setPresupuestoPauta] = useState('');
  const [costoAdquisicionEstimado, setCostoAdquisicionEstimado] = useState('');

  // Selecciona el primer producto apenas carga la lista
  useEffect(() => {
    if (productosDisponibles.length > 0 && !productoSeleccionadoId) {
      setProductoSeleccionadoId(productosDisponibles[0].id);
    }
  }, [productosDisponibles, productoSeleccionadoId]);

  const productoActivo = useMemo(() => {
    return productosDisponibles.find(p => p.id === productoSeleccionadoId) || productosDisponibles[0];
  }, [productosDisponibles, productoSeleccionadoId]);

  // Si cambia de producto en el menú, actualizamos los números automáticamente
  useEffect(() => {
    if (productoActivo) {
      setPrecioManual(productoActivo.precio > 0 ? String(productoActivo.precio) : '');
      setCostoManual(productoActivo.costo > 0 ? String(productoActivo.costo) : '');
    }
  }, [productoActivo]);

  // Formato limpio de moneda con manejo de negativos (-$ 50.000)
  const formatoMoneda = (val) => {
    const n = Math.round(Number(val) || 0);
    if (n < 0) {
      return `-$ ${Math.abs(n).toLocaleString('es-CO')}`;
    }
    return `$ ${n.toLocaleString('es-CO')}`;
  };

  // 3. Matemáticas de los 3 escenarios
  const calculos = useMemo(() => {
    const precio = Number(precioManual || 0);
    const costo = Number(costoManual || 0);
    const pauta = Math.max(0, Number(presupuestoPauta) || 0);
    // Solo toma un CPA si el usuario realmente escribió un número mayor a 0
    const cpaIngresado = Number(costoAdquisicionEstimado);
    const cpaValido = !isNaN(cpaIngresado) && cpaIngresado > 0;
    const cpaBase = cpaValido ? cpaIngresado : 0;

    const margenUnitarioDinero = Math.max(0, precio - costo);
    const margenUnitarioPct = precio > 0 ? (margenUnitarioDinero / precio) * 100 : 0;
    const roasEquilibrio = margenUnitarioPct > 0 ? (100 / margenUnitarioPct) : 0;
    const cpaMaximoPermitido = margenUnitarioDinero;

    // Escenario 1: RENTABLE
    const ventasRentable = (pauta > 0 && cpaBase > 0) ? Math.floor(pauta / cpaBase) : 0;
    const ingresoRentable = ventasRentable * precio;
    const gananciaNetaRentable = (pauta > 0 && cpaBase > 0)
      ? ingresoRentable - (ventasRentable * costo) - pauta
      : 0;
    const roasRentable = pauta > 0 ? (ingresoRentable / pauta) : 0;

    // Escenario 2: EMPATE (sales tablas, ni ganas ni pierdes)
    const ventasEmpate = margenUnitarioDinero > 0 && pauta > 0 
      ? Math.ceil(pauta / margenUnitarioDinero) 
      : 0;
    const ingresoEmpate = ventasEmpate * precio;
    const gananciaNetaEmpate = ingresoEmpate - (ventasEmpate * costo) - pauta;
    const roasEmpate = pauta > 0 ? ingresoEmpate / pauta : 0;

    // Escenario 3: QUEMA-BOLSILLO (El anuncio se vuelve ineficiente y supera el CPA límite)
    // El CPA se encarece un 40% por encima del CPA máximo permitido
    const cpaDestructivo = margenUnitarioDinero > 0 ? (cpaMaximoPermitido * 1.4) : (cpaBase * 1.5);
    const ventasDestructivo = (pauta > 0 && cpaDestructivo > 0) ? Math.floor(pauta / cpaDestructivo) : 0;
    const ingresoDestructivo = ventasDestructivo * precio;
    const gananciaNetaDestructivo = ingresoDestructivo - (ventasDestructivo * costo) - pauta;
    const roasDestructivo = pauta > 0 ? (ingresoDestructivo / pauta) : 0;

    return {
      precio,
      costo,
      pauta,
      cpaBase,
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
        ventas: ventasEmpate,
        ingreso: ingresoEmpate,
        gananciaNeta: 0,
        roas: roasEquilibrio
      },
      destructivo: {
        ventas: ventasDestructivo,
        ingreso: ingresoDestructivo,
        gananciaNeta: gananciaNetaDestructivo,
        roas: roasDestructivo
      }
    };
  }, [precioManual, costoManual, presupuestoPauta, costoAdquisicionEstimado]);

  const datosGrafico = useMemo(() => [
    {
      nombre: 'Rentable',
      valor: Number(calculos?.rentable?.gananciaNeta) || 0,
      fill: (calculos?.rentable?.gananciaNeta ?? 0) >= 0 ? '#10B981' : '#F43F5E'
    },
    {
      nombre: 'Empate',
      valor: Number(calculos?.empate?.gananciaNeta) || 0,
      fill: '#F59E0B'
    },
    {
      nombre: 'Quema-Bolsillo',
      valor: Number(calculos?.destructivo?.gananciaNeta) || 0,
      fill: '#EF4444'
    }
  ], [calculos]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-4 text-white">
      {/* BARRA SUPERIOR */}
      <div className="relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#081015]/90 border border-[#16222C] p-6 rounded-2xl shadow-xl">
      {/* Línea de brillo superior esmeralda */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

      <div className="flex items-start md:items-center gap-3">
        <button
          onClick={onVolverHome}
          className="p-2 bg-[#0E171F] hover:bg-[#16222C] border border-[#1B2935] hover:border-emerald-500/40 rounded-xl text-gray-300 hover:text-white transition-all shadow-sm group"
          title="Volver al Lobby"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
        </button>

        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-emerald-950/40 border border-emerald-500/20 text-[10px] font-mono text-emerald-400 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            PASO 04 // SIMULADOR DE INVERSIÓN & ADS
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            ¿Conviene Pautar este Producto?
          </h2>
          <p className="text-gray-400 text-xs leading-relaxed max-w-xl">
            Simula cuánto presupuesto meter en anuncios y calcula el retorno real antes de quemar dinero.
          </p>
        </div>
      </div>

        <button
          onClick={() => {
            if (typeof onConsultarMiniTars === 'function') {
              const mensaje = `Hola Mini-TARS, analiza si vale la pena pautar para:
- Producto: ${productoActivo?.nombre || 'Producto manual'}
- Precio de venta: ${formatoMoneda(calculos.precio)} | Costo unitario: ${formatoMoneda(calculos.costo)} (Margen: ${calculos.margenUnitarioPct.toFixed(1)}%)
- Presupuesto pauta: ${formatoMoneda(presupuestoPauta || 0)}
- ROAS mínimo exigido: ${calculos.roasEquilibrio.toFixed(2)}x
- Límite máximo por cliente (CPA): ${formatoMoneda(calculos.cpaMaximoPermitido)}

¿Es viable o es una campaña quema-bolsillo?`;
              onConsultarMiniTars(mensaje);
            }
          }}
          className="flex items-center justify-center gap-2 bg-[#CF9D7B] hover:bg-[#b88563] text-black font-semibold px-4 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-[#CF9D7B]/10 active:scale-95"
        >
          <Sparkles className="w-4 h-4 text-black"/>
          <span>Interpretar viabilidad con Mini-TARS</span>
        </button>
      </div>

      {/* ENTRADAS / INPUTS LIMPIOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Selector de Producto */}
        <div className="bg-[#081015]/80 border border-[#16222C] p-4 rounded-xl space-y-2">
          <label className="text-xs text-gray-400 font-medium flex items-center justify-between">
            <span>1. Elige el producto a impulsar:</span>
            <span className="text-[10px] text-[#CF9D7B]">{productoActivo?.origen}</span>
          </label>
          <select
            value={productoSeleccionadoId}
            onChange={(e) => setProductoSeleccionadoId(e.target.value)}
            className="w-full bg-[#0E171F] border border-[#1B2935] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#CF9D7B]"
          >
            {productosDisponibles.map((prod) => (
              <option key={prod.id} value={prod.id}>
                {prod.nombre} {prod.precio > 0 ? `(${formatoMoneda(prod.precio)})` : ''}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <span className="text-[10px] text-gray-400 block">Precio de venta:</span>
              <input
                type="text"
                inputMode="numeric"
                value={precioManual}
                onChange={(e) => setPrecioManual(e.target.value.replace(/\D/g, ''))}
                placeholder="0"
                className="w-full bg-[#0E171F] border border-[#1B2935] rounded px-2 py-1 text-xs text-right font-mono text-white outline-none focus:border-[#CF9D7B]"
              />
            </div>
            <div>
              <span className="text-[10px] text-gray-400 block">Costo unitario:</span>
              <input
                type="text"
                inputMode="numeric"
                value={costoManual}
                onChange={(e) => setCostoManual(e.target.value.replace(/\D/g, ''))}
                placeholder="0"
                className="w-full bg-[#0E171F] border border-[#1B2935] rounded px-2 py-1 text-xs text-right font-mono text-white outline-none focus:border-[#CF9D7B]"
              />
            </div>
          </div>
          <div className="text-[11px] text-right text-gray-400">
            Margen: <strong className="text-emerald-400">{calculos.margenUnitarioPct.toFixed(1)}%</strong>
          </div>
        </div>

        {/* Presupuesto */}
        <div className="bg-[#081015]/80 border border-[#16222C] p-4 rounded-xl space-y-2">
          <label className="text-xs text-gray-400 font-medium">
            2. ¿Cuánto vas a meter en publicidad ({moneda})?
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={presupuestoPauta}
            onChange={(e) => setPresupuestoPauta(e.target.value.replace(/\D/g, ''))}
            placeholder="Ej: 500000"
            className="w-full bg-[#0E171F] border border-[#1B2935] rounded-lg px-3 py-2 text-xs text-white font-mono text-right outline-none focus:border-[#CF9D7B]"
          />
          <p className="text-[10px] text-gray-500">Total presupuestado para Meta, TikTok o Google Ads.</p>
        </div>

        {/* Costo por cliente (CPA) */}
        <div className="bg-[#081015]/80 border border-[#16222C] p-4 rounded-xl space-y-2">
          <label className="text-xs text-gray-400 font-medium">
            3. ¿Cuánto esperas que te cueste cada venta ({moneda})?
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={costoAdquisicionEstimado}
            onChange={(e) => setCostoAdquisicionEstimado(e.target.value.replace(/\D/g, ''))}
            placeholder="Ej: 15000"
            className="w-full bg-[#0E171F] border border-[#1B2935] rounded-lg px-3 py-2 text-xs text-white font-mono text-right outline-none focus:border-[#CF9D7B]"
          />
          <p className="text-[10px] text-gray-500">Lo que le pagas a los anuncios para cerrar un cliente.</p>
        </div>
      </div>

      {/* LÍMITE FINANCIERO */}
      <div className="bg-[#0E171F] border border-[#1B2935] p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#CF9D7B]/10 border border-[#CF9D7B]/30 text-[#CF9D7B]">
            <Target className="w-5 h-5"/>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Límite para no perder dinero</h4>
            <p className="text-xs text-gray-400">
              Lo máximo que puedes pagar por un cliente es{' '}
              <strong className="text-white">{formatoMoneda(calculos.cpaMaximoPermitido)}</strong>. Si un anuncio te cuesta más, estás pagando por vender.
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
        {/* RENTABLE */}
        <div className="bg-[#081015] border border-emerald-900/40 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4"/> Escenario Rentable
            </span>
            <span className="text-[10px] bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 px-2 py-0.5 rounded-full font-mono">
              ROAS {calculos.rentable.roas.toFixed(2)}x
            </span>
          </div>
          <div>
            <span className="text-xs text-gray-400">Ganancia libre a tu bolsillo:</span>
            <div className={`text-2xl font-bold font-mono ${calculos.rentable.gananciaNeta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatoMoneda(calculos.rentable.gananciaNeta)}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Logrando unas <strong className="text-white font-mono">{calculos.rentable.ventas} ventas</strong> ({formatoMoneda(calculos.rentable.ingreso)} facturados).
            </p>
          </div>
        </div>

        {/* EMPATE */}
        <div className="bg-[#081015] border border-amber-900/40 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4"/> Zona de Empate (Tablas)
            </span>
            <span className="text-[10px] bg-amber-950/60 border border-amber-800/40 text-amber-400 px-2 py-0.5 rounded-full font-mono">
              ROAS {calculos.empate.roas.toFixed(2)}x
            </span>
          </div>
          <div>
            <span className="text-xs text-gray-400">Resultado operativo:</span>
            <div className="text-2xl font-bold font-mono text-amber-400">$ 0 {moneda}</div>
            <p className="text-[11px] text-gray-400 mt-1">
              Necesitas mínimo <strong className="text-white font-mono">{calculos.empate.ventas} ventas</strong> para cubrir producto y pauta sin ganar ni perder.
            </p>
          </div>
        </div>

        {/* QUEMA-BOLSILLO */}
        <div className="bg-[#081015] border border-rose-900/40 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="w-4 h-4"/> Campaña Quema-Bolsillo
            </span>
            <span className="text-[10px] bg-rose-950/60 border border-rose-800/40 text-rose-400 px-2 py-0.5 rounded-full font-mono">
              ROAS {calculos.destructivo.roas.toFixed(2)}x
            </span>
          </div>
          <div>
            <span className="text-xs text-gray-400">Pérdida neta estimada:</span>
            <div className="text-2xl font-bold font-mono text-rose-400">
              {formatoMoneda(calculos.destructivo.gananciaNeta)}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Si la pauta se encarece y solo logras <strong className="text-white font-mono">{calculos.destructivo.ventas} ventas</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* GRÁFICO COMPARATIVO */}
      <div className="bg-[#081015] border border-[#16222C] p-5 rounded-2xl space-y-3">
        <h4 className="text-xs font-semibold text-gray-300">
          Comparativa Visual: Ganancia neta real frente a los escenarios
        </h4>
        <div style={{ width: '100%', height: 260, minHeight: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={datosGrafico} 
              margin={{ top: 25, right: 30, left: 15, bottom: 10 }}
            >
              {/* Eje X con texto blanco visible y claro */}
              <XAxis 
                dataKey="nombre" 
                stroke="#9CA3AF" 
                tick={{ fill: '#E5E7EB', fontSize: 12, fontWeight: 500 }} 
                tickLine={false} 
              />
              
              {/* Eje Y legible */}
              <YAxis 
                type="number"
                domain={['auto', 'auto']}
                stroke="#6B7280" 
                tick={{ fill: '#9CA3AF', fontSize: 11 }}
                tickFormatter={(v) => `$${Math.round(v / 1000)}k`} 
              />
              
              {/* Línea divisoria en 0 con etiqueta visual */}
              <ReferenceLine y={0} stroke="#4B5563" strokeDasharray="3 3" />
              
              {/* Tooltip con fondo oscuro elegante, sin la sombra gris molesta */}
              <Tooltip
                cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                contentStyle={{ 
                  backgroundColor: '#0F172A', 
                  borderColor: '#334155', 
                  borderRadius: '10px', 
                  padding: '8px 12px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                }}
                itemStyle={{ color: '#F8FAFC', fontWeight: 600, fontSize: '12px' }}
                labelStyle={{ color: '#94A3B8', fontSize: '11px', marginBottom: '4px' }}
                formatter={(val) => [formatoMoneda(val), 'Ganancia / Pérdida neta']}
              />
              
              {/* Barras con esquinas adaptadas */}
              <Bar dataKey="valor" radius={[6, 6, 6, 6]}>
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