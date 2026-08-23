import React, { useState } from 'react';

export default function ModoAsistido({ onVolverHome, onProcesarDatos }) {
  const [filas, setFilas] = useState([
    { id: 1, producto: 'Ejemplo: Camiseta Negra', cantidad: 100, precio: 50000, costo: 20000, esEjemplo: true },
    { id: 2, producto: '', cantidad: 0, precio: 0, costo: 0, esEjemplo: false },
    { id: 3, producto: '', cantidad: 0, precio: 0, costo: 0, esEjemplo: false },
  ]);

  const handleCambio = (id, campo, valor) => {
    setFilas(filas.map(fila => {
      if (fila.id === id) {
        return { 
          ...fila, 
          [campo]: campo === 'producto' ? valor : Number(valor) || 0,
          esEjemplo: false 
        };
      }
      return fila;
    }));
  };

  const agregarFila = () => {
    setFilas([...filas, { id: Date.now(), producto: '', cantidad: 0, precio: 0, costo: 0, esEjemplo: false }]);
  };

  const eliminarFila = (id) => {
    if (filas.length > 1) {
      setFilas(filas.filter(f => f.id !== id));
    }
  };

  const descargarPlantilla = () => {
    const csvContent = "data:text/csv;charset=utf-8,Producto,Cantidad Vendida,Precio de Venta,Costo Proveedor\nCamiseta Negra,100,50000,20000\nJean Clasico,50,120000,60000";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "plantilla_negocio.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const lineas = text.split('\n').filter(l => l.trim() !== '');
      const nuevasFilas = [];

      for (let i = 1; i < lineas.length; i++) {
        const cols = lineas[i].split(/[,;]/);
        if (cols.length >= 3) {
          nuevasFilas.push({
            id: Date.now() + i,
            producto: cols[0]?.trim() || `Item ${i}`,
            cantidad: parseFloat(cols[1]?.replace(/[\$,]/g, '')) || 0,
            precio: parseFloat(cols[2]?.replace(/[\$,]/g, '')) || 0,
            costo: parseFloat(cols[3]?.replace(/[\$,]/g, '')) || 0,
            esEjemplo: false
          });
        }
      }

      if (nuevasFilas.length > 0) {
        setFilas(nuevasFilas);
      }
    };
    reader.readAsText(file);
  };

  const datosValidos = filas.filter(f => !f.esEjemplo && f.producto.trim() !== '' && (f.cantidad > 0 || f.precio > 0));
  const tieneDatosReales = datosValidos.length > 0;

  const ejecutarAnalisis = () => {
    if (onProcesarDatos && tieneDatosReales) {
      onProcesarDatos(datosValidos);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '1150px', margin: '0 auto', padding: '24px', color: '#e7e5e4', fontFamily: 'sans-serif' }}>
      
      {/* Navegacion superior */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', borderBottom: '1px solid #292524', paddingBottom: '16px' }}>
        <button 
          onClick={onVolverHome} 
          style={{ background: '#1c1917', color: '#d6d3d1', border: '1px solid #44403c', borderRadius: '12px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
        >
          ← Volver al Home
        </button>
        <div style={{ background: '#0c0a09', padding: '6px', borderRadius: '16px', border: '1px solid #292524', display: 'flex', gap: '8px' }}>
          <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '6px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: '600' }}>
            🤝 Modo Asistido
          </span>
        </div>
      </div>

      {/* Titulo */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#fafaf9', margin: '0 0 6px 0' }}>
          🤝 Modo Asistido: Tu lienzo en blanco
        </h2>
        <p style={{ fontSize: '14px', color: '#a8a29e', margin: 0 }}>
          Completa los datos de tus productos directamente aquí o descarga la plantilla para llenarla en tu computador y subirla después.
        </p>
      </div>

      {/* Botones de Accion */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '28px' }}>
        <button 
          onClick={descargarPlantilla}
          style={{ background: '#1c1917', border: '1px solid #292524', color: '#f5f5f4', padding: '14px', borderRadius: '14px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          📥 Descargar Plantilla CSV
        </button>

        <label style={{ background: '#1c1917', border: '1px dashed #44403c', color: '#d6d3d1', padding: '14px', borderRadius: '14px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          📤 <span>Upload CSV <small style={{ color: '#78716c' }}>(o arrastra el archivo)</small></span>
          <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
        </label>
      </div>

      {/* Tabla Editable */}
      <div style={{ background: 'rgba(12, 10, 9, 0.6)', border: '1px solid #292524', borderRadius: '16px', overflow: 'hidden', marginBottom: '24px' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #292524', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '15px', color: '#fafaf9' }}>📄 Llena tus datos en línea</h3>
          <span style={{ fontSize: '12px', color: '#78716c' }}>Haz clic en cualquier celda para editar</span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#1c1917', color: '#a8a29e', fontSize: '12px', borderBottom: '1px solid #292524' }}>
              <th style={{ padding: '12px 16px' }}>PRODUCTO</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>CANTIDAD VENDIDA</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>PRECIO DE VENTA</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>COSTO PROVEEDOR</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', width: '60px' }}>ACCIÓN</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <tr key={fila.id} style={{ borderBottom: '1px solid #1c1917' }}>
                <td style={{ padding: '8px 12px' }}>
                  <input
                    type="text"
                    value={fila.producto}
                    placeholder="Nombre del producto"
                    onChange={(e) => handleCambio(fila.id, 'producto', e.target.value)}
                    style={{ width: '100%', background: 'transparent', border: '1px solid transparent', color: fila.esEjemplo ? '#78716c' : '#f5f5f4', padding: '8px', borderRadius: '8px', outline: 'none', fontStyle: fila.esEjemplo ? 'italic' : 'normal' }}
                  />
                </td>
                <td style={{ padding: '8px 12px' }}>
                  <input
                    type="number"
                    value={fila.cantidad === 0 ? '' : fila.cantidad}
                    placeholder="0"
                    onChange={(e) => handleCambio(fila.id, 'cantidad', e.target.value)}
                    style={{ width: '100%', background: 'transparent', border: '1px solid transparent', color: '#f5f5f4', padding: '8px', borderRadius: '8px', textAlign: 'right', outline: 'none' }}
                  />
                </td>
                <td style={{ padding: '8px 12px' }}>
                  <input
                    type="number"
                    value={fila.precio === 0 ? '' : fila.precio}
                    placeholder="0"
                    onChange={(e) => handleCambio(fila.id, 'precio', e.target.value)}
                    style={{ width: '100%', background: 'transparent', border: '1px solid transparent', color: '#f5f5f4', padding: '8px', borderRadius: '8px', textAlign: 'right', outline: 'none' }}
                  />
                </td>
                <td style={{ padding: '8px 12px' }}>
                  <input
                    type="number"
                    value={fila.costo === 0 ? '' : fila.costo}
                    placeholder="0"
                    onChange={(e) => handleCambio(fila.id, 'costo', e.target.value)}
                    style={{ width: '100%', background: 'transparent', border: '1px solid transparent', color: '#f5f5f4', padding: '8px', borderRadius: '8px', textAlign: 'right', outline: 'none' }}
                  />
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                  <button 
                    onClick={() => eliminarFila(fila.id)}
                    style={{ background: 'transparent', border: 'none', color: '#78716c', cursor: 'pointer', fontSize: '15px' }}
                    title="Eliminar fila"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ padding: '12px 16px', background: 'rgba(28, 25, 23, 0.4)', borderTop: '1px solid #292524' }}>
          <button
            onClick={agregarFila}
            style={{ background: 'transparent', border: 'none', color: '#fbbf24', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            + Agregar otra fila
          </button>
        </div>
      </div>

      {/* Barra de Activacion */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderRadius: '16px', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px' }}>👉</span>
          <span style={{ fontSize: '14px', color: '#d6d3d1' }}>
            {tieneDatosReales 
              ? `${datosValidos.length} producto(s) listos para auditar.` 
              : "Empieza a escribir tus productos reales en la tabla para activar el análisis."}
          </span>
        </div>

        {tieneDatosReales && (
          <button
            onClick={ejecutarAnalisis}
            style={{ background: '#f59e0b', color: '#0c0a09', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)' }}
          >
            ✨ Activar Análisis Forense
          </button>
        )}
      </div>

    </div>
  );
}