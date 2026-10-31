import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';

export default function CodeBlueScreen() {
    const navigate = useNavigate();
    const { currentUser } = useAppStore(); // Get auth state
    const [isActivated, setIsActivated] = useState(false);
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const [sliderValue, setSliderValue] = useState(0);
    const sliderRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const sliderValueRef = useRef(0); // Ref to avoid stale closure in event listeners

    const [showLocationModal, setShowLocationModal] = useState(false);
    const [location, setLocation] = useState('City Hospital - Floor 4 - East Wing');

    const zones = [
        { id: 'north', name: 'Planta 2 - Norte', patients: '12 Pacientes' },
        { id: 'south', name: 'Planta 2 - Sur', patients: '8 Pacientes' },
        { id: 'uci', name: 'UCI General', patients: '5 Pacientes' }
    ];
    // Layout fix: Remove the overlapping "System Armed" text if it conflicts, or move it. 
    // User asked to remove it if I want the text or fix it. I'll remove it to clean up.

    const handleDragStart = () => {
        if (isActivated) return;
        document.addEventListener('mousemove', handleDrag);
        document.addEventListener('mouseup', handleDragEnd);
        document.addEventListener('touchmove', handleDrag);
        document.addEventListener('touchend', handleDragEnd);
    };

    const handleCancel = () => {
        if (!currentUser) {
            navigate('/');
        } else {
            navigate(-1);
        }
    };

    const handleDrag = (e: MouseEvent | TouchEvent) => {
        if (isActivated || !containerRef.current || !sliderRef.current) return;

        let clientX;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
        } else {
            clientX = (e as MouseEvent).clientX;
        }

        const containerRect = containerRef.current.getBoundingClientRect();
        const sliderWidth = sliderRef.current.offsetWidth;
        const maxDrag = containerRect.width - sliderWidth - 8; // padding

        let newX = clientX - containerRect.left - (sliderWidth / 2);
        newX = Math.max(0, Math.min(newX, maxDrag));

        const percentage = (newX / maxDrag) * 100;
        setSliderValue(percentage);
        sliderValueRef.current = percentage; // Update ref for stable access
    };

    const handleDragEnd = () => {
        document.removeEventListener('mousemove', handleDrag);
        document.removeEventListener('mouseup', handleDragEnd);
        document.removeEventListener('touchmove', handleDrag);
        document.removeEventListener('touchend', handleDragEnd);

        if (isActivated) return;

        // Use ref to check value, as state might be stale in closure
        if (sliderValueRef.current > 85) {
            setIsActivated(true);
            setSliderValue(100);
            sliderValueRef.current = 100;
        } else {
            setSliderValue(0);
            sliderValueRef.current = 0;
        }
    };

    return (
        <div className="bg-oled text-white font-display antialiased selection:bg-danger selection:text-white min-h-[100dvh] w-full flex flex-col items-center justify-center select-none overflow-y-auto relative">
            <style>{`
                .bg-oled { background-color: #000000; }
                .text-glow { text-shadow: 0 0 20px rgba(239, 68, 68, 0.5); }
                @keyframes slideHint {
                    0%, 100% { transform: translateX(0); opacity: 0.5; }
                    50% { transform: translateX(5px); opacity: 1; }
                }
                .animate-slide-hint { animation: slideHint 1.5s infinite; }
            `}</style>

            {/* Location Selection Modal */}
            {showLocationModal && (
                <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-end justify-center animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-[#111827] rounded-t-3xl border-t border-[#374151] p-6 pb-12 animate-in slide-in-from-bottom duration-300">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-white">Select Location</h3>
                            <button
                                onClick={() => setShowLocationModal(false)}
                                className="p-2 bg-white/5 rounded-full hover:bg-white/10"
                            >
                                <span className="material-symbols-outlined text-gray-400">close</span>
                            </button>
                        </div>
                        <div className="space-y-3">
                            {zones.map(zone => (
                                <button
                                    key={zone.id}
                                    onClick={() => {
                                        setLocation(zone.name);
                                        setShowLocationModal(false);
                                    }}
                                    className="w-full flex items-center justify-between p-4 rounded-xl bg-[#1f2937] border border-[#374151] hover:bg-[#374151] active:scale-[0.98] transition-all"
                                >
                                    <div className="flex flex-col text-left">
                                        <span className="text-white font-bold">{zone.name}</span>
                                        <span className="text-gray-400 text-xs">{zone.patients}</span>
                                    </div>
                                    {location === zone.name && (
                                        <span className="material-symbols-outlined text-green-500">check_circle</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="relative flex flex-col justify-between p-6 pb-32 max-w-md mx-auto w-full min-h-[100dvh]">
                <div className="absolute top-0 left-0 w-full h-96 bg-red-900/10 blur-[100px] rounded-b-full pointer-events-none"></div>

                <div className="relative z-50 flex items-center justify-between pt-6 shrink-0">
                    <button onClick={handleCancel} className="group flex items-center gap-2 text-[#90adcb] hover:text-white transition-colors py-2 active:opacity-70">
                        <span className="material-symbols-outlined text-2xl group-hover:-translate-x-1 transition-transform">arrow_back</span>
                        <span className="text-base font-semibold">Cancel</span>
                    </button>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center gap-8 relative z-10 py-8">
                    <div className="flex flex-col items-center text-center space-y-6">
                        <div className="relative">
                            <div className="absolute inset-0 rounded-full bg-red-600 blur-[60px] opacity-20 animate-pulse"></div>
                            <div className="absolute inset-0 rounded-full border border-red-500/30 animate-ping opacity-20"></div>
                            <div className="relative flex h-32 w-32 items-center justify-center rounded-3xl bg-oled border border-red-900/50 shadow-[0_0_30px_rgba(220,38,38,0.25)]">
                                <span className="material-symbols-outlined text-7xl text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">campaign</span>
                            </div>
                            <div className="absolute -top-2 -right-2 h-10 w-10 bg-red-600 rounded-full flex items-center justify-center border-4 border-black shadow-lg">
                                <span className="material-symbols-outlined text-white text-xl font-bold">priority_high</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-5xl font-extrabold text-white tracking-tight text-glow leading-none">CODE BLUE</h1>
                            <p className="text-red-400/80 font-medium text-lg tracking-wide uppercase">Emergency Broadcast</p>
                        </div>
                    </div>

                    <div className="w-full px-8">
                        <button
                            disabled={!isActivated}
                            onMouseDown={() => isActivated && setIsBroadcasting(true)}
                            onMouseUp={() => setIsBroadcasting(false)}
                            onMouseLeave={() => setIsBroadcasting(false)}
                            onTouchStart={() => isActivated && setIsBroadcasting(true)}
                            onTouchEnd={() => setIsBroadcasting(false)}
                            className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 select-none ${isActivated
                                ? (isBroadcasting ? 'bg-red-900/50 border-red-500 scale-[0.98]' : 'bg-[#1f2937] border-[#4B5563] hover:bg-[#374151] cursor-pointer active:scale-[0.98]')
                                : 'bg-[#111827] border-[#374151] opacity-60 cursor-not-allowed'
                                }`}
                        >
                            <div className={`h-12 w-12 shrink-0 rounded-xl flex items-center justify-center transition-all ${isActivated
                                ? (isBroadcasting ? 'bg-red-500 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.6)]' : 'bg-red-600 text-white shadow-lg')
                                : 'bg-[#1f2937] text-[#9ca3af]'
                                }`}>
                                <span className="material-symbols-outlined text-2xl">mic</span>
                            </div>

                            <div className="flex flex-col text-left flex-1 min-w-0">
                                <span className={`text-sm font-bold truncate transition-colors ${isBroadcasting ? 'text-red-400' : (isActivated ? 'text-white' : 'text-gray-300')
                                    }`}>
                                    {isActivated
                                        ? (isBroadcasting ? 'BROADCASTING LIVE...' : 'PUSH TO TALK READY')
                                        : 'Push-to-Talk Disabled'
                                    }
                                </span>
                                <span className={`text-xs truncate transition-colors ${isBroadcasting ? 'text-red-300' : 'text-gray-500'
                                    }`}>
                                    {isActivated
                                        ? (isBroadcasting ? 'Recording audio channel...' : 'Hold button to broadcast')
                                        : 'Activate system to enable audio input'
                                    }
                                </span>
                            </div>

                            <div className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${isBroadcasting ? 'bg-red-500/20 text-red-500' : 'bg-transparent text-gray-600'
                                }`}>
                                <span className="material-symbols-outlined text-xl">
                                    {isActivated ? (isBroadcasting ? 'graphic_eq' : 'lock_open') : 'lock'}
                                </span>
                            </div>
                        </button>
                    </div>
                </div>

                <div className="relative z-20 flex flex-col gap-6 w-full shrink-0">
                    <div className="text-center space-y-1">
                        <p className="text-white font-bold text-lg">Dual Trigger Activation</p>
                        <p className="text-[#90adcb] text-sm max-w-[80%] mx-auto">Slide firmly to unlock the emergency microphone channel.</p>
                    </div>

                    <div
                        ref={containerRef}
                        className="relative w-full group select-none cursor-pointer"
                    >
                        <div className="relative flex h-24 w-full items-center justify-start rounded-2xl bg-[#0a0a0a] border-2 border-red-900/40 p-2 overflow-hidden shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)]">
                            <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-red-900/40 to-transparent opacity-60"></div>
                            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(45deg, #EF4444 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>

                            <div className={`absolute inset-0 flex items-center justify-center pointer-events-none z-0 pl-20 transition-opacity duration-300 ${isActivated ? 'opacity-0' : 'opacity-100'}`}>
                                <span className="text-red-500/60 text-xl font-extrabold uppercase tracking-[0.2em] flex items-center gap-3 drop-shadow-md">
                                    Slide to Activate
                                    <span className="material-symbols-outlined text-2xl animate-slide-hint">double_arrow</span>
                                </span>
                            </div>

                            <div
                                className={`absolute inset-0 flex items-center justify-center pointer-events-none z-0 pl-0 transition-opacity duration-300 ${isActivated ? 'opacity-100' : 'opacity-0'}`}
                            >
                                <span className="text-white text-xl font-extrabold uppercase tracking-[0.2em] flex items-center gap-3 drop-shadow-md">
                                    SYSTEM ARMED
                                    <span className="material-symbols-outlined text-green-500 text-2xl">check_circle</span>
                                </span>
                            </div>


                            <div
                                ref={sliderRef}
                                onMouseDown={handleDragStart}
                                onTouchStart={handleDragStart}
                                style={{ transform: `translateX(${isActivated ? 'calc(100% + 20px)' : (sliderValue * 3.5) + 'px'})` }} // Simple translation logic, ideally handled by container width but close enough for fixed width layout
                                className={`relative z-10 h-18 w-24 rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.4)] border-t border-red-400/50 flex items-center justify-center active:scale-95 transition-transform duration-100 touch-none ring-4 ring-black/20 cursor-grab active:cursor-grabbing ${isActivated ? 'bg-green-600 border-green-400/50 opacity-0 pointer-events-none' : 'bg-gradient-to-b from-red-600 to-red-800'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-white text-4xl drop-shadow-md">
                                    arrow_forward
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="w-full px-2">
                        <div className="flex items-center justify-center gap-2 p-3 rounded-lg border border-red-900/30 bg-red-950/20 text-center">
                            <span className="material-symbols-outlined text-red-500 text-lg">gavel</span>
                            <p className="text-xs leading-tight font-bold text-red-500 uppercase tracking-widest">
                                Uso exclusivo emergencias vitales.<br />Su ID de dispositivo quedará registrado.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-1 mx-auto w-full">
                        <div className="flex items-center justify-center gap-2 py-2 px-4 bg-[#111827]/50 rounded-t-lg border border-[#374151]/50 border-b-0 w-max">
                            <span className="material-symbols-outlined text-xs text-[#90adcb]">location_on</span>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-[#90adcb]">{location}</span>
                        </div>
                        <button
                            onClick={() => setShowLocationModal(true)}
                            className="text-[10px] text-blue-400/80 hover:text-blue-300 uppercase tracking-wide font-semibold py-1 px-3 hover:bg-white/5 rounded transition-colors"
                        >
                            Incorrect Location? Change
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
