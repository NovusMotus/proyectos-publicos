import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore, ProfessionType } from '../store/useAppStore';

const PROFESSION_OPTIONS: { value: ProfessionType; label: string }[] = [
    { value: 'medico', label: 'Médico/a' },
    { value: 'medico_residente', label: 'Médico/a Residente (MIR)' },
    { value: 'enfermero', label: 'Enfermero/a' },
    { value: 'enfermero_residente', label: 'Enfermero/a Residente (EIR)' },
    { value: 'tcae', label: 'TCAE' },
    { value: 'estudiante_medicina', label: 'Estudiante de Medicina' },
    { value: 'estudiante_enfermeria', label: 'Estudiante de Enfermería' },
    { value: 'estudiante_tcae', label: 'Estudiante TCAE' },
];

export default function ProfileSetupScreen() {
    const navigate = useNavigate();
    const { setUserProfile } = useAppStore();

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [profession, setProfession] = useState<ProfessionType>('enfermero');
    const [showQR, setShowQR] = useState(false);

    const handleGenerateQR = () => {
        if (!firstName.trim() || !lastName.trim()) {
            alert('Por favor, completa nombre y apellidos');
            return;
        }

        // Save profile data
        setUserProfile({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            profession,
            validationStatus: 'none' // Still unvalidated
        });

        setShowQR(true);
    };

    const handleScanValidator = () => {
        // Navigate to QR scanner to get validated
        navigate('/qr-scanner');
    };

    return (
        <div className="bg-black text-white font-display min-h-screen flex flex-col">
            <div className="w-full max-w-md mx-auto flex flex-col min-h-screen">
                {/* Header */}
                <header className="p-6 text-center border-b border-white/10">
                    <span className="material-symbols-outlined text-[#258cf4] text-[48px] mb-3" style={{ fontVariationSettings: "'FILL' 1, 'wght' 400" }}>
                        badge
                    </span>
                    <h1 className="text-2xl font-extrabold tracking-tight mb-2">Configuración de Perfil</h1>
                    <p className="text-gray-400 text-sm">Primeros pasos para acceder a SmartHandover</p>
                </header>

                {/* Main Content */}
                <main className="flex-1 px-6 py-6 overflow-y-auto space-y-6">
                    {!showQR ? (
                        <>
                            {/* Info Alert */}
                            <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4">
                                <div className="flex gap-3">
                                    <span className="material-symbols-outlined text-blue-400 shrink-0">info</span>
                                    <div className="text-sm text-gray-300 leading-relaxed">
                                        <strong className="text-blue-400">Sistema de Referidos:</strong> Para acceder a la app, necesitas ser validado por un compañero ya registrado.
                                    </div>
                                </div>
                            </div>

                            {/* Form */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Nombre</label>
                                    <input
                                        type="text"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        placeholder="Ej: María"
                                        className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#258cf4] focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Apellidos</label>
                                    <input
                                        type="text"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        placeholder="Ej: García López"
                                        className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#258cf4] focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Profesión</label>
                                    <select
                                        value={profession}
                                        onChange={(e) => setProfession(e.target.value as ProfessionType)}
                                        className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#258cf4] focus:border-transparent"
                                    >
                                        {PROFESSION_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Generate QR Button */}
                            <button
                                onClick={handleGenerateQR}
                                className="w-full h-14 bg-[#258cf4] hover:bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
                            >
                                <span className="material-symbols-outlined">qr_code_2</span>
                                <span>Generar mi QR</span>
                            </button>
                        </>
                    ) : (
                        <>
                            {/* QR Display */}
                            <div className="text-center space-y-4">
                                <div className="bg-[#1C1C1E] rounded-2xl p-8 border border-white/10">
                                    {/* Placeholder QR - will be replaced with real QR library */}
                                    <div className="w-64 h-64 mx-auto bg-white rounded-xl flex items-center justify-center">
                                        <span className="text-black font-mono text-xs">QR CODE<br />{firstName} {lastName}<br />{profession}</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-lg font-bold">{firstName} {lastName}</p>
                                    <p className="text-sm text-gray-400">{PROFESSION_OPTIONS.find(p => p.value === profession)?.label}</p>
                                </div>

                                <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-4">
                                    <div className="flex gap-3">
                                        <span className="material-symbols-outlined text-yellow-400 shrink-0">warning</span>
                                        <div className="text-sm text-gray-300 leading-relaxed text-left">
                                            <strong className="text-yellow-400">Pendiente de validación:</strong> Muestra este QR a un compañero validado para que te conceda acceso a la aplicación.
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="space-y-3">
                                <button
                                    onClick={handleScanValidator}
                                    className="w-full h-14 bg-[#34C759] hover:bg-green-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
                                >
                                    <span className="material-symbols-outlined">qr_code_scanner</span>
                                    <span>Escanear código de validador</span>
                                </button>

                                <button
                                    onClick={() => setShowQR(false)}
                                    className="w-full h-12 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-colors"
                                >
                                    Editar datos
                                </button>
                            </div>
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}
