import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const DISCLAIMER_VERSION = '1.0';
const DISCLAIMER_STORAGE_KEY = 'smarthandover_disclaimer_accepted';

interface DisclaimerData {
    accepted: boolean;
    disclaimerVersion: string;
}

export default function ShiftTimeScreen() {
    const navigate = useNavigate();

    // State for selected times
    const [startHour, setStartHour] = useState(8);
    const [startMinute, setStartMinute] = useState(0);
    const [endHour, setEndHour] = useState(20);
    const [endMinute, setEndMinute] = useState(0);

    // State for manual input
    const [editingField, setEditingField] = useState<string | null>(null);

    // Current time from device
    const [currentTime, setCurrentTime] = useState('');

    // Check if disclaimer is accepted
    const checkDisclaimerAccepted = (): boolean => {
        try {
            const stored = localStorage.getItem(DISCLAIMER_STORAGE_KEY);
            if (!stored) return false;

            const data: DisclaimerData = JSON.parse(stored);

            if (data.disclaimerVersion !== DISCLAIMER_VERSION) {
                return false;
            }

            return data.accepted;
        } catch (error) {
            return false;
        }
    };

    // Navigate to next screen based on disclaimer status
    const navigateToNextScreen = () => {
        const isAccepted = checkDisclaimerAccepted();
        if (isAccepted) {
            navigate('/welcome-count');
        } else {
            navigate('/welcome-legal');
        }
    };

    useEffect(() => {
        const updateCurrentTime = () => {
            const now = new Date();
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            setCurrentTime(`${hours}:${minutes}`);
        };

        // Update immediately
        updateCurrentTime();

        // Update every minute
        const interval = setInterval(updateCurrentTime, 60000);

        return () => clearInterval(interval);
    }, []);

    // Calculate shift duration
    const calculateDuration = () => {
        const startMinutes = startHour * 60 + startMinute;
        const endMinutes = endHour * 60 + endMinute;
        let diff = endMinutes - startMinutes;

        if (diff < 0) {
            diff += 24 * 60;
        }

        const hours = Math.floor(diff / 60);
        const mins = diff % 60;

        if (mins === 0) {
            return `${hours} Horas`;
        }
        return `${hours}h ${mins}m`;
    };

    // Hybrid Time Picker Component
    const HybridTimePicker = ({
        hour,
        minute,
        onHourChange,
        onMinuteChange,
        label,
        sublabel,
        fieldPrefix
    }: {
        hour: number;
        minute: number;
        onHourChange: (h: number) => void;
        onMinuteChange: (m: number) => void;
        label: string;
        sublabel: string;
        fieldPrefix: string;
    }) => {
        const hourRef = useRef<HTMLDivElement>(null);
        const minuteRef = useRef<HTMLDivElement>(null);
        const itemHeight = 50;

        // Generate arrays
        const hours = Array.from({ length: 24 }, (_, i) => i);
        const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

        // Scroll handling for hour
        useEffect(() => {
            if (hourRef.current) {
                const selectedIndex = hours.indexOf(hour);
                hourRef.current.scrollTop = selectedIndex * itemHeight;
            }
        }, [hour]);

        // Scroll handling for minute
        useEffect(() => {
            if (minuteRef.current) {
                const selectedIndex = minutes.indexOf(minute);
                minuteRef.current.scrollTop = selectedIndex * itemHeight;
            }
        }, [minute]);

        // Scroll handling for hour with debounce
        const hourScrollTimeout = useRef<NodeJS.Timeout | null>(null);

        const handleHourScroll = () => {
            if (!hourRef.current) return;

            // Clear existing timeout
            if (hourScrollTimeout.current) {
                clearTimeout(hourScrollTimeout.current);
            }

            // Set new timeout to update value after scroll stops
            hourScrollTimeout.current = setTimeout(() => {
                if (!hourRef.current) return;
                const scrollTop = hourRef.current.scrollTop;
                const index = Math.round(scrollTop / itemHeight);
                const newValue = hours[Math.max(0, Math.min(index, hours.length - 1))];

                if (newValue !== hour) {
                    onHourChange(newValue);
                }

                // Smooth scroll to exact position
                const targetScroll = index * itemHeight;
                hourRef.current.scrollTo({
                    top: targetScroll,
                    behavior: 'smooth'
                });
            }, 100); // Wait 100ms after scroll stops
        };

        // Scroll handling for minute with debounce
        const minuteScrollTimeout = useRef<NodeJS.Timeout | null>(null);

        const handleMinuteScroll = () => {
            if (!minuteRef.current) return;

            // Clear existing timeout
            if (minuteScrollTimeout.current) {
                clearTimeout(minuteScrollTimeout.current);
            }

            // Set new timeout to update value after scroll stops
            minuteScrollTimeout.current = setTimeout(() => {
                if (!minuteRef.current) return;
                const scrollTop = minuteRef.current.scrollTop;
                const index = Math.round(scrollTop / itemHeight);
                const newValue = minutes[Math.max(0, Math.min(index, minutes.length - 1))];

                if (newValue !== minute) {
                    onMinuteChange(newValue);
                }

                // Smooth scroll to exact position
                const targetScroll = index * itemHeight;
                minuteRef.current.scrollTo({
                    top: targetScroll,
                    behavior: 'smooth'
                });
            }, 100); // Wait 100ms after scroll stops
        };

        const handleManualHourInput = (value: string) => {
            const num = parseInt(value);
            if (!isNaN(num) && num >= 0 && num < 24) {
                onHourChange(num);
            }
            setEditingField(null);
        };

        const handleManualMinuteInput = (value: string) => {
            const num = parseInt(value);
            if (!isNaN(num) && num >= 0 && num < 60) {
                // Round to nearest 5
                const rounded = Math.round(num / 5) * 5;
                onMinuteChange(rounded >= 60 ? 55 : rounded);
            }
            setEditingField(null);
        };

        const renderScrollableColumn = (
            ref: React.RefObject<HTMLDivElement>,
            items: number[],
            value: number,
            onScroll: () => void,
            fieldKey: string,
            onManualInput: (value: string) => void
        ) => {
            const isEditing = editingField === fieldKey;

            return (
                <div className="flex-1 relative">
                    {isEditing ? (
                        <div className="flex items-center justify-center h-full">
                            <input
                                type="number"
                                inputMode="numeric"
                                autoFocus
                                defaultValue={value.toString().padStart(2, '0')}
                                onFocus={(e) => {
                                    // Select all text when focused
                                    e.target.select();
                                }}
                                onClick={(e) => {
                                    // Also select on click in case focus doesn't trigger
                                    e.currentTarget.select();
                                }}
                                onBlur={(e) => onManualInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        onManualInput(e.currentTarget.value);
                                    }
                                }}
                                className="w-20 h-16 bg-[#258cf4] text-white text-3xl font-bold text-center rounded-xl border-2 border-[#258cf4] focus:outline-none focus:ring-2 focus:ring-blue-400"
                                style={{ MozAppearance: 'textfield' }}
                            />
                        </div>
                    ) : (
                        <div
                            ref={ref}
                            onScroll={onScroll}
                            className="h-full overflow-y-scroll scrollbar-hide time-wheel-mask"
                            style={{
                                scrollBehavior: 'auto',
                                WebkitOverflowScrolling: 'touch' // Enable momentum scrolling on iOS
                            }}
                        >
                            <div style={{ height: `${itemHeight * 2}px` }} />
                            {items.map((item) => (
                                <div
                                    key={item}
                                    onClick={() => setEditingField(fieldKey)}
                                    className="flex items-center justify-center cursor-pointer hover:bg-white/5 transition-all duration-200"
                                    style={{ height: `${itemHeight}px` }}
                                >
                                    <span
                                        className={`font-display transition-all duration-200 ${item === value
                                            ? 'text-[2rem] text-white font-semibold'
                                            : 'text-[1.25rem] text-[#525252]'
                                            }`}
                                    >
                                        {item.toString().padStart(2, '0')}
                                    </span>
                                </div>
                            ))}
                            <div style={{ height: `${itemHeight * 2}px` }} />
                        </div>
                    )}
                </div>
            );
        };

        return (
            <div className="flex flex-col items-center justify-center relative">
                <div className="flex items-center justify-between w-full max-w-[280px] mb-2 px-2">
                    <p className="text-sm font-bold text-[#258cf4] uppercase tracking-widest">{label}</p>
                    <span className="text-xs text-[#A0A0A0] font-medium">{sublabel}</span>
                </div>
                <div className="relative w-full max-w-[280px] h-[250px] bg-[#1C1C1E] rounded-3xl border border-white/10 flex items-center justify-center overflow-hidden">
                    <div className="absolute w-full h-[50px] bg-white/5 border-y border-white/10 top-1/2 -translate-y-1/2 z-0 pointer-events-none"></div>
                    <div className="flex w-full h-full z-10 relative">
                        {renderScrollableColumn(
                            hourRef,
                            hours,
                            hour,
                            handleHourScroll,
                            `${fieldPrefix}-hour`,
                            handleManualHourInput
                        )}
                        <div className="flex items-center justify-center px-2">
                            <span className="text-2xl font-bold text-white">:</span>
                        </div>
                        {renderScrollableColumn(
                            minuteRef,
                            minutes,
                            minute,
                            handleMinuteScroll,
                            `${fieldPrefix}-minute`,
                            handleManualMinuteInput
                        )}
                    </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Toca los números para editar manualmente</p>
            </div>
        );
    };

    return (
        <div className="bg-black font-display antialiased text-white h-screen overflow-hidden">
            <style>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .time-wheel-mask {
                    mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent);
                    -webkit-mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent);
                }
                input[type=number]::-webkit-inner-spin-button,
                input[type=number]::-webkit-outer-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }
            `}</style>
            <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto shadow-2xl bg-black">
                <header className="sticky top-0 z-50 flex items-center justify-between bg-black/90 p-4 backdrop-blur-md border-b border-white/10">
                    <button onClick={() => navigate(-1)} className="flex items-center justify-center p-2 -ml-2 rounded-full text-white hover:bg-white/10 transition-colors">
                        <span className="material-symbols-outlined text-[24px]">arrow_back</span>
                    </button>
                    <div className="flex flex-col items-center">
                        <h1 className="text-white text-lg font-bold leading-tight tracking-tight">Nuevo Turno</h1>
                        <div className="flex gap-1 mt-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#258cf4]/40"></div>
                            <div className="w-1.5 h-1.5 rounded-full bg-[#258cf4]/40"></div>
                            <div className="w-6 h-1.5 rounded-full bg-[#258cf4]"></div>
                        </div>
                    </div>
                    <button className="flex items-center justify-end p-2 -mr-2 opacity-0 cursor-default">
                        <span className="material-symbols-outlined text-[24px]">close</span>
                    </button>
                </header>

                <main className="flex-1 flex flex-col px-6 pt-6 pb-8 overflow-y-auto">
                    <div className="mb-6 text-center">
                        <h2 className="text-2xl font-bold mb-2">Seleccionar Horario</h2>
                        <p className="text-[#A0A0A0] text-base">Define tu hora de entrada y salida prevista.</p>
                    </div>

                    <div className="flex justify-center mb-6">
                        <div className="bg-[#1C1C1E] rounded-full px-4 py-2 flex items-center gap-2 border border-white/5">
                            <span className="material-symbols-outlined text-[#258cf4] text-sm">schedule</span>
                            <span className="text-sm font-medium text-[#A0A0A0]">Hora actual: <span className="text-white">{currentTime}</span></span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-6 mb-4">
                        <HybridTimePicker
                            hour={startHour}
                            minute={startMinute}
                            onHourChange={setStartHour}
                            onMinuteChange={setStartMinute}
                            label="Hora Entrada"
                            sublabel="INICIO"
                            fieldPrefix="start"
                        />

                        <HybridTimePicker
                            hour={endHour}
                            minute={endMinute}
                            onHourChange={setEndHour}
                            onMinuteChange={setEndMinute}
                            label="Hora Salida"
                            sublabel="PREVISTA"
                            fieldPrefix="end"
                        />
                    </div>

                    <div className="mt-auto flex justify-center pb-2">
                        <div className="flex items-center gap-2 text-sm text-[#A0A0A0] bg-[#1C1C1E] px-4 py-2 rounded-full border border-white/5 shadow-lg">
                            <span className="material-symbols-outlined text-[18px] text-[#34C759]">timer</span>
                            <span>Duración del turno: <span className="text-white font-semibold">{calculateDuration()}</span></span>
                        </div>
                    </div>
                </main>

                <div className="p-4 pt-0 bg-black">
                    <button
                        onClick={navigateToNextScreen}
                        className="w-full h-14 bg-[#34C759] hover:bg-green-600 text-white rounded-xl shadow-lg shadow-green-500/20 flex items-center justify-center gap-3 transition-transform active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-green-500/30"
                    >
                        <span className="font-extrabold text-lg tracking-wide">COMENZAR TURNO</span>
                        <span className="material-symbols-outlined font-bold">arrow_forward</span>
                    </button>
                    <p className="text-center text-xs text-[#A0A0A0] mt-4 mb-2">Al comenzar, tu estado cambiará a "Disponible"</p>
                </div>
            </div>
        </div>
    );
}
