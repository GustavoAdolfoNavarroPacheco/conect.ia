# Apartado: Asistente IA (dentro de CampusSocial)

No es un proyecto aparte. Es una **pantalla** del producto CampusSocial.

| Capa | Ubicación |
|------|-----------|
| UI | `Fontend/src/app/App.tsx` (pantalla `agent`, menú *Asistente IA*) |
| Backend IA | `server/ai/` (`generateContent`, `chatWithAgent`) |
| Historial | Neon `chats/{uid}/mensajes` |

El asistente redacta copy; la publicación en **LinkedIn** usa Make/Postiz (`server/integracion/triggerMakeWorkflow.ts`).
