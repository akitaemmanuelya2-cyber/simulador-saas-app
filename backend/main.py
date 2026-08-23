import os
import io
import pandas as pd
import requests
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="SaaS Simulator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

class ChatRequest(BaseModel):
    mensaje: str
    contexto: dict | None = None

@app.get("/")
def home():
    return {"status": "ok", "mensaje": "Motor analítico SaaS y Mini-TARS activos"}

# ==========================================
# 1. AUDITORÍA FORENSE CSV
# ==========================================
@app.post("/api/auditar-csv")
async def auditar_csv(archivo: UploadFile = File(...)):
    try:
        contenido = await archivo.read()
        
        try:
            df = pd.read_csv(io.BytesIO(contenido))
        except Exception:
            try:
                df = pd.read_csv(io.BytesIO(contenido), sep=";", encoding="latin1")
            except Exception:
                df = pd.read_csv(io.BytesIO(contenido), sep=None, engine='python', encoding="utf-8-sig")

        df.columns = [str(c).strip().lower() for c in df.columns]

        col_producto = next((c for c in df.columns if any(k in c for k in ['producto', 'item', 'nombre', 'articulo', 'description', 'product'])), df.columns[0])
        col_precio = next((c for c in df.columns if any(k in c for k in ['precio', 'price', 'unit_price', 'valor'])), None)
        col_unidades = next((c for c in df.columns if any(k in c for k in ['cantidad', 'unidades', 'quantity', 'qty', 'units', 'cant'])), None)
        col_ventas = next((c for c in df.columns if any(k in c for k in ['ventas', 'total', 'ingreso', 'revenue', 'sales'])), None)

        def limpiar_numeros(serie):
            return pd.to_numeric(serie.astype(str).str.replace(r'[\$,\s]', '', regex=True), errors='coerce').fillna(0)

        if col_precio:
            df[col_precio] = limpiar_numeros(df[col_precio])
        if col_unidades:
            df[col_unidades] = limpiar_numeros(df[col_unidades])
        
        if col_ventas:
            df['ventas_calculadas'] = limpiar_numeros(df[col_ventas])
        elif col_precio and col_unidades:
            df['ventas_calculadas'] = df[col_precio] * df[col_unidades]
        elif col_precio:
            df['ventas_calculadas'] = df[col_precio]
        else:
            df['ventas_calculadas'] = 1.0

        total_registros = int(len(df))
        ventas_historicas = float(df['ventas_calculadas'].sum())
        unidades_historicas = float(df[col_unidades].sum()) if col_unidades else float(total_registros)
        precio_promedio = float(ventas_historicas / unidades_historicas) if unidades_historicas > 0 else 0.0

        resumen = df.groupby(col_producto)['ventas_calculadas'].sum().reset_index()
        resumen = resumen.sort_values(by='ventas_calculadas', ascending=False)

        top_5 = [
            {"nombre": str(row[col_producto]), "ventas": round(float(row['ventas_calculadas']), 2)}
            for _, row in resumen.head(5).iterrows()
        ]

        rey = top_5[0] if top_5 else {"nombre": "N/A", "ventas": 0.0}
        hueso = {
            "nombre": str(resumen.iloc[-1][col_producto]), 
            "ventas": round(float(resumen.iloc[-1]['ventas_calculadas']), 2)
        } if not resumen.empty else {"nombre": "N/A", "ventas": 0.0}

        return {
            "total_registros": total_registros,
            "ventas_historicas": round(ventas_historicas, 2),
            "unidades_historicas": round(unidades_historicas, 2),
            "precio_promedio": round(precio_promedio, 2),
            "ranking_productos": top_5,
            "diagnostico": {
                "rey": rey,
                "hueso": hueso
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al auditar archivo: {str(e)}")

# ==========================================
# 2. MINI-TARS REST API (SIN DEPENDENCIAS DE SDK)
# ==========================================
@app.post("/api/tars-chat")
async def tars_chat(request: ChatRequest):
    if not GEMINI_API_KEY:
        return {"respuesta": "Estimado(a) empresario(a), la clave GEMINI_API_KEY no está configurada en Render."}

    prompt_sistema = f"""
    Eres Mini-TARS, copiloto analítico de negocios cuantitativo, directo y estratégico.
    Reglas:
    - Saluda siempre con 'Estimado(a) empresario(a)'.
    - Sé concreto, ejecutivo y conciso (máximo 2 párrafos breves o bullets claros).
    - Habla de rentabilidad, margen, liquidación de inventario y acciones precisas sobre los datos.
    
    Contexto actual:
    {request.contexto}
    
    Pregunta:
    {request.mensaje}
    """

    payload = {
        "contents": [{
            "parts": [{"text": prompt_sistema}]
        }],
        "generationConfig": {
            "maxOutputTokens": 500,
            "temperature": 0.7
        }
    }

    # Intentar directamente con los modelos principales con timeout ampliado
    modelos_a_probar = [
        "gemini-1.5-flash",
        "gemini-1.5-flash-latest",
        "gemini-2.0-flash",
        "gemini-pro"
    ]

    for model in modelos_a_probar:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
            res = requests.post(url, json=payload, timeout=60)
            
            if res.status_code == 200:
                data = res.json()
                texto = data['candidates'][0]['content']['parts'][0]['text']
                return {"respuesta": texto}
        except Exception:
            continue

    return {"respuesta": "Estimado(a) empresario(a), el servidor de IA tardó en responder. Por favor reenvía la consulta."}