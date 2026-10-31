import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface BottomNavProps {
    activeTab?: 'kardex' | 'avisos' | 'evol' | 'pendientes' | 'settings';
}

export default function BottomNav({ activeTab = 'kardex' }: BottomNavProps) {
    const navigate = useNavigate();
    const [showEvolModal, setShowEvolModal] = useState(false);

    // TODO: Get from store
    const urgentCount = 3; // Avisos urgentes (badge rojo)
    const newNotificationsCount = 7; // Notificaciones nuevas (badge naranja)
    const pendientesCount = 5; // Tareas pendientes

    const handleEvolNotifClick = () => {
        setShowEvolModal(true);
    };

    const handleEvolutivo = () => {
        setShowEvolModal(false);
        navigate('/audio-transcription', { state: { mode: 'evolutivo' } });
    };

    const handleNotificar = () => {
        setShowEvolModal(false);
        navigate('/audio-transcription', { state: { mode: 'notificar' } });
    };

    return (
        <>
            {/* Modal Overlay */}
            {showEvolModal && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 flex items-center justify-center p-6"
                    onClick={() => setShowEvolModal(false)}
                >
                    <div className="w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
                        {/* Evolutivo Button */}
                        <button
                            onClick={handleEvolutivo}
                            className="w-full h-32 bg-gradient-to-br from-[#258cf4] to-blue-600 rounded-2xl shadow-2xl shadow-blue-500/30 flex flex-col items-center justify-center gap-3 transition-transform active:scale-95 hover:shadow-blue-500/50"
                        >
                            <span className="material-symbols-outlined text-white text-[48px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                edit_note
                            </span>
                            <div className="text-center">
                                <p className="text-white font-extrabold text-xl tracking-wide">EVOLUTIVO</p>
                                <p className="text-blue-100 text-xs mt-1">Registro de notas del paciente</p>
                            </div>
                        </button>

                        {/* Notificar Button */}
                        <button
                            onClick={handleNotificar}
                            className="w-full h-32 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl shadow-2xl shadow-orange-500/30 flex flex-col items-center justify-center gap-3 transition-transform active:scale-95 hover:shadow-orange-500/50"
                        >
                            <span className="material-symbols-outlined text-white text-[48px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                campaign
                            </span>
                            <div className="text-center">
                                <p className="text-white font-extrabold text-xl tracking-wide">NOTIFICAR</p>
                                <p className="text-amber-100 text-xs mt-1 px-4">Registro de comunicación oral<br />(requiere registrar en Mambrino)</p>
                            </div>
                        </button>

                        {/* Warning */}
                        <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-xl p-3">
                            <div className="flex gap-2 items-start">
                                <span className="material-symbols-outlined text-yellow-400 text-[18px] shrink-0">warning</span>
                                <p className="text-xs text-yellow-100 leading-relaxed">
                                    <strong>Importante:</strong> Los avisos NO tienen validez legal. Debes registrar todas las órdenes en Mambrino obligatoriamente.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Navigation con HENDIDURA PROFUNDA */}
            <nav className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-lg border-t border-white/10 z-30 max-w-md mx-auto">
                {/* Hendidura central usando clip-path */}
                <div className="relative h-16">
                    {/* Fondo con hendidura */}
                    <div
                        className="absolute inset-0 bg-black/95 backdrop-blur-lg"
                        style={{
                            clipPath: 'polygon(0 0, 42% 0, 42% 85%, 44% 100%, 56% 100%, 58% 85%, 58% 0, 100% 0, 100% 100%, 0 100%)'
                        }}
                    ></div>

                    {/* Contenedor de botones */}
                    <div className="relative flex items-stretch justify-around h-16 px-2">
                        {/* Kardex */}
                        <button
                            onClick={() => navigate('/kardex')}
                            className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-2xl transition-all ${activeTab === 'kardex'
                                ? 'bg-white/10 text-[#258cf4]'
                                : 'text-gray-500 hover:text-white active:bg-white/5'
                                }`}
                        >
                            <span className={`material-symbols-outlined text-[22px] ${activeTab === 'kardex' ? 'font-bold' : ''}`}>
                                grid_view
                            </span>
                            <span className={`text-[10px] ${activeTab === 'kardex' ? 'font-bold' : 'font-medium'}`}>
                                Kardex
                            </span>
                        </button>

                        {/* Avisos (con badges circulares) */}
                        <button
                            onClick={() => navigate('/avisos')}
                            className={`relative flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-2xl transition-all ${activeTab === 'avisos'
                                ? 'bg-white/10 text-[#258cf4]'
                                : 'text-gray-500 hover:text-white active:bg-white/5'
                                }`}
                        >
                            {/* Badge rojo (urgentes) - con círculo */}
                            {urgentCount > 0 && (
                                <div className="absolute -top-1 left-1 bg-red-500 text-white text-[11px] font-black rounded-full w-5 h-5 flex items-center justify-center shadow-lg">
                                    {urgentCount}
                                </div>
                            )}
                            {/* Badge naranja (nuevas) - con círculo */}
                            {newNotificationsCount > 0 && (
                                <div className="absolute -top-1 right-1 bg-orange-500 text-white text-[11px] font-black rounded-full w-5 h-5 flex items-center justify-center shadow-lg">
                                    {newNotificationsCount}
                                </div>
                            )}
                            <span className={`material-symbols-outlined text-[22px] ${activeTab === 'avisos' ? 'font-bold' : ''}`}>
                                notifications
                            </span>
                            <span className={`text-[10px] ${activeTab === 'avisos' ? 'font-bold' : 'font-medium'}`}>
                                Avisos
                            </span>
                        </button>

                        {/* Espacio para el botón circular central */}
                        <div className="w-20"></div>

                        {/* Pendientes */}
                        <button
                            onClick={() => navigate('/pendientes')}
                            className={`relative flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-2xl transition-all ${activeTab === 'pendientes'
                                ? 'bg-white/10 text-[#258cf4]'
                                : 'text-gray-500 hover:text-white active:bg-white/5'
                                }`}
                        >
                            {/* Badge gris (pendientes) - con círculo */}
                            {pendientesCount > 0 && (
                                <div className="absolute -top-1 right-1 bg-gray-500 text-white text-[11px] font-black rounded-full w-5 h-5 flex items-center justify-center shadow-lg">
                                    {pendientesCount}
                                </div>
                            )}
                            <span className={`material-symbols-outlined text-[22px] ${activeTab === 'pendientes' ? 'font-bold' : ''}`}>
                                checklist
                            </span>
                            <span className={`text-[10px] ${activeTab === 'pendientes' ? 'font-bold' : 'font-medium'}`}>
                                Pendientes
                            </span>
                        </button>

                        {/* Ajustes */}
                        <button
                            onClick={() => navigate('/profile')}
                            className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-2xl transition-all ${activeTab === 'settings'
                                ? 'bg-white/10 text-[#258cf4]'
                                : 'text-gray-500 hover:text-white active:bg-white/5'
                                }`}
                        >
                            <span className={`material-symbols-outlined text-[22px] ${activeTab === 'settings' ? 'font-bold' : ''}`}>
                                settings
                            </span>
                            <span className={`text-[10px] ${activeTab === 'settings' ? 'font-bold' : 'font-medium'}`}>
                                Ajustes
                            </span>
                        </button>
                    </div>
                </div>

                {/* Evol/Notif - BOTÓN GRANDE QUE LLEGA HASTA ABAJO */}
                <button
                    onClick={handleEvolNotifClick}
                    className="absolute left-1/2 -translate-x-1/2 bottom-0 w-20 h-20 rounded-t-full bg-gradient-to-br from-[#258cf4] to-blue-600 text-white shadow-2xl shadow-blue-500/50 flex flex-col items-center justify-center pt-2 transition-all active:scale-95 hover:shadow-blue-500/70 border-4 border-b-0 border-black"
                >
                    <span className="material-symbols-outlined text-[28px] font-bold leading-none">
                        mic
                    </span>
                    <span className="text-[8px] font-black tracking-tight leading-tight mt-1">
                        EVOL/NOTIF
                    </span>
                </button>
            </nav>
        </>
    );
}
