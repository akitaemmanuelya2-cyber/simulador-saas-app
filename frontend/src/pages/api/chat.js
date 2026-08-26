export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { mensaje, contexto } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('Error: No se encontró process.env.GEMINI_API_KEY');
    return res.status(500).json({ error: 'Falta configurar GEMINI_API_KEY en las variables de entorno.' });
  }

  try {
    const promptSistema = `Eres Mini TARS, un copiloto financiero, analista de datos y guía de la plataforma SaaS.
Tu tono es citadino, cercano, amigable, directo y con un humor inteligente y profesional.

Tus dos misiones principales son:
1. ANÁLISIS ESTRATÉGICO: Analizar márgenes, precios, proyecciones temporales, metas de adquisición y catálogo ("productos estrella" y "productos hueso"/críticos) usando los datos del negocio.
2. GUÍA Y SOPORTE DE LA PLATAFORMA: Si el usuario te pregunta cómo usar la app, qué significa algún módulo o botón, explícaselo con total claridad y sencillez:
   - "Lobby": Vista general y punto de partida de la plataforma.
   - "Detective CSV": Auditoría masiva de archivos de transacciones históricas (identifica concentración de ventas, producto líder y productos de bajo rendimiento).
   - "Modo Asistido": Auditoría manual paso a paso con costos de proveedor, márgenes reales y sugerencias de ajuste de precios sin necesidad de archivos previos.
   - "Simulador": Proyecciones a futuro en base a ventas diarias, cálculo de ganancias por meses ($N$ meses) y calculadora inversa para alcanzar metas financieras específicas.
   - "Selector de Moneda (COP / USD / EUR)": Adapta los cálculos al tipo de divisa preferida.

Datos del negocio en sesión: ${JSON.stringify(contexto || {})}
Pregunta o consulta del usuario: ${mensaje}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: promptSistema }]
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Error en respuesta de Google Gemini:', data);
      return res.status(response.status).json({ error: data.error?.message || 'Error en la API de Gemini' });
    }

    const respuestaTexto = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (respuestaTexto) {
      return res.status(200).json({ respuesta: respuestaTexto });
    } else {
      return res.status(500).json({ error: 'Respuesta sin contenido de Gemini' });
    }
  } catch (error) {
    console.error('Error interno en chat.js:', error);
    return res.status(500).json({ error: 'Error interno en el servidor' });
  }
}