import { useState } from 'react';
import { UrgencyLevel } from '../../types/actions';

interface RequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (requestText: string, targetDateTime: Date, urgency: UrgencyLevel) => void;
    actionName: string;
}

export default function RequestModal({ isOpen, onClose, onSubmit, actionName }: RequestModalProps) {
    const [requestText, setRequestText] = useState('');
    const [targetDate, setTargetDate] = useState('');
    const [targetTime, setTargetTime] = useState('');

    const handleSubmit = () => {
        if (!requestText.trim() || !targetDate || !targetTime) return;

        const targetDateTime = new Date(`${targetDate}T${targetTime}`);
        const now = new Date();

        // Calculate urgency based on timing
        const hoursUntil = (targetDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        const urgency: UrgencyLevel = hoursUntil <= 8 ? 'media' : 'baja';

        onSubmit(requestText, targetDateTime, urgency);

        // Reset
        setRequestText('');
        setTargetDate('');
        setTargetTime('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-[2px] pb-6">
            <div className="w-full max-w-sm mx-4 bg-[#1E1E1E] ring-1 ring-white/10 rounded-3xl p-5 shadow-2xl relative">
                {/* Handle bar */}
                <div className="w-full flex justify-center mb-4">
                    <div className="w-10 h-1 bg-gray-600/60 rounded-full"></div>
                </div>

                <h2 className="text-lg font-bold text-white mb-1 text-center">Solicitar {actionName}</h2>
                <p className="text-sm text-gray-400 text-center mb-4">Petición rutinaria</p>

                {/* Request text input */}
                <div className="mb-4">
                    <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-2">
                        Detalles de la solicitud
                    </label>
                    <textarea
                        value={requestText}
                        onChange={(e) => setRequestText(e.target.value)}
                        placeholder="Ej: Hemograma, coagulación y gases..."
                        className="w-full bg-[#2C2C2E] text-white rounded-xl p-3 text-sm border border-gray-700 focus:border-primary focus:outline-none resize-none"
                        rows={4}
                    />
                </div>

                {/* Date and time pickers */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                        <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-2">
                            Fecha
                        </label>
                        <input
                            type="date"
                            value={targetDate}
                            onChange={(e) => setTargetDate(e.target.value)}
                            className="w-full bg-[#2C2C2E] text-white rounded-xl p-3 text-sm border border-gray-700 focus:border-primary focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-2">
                            Hora
                        </label>
                        <input
                            type="time"
                            value={targetTime}
                            onChange={(e) => setTargetTime(e.target.value)}
                            className="w-full bg-[#2C2C2E] text-white rounded-xl p-3 text-sm border border-gray-700 focus:border-primary focus:outline-none"
                        />
                    </div>
                </div>

                {/* Info about urgency */}
                <div className="bg-blue-600/10 border border-blue-500/30 rounded-xl p-3 mb-4">
                    <div className="flex items-start gap-2">
                        <span className="material-icons-round text-blue-400 text-lg">info</span>
                        <div className="flex-1">
                            <p className="text-xs text-blue-300 font-medium">
                                Se generará notificación al profesional correspondiente.
                                La urgencia se calculará según el horario seleccionado.
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
                        disabled={!requestText.trim() || !targetDate || !targetTime}
                        className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Solicitar
                    </button>
                </div>
            </div>
        </div>
    );
}
