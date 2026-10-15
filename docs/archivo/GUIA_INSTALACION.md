# Asistente de IA - Guía de Instalación y Uso

## 📋 Descripción General

Este proyecto es un **Asistente de IA** completo que utiliza:

- **Frontend**: HTML5 + CSS3 + JavaScript vanilla (Sin dependencias)
- **Backend**: Flask + Python + Google Gemini API
- **Almacenamiento**: JSON persistente

La aplicación permite que los usuarios hagan preguntas y reciban respuestas inteligentes en tiempo real.

## 📁 Estructura del Proyecto

```
agente inteligente/
├── .env                          # Configuración de variables de entorno
├── .gitignore                    # Archivos a ignorar en git
├── README.md                     # Este archivo
│
├── fronted/                      # FRONTEND
│   ├── index.html               # Página principal
│   ├── README_FRONTEND.md       # Documentación del frontend
│   ├── css/
│   │   └── styles.css           # Estilos
│   └── js/
│       └── chat.js              # Lógica del chat
│
└── backend/                      # BACKEND
    ├── app.py                   # Aplicación principal Flask
    ├── config.py                # Configuración
    ├── test_app.py              # Suite de pruebas
    ├── requirements.txt         # Dependencias Python
    ├── run_backend.bat          # Script de inicio (Windows)
    ├── run_backend.sh           # Script de inicio (Linux/Mac)
    ├── README_BACKEND.md        # Documentación del backend
    ├── data/                    # Datos (creado automáticamente)
    │   └── conversations.json   # Almacenamiento de conversaciones
    ├── controlador/
    │   ├── __init__.py
    │   └── chat_handler.py      # Manejador de chat con Gemini
    ├── utils/
    │   ├── __init__.py
    │   └── storage.py           # Almacenamiento JSON
    └── modelo/                  # (Reservado para modelos)
```

## ⚡ Quick Start (5 minutos)

### Paso 1: Verificar Requisitos

- Python 3.8+
- PIP (gestor de paquetes Python)
- Navegador moderno
- Conexión a Internet

```bash
# Verificar Python
python --version

# Verificar PIP
pip --version
```

### Paso 2: Instalar Dependencias del Backend

```bash
# Navegar a la carpeta backend
cd backend

# Instalar dependencias
pip install -r requirements.txt
```

### Paso 3: Ejecutar Pruebas

```bash
# Desde la carpeta backend
python test_app.py
```

Deberías ver:
```
✓ ¡TODAS LAS PRUEBAS PASARON! La aplicación está lista.
```

### Paso 4: Iniciar el Backend

```bash
# Windows
run_backend.bat

# Linux/Mac
bash run_backend.sh

# O manualmente
python app.py
```

El servidor se iniciará en: `http://localhost:5000`

### Paso 5: Abrir el Frontend

En otro terminal, abre el frontend de una de estas formas:

**Opción A: Navegador directo (Simple)**
```bash
# Windows
start fronted\index.html

# Linux
xdg-open fronted/index.html

# Mac
open fronted/index.html
```

**Opción B: Servidor local (Recomendado)**
```bash
cd fronted
python -m http.server 8000
```
Luego abre `http://localhost:8000` en el navegador.

## 🎯 Flujo de la Aplicación

```
┌─────────────┐
│  Usuario    │
└──────┬──────┘
       │ Escribe pregunta
       ▼
┌─────────────────────┐
│ Frontend (HTML/JS)  │
│ - Recibe pregunta   │
│ - Valida entrada    │
└──────┬──────────────┘
       │ POST /api/chat
       ▼
┌─────────────────────┐
│ Backend (Flask)     │
│ - Recibe mensaje    │
│ - Valida            │
│ - Guarda en JSON    │
└──────┬──────────────┘
       │ Envía a Gemini
       ▼
┌─────────────────────┐
│ Gemini API          │
│ - Procesa pregunta  │
│ - Genera respuesta  │
└──────┬──────────────┘
       │ Respuesta
       ▼
┌─────────────────────┐
│ Backend (Flask)     │
│ - Recibe respuesta  │
│ - Guarda en JSON    │
│ - Devuelve al front │
└──────┬──────────────┘
       │ JSON con respuesta
       ▼
┌─────────────────────┐
│ Frontend (HTML/JS)  │
│ - Recibe respuesta  │
│ - Muestra al usuario│
└─────────────────────┘
```

