// Action types and interfaces for the medical action flow system

export type ActionMode = 'rutinario' | 'extraordinario';
export type ActionStatus = 'hecho' | 'pedir';
export type UrgencyLevel = 'baja' | 'media' | 'alta' | 'critica';
export type Specialty = 'cardiologia' | 'neurologia' | 'medicina-interna' | 'cirugia' | 'enfermeria' | 'tcae';

// Tube types for analítica
export interface TubeSelection {
    malvaGrande: number;
    malvaPequeno: number;
    rojoGrande: number;
    rojoPequeno: number;
    verde: number;
    amarillo: number;
    azulon: number;
    gasesVenosos: number;
    gasesArteriales: number;
    tuboConico: number;
    urocultivo: number;
}

// Professional info
export interface Professional {
    id: string;
    firstName: string;
    lastNameInitial: string;
    role: 'medico' | 'enfermero' | 'tcae';
    specialty: Specialty;
}

// Chronological entry
export interface ChronologicalEntry {
    id: string;
    timestamp: Date;
    patientId: string;
    actionType: string; // "Realizada analítica", "Solicitada analítica", etc.
    details: string; // Tubes extracted or request text
    professional: Professional;
    urgency?: UrgencyLevel;
    isUrgent: boolean;
    parentEntryId?: string; // For concatenated entries
    color: string; // Specialty color
}

// Action request (for "Pedir" actions)
export interface ActionRequest {
    id: string;
    timestamp: Date;
    patientId: string;
    actionName: string; // "analítica", "constantes", etc.
    requestText: string;
    targetDateTime: Date;
    urgency: UrgencyLevel;
    requestedBy: Professional;
    targetProfessional?: Professional;
    isCompleted: boolean;
    completedAt?: Date;
    completedBy?: Professional;
}

// Notification/Alert
export interface NotificationAlert {
    id: string;
    timestamp: Date;
    patientId: string;
    type: 'pending' | 'urgent' | 'critical';
    urgency: UrgencyLevel;
    title: string;
    message: string;
    actionType: string;
    targetProfessional?: Professional;
    relatedRequestId?: string;
    isDismissed: boolean;
}

// Modal state
export interface ActionModalState {
    isOpen: boolean;
    mode: ActionMode | null;
    status: ActionStatus | null;
    actionName: string | null; // "analítica", "constantes", etc.
}
