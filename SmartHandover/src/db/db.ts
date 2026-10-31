import Dexie, { Table } from 'dexie';

export interface Patient {
    id: string; // generated UUID or provided ID
    bed: string; // e.g., "203A"
    name: string; // e.g., "J. Doe"
    gender: 'male' | 'female';
    specialty: string; // "Own Spec", "Other Spec"
    status: 'active' | 'discharged';
    isolationType?: 'contact' | 'airborne' | 'droplet';
    alerts: string[]; // e.g., ["EKG Urgente", "Dolor"]
    tasksPending: number;
}

export interface Note {
    id?: number; // auto-increment
    patientId: string;
    content: string;
    timestamp: number;
    audioUrl?: string; // Blob URL or base64
    isTranscribed: boolean;
}

export class SmartHandoverDB extends Dexie {
    patients!: Table<Patient>;
    notes!: Table<Note>;

    constructor() {
        super('SmartHandoverDB');
        this.version(1).stores({
            patients: 'id, bed, status',
            notes: '++id, patientId, timestamp'
        });
    }
}

export const db = new SmartHandoverDB();
