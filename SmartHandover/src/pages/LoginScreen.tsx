import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';

export default function LoginScreen() {
    const navigate = useNavigate();
    const login = useAppStore(s => s.login);
    const [pin, setPin] = useState('');
    const [error, setError] = useState(false);

    // Mock logic for input
    const handleNumClick = (num: string) => {
        if (pin.length < 4) { // UI shows 4 dots in HTML
            const newPin = pin + num;
            setPin(newPin);
            if (newPin === '1234') { // Assuming 4 digit pin based on 4 dots in HTML
                login(newPin);
                navigate('/shift-setup');
            } else if (newPin.length === 4) {
                // Shake effect or error
                setTimeout(() => setPin(''), 500);
            }
        }
    };

    const handleDelete = () => setPin(prev => prev.slice(0, -1));

    // Long press logic
    const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);

    const startPress = () => {
        const timer = setTimeout(() => {
            navigate('/code-blue');
        }, 1000);
        setPressTimer(timer);
    };

    const endPress = () => {
        if (pressTimer) clearTimeout(pressTimer);
    };

    // Biometric Logic
    const { biometricEnabled } = useAppStore();
    const [showBioError, setShowBioError] = useState(false);

    const handleBiometricClick = () => {
        if (biometricEnabled) {
            // Simulate instant biometric success
            login('FACE_ID');
            navigate('/shift-setup');
        } else {
            // Show error/toast
            setShowBioError(true);
            setTimeout(() => setShowBioError(false), 3000);
        }
    };

    return (
        <div className="bg-[#101922] text-white font-display antialiased selection:bg-primary selection:text-white overflow-hidden touch-manipulation h-screen w-full flex flex-col justify-between p-4 pb-8 max-w-md mx-auto relative">

            {/* Toast Notification for Biometric Error */}
            {showBioError && (
                <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 w-[90%] bg-red-500/90 backdrop-blur-md text-white p-4 rounded-xl shadow-lg animate-in slide-in-from-top duration-300 border border-red-400/20">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-2xl">face_retouching_off</span>
                        <div className="flex flex-col">
                            <span className="font-bold text-sm">Biometrics Disabled</span>
                            <span className="text-xs opacity-90">Login with PIN to enable Face ID in settings.</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col items-center pt-8">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1F2937]/50 border border-[#314d68]">
                    <span className="material-symbols-outlined text-4xl text-[#258cf4]">local_hospital</span>
                </div>
                <h1 className="text-white tracking-tight text-[28px] font-bold leading-tight text-center">SmartHandover</h1>
                <p className="text-[#90adcb] text-sm font-medium leading-normal pt-2 text-center">Enter PIN to access clinical dashboard</p>
            </div>

            {/* PIN Dots */}
            <div className="flex justify-center py-6">
                <div className="flex gap-4">
                    {[0, 1, 2, 3].map(i => (
                        <div key={i} className={`h-4 w-4 rounded-full transition-all duration-200 ${i < pin.length
                            ? "bg-[#258cf4] shadow-[0_0_10px_rgba(37,140,244,0.6)]"
                            : "border-2 border-[#314d68] bg-transparent"
                            }`} />
                    ))}
                </div>
            </div>

            {/* Keypad */}
            <div className="flex-1 flex flex-col justify-center max-h-[420px]">
                <div className="grid grid-cols-3 gap-4 px-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <button
                            key={num}
                            onClick={() => handleNumClick(num.toString())}
                            className="flex h-16 w-full items-center justify-center rounded-lg bg-[#1F2937] text-2xl font-bold text-white hover:bg-[#314d68] active:bg-[#258cf4] active:scale-95 transition-all duration-100 touch-manipulation"
                        >
                            {num}
                        </button>
                    ))}

                    <button
                        onClick={handleBiometricClick}
                        className={`flex h-16 w-full items-center justify-center rounded-lg bg-transparent hover:bg-[#1F2937]/50 active:scale-95 transition-all duration-100 ${biometricEnabled ? 'text-[#258cf4]' : 'text-[#90adcb] opacity-50'}`}
                    >
                        <span className="material-symbols-outlined text-3xl">face</span>
                    </button>

                    <button
                        onClick={() => handleNumClick('0')}
                        className="flex h-16 w-full items-center justify-center rounded-lg bg-[#1F2937] text-2xl font-bold text-white hover:bg-[#314d68] active:bg-[#258cf4] active:scale-95 transition-all duration-100 touch-manipulation"
                    >
                        0
                    </button>

                    <button
                        onClick={handleDelete}
                        className="flex h-16 w-full items-center justify-center rounded-lg bg-transparent text-[#90adcb] hover:bg-[#1F2937]/50 active:scale-95 transition-all duration-100"
                    >
                        <span className="material-symbols-outlined text-3xl">backspace</span>
                    </button>
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col gap-6 pt-4">
                <div className="flex items-center justify-center gap-4 text-[#90adcb] text-sm font-medium">
                    <button
                        onClick={() => navigate('/qr-access')}
                        className="hover:text-white transition-colors"
                    >
                        Forgot PIN?
                    </button>
                    <span className="opacity-30">|</span>
                    <button
                        onClick={() => navigate('/qr-access')}
                        className="flex items-center gap-1 text-[#258cf4] hover:text-white transition-colors"
                    >
                        Connect New Service <span className="material-symbols-outlined text-lg">qr_code_scanner</span>
                    </button>
                </div>

                <div className="relative w-full">
                    <button
                        onMouseDown={startPress}
                        onMouseUp={endPress}
                        onTouchStart={startPress}
                        onTouchEnd={endPress}
                        className="relative flex h-[72px] w-full items-center justify-center rounded-2xl bg-[#9e1c1c] border-2 border-[#b91c1c] p-2 shadow-[0_0_15px_rgba(185,28,28,0.4)] overflow-hidden group cursor-pointer active:scale-[0.98] transition-all touch-none select-none animate-pulse-ring"
                    >
                        <div className="absolute inset-0 bg-gradient-to-t from-[#7f1d1d] to-[#ef4444] opacity-80 group-active:opacity-100 transition-opacity"></div>
                        <div className="relative z-20 flex h-full w-full items-center justify-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm shadow-sm group-active:scale-110 transition-transform duration-500">
                                <span className="material-symbols-outlined text-white text-2xl font-black">emergency</span>
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="text-white text-base font-bold tracking-wide uppercase drop-shadow-sm flex items-center gap-1">
                                    Hold for Code Blue
                                </span>
                                <span className="text-white/80 text-[10px] font-bold tracking-wider uppercase">
                                    Press & Hold (1s)
                                </span>
                            </div>
                            <span className="material-symbols-outlined text-white/50 text-2xl animate-pulse">touch_app</span>
                        </div>
                        <div className="absolute bottom-0 left-0 h-1 bg-white/50 w-0 group-active:w-full transition-all duration-1000 ease-linear rounded-full"></div>
                    </button>
                </div>
            </div>
        </div>
    );
}
