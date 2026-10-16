import type { Callable } from './platform/callable';
import { healthCheck } from './ai/healthCheck';
import { generateContent } from './ai/generateContent';
import { generateVideo } from './ai/generateVideo';
import { chatWithAgent } from './ai/chatWithAgent';
import { cuotaIAHoy } from './ai/cuotaIA';
import { schedulePost } from './posts/schedulePost';
import { publishPostNow } from './posts/publishPostCallable';
import { processDueScheduledPosts } from './posts/processDueScheduledPosts';
import { triggerMakeWorkflow } from './integracion/triggerMakeWorkflow';
import { verifyChannelConnection } from './integracion/verifyChannelConnection';
import { startLinkedInOAuth } from './integracion/startLinkedInOAuth';
import { completeLinkedInOAuth } from './integracion/completeLinkedInOAuth';
import { startMetaOAuth } from './integracion/startMetaOAuth';
import { completeMetaOAuth } from './integracion/completeMetaOAuth';
import { startTikTokOAuth } from './integracion/startTikTokOAuth';
import { completeTikTokOAuth } from './integracion/completeTikTokOAuth';
import { registrarCuenta } from './handlers/cuenta';
import {
  actualizarBorradorDatos,
  actualizarPublicacionDatos,
  crearBorradorDatos,
  crearPublicacionDatos,
  eliminarBorradorDatos,
  eliminarPublicacionDatos,
  guardarCanalDatos,
  guardarConfiguracionDatos,
  inicializarCuenta,
  listarActividadDatos,
  listarBorradoresDatos,
  listarMensajesChatDatos,
  listarPublicacionesDatos,
  obtenerCanalesDatos,
  obtenerConfiguracionDatos,
  registrarActividadDatos,
} from './handlers/datos';

/**
 * Funciones invocables desde el frontend: POST /api/fn/<nombre> con JSON.
 * El nombre es el que usa `frontend/src/services/api.ts`.
 */
export const CALLABLES: Record<string, Callable> = {
  healthCheck,
  generateContent,
  generateVideo,
  chatWithAgent,
  cuotaIA: cuotaIAHoy,
  schedulePost,
  publishPostNow,
  processDueScheduledPosts,
  triggerMakeWorkflow,
  verifyChannelConnection,
  startLinkedInOAuth,
  completeLinkedInOAuth,
  startMetaOAuth,
  completeMetaOAuth,
  startTikTokOAuth,
  completeTikTokOAuth,
  inicializarCuenta,
  registrarCuenta,
  listarPublicaciones: listarPublicacionesDatos,
  crearPublicacion: crearPublicacionDatos,
  actualizarPublicacion: actualizarPublicacionDatos,
  eliminarPublicacion: eliminarPublicacionDatos,
  listarBorradores: listarBorradoresDatos,
  crearBorrador: crearBorradorDatos,
  actualizarBorrador: actualizarBorradorDatos,
  eliminarBorrador: eliminarBorradorDatos,
  obtenerCanales: obtenerCanalesDatos,
  guardarCanal: guardarCanalDatos,
  obtenerConfiguracion: obtenerConfiguracionDatos,
  guardarConfiguracion: guardarConfiguracionDatos,
  registrarActividad: registrarActividadDatos,
  listarActividad: listarActividadDatos,
  listarMensajesChat: listarMensajesChatDatos,
};
