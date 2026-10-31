import { useState } from 'react';
import { UrgencyLevel } from '../../types/actions';

interface UrgentRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (requestText: string, urgency: UrgencyLevel) => void;
    actionName: string;
}

const urgencyLevels = [
    {
        value: 'media' as UrgencyLevel,
        label: 'Media',
        description: 'Hoy, sin prisa',
        color: 'yellow',
        icon: 'schedule'
    },
    {
        value: 'alta' as UrgencyLevel,
        label: 'Alta',
        description: 'Próximos 30 min',
        color: 'orange',
        icon: 'priority_high'
    },
    {
        value: 'critica' as UrgencyLevel,
        label: 'Crítica',
        description: 'Inmediato / AHORA',
        color: 'red',
        icon: 'emergency'
    },
];

export default function UrgentRequestModal({ isOpen, onClose, onSubmit, actionName }: UrgentRequestModalProps) {
    const [requestText, setRequestText] = useState('');
    const [urgency, setUrgency] = useState<UrgencyLevel>('alta');

    const handleSubmit = () => {
        if (!requestText.trim()) return;
        onSubmit(requestText, urgency);

        // Reset
        setRequestText('');
        setUrgency('alta');
    };

    if (!isOpen) return null;

    const selectedLevel = urgencyLevels.find(l => l.value === urgency)!;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-[2px] pb-6">
            <div className="w-full max-w-sm mx-4 bg-[#1E1E1E] ring-1 ring-white/10 rounded-3xl p-5 shadow-2xl relative">
                {/* Handle bar */}
                <div className="w-full flex justify-center mb-4">
                    <div className="w-10 h-1 bg-gray-600/60 rounded-full"></div>
                </div>

                <h2 className="text-lg font-bold text-white mb-1 text-center flex items-center justify-center gap-2">
                    <span className="material-icons-round text-orange-400">bolt</span>
                    Solicitud URGENTE
                </h2>
                <p className="text-sm text-gray-400 text-center mb-4">{actionName}</p>

                {/* Request text input */}
                <div className="mb-4">
                    <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-2">
                        Detalles de la solicitud urgente
                    </label>
                    <textarea
                        value={requestText}
                        onChange={(e) => setRequestText(e.target.value)}
                        placeholder="Describe la urgencia..."
                        className="w-full bg-[#2C2C2E] text-white rounded-xl p-3 text-sm border border-gray-700 focus:border-orange-500 focus:outline-none resize-none"
                        rows={4}
                    />
                </div>

                {/* Urgency level selector */}
                <div className="mb-4">
                    <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-2">
                        Nivel de Urgencia
                    </label>
                    <div className="space-y-2">
                        {urgencyLevels.map((level) => (
                            <button
                                key={level.value}
                                onClick={() => setUrgency(level.value)}
                                className={`w-full p-3 rounded-xl border-2 transition-all ${urgency === level.value
                                        ? `border-${level.color}-500 bg-${level.color}-600/20`
                                        : 'border-gray-700 bg-[#2C2C2E] hover:border-gray-600'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className={`material-icons-round text-${level.color}-400 text-xl`}>
                                        {level.icon}
                                    </span>
                                    <div className="flex-1 text-left">
                                        <p className={`font-bold text-sm ${urgency === level.value ? `text-${level.color}-200` : 'text-white'
                                            }`}>
                                            {level.label}
                                        </p>
                                        <p className="text-xs text-gray-400">{level.description}</p>
                                    </div>
                                    {urgency === level.value && (
                                        <span className={`material-icons-round text-${level.color}-400`}>
                                            check_circle
                                        </span>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Warning */}
                <div className={`bg-${selectedLevel.color}-600/10 border border-${selectedLevel.color}-500/30 rounded-xl p-3 mb-4`}>
                    <div className="flex items-start gap-2">
                        <span className={`material-icons-round text-${selectedLevel.color}-400 text-lg`}>
                            {selectedLevel.icon}
                        </span>
                        <div className="flex-1">
                            <p className={`text-xs text-${selectedLevel.color}-300 font-medium`}>
                                Se generará una alerta de {selectedLevel.label.toLowerCase()} prioridad
                                con notificación al móvil del profesional.
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
                        disabled={!requestText.trim()}
                        className={`flex-1 h-12 bg-${selectedLevel.color}-600 hover:bg-${selectedLevel.color}-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        Solicitar {selectedLevel.label}
                    </button>
                </div>
            </div>
        </div>
    );
}
