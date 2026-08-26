export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { mensaje, contexto } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Falta configurar GEMINI_API_KEY en las variables de entorno.' });
  }

  try {
    const promptSistema = `Eres Mini TARS, un copiloto financiero y analista de negocios inteligente, directo y con un toque citadino y amigable.
Tu objetivo es ayudar al usuario con estrategias de precios, márgenes, ventas y decisiones comerciales basadas en sus datos.
Contexto actual del negocio: ${JSON.stringify(contexto || {})}
Pregunta del usuario: ${mensaje}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: promptSistema }] }]
      })
    });

    const data = await response.json();

    if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
      const respuestaTexto = data.candidates[0].content.parts[0].text;
      return res.status(200).json({ respuesta: respuestaTexto });
    } else {
      return res.status(500).json({ error: 'Respuesta inválida de Gemini' });
    }
  } catch (error) {
    console.error('Error en API Mini TARS:', error);
    return res.status(500).json({ error: 'Error al conectar con Mini TARS' });
  }
}