// Notification System Logic Documentation
// ==========================================

/**
 * CÓDIGO DE COLORES PARA NOTIFICACIONES
 * 
 * AVISOS (se borran al leer):
 * - Círculo ROJO: Avisos urgentes (para ahora)
 * - Círculo NARANJA: Avisos pendientes de leer (urgentes + medias + bajas)
 * 
 * PENDIENTES (se borran al validar):
 * - Círculo ROJO: Pendientes urgentes (validar para este turno)
 * - Círculo GRIS: Pendientes medias (validar para este turno)
 * 
 * PRIORIDADES:
 * - URGENTE (roja): Para ahora - se activa en este turno
 * - MEDIA (naranja en avisos, gris en pendientes): Para este turno
 * - BAJA: Para otro turno (solo se activa cuando ese turno esté activo)
 * 
 * FLUJO:
 * 1. Notificación creada → Aparece en AVISOS (naranja si no leída)
 * 2. Usuario lee aviso → Se borra de AVISOS
 * 3. Si es urgente → Se mueve a PENDIENTES (rojo)
 * 4. Si es media → Se mueve a PENDIENTES (gris)
 * 5. Usuario valida/completa → Se borra de PENDIENTES
 * 
 * REGISTRO DE TURNO:
 * - Entrada: Al mostrar pantalla "Hola [nombre], llevas X pacientes"
 * - Salida: Al hacer clic en "Cerrar Turno" del menú hamburguesa
 * - Propósito: Falso fichaje para calcular solape de jornada real
 */

export interface Notification {
    id: string;
    patientId: string;
    type: 'evolutivo' | 'notificar';
    priority: 'urgent' | 'medium' | 'low';
    content: string;
    createdAt: number;
    isRead: boolean;
    isCompleted: boolean;
    shiftId?: string; // Para vincular a un turno específico
}

export interface ShiftLog {
    id: string;
    userId: string;
    startTime: number;
    endTime?: number;
    zone: string;
    patientIds: string[];
}

// Helper functions
export const getUrgentCount = (notifications: Notification[]): number => {
    return notifications.filter(n => !n.isRead && n.priority === 'urgent').length;
};

export const getUnreadCount = (notifications: Notification[]): number => {
    return notifications.filter(n => !n.isRead).length;
};

export const getPendingUrgentCount = (notifications: Notification[]): number => {
    return notifications.filter(n => n.isRead && !n.isCompleted && n.priority === 'urgent').length;
};

export const getPendingMediumCount = (notifications: Notification[]): number => {
    return notifications.filter(n => n.isRead && !n.isCompleted && n.priority === 'medium').length;
};
