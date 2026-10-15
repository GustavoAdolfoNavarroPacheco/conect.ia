# ⚡ INICIO RÁPIDO

## 🚀 5 PASOS PARA EMPEZAR (5 minutos)

### Paso 1️⃣ - Terminal
```bash
cd backend
```

### Paso 2️⃣ - Instalar
```bash
pip install -r requirements.txt
```

### Paso 3️⃣ - Probar
```bash
python test_app.py
```
✅ Verifica que dice: `✓ ¡TODAS LAS PRUEBAS PASARON!`

### Paso 4️⃣ - Ejecutar
```bash
python app.py
```
✅ Verifica que dice: `Running on http://0.0.0.0:5000`

### Paso 5️⃣ - Usar
Abre en el navegador:
- **Opción A:** `fronted\index.html` (Click derecho → Abrir)
- **Opción B:** `http://localhost:8000` (si usas servidor local)

---

## ❓ PROBLEMAS COMUNES

### Error: "módulo no encontrado"
```bash
# Reinstala dependencias
pip install -r requirements.txt
```

### Error: "Puerto 5000 en uso"
```bash
# Verifica qué está usando el puerto
netstat -ano | findstr :5000
# Mata el proceso
taskkill /PID [PID] /F
```

### Error: "No se conecta"
- ¿Backend en `:5000`? → `python app.py`
- ¿Frontend en `:8000`? → `python -m http.server 8000`
- ¿API Key en `.env`? → `CLAVE_API_GEMINI=...`

---

## 📋 VERIFICACIÓN

- [x] `.env` tiene `CLAVE_API_GEMINI=...`
- [x] `backend/requirements.txt` existe
- [x] Python 3.8+ instalado
- [x] `fronted/index.html` existe
- [x] `backend/app.py` existe

---

## 🎯 QUÉ HACE CADA ARCHIVO

| Archivo | Función |
|---------|---------|
| `backend/app.py` | 🖥️ Servidor |
| `fronted/index.html` | 🎨 Interfaz |
| `backend/chat_handler.py` | 🤖 Gemini |
| `backend/storage.py` | 💾 Datos |
| `.env` | 🔑 Configuración |

---

## 🔗 URLS IMPORTANTES

| URL | Descripción |
|-----|-------------|
| `http://localhost:5000/health` | ¿Está el servidor vivo? |
| `http://localhost:5000/api/status` | Estado de la API |
| `http://localhost:8000` | Frontend (si usas servidor) |

---

## 📞 DOCUMENTACIÓN COMPLETA

- 📖 `GUIA_INSTALACION.md` - Instalación paso a paso
- 📊 `ANALISIS_COMPLETO.md` - Análisis del código
- 🏗️ `ARQUITECTURA.md` - Diagramas
- 📝 `RESUMEN_FINAL.md` - Resumen ejecutivo
- 🔧 `backend/README_BACKEND.md` - API endpoints
- 🎨 `fronted/README_FRONTEND.md` - Frontend

---

## ✅ CHECKLIST

- [ ] Dependencias instaladas: `pip install -r requirements.txt`
- [ ] Pruebas pasadas: `python test_app.py`
- [ ] Backend ejecutando: `python app.py`
- [ ] Frontend abierto: `fronted/index.html`
- [ ] ¡Chat funcionando!

---

**¡LISTO PARA USAR!** 🎉

Ejecuta: `python app.py` y luego abre el frontend.

Pregunta algo a la IA y verás la magia suceder.
