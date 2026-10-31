import { useState } from 'react';

interface ActionCompletionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (concatenate: boolean, symptoms?: string[]) => void;
    actionName: string;
    hasRelatedUrgentRequest: boolean;
    requiresVerification: boolean; // For nurses/TCAE
}

const commonSymptoms = [
    { id: 'dolor', label: 'Dolor', icon: 'healing' },
    { id: 'disnea', label: 'Disnea', icon: 'air' },
    { id: 'sincope', label: 'Síncope', icon: 'personal_injury' },
    { id: 'mareo', label: 'Mareo', icon: 'psychology_alt' },
    { id: 'nauseas', label: 'Náuseas', icon: 'sick' },
    { id: 'fiebre', label: 'Fiebre', icon: 'thermostat' },
];

export default function ActionCompletionModal({
    isOpen,
    onClose,
    onSubmit,
    actionName,
    hasRelatedUrgentRequest,
    requiresVerification
}: ActionCompletionModalProps) {
    const [concatenate, setConcatenate] = useState(hasRelatedUrgentRequest);
    const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
    const [verificationChecked, setVerificationChecked] = useState(false);

    const toggleSymptom = (symptomId: string) => {
        setSelectedSymptoms(prev =>
            prev.includes(symptomId)
                ? prev.filter(id => id !== symptomId)
                : [...prev, symptomId]
        );
    };

    const handleSubmit = () => {
        if (requiresVerification && !verificationChecked) return;
        onSubmit(concatenate, selectedSymptoms.length > 0 ? selectedSymptoms : undefined);

        // Reset
        setConcatenate(false);
        setSelectedSymptoms([]);
        setVerificationChecked(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-[2px] pb-6">
            <div className="w-full max-w-sm mx-4 bg-[#1E1E1E] ring-1 ring-white/10 rounded-3xl p-5 shadow-2xl relative max-h-[80vh] overflow-y-auto">
                {/* Handle bar */}
                <div className="w-full flex justify-center mb-4">
                    <div className="w-10 h-1 bg-gray-600/60 rounded-full"></div>
                </div>

                <h2 className="text-lg font-bold text-white mb-1 text-center flex items-center justify-center gap-2">
                    <span className="material-icons-round text-green-400">check_circle</span>
                    Acción Completada
                </h2>
                <p className="text-sm text-gray-400 text-center mb-4">{actionName} realizada</p>

                {/* Related urgent request option */}
                {hasRelatedUrgentRequest && (
                    <div className="mb-4">
                        <label className="flex items-start gap-3 bg-orange-600/10 border border-orange-500/30 rounded-xl p-3 cursor-pointer hover:bg-orange-600/20 transition-all">
                            <input
                                type="checkbox"
                                checked={concatenate}
                                onChange={(e) => setConcatenate(e.target.checked)}
                                className="mt-1 w-5 h-5 rounded border-gray-600 bg-gray-700 text-orange-500 focus:ring-2 focus:ring-orange-500"
                            />
                            <div className="flex-1">
                                <p className="text-sm font-bold text-orange-200">
                                    Asociar a solicitud urgente
                                </p>
                                <p className="text-xs text-orange-300/80 mt-1">
                                    Se concatenará con la petición urgente previa para registrar el tiempo de respuesta
                                </p>
                            </div>
                        </label>
                    </div>
                )}

                {/* Symptom context (for vital signs, etc.) */}
                {actionName.toLowerCase().includes('constantes') && (
                    <div className="mb-4">
                        <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-2">
                            Síntomas Asociados (opcional)
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {commonSymptoms.map((symptom) => (
                                <button
                                    key={symptom.id}
                                    onClick={() => toggleSymptom(symptom.id)}
                                    className={`p-2 rounded-xl border transition-all ${selectedSymptoms.includes(symptom.id)
                                            ? 'border-primary bg-primary/20 text-white'
                                            : 'border-gray-700 bg-[#2C2C2E] text-gray-300 hover:border-gray-600'
                                        }`}
                                >
                                    <span className="material-icons-round text-lg block mb-1">
                                        {symptom.icon}
                                    </span>
                                    <span className="text-xs font-medium">{symptom.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Verification checkbox for nurses/TCAE */}
                {requiresVerification && (
                    <div className="mb-4">
                        <label className="flex items-start gap-3 bg-blue-600/10 border border-blue-500/30 rounded-xl p-3 cursor-pointer hover:bg-blue-600/20 transition-all">
                            <input
                                type="checkbox"
                                checked={verificationChecked}
                                onChange={(e) => setVerificationChecked(e.target.checked)}
                                className="mt-1 w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-2 focus:ring-blue-500"
                                required
                            />
                            <div className="flex-1">
                                <p className="text-sm font-bold text-blue-200">
                                    Verificar resultados <span className="text-red-400">*</span>
                                </p>
                                <p className="text-xs text-blue-300/80 mt-1">
                                    Confirmo que he revisado los resultados y el estado del paciente
                                </p>
                            </div>
                        </label>
                    </div>
                )}

                {/* Info */}
                <div className="bg-green-600/10 border border-green-500/30 rounded-xl p-3 mb-4">
                    <div className="flex items-start gap-2">
                        <span className="material-icons-round text-green-400 text-lg">info</span>
                        <div className="flex-1">
                            <p className="text-xs text-green-300 font-medium">
                                {hasRelatedUrgentRequest && concatenate
                                    ? 'Se registrará el tiempo de respuesta y se eliminará la alerta urgente.'
                                    : 'Se eliminará esta acción de pendientes y se registrará en la lista cronológica.'
                                }
                            </p>
                        </div>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 h-12 bg-[#2C2C2E] border border-gray-700 text-gray-300 rounded-xl font-bold hover:bg-gray-700/50 transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={requiresVerification && !verificationChecked}
                        className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
}
