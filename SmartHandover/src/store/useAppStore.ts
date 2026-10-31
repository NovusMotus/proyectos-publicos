import { create } from 'zustand';

// Profession Types
export type ProfessionType =
    | 'medico'
    | 'medico_residente'
    | 'enfermero'
    | 'enfermero_residente'
    | 'tcae'
    | 'estudiante_medicina'
    | 'estudiante_enfermeria'
    | 'estudiante_tcae';

export type ValidationStatus = 'none' | 'peer' | 'supervisor';

export interface UserProfile {
    userId: string;
    pin: string;
    firstName: string;
    lastName: string;
    profession: ProfessionType;
    preferredName?: string;
    corporateEmail?: string; // Optional @sescam.jccm.es email
    validationStatus: ValidationStatus;
    validatedBy?: string;
    validatedAt?: number;
    validationExpiry?: number; // Only for peer validation
    isSupervisor?: boolean;
}

interface AppState {
    currentUser: UserProfile | null;
    shift: { start: string | null; end: string | null; type: 'day' | 'night' };
    uiMode: 'light' | 'dark';
    selectedBedsCount: number;
    biometricEnabled: boolean;

    // Actions
    login: (pin: string) => void;
    logout: () => void;
    setShiftTime: (start: string, end: string) => void;
    setUiMode: (mode: 'light' | 'dark') => void;
    setBiometricEnabled: (enabled: boolean) => void;
    setPreferredName: (name: string) => void;
    setSelectedBedsCount: (count: number) => void;
    setUserProfile: (profile: Partial<UserProfile>) => void;
    checkValidationExpiry: () => boolean;
}

const PROFILE_STORAGE_KEY = 'smarthandover_user_profile';

// Load profile from localStorage
const loadUserProfile = (): UserProfile | null => {
    try {
        const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
        if (!stored) return null;
        return JSON.parse(stored);
    } catch {
        return null;
    }
};

// Save profile to localStorage
const saveUserProfile = (profile: UserProfile | null) => {
    if (profile) {
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } else {
        localStorage.removeItem(PROFILE_STORAGE_KEY);
    }
};

export const useAppStore = create<AppState>((set, get) => ({
    currentUser: loadUserProfile(),
    shift: { start: null, end: null, type: 'day' },
    uiMode: 'dark',
    biometricEnabled: false,
    selectedBedsCount: 0,

    login: (pin) => {
        const profile = loadUserProfile();
        if (profile && profile.pin === pin) {
            set({ currentUser: profile });
        } else {
            // New user - create basic profile
            const newProfile: UserProfile = {
                userId: `user_${Date.now()}`,
                pin,
                firstName: '',
                lastName: '',
                profession: 'enfermero',
                validationStatus: 'none'
            };
            saveUserProfile(newProfile);
            set({ currentUser: newProfile });
        }
        document.documentElement.classList.add('dark');
    },

    logout: () => {
        set({ currentUser: null });
    },

    setShiftTime: (start, end) => set((state) => ({
        shift: { ...state.shift, start, end }
    })),

    setUiMode: (mode) => {
        if (mode === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        set({ uiMode: mode });
    },

    setBiometricEnabled: (enabled) => set({ biometricEnabled: enabled }),

    setPreferredName: (name) => {
        const user = get().currentUser;
        if (user) {
            const updated = { ...user, preferredName: name };
            saveUserProfile(updated);
            set({ currentUser: updated });
        }
    },

    setSelectedBedsCount: (count) => set({ selectedBedsCount: count }),

    setUserProfile: (profileData) => {
        const current = get().currentUser;
        if (current) {
            const updated = { ...current, ...profileData };
            saveUserProfile(updated);
            set({ currentUser: updated });
        }
    },

    checkValidationExpiry: () => {
        const user = get().currentUser;
        if (!user) return false;

        // No validation or none status
        if (user.validationStatus === 'none') return false;

        // Supervisor validation never expires
        if (user.validationStatus === 'supervisor') return true;

        // Check peer validation expiry
        if (user.validationStatus === 'peer' && user.validationExpiry) {
            const now = Date.now();
            if (now > user.validationExpiry) {
                // Expired - set back to none
                const updated = { ...user, validationStatus: 'none' as ValidationStatus };
                saveUserProfile(updated);
                set({ currentUser: updated });
                return false;
            }
            return true;
        }

        return false;
    },
}));
