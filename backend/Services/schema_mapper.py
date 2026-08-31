import unicodedata
import pandas as pd
from typing import Dict, Optional, Tuple

# 1. Diccionario canónico de sinónimos y alias habituales en analítica y facturación
DICCIONARIO_COLUMNAS = {
    "producto": [
        "producto", "item", "articulo", "descripcion", "concepto", "nombre_producto", 
        "servicio", "detalle", "product", "item_name", "description", "sku"
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
        "total_venta", "importe", "total_facturado", "subtotal", "monto_total"
    ],
    "fecha": [
        "fecha", "date", "periodo", "mes", "timestamp", "dia", "created_at"
    ]
}

def limpiar_texto(texto: str) -> str:
    """Elimina tildes, espacios en blanco y pasa a minúsculas estándar."""
    if not isinstance(texto, str):
        texto = str(texto)
    # Normalizar caracteres Unicode (remover tildes y diacríticos)
    texto_sin_tildes = "".join(
        c for c in unicodedata.normalize("NFD", texto)
        if unicodedata.category(c) != "Mn"
    )
    return texto_sin_tildes.strip().lower().replace(" ", "_").replace("-", "_").replace(".", "")

def mapear_esquema_inteligente(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Optional[str]], list]:
    """
    Normaliza los nombres de las columnas del DataFrame hacia el estándar canónico:
    ['producto', 'precio', 'cantidad', 'total', 'fecha'].
    
    Retorna:
      - DataFrame con nombres normalizados
      - Diccionario de mapeos encontrados
      - Lista de advertencias/columnas no identificadas
    """
    df_normalizado = df.copy()
    columnas_originales = list(df.columns)
    columnas_limpias = {col: limpiar_texto(col) for col in columnas_originales}
    
    columnas_mapeadas: Dict[str, Optional[str]] = {
        "producto": None,
        "precio": None,
        "cantidad": None,
        "total": None,
        "fecha": None
    }
    
    columnas_renombradas = {}
    
    # Fase 1: Coincidencia exacta y por diccionario de sinónimos
    for col_orig, col_clean in columnas_limpias.items():
        for canonica, alias_lista in DICCIONARIO_COLUMNAS.items():
            if columnas_mapeadas[canonica] is None:
                if col_clean in alias_lista:
                    columnas_mapeadas[canonica] = col_orig
                    columnas_renombradas[col_orig] = canonica
                    break

    # Fase 2: Coincidencia parcial (Fuzzy substring) para nombres compuestos
    # Ej: "precio_final_con_descuento" -> detecta "precio"
    for col_orig, col_clean in columnas_limpias.items():
        if col_orig not in columnas_renombradas:
            for canonica, alias_lista in DICCIONARIO_COLUMNAS.items():
                if columnas_mapeadas[canonica] is None:
                    if any(alias in col_clean for alias in alias_lista if len(alias) >= 4):
                        columnas_mapeadas[canonica] = col_orig
                        columnas_renombradas[col_orig] = canonica
                        break

    # Aplicar el renombramiento
    df_normalizado.rename(columns=columnas_renombradas, inplace=True)

    # Fase 3: Auto-recuperación de métricas faltantes (Lógica de negocio)
    advertencias = []
    
    # Si falta 'producto', buscamos la primera columna de texto/objeto
    if columnas_mapeadas["producto"] is None:
        columnas_texto = df_normalizado.select_dtypes(include=['object', 'string']).columns
        if len(columnas_texto) > 0:
            df_normalizado.rename(columns={columnas_texto[0]: "producto"}, inplace=True)
            columnas_mapeadas["producto"] = columnas_texto[0]
            advertencias.append(f"Columna '{columnas_texto[0]}' asumida como 'producto'.")

    # Limpieza numérica de campos monetarios y de cantidad (remover símbolos de moneda y comas)
    for col_num in ["precio", "cantidad", "total"]:
        if col_num in df_normalizado.columns:
            if df_normalizado[col_num].dtype == object:
                df_normalizado[col_num] = (
                    df_normalizado[col_num]
                    .astype(str)
                    .str.replace(r"[\$,\s€COPUSD]", "", regex=True)
                    .str.replace(",", ".")
                )
            df_normalizado[col_num] = pd.to_numeric(df_normalizado[col_num], errors="coerce").fillna(0)

    # Auto-cálculo de 'total' si se tienen 'precio' y 'cantidad'
    if "total" not in df_normalizado.columns and "precio" in df_normalizado.columns and "cantidad" in df_normalizado.columns:
        df_normalizado["total"] = df_normalizado["precio"] * df_normalizado["cantidad"]
        advertencias.append("Columna 'total' calculada automáticamente como (precio * cantidad).")
        columnas_mapeadas["total"] = "(calculado)"

    # Auto-cálculo de 'precio' si se tienen 'total' y 'cantidad'
    elif "precio" not in df_normalizado.columns and "total" in df_normalizado.columns and "cantidad" in df_normalizado.columns:
        df_normalizado["precio"] = df_normalizado.apply(
            lambda row: row["total"] / row["cantidad"] if row["cantidad"] > 0 else 0, axis=1
        )
        advertencias.append("Columna 'precio' calculada automáticamente como (total / cantidad).")
        columnas_mapeadas["precio"] = "(calculado)"

    return df_normalizado, columnas_mapeadas, advertencias