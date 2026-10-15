# Arquitectura del Proyecto

## Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                     NAVEGADOR DEL USUARIO                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────────────────────────────────────────────┐   │
│  │          FRONTEND (HTML + CSS + JavaScript)            │   │
│  │                                                         │   │
│  │  ┌──────────────────────────────────────────────────┐ │   │
│  │  │ index.html                                       │ │   │
│  │  │ ├── Header (Título + Subtítulo)                │ │   │
│  │  │ ├── Chat Messages (Historial de mensajes)      │ │   │
│  │  │ └── Chat Input (Input + Botón envío)           │ │   │
│  │  └──────────────────────────────────────────────────┘ │   │
│  │                                                         │   │
│  │  ┌──────────────────────────────────────────────────┐ │   │
│  │  │ styles.css                                       │ │   │
│  │  │ ├── Variables CSS                               │ │   │
│  │  │ ├── Animaciones                                 │ │   │
│  │  │ ├── Responsive Design                           │ │   │
│  │  │ └── Theme                                       │ │   │
│  │  └──────────────────────────────────────────────────┘ │   │
│  │                                                         │   │
│  │  ┌──────────────────────────────────────────────────┐ │   │
│  │  │ chat.js                                          │ │   │
│  │  │ ├── Event Listeners                             │ │   │
│  │  │ ├── Message Handling                            │ │   │
│  │  │ ├── API Communication                           │ │   │
│  │  │ ├── Validations                                 │ │   │
│  │  │ └── localStorage Management                     │ │   │
│  │  └──────────────────────────────────────────────────┘ │   │
│  └───────────────────────────────────────────────────────┘   │
│                            │                                  │
│  HTTP POST /api/chat       │ JSON                             │
│  {message, conversation_id}│                                  │
└────────────────────────────┼──────────────────────────────────┘
                             │
                             │ http://localhost:5000
                             │
┌────────────────────────────▼──────────────────────────────────┐
│                   SERVIDOR BACKEND (Flask)                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────────────────────────────────────────────┐   │
│  │                    app.py                             │   │
│  │  (Rutas y controladores principales)                  │   │
│  │                                                         │   │
│  │  GET /health                                          │   │
│  │  GET /api/status                                      │   │
│  │  POST /api/chat ◄─────────┐                           │   │
│  │  GET /api/conversations   │                           │   │
│  │  GET /api/conversations/<id>                          │   │
│  │  GET /api/conversations/<id>/messages                 │   │
│  │  DELETE /api/conversations/<id>                       │   │
│  │  PUT /api/conversations/<id>/title                    │   │
│  └───────────────────────────────────────────────────────┘   │
│                        │                  │                   │
│                        │                  │                   │
│                    ┌───▼────┬─────────────▼──────────┐        │
│                    │         │                        │        │
│  ┌────────────────▼──┐   ┌───▼──────────────┐   ┌────▼─────┐  │
│  │ chat_handler.py   │   │  storage.py      │   │config.py │  │
│  │                   │   │                  │   │          │  │
│  │ ChatHandler Class │   │ JSONStorage      │   │ Settings │  │
│  │ ├── validate      │   │ ├── read_file    │   │ ├── API  │  │
│  │ ├── send_message  │   │ ├── write_file   │   │ ├── Port │  │
│  │ ├── format_history│   │ ├── create_conv  │   │ ├── Limits│ │
│  │ └── get_system_info│  │ ├── add_message  │   │ └── Error│  │
│  │                   │   │ ├── get_messages │   │         │  │
│  │ Integración con   │   │ └── get_stats    │   │         │  │
│  │ Gemini API        │   │                  │   │         │  │
│  └────────────┬──────┘   │                  │   └────┬────┘  │
│               │           └──────┬───────────┘        │       │
│               │                  │                    │       │
│               │                  │                    │       │
│               │          ┌────────▼────────┐         │       │
│               │          │ JSON Storage     │         │       │
│               │          │ conversations.json         │       │
│               │          │                 │         │       │
│               │          │ {                │         │       │
│               │          │  "conversations":[│        │       │
│               │          │    {...}         │         │       │
│               │          │  ]               │         │       │
│               │          │ }                │         │       │
│               │          └───────┬──────────┘         │       │
│               │                  │                    │       │
│               │                  │                    │       │
└───────────────┼──────────────────┼────────────────────┼───────┘
                │                  │                    │
                │ API Request      │ .env              │
                │                  │ CLAVE_API_GEMINI  │
     ┌──────────▼────────────┐     │                   │
     │ GOOGLE GEMINI API     │◄────┴───────────────────┘
     │ (AI Response)         │
     └──────────┬────────────┘
                │ Response JSON
                │
     ┌──────────▼────────────┐
     │ backend/app.py        │
     │ Procesa respuesta     │
     │ Guarda en JSON        │
     │ Retorna al frontend   │
     └──────────┬────────────┘
                │ HTTP 200 + JSON
                │
└────────────────┼──────────────────────────────────────┐
                 │ chat.js procesa respuesta            │
                 │ Muestra en la UI                     │
                 │ Auto-scroll                          │
                 ▼                                      │
         ┌──────────────────────────────────────────┐  │
         │ Mensaje de la IA aparece en el chat      │  │
         └──────────────────────────────────────────┘  │
                                                        │
└────────────────────────────────────────────────────────┘
```

## Flujo de Datos

```
USUARIO
   │
   │ Escribe pregunta
   ▼
FRONTEND (chat.js)
   │
   ├─ Valida mensaje (no vacío, < 5000 chars)
   │
   ├─ Muestra mensaje en UI
   │
   ├─ Crea payload JSON
   │
   ▼
