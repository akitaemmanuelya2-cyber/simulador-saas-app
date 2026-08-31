import os
import io
import pandas as pd
import requests
from Services.schema_mapper import mapear_esquema_inteligente
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:
    from services.schema_mapper import mapear_esquema_inteligente
except ModuleNotFoundError:
    from Services.schema_mapper import mapear_esquema_inteligente

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
# 1. AUDITORÍA FORENSE CSV / EXCEL
# ==========================================
@app.post("/api/auditar-csv")
async def auditar_csv(archivo: UploadFile = File(...)):
    try:
        contenido = await archivo.read()

        # 1. Lectura tolerante de CSV o Excel multi-pestaña
        if archivo.filename.endswith(('.xlsx', '.xls', '.csv.xlsx')):
            excel_file = pd.ExcelFile(io.BytesIO(contenido))
            hojas = excel_file.sheet_names
            
            # Buscar prioritariamente una hoja con ventas o tomar la primera
            hoja_objetivo = hojas[0]
            for h in hojas:
                if any(k in h.lower() for k in ['venta', 'sales', 'facturacion', 'transaccion', 'detalle', 'ejemplo']):
                    hoja_objetivo = h
                    break
                    
            df_crudo = pd.read_excel(excel_file, sheet_name=hoja_objetivo)
        else:
            try:
                df_crudo = pd.read_csv(io.BytesIO(contenido))
            except Exception:
                try:
                    df_crudo = pd.read_csv(io.BytesIO(contenido), sep=";", encoding="latin1")
                except Exception:
                    df_crudo = pd.read_csv(io.BytesIO(contenido), sep=None, engine='python', encoding="utf-8-sig")

        # 2. Mapeador inteligente
        df, mapeo_detectado, advertencias = mapear_esquema_inteligente(df_crudo)

        if "producto" not in df.columns or "total" not in df.columns:
            raise HTTPException(
                status_code=400,
                detail=f"No se pudieron identificar las columnas requeridas ('producto' y 'total'). Detectadas: {list(df_crudo.columns)}"
            )

        df['ventas_calculadas'] = df['total']

        # 3. Métricas cuantitativas
        total_registros = len(df)
        ventas_historicas = float(df['ventas_calculadas'].sum())
        unidades_historicas = float(df['cantidad'].sum()) if 'cantidad' in df.columns else total_registros
        precio_promedio = float(df['precio'].mean()) if 'precio' in df.columns else (ventas_historicas / unidades_historicas if unidades_historicas > 0 else 0)

        resumen = df.groupby('producto')['ventas_calculadas'].sum().reset_index()
        resumen = resumen.sort_values(by='ventas_calculadas', ascending=False)

        top_5 = [
            {"nombre": str(row['producto']), "ventas": round(float(row['ventas_calculadas']), 2)}
            for _, row in resumen.head(5).iterrows()
        ]

        rey = top_5[0] if top_5 else {"nombre": "N/A", "ventas": 0.0}
        hueso = {
            "nombre": str(resumen.iloc[-1]['producto']),
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

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al auditar archivo: {str(e)}")

# ==========================================
# 2. MINI-TARS REST API (SIN DEPENDENCIAS DE SDK)
# ==========================================
@app.post("/api/tars-chat")
async def tars_chat(request: ChatRequest):
    if not GEMINI_API_KEY:
        return {"respuesta": "Estimado(a) empresario(a), la clave GEMINI_API_KEY no está configurada en Render."}

    prompt_completo = f"""[INSTRUCCIÓN DEL SISTEMA: Responde DIRECTAMENTE al usuario en español como Mini-TARS. PROHIBIDO imprimir notas, bocetos de pensamiento, listas de restricciones o análisis de variables. Entrega ÚNICAMENTE la respuesta final redactada.]

Contexto del negocio:
{request.contexto}

Pregunta del empresario:
{request.mensaje}
"""

    payload = {
        "contents": [{
            "parts": [{"text": prompt_completo}]
        }],
        "generationConfig": {
            "maxOutputTokens": 600,
            "temperature": 0.4
        }
    }

    try:
        # 1. Consultar a Google los modelos disponibles para tu clave
        list_url = f"https://generativelanguage.googleapis.com/v1beta/models?key={GEMINI_API_KEY}"
        list_res = requests.get(list_url, timeout=10)
        
        candidatos = []
        if list_res.status_code == 200:
            modelos = list_res.json().get("models", [])
            for m in modelos:
                if "generateContent" in m.get("supportedGenerationMethods", []):
                    candidatos.append(m["name"])

        # Fallback de nombres si no responde la lista
        if not candidatos:
            candidatos = ["models/gemini-1.5-flash", "models/gemini-2.0-flash", "models/gemini-pro"]

        # 2. Iterar sobre los modelos habilitados hasta obtener respuesta exitosa
        for model_path in candidatos:
            clean_name = model_path.replace("models/", "")
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{clean_name}:generateContent?key={GEMINI_API_KEY}"
            
            try:
                res = requests.post(url, json=payload, timeout=20)
                if res.status_code == 200:
                    data = res.json()
                    return {"respuesta": data['candidates'][0]['content']['parts'][0]['text']}
            except Exception:
                continue

        return {"respuesta": "Estimado(a) empresario(a), no fue posible enlazar con los modelos disponibles en este momento."}

    except Exception as e:
        return {"respuesta": f"Estimado(a) empresario(a), inconveniente de conexión: {str(e)}"}