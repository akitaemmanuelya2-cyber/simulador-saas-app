import io
import unicodedata
import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Simulador SaaS API")

# Configuración de CORS para permitir peticiones desde cualquier frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Diccionario maestro de mapeo
DICCIONARIO_COLUMNAS = {
    "producto": [
        "producto", "item", "articulo", "descripcion", "concepto", "nombre_producto", 
        "servicio", "detalle", "product", "product_name", "item_name", "description", "sku"
    ],
    "precio": [
        "precio", "precio_unitario", "valor_unitario", "pvp", "unit_price", "price", 
        "costo_unitario", "tarifa", "valor", "precio_venta"
    ],
    "cantidad": [
        "cantidad", "unidades", "qty", "quantity", "cant", "volumen", "piezas", 
        "numero_unidades", "ventas_unidades", "count"
    ],
    "total": [
        "total", "facturacion", "ingreso", "ventas", "revenue", "monto", 
        "total_venta", "importe", "total_facturado", "subtotal", "monto_total", "sales"
    ],
    "fecha": [
        "fecha", "date", "periodo", "mes", "timestamp", "dia", "created_at", "order_date"
    ]
}

def normalizar_texto(texto: str) -> str:
    if not isinstance(texto, str):
        texto = str(texto)
    sin_tildes = "".join(
        c for c in unicodedata.normalize("NFD", texto)
        if unicodedata.category(c) != "Mn"
    )
    return sin_tildes.strip().lower().replace(" ", "_").replace("-", "_").replace(".", "")

def mapear_dataframe(df_in: pd.DataFrame) -> pd.DataFrame:
    df = df_in.copy()
    
    # Eliminar columnas duplicadas o vacías como 'Unnamed'
    df = df.loc[:, ~df.columns.str.contains('^Unnamed', na=False)]
    
    mapeo_destino = {}
    usados = set()

    # Prioridad 1: Mapear Total / Sales
    for col in df.columns:
        c_clean = normalizar_texto(col)
        if "total" not in usados and c_clean in DICCIONARIO_COLUMNAS["total"]:
            mapeo_destino[col] = "total"
            usados.add("total")
            break

    # Prioridad 2: Mapear Producto / Product Name
    for col in df.columns:
        if col in mapeo_destino:
            continue
        c_clean = normalizar_texto(col)
        if "producto" not in usados and c_clean in DICCIONARIO_COLUMNAS["producto"]:
            mapeo_destino[col] = "producto"
            usados.add("producto")
            break

    # Prioridad 3: Mapear Cantidad
    for col in df.columns:
        if col in mapeo_destino:
            continue
        c_clean = normalizar_texto(col)
        if "cantidad" not in usados and c_clean in DICCIONARIO_COLUMNAS["cantidad"]:
            mapeo_destino[col] = "cantidad"
            usados.add("cantidad")
            break

    # Prioridad 4: Mapear Precio
    for col in df.columns:
        if col in mapeo_destino:
            continue
        c_clean = normalizar_texto(col)
        if "precio" not in usados and c_clean in DICCIONARIO_COLUMNAS["precio"]:
            mapeo_destino[col] = "precio"
            usados.add("precio")
            break

    df.rename(columns=mapeo_destino, inplace=True)

    # Si falta producto, tomar la primera columna de texto
    if "producto" not in df.columns:
        cols_txt = df.select_dtypes(include=['object', 'string']).columns
        if len(cols_txt) > 0:
            df.rename(columns={cols_txt[0]: "producto"}, inplace=True)

    # Limpieza de columnas numéricas
    for c in ["precio", "cantidad", "total"]:
        if c in df.columns:
            if df[c].dtype == object:
                df[c] = (
                    df[c].astype(str)
                    .str.replace(r"[\$,\s€COPUSD]", "", regex=True)
                    .str.replace(",", ".")
                )
            df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0)

    # Autocálculo de total o precio si uno falta
    if "total" not in df.columns and "precio" in df.columns and "cantidad" in df.columns:
        df["total"] = df["precio"] * df["cantidad"]
    elif "precio" not in df.columns and "total" in df.columns and "cantidad" in df.columns:
        df["precio"] = df.apply(lambda r: r["total"] / r["cantidad"] if r["cantidad"] > 0 else 0, axis=1)

    return df


@app.get("/")
def home():
    return {"status": "ok", "message": "Motor analítico SaaS activo"}


@app.post("/api/auditar-csv")
async def auditar_csv(
    archivo: UploadFile = File(None),
    file: UploadFile = File(None)
):
    try:
        archivo_final = archivo or file
        if not archivo_final:
            raise HTTPException(status_code=400, detail="No se recibió ningún archivo.")

        nombre = archivo_final.filename.lower()
        contenido = await archivo_final.read()

        # 1. Cargar archivo Excel o CSV
        if nombre.endswith(('.xlsx', '.xls')):
            excel_file = pd.ExcelFile(io.BytesIO(contenido))
            hoja_elegida = excel_file.sheet_names[0]
            max_pts = -1

            # Seleccionar la pestaña con mayor coincidencia comercial
            for h in excel_file.sheet_names:
                try:
                    df_preview = pd.read_excel(excel_file, sheet_name=h, nrows=3)
                    cols_limpias = [normalizar_texto(c) for c in df_preview.columns]
                    pts = 0
                    if any(k in cols_limpias for k in ['producto', 'product_name', 'item', 'descripcion', 'nombre_producto']):
                        pts += 3
                    if any(k in cols_limpias for k in ['total', 'sales', 'ventas', 'facturacion', 'precio']):
                        pts += 2
                    if any(k in cols_limpias for k in ['cantidad', 'quantity', 'qty']):
                        pts += 1
                    if pts > max_pts:
                        max_pts = pts
                        hoja_elegida = h
                except Exception:
                    continue

            df_crudo = pd.read_excel(excel_file, sheet_name=hoja_elegida)
        else:
            try:
                df_crudo = pd.read_csv(io.BytesIO(contenido))
            except Exception:
                try:
                    df_crudo = pd.read_csv(io.BytesIO(contenido), sep=";", encoding="latin1")
                except Exception:
                    df_crudo = pd.read_csv(io.BytesIO(contenido), sep=None, engine='python', encoding="utf-8-sig")

        # 2. Normalizar esquema
        df = mapear_dataframe(df_crudo)

        if "producto" not in df.columns or "total" not in df.columns:
            raise HTTPException(
                status_code=400,
                detail=f"No fue posible mapear 'producto' y 'total'. Columnas: {list(df_crudo.columns)}"
            )

        # 3. Métricas
        df["ventas_calculadas"] = df["total"]
        total_registros = int(len(df))
        ventas_historicas = float(df["ventas_calculadas"].sum())
        unidades_historicas = float(df["cantidad"].sum()) if "cantidad" in df.columns else float(total_registros)
        precio_promedio = float(df["precio"].mean()) if "precio" in df.columns else (ventas_historicas / unidades_historicas if unidades_historicas > 0 else 0.0)

        resumen = df.groupby("producto")["ventas_calculadas"].sum().reset_index()
        resumen = resumen.sort_values(by="ventas_calculadas", ascending=False)

        top_5 = [
            {"nombre": str(r["producto"]), "ventas": round(float(r["ventas_calculadas"]), 2)}
            for _, r in resumen.head(5).iterrows()
        ]

        rey = top_5[0] if len(top_5) > 0 else {"nombre": "N/A", "ventas": 0.0}
        hueso = {
            "nombre": str(resumen.iloc[-1]["producto"]),
            "ventas": round(float(resumen.iloc[-1]["ventas_calculadas"]), 2)
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
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

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