## 🔑 Configuración de Gemini API

1. Ve a [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Copia tu API Key
3. Asegúrate de que en el archivo `.env` está:

```
CLAVE_API_GEMINI=tu_clave_api_aqui
```

## 📊 Almacenamiento de Datos

Los datos se guardan en `backend/data/conversations.json`:

```json
{
  "conversations": [
    {
      "id": "uuid-único",
      "title": "Título de conversación",
      "created_at": "2024-05-12T10:30:45.123456",
      "updated_at": "2024-05-12T10:35:20.654321",
      "messages": [
        {
          "role": "user",
          "content": "Pregunta del usuario",
          "timestamp": "2024-05-12T10:30:45.123456"
        },
        {
          "role": "bot",
          "content": "Respuesta de la IA",
          "timestamp": "2024-05-12T10:30:46.123456"
        }
      ]
    }
  ]
}
```

## 🧪 Endpoints de la API

### Salud del Servidor
```bash
curl http://localhost:5000/health
```

### Estado de la API
```bash
curl http://localhost:5000/api/status
```

### Enviar Mensaje (Principal)
```bash
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "¿Hola?"}'
```

### Ver todas las conversaciones
```bash
curl http://localhost:5000/api/conversations
```

### Ver una conversación específica
```bash
curl http://localhost:5000/api/conversations/UUID-AQUI
```

## 🐛 Solución de Problemas

### Error: "No se pudo conectar con el servidor"

1. Verifica que el backend está ejecutándose:
   ```bash
   # Terminal 1: Backend
   python backend/app.py
   ```

2. Verifica que está en `http://localhost:5000`:
   ```bash
   curl http://localhost:5000/health
   ```

3. Si ves un error de puerto, el puerto 5000 ya está en uso:
   ```bash
   # Windows (PowerShell)
   Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess
   
   # Matar el proceso
   Stop-Process -Id [PID]
   ```

### Error: "Clave de API de Gemini no configurada"

1. Verifica que el archivo `.env` existe en la raíz del proyecto
2. Verifica que contiene: `CLAVE_API_GEMINI=tu_clave_aqui`
3. Reinicia el servidor

### El frontend no carga

1. Verifica que abres el archivo correcto: `fronted/index.html`
2. Si usas servidor local, verifica que está en `http://localhost:8000`
3. Limpia el cache: Ctrl+Shift+Delete

## 📚 Documentación Detallada

- [Frontend](fronted/README_FRONTEND.md) - Guía completa del frontend
- [Backend](backend/README_BACKEND.md) - Guía completa del backend

## 🔐 Consideraciones de Seguridad

- ✅ API Key guardada en archivo `.env` (no en el código)
- ✅ Validaciones estrictas en todos los inputs
- ✅ CORS configurado para aceptar localhost
- ✅ Manejo robusto de errores
- ✅ Logging completo para auditoría

## 📈 Estadísticas

El backend proporciona estadísticas en `/api/status`:

```json
{
  "status": "ok",
  "service": "AI Assistant Backend",
  "system": {
    "model": "gemini-pro",
    "api_configured": true,
    "status": "Operativo"
  },
  "storage": {
    "total_conversations": 5,
    "total_messages": 42,
    "file_size_kb": 12.34
  }
}
```

## 🚀 Próximos Pasos

1. Personaliza los estilos en `fronted/css/styles.css`
2. Agrega más funcionalidades en el backend
3. Implementa autenticación de usuarios
4. Añade exportación a PDF
5. Crea un historial de conversaciones más completo

## 📞 Soporte

Si tienes problemas:

1. Revisa la documentación específica:
   - [Frontend](fronted/README_FRONTEND.md)
   - [Backend](backend/README_BACKEND.md)

2. Verifica los logs en la consola

3. Ejecuta las pruebas: `python backend/test_app.py`

## 📝 Licencia

Este proyecto está disponible bajo licencia MIT.

## 👨‍💻 Autor

Proyecto desarrollado como un asistente de IA con Gemini.

---

**Versión:** 1.0.0  
**Última actualización:** Mayo 12, 2024  
**Estado:** ✅ Funcional y Probado
