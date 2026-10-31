import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';

// Reuse zone images or keep consistent style
import zoneNorth from '../assets/images/zone_north.jpg';
import zoneSouth from '../assets/images/zone_south.jpg';
import zoneUci from '../assets/images/zone_uci.jpg';

export default function QRAccessScreen() {
    const navigate = useNavigate();
    const login = useAppStore(s => s.login);
    const [step, setStep] = useState<'scanning' | 'zone' | 'pin'>('scanning');
    const [selectedZone, setSelectedZone] = useState<string | null>(null);
    const [pin, setPin] = useState('');

    // Simulate scanning delay
    React.useEffect(() => {
        if (step === 'scanning') {
            const timer = setTimeout(() => {
                setStep('zone');
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, [step]);

    const zones = [
        { id: 'north', name: 'Planta 2 - Norte', image: zoneNorth, patients: 12 },
        { id: 'south', name: 'Planta 2 - Sur', image: zoneSouth, patients: 8 },
        { id: 'uci', name: 'UCI General', image: zoneUci, patients: 5 },
    ];

    const handleNumClick = (num: string) => {
        if (pin.length < 4) {
            const newPin = pin + num;
            setPin(newPin);
            if (newPin.length === 4) {
                // Determine logic: user said "first time you have to select the PIN"
                // effectively setting a session PIN or verifying against a backend.
                // For this mock, we accept any 4 digit PIN as "Setting it up" and logging in.

                // Simulate success delay
                setTimeout(() => {
                    login(newPin); // Log user in
                    // Navigate to Shift Setup or directly to Dashboard? 
                    // User said "first time select PIN", usually implies setting up context.
                    // Let's go to Shift Setup to confirm patients.
                    navigate('/shift-setup');
                }, 300);
            }
        }
    };

    const handleDelete = () => setPin(prev => prev.slice(0, -1));

    return (
        <div className="bg-[#101922] text-white font-display antialiased selection:bg-primary selection:text-white overflow-hidden touch-manipulation h-screen w-full flex flex-col justify-between p-4 pb-8 max-w-md mx-auto relative">
            <style>{`
                @keyframes scan {
                    0% { top: 0; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
            `}</style>

            <header className="flex items-center pt-6 pb-2 relative z-20">
                <button onClick={() => step === 'pin' ? setStep('zone') : navigate('/')} className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors">
                    <span className="material-symbols-outlined text-2xl">arrow_back</span>
                </button>
                <div className="flex-1 text-center pr-10">
                    <h1 className="text-lg font-bold">
                        {step === 'scanning' ? 'Scanning QR...' : step === 'zone' ? 'Service Found' : 'Session Access'}
                    </h1>
                </div>
            </header>

            {step === 'scanning' && (
                <div className="flex-1 flex flex-col items-center justify-center relative">
                    <div className="w-64 h-64 border-2 border-primary/50 rounded-3xl relative flex items-center justify-center overflow-hidden bg-black/50 backdrop-blur-sm">
                        <div className="absolute inset-0 border-t-2 border-primary animate-[scan_2s_ease-in-out_infinite] bg-gradient-to-b from-primary/20 to-transparent"></div>
                        <span className="material-symbols-outlined text-6xl text-white/20 animate-pulse">qr_code_scanner</span>

                        {/* Corner markers */}
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl"></div>
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl"></div>
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl"></div>
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl"></div>
                    </div>
                    <p className="mt-8 text-gray-400 text-sm animate-pulse">Align QR code within frame</p>
                </div>
            )}

            {step === 'zone' && (
                <div className="flex-1 flex flex-col animate-in slide-in-from-bottom duration-500">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center mb-4 ring-2 ring-green-500/50">
                            <span className="material-symbols-outlined text-3xl text-green-400">check_circle</span>
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Service Connected</h2>
                        <p className="text-gray-400 text-sm">Select your authorized zone</p>
                    </div>

                    <div className="grid gap-4 overflow-y-auto px-2">
                        {zones.map(zone => (
                            <button
                                key={zone.id}
                                onClick={() => {
                                    setSelectedZone(zone.name);
                                    setStep('pin');
                                }}
                                className="relative h-24 rounded-xl overflow-hidden group border border-white/10 hover:border-primary/50 transition-all active:scale-[0.98]"
                            >
                                <div className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-60 transition-opacity" style={{ backgroundImage: `url(${zone.image})` }}></div>
                                <div className="absolute inset-0 bg-gradient-to-r from-black/90 to-transparent"></div>
                                <div className="relative z-10 h-full flex items-center justify-between px-6">
                                    <div className="text-left">
                                        <h3 className="text-lg font-bold">{zone.name}</h3>
                                        <p className="text-sm text-blue-300">{zone.patients} Active Patients</p>
                                    </div>
                                    <span className="material-symbols-outlined text-white/50 group-hover:text-white transition-colors">chevron_right</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {step === 'pin' && (
                <div className="flex-1 flex flex-col animate-in slide-in-from-right duration-300">
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/20 border border-primary/30 text-blue-300 text-xs font-bold uppercase tracking-wider mb-6">
                            <span className="material-symbols-outlined text-sm">location_on</span>
                            {selectedZone}
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Create Session PIN</h2>
                        <p className="text-gray-400 text-sm">Set a temporary PIN for this session</p>
                    </div>

                    {/* PIN Dots */}
                    <div className="flex justify-center py-6 mb-4">
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
                        <div className="h-16"></div> {/* Spacer */}
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
            )}
        </div>
    );
}
