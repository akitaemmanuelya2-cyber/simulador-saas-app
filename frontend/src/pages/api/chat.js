export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { mensaje, contexto } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('--> Error: No se encontró GEMINI_API_KEY');
    return res.status(500).json({ error: 'Falta configurar GEMINI_API_KEY' });
  }

  try {
    const promptSistema = `Eres Mini TARS, un copiloto financiero, analista de datos y guía de la plataforma SaaS.
Tu tono es citadino, cercano, amigable, directo y con un humor inteligente y profesional.

Misiones principales:
1. ANÁLISIS ESTRATÉGICO: Analizar márgenes, precios, proyecciones temporales y catálogo según los datos.
2. GUÍA DE LA PLATAFORMA: Si el usuario pregunta cómo usar la app o qué significa cada sección, guíalo con claridad (Lobby, Detective CSV, Modo Asistido, Simulador, selector de monedas).

Contexto del negocio: ${JSON.stringify(contexto || {})}
Mensaje del usuario: ${mensaje}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: promptSistema }]
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('--> Error API Gemini:', JSON.stringify(data));
      return res.status(response.status).json({ error: data.error?.message || 'Error en Gemini' });
    }

    const respuestaTexto = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (respuestaTexto) {
      return res.status(200).json({ respuesta: respuestaTexto });
    } else {
      console.error('--> Respuesta vacía de Gemini:', data);
      return res.status(500).json({ error: 'Respuesta vacía' });
    }
  } catch (error) {
    console.error('--> Error en handler chat.js:', error);
    return res.status(500).json({ error: 'Error interno en el servidor' });
  }
}