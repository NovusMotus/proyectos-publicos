import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const APP_VERSION = '1.0.0';
const DISCLAIMER_VERSION = '1.0';
const DISCLAIMER_STORAGE_KEY = 'smarthandover_disclaimer_accepted';

interface DisclaimerData {
    accepted: boolean;
    disclaimerVersion: string;
}

export default function WelcomeLegalScreen() {
    const navigate = useNavigate();
    const [isDisclaimerAccepted, setIsDisclaimerAccepted] = useState(false);

    const [isPressing, setIsPressing] = useState(false);
    const [progress, setProgress] = useState(0);
    const timerRef = useRef<number | null>(null);
    const progressIntervalRef = useRef<number | null>(null);

    useEffect(() => {
        const accepted = checkIfDisclaimerAccepted();
        setIsDisclaimerAccepted(accepted);
    }, []);

    const checkIfDisclaimerAccepted = (): boolean => {
        try {
            const stored = localStorage.getItem(DISCLAIMER_STORAGE_KEY);
            if (!stored) return false;

            const data: DisclaimerData = JSON.parse(stored);

            if (data.disclaimerVersion !== DISCLAIMER_VERSION) {
                localStorage.removeItem(DISCLAIMER_STORAGE_KEY);
                return false;
            }

            return data.accepted;
        } catch (error) {
            return false;
        }
    };

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                const accepted = checkIfDisclaimerAccepted();
                setIsDisclaimerAccepted(accepted);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    const handleMouseDown = () => {
        if (!isDisclaimerAccepted) return;

        setIsPressing(true);
        setProgress(0);

        const startTime = Date.now();
        const duration = 1000;

        progressIntervalRef.current = window.setInterval(() => {
            const elapsed = Date.now() - startTime;
            const p = Math.min((elapsed / duration) * 100, 100);
            setProgress(p);
        }, 16);

        timerRef.current = window.setTimeout(() => {
            clearInterval(progressIntervalRef.current!);
            setProgress(100);
            setIsPressing(false);
            navigate('/welcome-count');
        }, duration);
    };

    const handleMouseUp = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            clearInterval(progressIntervalRef.current!);
            setIsPressing(false);
            setProgress(0);
        }
    };

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        };
    }, []);

    return (
        <div className="bg-oled text-white font-display antialiased min-h-[100dvh] flex flex-col overflow-y-auto selection:bg-[#258cf4]/30 select-none relative">
            <style>{`
                .bg-oled { background-color: #000000; }
                .bg-background-dark { background-color: #101922; }
            `}</style>

            <div className="flex-1 flex flex-col relative w-full max-w-[480px] mx-auto min-h-[100dvh] px-6 pt-10 pb-10 bg-black">
                <div className="flex-1 flex flex-col justify-start items-center text-center z-10 space-y-6">
                    <div className="flex flex-col items-center">
                        <span className="material-symbols-outlined text-[#258cf4] text-[40px] mb-3" style={{ fontVariationSettings: "'FILL' 1, 'wght' 400" }}>verified_user</span>
                        <h2 className="text-[32px] font-extrabold tracking-tight text-white leading-tight mb-4">Aviso Importante</h2>
                        <div className="h-1 w-16 bg-[#258cf4] rounded-full opacity-80 mx-auto"></div>
                    </div>

                    <div className="space-y-6 w-full">
                        <p className="text-gray-300 text-base font-medium leading-relaxed">
                            La información exportada a su correo corporativo es un borrador de apoyo generado automáticamente. Es responsabilidad exclusiva del profesional sanitario revisar, verificar y rectificar cualquier dato o error de transcripción antes de su volcado definitivo en la Historia Clínica Electrónica (Mambrino). Esta aplicación no sustituye la validación clínica manual.
                        </p>

                        <div className="bg-[#101922]/80 border border-white/10 rounded-xl p-5 backdrop-blur-sm shadow-inner mt-4 mx-auto w-full">
                            <div className="flex flex-col gap-4 text-center">
                                <div className="flex gap-3 items-start justify-center">
                                    <span className="material-symbols-outlined text-red-500 shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1, 'wght' 700" }}>cancel</span>
                                    <p className="text-gray-200 text-base leading-snug text-left">
                                        <span className="text-red-500 font-extrabold tracking-wide">NO</span> sustituye a los sistemas de monitorización ni a las alarmas físicas del hospital.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <p className="text-gray-400 text-base font-medium text-center px-4">Esta app es una herramienta de gestión y comunicación</p>
                    </div>
                </div>

                <div className="flex-none pt-12 pb-6 flex flex-col items-center space-y-4 z-10 w-full">
                    <div className="w-full mb-2">
                        <button
                            onClick={() => navigate('/disclaimer')}
                            className="block w-full text-center text-sm text-[#258cf4] hover:text-[#258cf4]/80 transition-colors font-medium underline underline-offset-4"
                        >
                            Leer descargo de responsabilidad clínica (MDR Clase I)
                        </button>
                    </div>

                    {!isDisclaimerAccepted && (
                        <div className="w-full mb-4 bg-red-900/20 border border-red-500/30 rounded-xl p-3">
                            <div className="flex gap-2 items-center justify-center">
                                <span className="material-symbols-outlined text-red-400 text-[18px]">error</span>
                                <p className="text-xs text-red-300 font-medium">
                                    Debes leer y aceptar el descargo antes de continuar
                                </p>
                            </div>
                        </div>
                    )}

                    <button
                        onMouseDown={handleMouseDown}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onTouchStart={handleMouseDown}
                        onTouchEnd={handleMouseUp}
                        disabled={!isDisclaimerAccepted}
                        className={`w-full relative overflow-hidden group h-14 rounded-lg shadow-lg flex items-center justify-center select-none transition-all duration-200 ${isDisclaimerAccepted
                                ? 'bg-[#258cf4] hover:bg-[#258cf4]/90 active:scale-[0.98] shadow-[0_0_20px_rgba(37,140,244,0.3)] hover:shadow-[0_0_30px_rgba(37,140,244,0.5)] text-white cursor-pointer'
                                : 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                            }`}
                    >
                        <div
                            className="absolute inset-0 bg-white/20 transition-all duration-75 ease-linear"
                            style={{ width: `${progress}%` }}
                        ></div>

                        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                        <span className="text-sm font-extrabold tracking-wider uppercase relative z-10">MANTENER PULSADO PARA ACEPTAR (1s)</span>
                    </button>

                    <div className="flex items-center gap-1 opacity-40 hover:opacity-80 transition-opacity pt-2">
                        <span className="material-symbols-outlined text-[14px]">terminal</span>
                        <span className="text-xs font-mono">v{APP_VERSION}</span>
                    </div>
                </div>

                <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-b from-[#258cf4]/10 to-transparent pointer-events-none opacity-20"></div>
                <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#258cf4]/5 to-transparent pointer-events-none opacity-20"></div>
            </div>
        </div>
    );
}
