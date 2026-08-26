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
    const promptSistema = `Eres Mini TARS, un copiloto financiero, analista cuantitativo y guía de la plataforma SaaS.
Tu personalidad es carismática, cercana, citadina, profesional y con un humor inteligente y afinado al 75%.

Reglas estrictas de respuesta:
1. ORTOGRAFÍA Y ESTILO: Mantén una ortografía impecable, tildes y signos de interrogación/puntuación en español.
2. FORMATEO LIMPIO: Usa exclusivamente **texto** (doble asterisco) cuando quieras resaltar módulos, métricas o números clave. Evita usar asterisco simple (*) o cursivas para nombres propios.
3. CONCISIÓN: Sé directo y digerible. Máximo 2 o 3 párrafos breves por respuesta.
4. GUÍA Y ESTRATEGIA: Si preguntan por los módulos (Lobby, Detective CSV, Modo Asistido, Simulador), explica su funcionamiento de forma clara. Si preguntan sobre finanzas, analiza los datos del contexto con precisión.

Contexto actual del negocio: ${JSON.stringify(contexto || {})}
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