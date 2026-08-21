from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import io

app = FastAPI(title="Simulador SaaS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "online", "mensaje": "Motor analítico activo"}

@app.post("/api/auditar-csv")
async def auditar_csv(archivo: UploadFile = File(...)):
    try:
        contenido = await archivo.read()
        df = pd.read_csv(io.BytesIO(contenido))
        
        # Limpieza básica de nombres de columnas
        df.columns = [col.strip().lower().replace(" ", "_").replace(".", "") for col in df.columns]
        
        # 1. Búsqueda flexible de columnas numéricas (Ventas y Unidades)
        col_ventas = next((c for c in df.columns if any(k in c for k in ['venta', 'ingreso', 'total', 'revenue', 'monto', 'price', 'valor', 'sales', 'amount'])), None)
        col_unidades = next((c for c in df.columns if any(k in c for k in ['unidad', 'cantidad', 'qty', 'volume', 'count', 'quantity', 'unidades'])), None)
        
        # 2. Búsqueda flexible de columna de Producto / Categoría
        col_producto = next((c for c in df.columns if any(k in c for k in ['producto', 'product', 'item', 'descripcion', 'description', 'name', 'nombre', 'articulo', 'sku', 'categoria', 'category'])), None)
        
        # Si aún no detecta columna de producto, toma la primera columna tipo texto/objeto
        if not col_producto:
            cols_texto = df.select_dtypes(include=['object', 'string']).columns
            if len(cols_texto) > 0:
                col_producto = cols_texto[0]

        total_registros = len(df)
        ventas_historicas = float(df[col_ventas].sum()) if col_ventas else 0.0
        unidades_historicas = int(df[col_unidades].sum()) if col_unidades else int(total_registros)
        precio_promedio = ventas_historicas / unidades_historicas if unidades_historicas > 0 else 0.0
        
        diagnostico = None
        ranking_productos = []

        if col_producto:
            # Usar ventas si existen, si no, contar frecuencia de transacciones
            if col_ventas:
                agrupado = df.groupby(col_producto)[col_ventas].sum().sort_values(ascending=False)
            else:
                agrupado = df[col_producto].value_counts()

            if len(agrupado) > 0:
                rey_nombre = str(agrupado.index[0])
                rey_ventas = float(agrupado.iloc[0])
                
                hueso_nombre = str(agrupado.index[-1])
                hueso_ventas = float(agrupado.iloc[-1])
                
                diagnostico = {
                    "rey": {"nombre": rey_nombre, "ventas": round(rey_ventas, 2)},
                    "hueso": {"nombre": hueso_nombre, "ventas": round(hueso_ventas, 2)}
                }

                # Tomar Top 5 para el gráfico
                top5 = agrupado.head(5).reset_index()
                top5.columns = ['producto', 'valor']
                for _, row in top5.iterrows():
                    ranking_productos.append({
                        "nombre": str(row['producto'])[:16], # Truncar a 16 caracteres para diseño limpio
                        "ventas": round(float(row['valor']), 2)
                    })

        return {
            "total_registros": total_registros,
            "ventas_historicas": round(ventas_historicas, 2),
            "unidades_historicas": unidades_historicas,
            "precio_promedio": round(precio_promedio, 2),
            "diagnostico": diagnostico,
            "ranking_productos": ranking_productos
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error analizando CSV: {str(e)}")