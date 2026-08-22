import os
import io
import pandas as pd
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai

app = FastAPI(title="SaaS Simulator API")

# Configuración de CORS para permitir peticiones desde Vercel y Localhost
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuración de Google Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Esquema para la petición del chat
class ChatRequest(BaseModel):
    mensaje: str
    contexto: dict | None = None

@app.get("/")
def home():
    return {"status": "ok", "mensaje": "Motor analítico SaaS y Mini-TARS activos"}

# ==========================================
# 1. ENDPOINT: AUDITORÍA FORENSE CSV
# ==========================================
@app.post("/api/auditar-csv")
async def auditar_csv(archivo: UploadFile = File(...)):
    try:
        contenido = await archivo.read()
        
        # Detección de encoding y separador
        try:
            df = pd.read_csv(io.BytesIO(contenido))
        except Exception:
            df = pd.read_csv(io.BytesIO(contenido), sep=";", encoding="latin1")

        # Normalizar nombres de columnas a minúsculas y sin espacios
        df.columns = df.columns.str.strip().str.lower()

        # Mapeo flexible de columnas
        col_producto = next((c for c in df.columns if any(k in c for k in ['producto', 'item', 'nombre', 'articulo', 'description'])), None)
        col_precio = next((c for c in df.columns if any(k in c for k in ['precio', 'price', 'unit_price', 'valor_unitario'])), None)
        col_unidades = next((c for c in df.columns if any(k in c for k in ['cantidad', 'unidades', 'quantity', 'qty', 'units'])), None)
        col_ventas = next((c for c in df.columns if any(k in c for k in ['ventas', 'total', 'ingreso', 'revenue', 'sales'])), None)

        if not col_producto:
            raise HTTPException(status_code=400, detail="No se encontró la columna de identificación del producto.")

        # Limpieza y conversión numérica
        if col_precio:
            df[col_precio] = pd.to_numeric(df[col_precio].astype(str).str.replace(r'[\$,]', '', regex=True), errors='coerce').fillna(0)
        if col_unidades:
            df[col_unidades] = pd.to_numeric(df[col_unidades].astype(str).str.replace(r'[\$,]', '', regex=True), errors='coerce').fillna(1)
        
        if col_ventas:
            df['ventas_calculadas'] = pd.to_numeric(df[col_ventas].astype(str).str.replace(r'[\$,]', '', regex=True), errors='coerce').fillna(0)
        elif col_precio and col_unidades:
            df['ventas_calculadas'] = df[col_precio] * df[col_unidades]
        elif col_precio:
            df['ventas_calculadas'] = df[col_precio]
        else:
            df['ventas_calculadas'] = 1

        total_registros = int(len(df))
        ventas_historicas = float(df['ventas_calculadas'].sum())
        unidades_historicas = float(df[col_unidades].sum()) if col_unidades else float(total_registros)
        precio_promedio = float(ventas_historicas / unidades_historicas) if unidades_historicas > 0 else 0.0

        # Agrupación por producto
        resumen_productos = df.groupby(col_producto).agg({'ventas_calculadas': 'sum'}).reset_index()
        resumen_productos = resumen_productos.sort_values(by='ventas_calculadas', ascending=False)

        top_5 = [
            {"nombre": str(row[col_producto]), "ventas": float(row['ventas_calculadas'])}
            for _, row in resumen_productos.head(5).iterrows()
        ]

        rey = top_5[0] if top_5 else {"nombre": "N/A", "ventas": 0.0}
        hueso = {
            "nombre": str(resumen_productos.iloc[-1][col_producto]), 
            "ventas": float(resumen_productos.iloc[-1]['ventas_calculadas'])
        } if not resumen_productos.empty else {"nombre": "N/A", "ventas": 0.0}

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
# 2. ENDPOINT: MINI-TARS COPILOTO AI
# ==========================================
@app.post("/api/tars-chat")
async def tars_chat(request: ChatRequest):
    if not GEMINI_API_KEY:
        return {
            "respuesta": "Estimado(a) empresario(a), la clave GEMINI_API_KEY no está configurada en las variables de entorno de Render."
        }
    
    try:
        # Intentar con gemini-1.5-flash y fallback a gemini-pro
        try:
            model = genai.GenerativeModel("gemini-1.5-flash")
        except Exception:
            model = genai.GenerativeModel("gemini-pro")
        
        prompt_sistema = f"""
        Eres Mini-TARS, un socio analítico, asesor cuantitativo y copiloto de negocios directo, franco y estratégico.
        
        Reglas de comunicación:
        - Dirígete al usuario siempre como 'Estimado(a) empresario(a)' si vas a saludar.
        - Habla claro sobre números, márgenes, rentabilidad y adquisición de clientes (CAC, ROAS).
        - No uses rodeos corporativos ni introducciones vacías.
        - Si hay datos de auditoría o del simulador disponibles en el contexto, úsalos para justificar tus respuestas.
        
        Contexto del negocio en la plataforma:
        {request.contexto}
        
        Consulta del usuario:
        {request.mensaje}
        """
        
        # Si falla el método general, usamos el modelo clásico directo
        try:
            response = model.generate_content(prompt_sistema)
            return {"respuesta": response.text}
        except Exception:
            fallback_model = genai.GenerativeModel("gemini-pro")
            response = fallback_model.generate_content(prompt_sistema)
            return {"respuesta": response.text}

    except Exception as e:
        return {"respuesta": f"Estimado(a) empresario(a), ocurrió un inconveniente con el motor de IA: {str(e)}"}