import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface ShiftLog {
    userId: string;
    userName: string;
    shiftStart: string; // ISO timestamp
    shiftEnd: string; // ISO timestamp
    officialShiftStart: string; // "08:00"
    officialShiftEnd: string; // "20:00"
    actualStart: string; // Actual clock-in time
    actualEnd: string; // Actual clock-out time
    adjustedStart: string; // Logged start (actual or official)
    adjustedEnd: string; // Logged end (actual or official)
    totalHours: number;
}

export default function CloseShiftScreen() {
    const navigate = useNavigate();
    const [shiftStartTime, setShiftStartTime] = useState<Date | null>(null);
    const [currentTime] = useState(new Date());
    const [loading, setLoading] = useState(false);

    // Official shift hours (TODO: get from user settings/shift type)
    const officialStart = "08:00";
    const officialEnd = "20:00";

    useEffect(() => {
        // Get shift start time from localStorage
        const storedStart = localStorage.getItem('shift_start_time');
        if (storedStart) {
            setShiftStartTime(new Date(storedStart));
        }
    }, []);

    const calculateAdjustedTimes = () => {
        if (!shiftStartTime) return null;

        const actualStart = shiftStartTime;
        const actualEnd = currentTime;

        // Parse official times
        const [officialHourStart, officialMinStart] = officialStart.split(':').map(Number);
        const [officialHourEnd, officialMinEnd] = officialEnd.split(':').map(Number);

        const officialStartDate = new Date(actualStart);
        officialStartDate.setHours(officialHourStart, officialMinStart, 0, 0);

        const officialEndDate = new Date(actualEnd);
        officialEndDate.setHours(officialHourEnd, officialMinEnd, 0, 0);

        // Apply logic:
        // - Arrived early OR left late → use actual time
        // - Arrived late OR left early → use official time
        const adjustedStart = actualStart < officialStartDate ? actualStart : officialStartDate;
        const adjustedEnd = actualEnd > officialEndDate ? actualEnd : officialEndDate;

        const totalHours = (adjustedEnd.getTime() - adjustedStart.getTime()) / (1000 * 60 * 60);

        return {
            actualStart,
            actualEnd,
            adjustedStart,
            adjustedEnd,
            totalHours: Math.round(totalHours * 100) / 100
        };
    };

    const times = calculateAdjustedTimes();

    const handleCloseShift = async () => {
        if (!times || !shiftStartTime) return;

        setLoading(true);

        const shiftLog: ShiftLog = {
            userId: 'current-user-id', // TODO: get from auth
            userName: 'Usuario Actual', // TODO: get from store
            shiftStart: shiftStartTime.toISOString(),
            shiftEnd: currentTime.toISOString(),
            officialShiftStart: officialStart,
            officialShiftEnd: officialEnd,
            actualStart: times.actualStart.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            actualEnd: times.actualEnd.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            adjustedStart: times.adjustedStart.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            adjustedEnd: times.adjustedEnd.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            totalHours: times.totalHours
        };

        // TODO: Send to backend API
        // await fetch('/api/shifts/close', { method: 'POST', body: JSON.stringify(shiftLog) });

        // Save to localStorage for demo
        const existingLogs = JSON.parse(localStorage.getItem('shift_logs') || '[]');
        existingLogs.push(shiftLog);
        localStorage.setItem('shift_logs', JSON.stringify(existingLogs));

        // Clear shift start time
        localStorage.removeItem('shift_start_time');

        setLoading(false);

        // Navigate back or to home
        navigate('/kardex');
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    };

    if (!shiftStartTime) {
        return (
            <div className="bg-black text-white font-display min-h-screen flex items-center justify-center p-4">
                <div className="text-center">
                    <span className="material-symbols-outlined text-red-500 text-[64px]">error</span>
                    <p className="text-xl font-bold mt-4">No hay un turno activo</p>
                    <p className="text-gray-400 text-sm mt-2">Inicia un turno primero</p>
                    <button
                        onClick={() => navigate('/kardex')}
                        className="mt-6 px-6 py-3 bg-primary rounded-xl font-medium"
                    >
                        Volver al Kardex
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-black text-white font-display min-h-screen flex flex-col max-w-md mx-auto">
            <header className="sticky top-0 z-50 flex items-center justify-between bg-black/90 p-4 backdrop-blur-md border-b border-white/10">
                <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-white/10">
                    <span className="material-symbols-outlined text-[24px]">arrow_back</span>
                </button>
                <h1 className="text-lg font-bold">Cerrar Turno</h1>
                <div className="w-10"></div>
            </header>

            <main className="flex-1 p-6 space-y-6">
                {/* Info Card */}
                <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="material-symbols-outlined text-red-500 text-[32px]">logout</span>
                        <h2 className="text-xl font-bold">Registro de Jornada</h2>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed">
                        El sistema registrará automáticamente las horas trabajadas para calcular el solape de jornada real.
                    </p>
                </div>

                {/* Times Display */}
                {times && (
                    <div className="space-y-4">
                        {/* Official Shift */}
                        <div className="bg-[#1C1C1E] border border-white/10 rounded-xl p-4">
                            <p className="text-gray-400 text-xs font-medium mb-3">TURNO OFICIAL</p>
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-gray-500 text-xs">Inicio</p>
                                    <p className="text-white text-2xl font-bold">{officialStart}</p>
                                </div>
                                <span className="material-symbols-outlined text-gray-600">arrow_forward</span>
                                <div className="text-right">
                                    <p className="text-gray-500 text-xs">Fin</p>
                                    <p className="text-white text-2xl font-bold">{officialEnd}</p>
                                </div>
                            </div>
                        </div>

                        {/* Actual Times */}
                        <div className="bg-[#1C1C1E] border border-white/10 rounded-xl p-4">
                            <p className="text-gray-400 text-xs font-medium mb-3">TIEMPO REAL</p>
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-gray-500 text-xs">Entrada</p>
                                    <p className="text-white text-2xl font-bold">{formatTime(times.actualStart)}</p>
                                </div>
                                <span className="material-symbols-outlined text-gray-600">arrow_forward</span>
                                <div className="text-right">
                                    <p className="text-gray-500 text-xs">Salida</p>
                                    <p className="text-white text-2xl font-bold">{formatTime(times.actualEnd)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Adjusted/Logged Times */}
                        <div className="bg-gradient-to-br from-primary/20 to-blue-600/20 border border-primary/30 rounded-xl p-4">
                            <p className="text-primary text-xs font-bold mb-3 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[16px]">fact_check</span>
                                TIEMPO REGISTRADO
                            </p>
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-blue-200 text-xs">Inicio</p>
                                    <p className="text-white text-2xl font-bold">{formatTime(times.adjustedStart)}</p>
                                </div>
                                <span className="material-symbols-outlined text-primary">arrow_forward</span>
                                <div className="text-right">
                                    <p className="text-blue-200 text-xs">Fin</p>
                                    <p className="text-white text-2xl font-bold">{formatTime(times.adjustedEnd)}</p>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-white/10">
                                <p className="text-blue-200 text-xs">Total Horas</p>
                                <p className="text-white text-3xl font-black">{times.totalHours}h</p>
                            </div>
                        </div>

                        {/* Explanation */}
                        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-4">
                            <div className="flex gap-2">
                                <span className="material-symbols-outlined text-yellow-400 text-[18px] shrink-0">info</span>
                                <p className="text-xs text-yellow-100 leading-relaxed">
                                    Si llegas antes o sales después del turno oficial, se registran las horas reales.
                                    Si llegas tarde o sales antes, se registran las horas oficiales del turno.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <footer className="sticky bottom-0 p-4 bg-black/90 backdrop-blur-md border-t border-white/10">
                <button
                    onClick={handleCloseShift}
                    disabled={loading}
                    className="w-full h-14 bg-red-500 disabled:opacity-50 hover:bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 transition-all active:scale-95"
                >
                    {loading ? 'Cerrando turno...' : 'Confirmar Cierre de Turno'}
                </button>
            </footer>
        </div>
    );
}