HTTP POST Request → http://localhost:5000/api/chat
   │
   │ {
   │   "message": "¿Cuál es la capital?",
   │   "conversation_id": "uuid-o-null"
   │ }
   │
   ▼
BACKEND (app.py) - POST /api/chat
   │
   ├─ Valida JSON
   │
   ├─ Valida mensaje
   │
   ├─ Crea conversación si es nueva
   │
   ├─ Guarda mensaje en conversations.json
   │
   ▼
BACKEND (chat_handler.py) - send_message()
   │
   ├─ Valida mensaje
   │
   ├─ Obtiene historial anterior
   │
   ├─ Formatea para Gemini API
   │
   ▼
GOOGLE GEMINI API
   │
   ├─ Procesa pregunta
   │
   ├─ Genera respuesta
   │
   ▼
Respuesta de Gemini
   │
   │ "La capital de Francia es París..."
   │
   ▼
BACKEND (chat_handler.py)
   │
   ├─ Recibe respuesta de Gemini
   │
   ├─ Valida respuesta
   │
   ▼
BACKEND (storage.py)
   │
   ├─ Guarda respuesta en conversations.json
   │
   ▼
HTTP 200 Response
   │
   │ {
   │   "success": true,
   │   "response": "La capital de Francia es París...",
   │   "conversation_id": "uuid-generado",
   │   "timestamp": "2024-05-12T10:30:45"
   │ }
   │
   ▼
FRONTEND (chat.js)
   │
   ├─ Recibe respuesta
   │
   ├─ Valida JSON
   │
   ├─ Guarda conversation_id en localStorage
   │
   ├─ Muestra respuesta en UI
   │
   ├─ Auto-scroll al final
   │
   ▼
PANTALLA
   │
   │ [Usuario] ¿Cuál es la capital?
   │ [Bot] La capital de Francia es París...
   │
   ▼
Listo para siguiente pregunta
```

## Estructura de Carpetas

```
agente inteligente/
│
├── .env                          # Configuración (API Key)
├── .gitignore                    # Archivos ignorados
├── README.md                     # README principal
├── GUIA_INSTALACION.md           # Guía de instalación
├── ANALISIS_COMPLETO.md          # Este archivo
│
├── fronted/
│   ├── index.html                # Página principal
│   ├── README_FRONTEND.md        # Documentación frontend
│   ├── css/
│   │   └── styles.css            # Estilos modernos
│   └── js/
│       └── chat.js               # Lógica de chat
│
└── backend/
    ├── app.py                    # App principal Flask
    ├── config.py                 # Configuración
    ├── test_app.py               # Suite de pruebas
    ├── requirements.txt          # Dependencias
    ├── run_backend.bat           # Script Windows
    ├── run_backend.sh            # Script Linux/Mac
    ├── README_BACKEND.md         # Documentación backend
    ├── data/
    │   └── conversations.json    # Almacenamiento
    ├── controlador/
    │   ├── __init__.py
    │   └── chat_handler.py       # Manejador Gemini
    ├── utils/
    │   ├── __init__.py
    │   └── storage.py            # Almacenamiento JSON
    └── modelo/
        └── (Reservado)
```

## Tecnologías Utilizadas

### Frontend
- **HTML5** - Estructura semántica
- **CSS3** - Estilos, animaciones, responsive
- **JavaScript (Vanilla)** - Lógica sin frameworks

### Backend
- **Flask 2.3** - Framework web
- **Python 3.8+** - Lenguaje
- **Gemini API** - Inteligencia artificial
- **JSON** - Almacenamiento de datos

### Herramientas
- **Git** - Control de versiones
- **pip** - Gestor de paquetes
- **Virtual Environment** - Aislamiento de dependencias

## Seguridad

```
┌─────────────────────────────────────┐
│ .env (NO commitear a git)           │
│ CLAVE_API_GEMINI=*****              │
└────────────┬────────────────────────┘
             │
             ▼
        ┌─────────────────────────────────────┐
        │ config.py                            │
        │ Lee variables de entorno             │
        └────────────┬────────────────────────┘
                     │
                     ▼
        ┌─────────────────────────────────────┐
        │ chat_handler.py                      │
        │ Usa API Key de forma segura          │
        │ En request a Gemini API              │
        └─────────────────────────────────────┘
```

## Validaciones en Capas

```
Frontend (chat.js)
├─ Mensaje no vacío
├─ Tipo string
├─ Longitud < 5000
└─ JSON válido en respuesta
         ▼
Backend (app.py)
├─ Mensaje no vacío
├─ Tipo string
├─ Longitud < 5000
├─ JSON válido
└─ Conversación existe
         ▼
ChatHandler (chat_handler.py)
├─ Mensaje no vacío
├─ Tipo string
├─ Longitud < 5000
├─ API Key disponible
└─ Respuesta de Gemini válida
         ▼
Storage (storage.py)
├─ Archivo accesible
├─ JSON parseado
├─ Datos completos
└─ Escritura exitosa
```

## Estados de Respuesta HTTP

```
200 OK
├─ Mensaje procesado exitosamente
└─ Respuesta completa

400 Bad Request
├─ JSON inválido
├─ Mensaje vacío
└─ Datos faltantes

404 Not Found
├─ Conversación no existe
├─ Endpoint no existe
└─ Recurso no encontrado

500 Internal Server Error
├─ Error de Gemini API
├─ Error de archivo
└─ Excepción no controlada
```

---

**Arquitectura Completada:** ✅  
**Estado:** Funcional y probado  
**Versión:** 1.0.0
