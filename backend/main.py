import io
import unicodedata
import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Diccionario maestro de sinónimos para el mapeo
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

def limpiar_texto(texto: str) -> str:
    if not isinstance(texto, str):
        texto = str(texto)
    texto_sin_tildes = "".join(
        c for c in unicodedata.normalize("NFD", texto)
        if unicodedata.category(c) != "Mn"
    )
    return texto_sin_tildes.strip().lower().replace(" ", "_").replace("-", "_").replace(".", "")

def mapear_esquema(df: pd.DataFrame):
    df_res = df.copy()
    columnas_originales = list(df.columns)
    columnas_limpias = {col: limpiar_texto(col) for col in columnas_originales}

    columnas_mapeadas = {"producto": None, "precio": None, "cantidad": None, "total": None, "fecha": None}
    columnas_renombradas = {}

    # 1. Coincidencia exacta
    for col_orig, col_clean in columnas_limpias.items():
        for canonica, alias_lista in DICCIONARIO_COLUMNAS.items():
            if columnas_mapeadas[canonica] is None and col_clean in alias_lista:
                columnas_mapeadas[canonica] = col_orig
                columnas_renombradas[col_orig] = canonica
                break

    # 2. Coincidencia parcial
    for col_orig, col_clean in columnas_limpias.items():
        if col_orig not in columnas_renombradas:
            for canonica, alias_lista in DICCIONARIO_COLUMNAS.items():
                if columnas_mapeadas[canonica] is None:
                    if any(alias in col_clean for alias in alias_lista if len(alias) >= 4):
                        columnas_mapeadas[canonica] = col_orig
                        columnas_renombradas[col_orig] = canonica
                        break

    df_res.rename(columns=columnas_renombradas, inplace=True)

    # Si falta producto, tomar la primera columna de texto
    if "producto" not in df_res.columns:
        cols_texto = df_res.select_dtypes(include=['object', 'string']).columns
        if len(cols_texto) > 0:
            df_res.rename(columns={cols_texto[0]: "producto"}, inplace=True)

    # Normalizar columnas numéricas
    for col_num in ["precio", "cantidad", "total"]:
        if col_num in df_res.columns:
            if df_res[col_num].dtype == object:
                df_res[col_num] = (
                    df_res[col_num]
                    .astype(str)
                    .str.replace(r"[\$,\s€COPUSD]", "", regex=True)
                    .str.replace(",", ".")
                )
            df_res[col_num] = pd.to_numeric(df_res[col_num], errors="coerce").fillna(0)

    # Autocalcular total o precio si faltan
    if "total" not in df_res.columns and "precio" in df_res.columns and "cantidad" in df_res.columns:
        df_res["total"] = df_res["precio"] * df_res["cantidad"]
    elif "precio" not in df_res.columns and "total" in df_res.columns and "cantidad" in df_res.columns:
        df_res["precio"] = df_res.apply(
            lambda r: r["total"] / r["cantidad"] if r["cantidad"] > 0 else 0, axis=1
        )

    return df_res

# ==========================================
# ENDPOINT DE AUDITORÍA FORENSE
# ==========================================
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

        # 1. Lectura de Excel
        if nombre.endswith(('.xlsx', '.xls')):
            excel_file = pd.ExcelFile(io.BytesIO(contenido))
            hojas = excel_file.sheet_names
            hoja_objetivo = hojas[0]
            puntuacion_max = -1
            
            for h in hojas:
                try:
                    df_temp = pd.read_excel(excel_file, sheet_name=h, nrows=5)
                    cols_clean = [limpiar_texto(c) for c in df_temp.columns]
                    puntos = 0
                    if any(k in cols_clean for k in ['producto', 'product', 'item', 'descripcion', 'nombre_producto', 'product_name']):
                        puntos += 3
                    if any(k in cols_clean for k in ['total', 'ventas', 'sales', 'precio', 'monto']):
                        puntos += 2
                    if any(k in cols_clean for k in ['cantidad', 'qty', 'quantity']):
                        puntos += 1
                    
                    if puntos > puntuacion_max:
                        puntuacion_max = puntos
                        hoja_objetivo = h
                except Exception:
                    continue

            df_crudo = pd.read_excel(excel_file, sheet_name=hoja_objetivo)

        # 2. Lectura tolerante de CSV
        else:
            try:
                df_crudo = pd.read_csv(io.BytesIO(contenido))
            except Exception:
                try:
                    df_crudo = pd.read_csv(io.BytesIO(contenido), sep=";", encoding="latin1")
                except Exception:
                    df_crudo = pd.read_csv(io.BytesIO(contenido), sep=None, engine='python', encoding="utf-8-sig")

        # 3. Aplicar mapeo inteligente
        df = mapear_esquema(df_crudo)

        if "producto" not in df.columns or "total" not in df.columns:
            raise HTTPException(
                status_code=400,
                detail=f"No se pudieron identificar las columnas requeridas ('producto' y 'total'). Detectadas: {list(df_crudo.columns)}"
            )

        df['ventas_calculadas'] = df['total']

        # 4. Métricas cuantitativas
        total_registros = int(len(df))
        ventas_historicas = float(df['ventas_calculadas'].sum())
        unidades_historicas = float(df['cantidad'].sum()) if 'cantidad' in df.columns else float(total_registros)
        precio_promedio = float(df['precio'].mean()) if 'precio' in df.columns else (ventas_historicas / unidades_historicas if unidades_historicas > 0 else 0.0)

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
        raise HTTPException(status_code=500, detail=f"Error al procesar archivo: {str(e)}")

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