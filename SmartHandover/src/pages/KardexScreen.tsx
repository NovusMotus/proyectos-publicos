import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import BottomNav from '../components/BottomNav';
import FloatingActions from '../components/FloatingActions';

export default function KardexScreen() {
    const navigate = useNavigate();
    const { currentUser } = useAppStore();

    // Replicating the exact data and colors from 'kardex main dark/code.html'
    const patients = [
        {
            id: '203A',
            initials: '203A', // Using Room Number as ID/Title per design
            subtitle: 'Male • Own Spec',
            description: 'Cirugía General', // Context
            bgColor: 'bg-orange-100 dark:bg-[#964B00]',
            textColor: 'text-gray-900 dark:text-white',
            subTextColor: 'text-orange-100',
            alerts: [
                { icon: 'bolt', label: 'EKG Urgente', bg: 'bg-red-500/90', text: 'text-white', animate: 'animate-pulse' },
                { icon: 'medication', label: 'Dolor', bg: 'bg-amber-900/40 dark:bg-black/30', text: 'text-gray-900 dark:text-amber-100', iconColor: 'text-yellow-400', iconClass: '-rotate-45' }
            ],
            tasks: '3 Tareas Pendientes',
            footerBg: 'bg-black/10 dark:bg-black/20',
            footerText: 'text-orange-50'
        },
        {
            id: '203B',
            initials: '203B',
            subtitle: 'Female • Own Spec',
            bgColor: 'bg-pink-100 dark:bg-[#BE123C]',
            textColor: 'text-gray-900 dark:text-white',
            subTextColor: 'text-pink-100',
            isolation: true,
            alerts: [
                { icon: 'water_drop', label: 'Analítica', bg: 'bg-rose-900/30 dark:bg-black/30', text: 'text-pink-50', iconColor: 'text-red-500' }
            ],
            tasks: '1 Tarea Pendiente',
            footerBg: 'bg-black/10 dark:bg-black/20',
            footerText: 'text-pink-50'
        },
        {
            id: '204A',
            initials: '204A',
            subtitle: 'Male • Other Spec',
            bgColor: 'bg-blue-100 dark:bg-[#1E3A8A]',
            textColor: 'text-gray-900 dark:text-white',
            subTextColor: 'text-blue-200',
            alerts: [
                { label: 'Pend. Traslado', bg: 'bg-blue-900/10 dark:bg-white/10', text: 'text-blue-50' }
            ],
            tasks: '0 Tareas Pendientes',
            footerBg: 'bg-black/5 dark:bg-black/30',
            footerText: 'text-blue-100'
        },
        {
            id: '204B',
            initials: '204B',
            subtitle: 'Female • Other Spec',
            bgColor: 'bg-stone-50 dark:bg-stone-200',
            textColor: 'text-gray-900',
            subTextColor: 'text-stone-700',
            alerts: [
                { label: 'Dieta Absoluta', bg: 'bg-stone-300', text: 'text-stone-900' }
            ],
            tasks: '1 Tarea Pendiente',
            footerBg: 'bg-stone-300/50',
            footerText: 'text-stone-900'
        },
        {
            id: '205A',
            initials: '205A',
            subtitle: '',
            bgColor: 'bg-stripes-light dark:bg-stripes-dark border border-gray-300 dark:border-gray-700',
            textColor: 'text-gray-500 dark:text-gray-300',
            isBlocked: true,
            blockReason: '', // Editable by user
        },
        {
            id: '205B',
            initials: '205B',
            subtitle: '',
            bgColor: 'bg-gray-100 dark:bg-[#2A2A2B] border-2 border-dashed border-gray-300 dark:border-gray-600',
            textColor: 'text-gray-400 dark:text-gray-500',
            isFree: true,
        }
    ];

    const [showDropdown, setShowDropdown] = useState(false);
    const [showHamburger, setShowHamburger] = useState(false);
    const [blockReasons, setBlockReasons] = useState<Record<string, string>>({});
    const [showAllPatients, setShowAllPatients] = useState(false); // Toggle para ver toda la planta
    const [thirdBedEnabled, setThirdBedEnabled] = useState(false); // 3ª cama activada

    // TODO: Calcular ocupación de TODA LA ZONA FÍSICA (no solo tus pacientes)
    // Ejemplo: GET /api/zones/{zoneId}/occupancy
    // Esta información debe venir del backend para toda la planta/zona
    const occupiedBeds = patients.filter(p => !p.isBlocked && !p.isFree).length; // TEMPORAL: solo para demo
    const totalCapacity = thirdBedEnabled ? 32 : 26; // Debe venir de configuración de zona

    return (
        <div className="w-full h-full flex flex-col relative bg-black font-display overflow-hidden text-white">
            <style>{`
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.95) translateY(-10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>

            <header className="px-4 py-3 flex items-center justify-between z-20 sticky top-0 bg-black/90 backdrop-blur-sm border-b border-white/10">
                <button
                    onClick={() => setShowHamburger(!showHamburger)}
                    className={`p-2 rounded-full transition-colors ${showHamburger ? 'bg-white/10 text-white' : 'hover:bg-white/10 dark:text-white'}`}
                >
                    <span className="material-icons-round text-2xl">menu</span>
                </button>
                <div className="flex flex-col items-center">
                    <h1 className="text-xl font-bold tracking-tight dark:text-white">Super Kardex Digital</h1>
                    {/* Indicador de ocupación */}
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="material-symbols-outlined text-[14px] text-gray-500">hotel</span>
                        <span className="text-[11px] font-medium text-gray-400">
                            {occupiedBeds}/{totalCapacity} camas
                        </span>
                        <div className={`w-1.5 h-1.5 rounded-full ${occupiedBeds >= totalCapacity * 0.9 ? 'bg-red-500' :
                            occupiedBeds >= totalCapacity * 0.7 ? 'bg-orange-500' :
                                'bg-green-500'
                            }`}></div>
                    </div>
                </div>
                <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className={`p-2 rounded-full transition-colors ${showDropdown ? 'bg-white/10 text-white' : 'hover:bg-gray-200 dark:hover:bg-white/10 dark:text-white/70'}`}
                >
                    <span className="material-icons-round text-2xl">more_vert</span>
                </button>
            </header>

            {/* Hamburger Menu (Left) - GESTIÓN DE TURNO */}
            {showHamburger && (
                <>
                    <div
                        className="absolute inset-0 z-30 bg-black/60 backdrop-blur-[1px] transition-all duration-300"
                        onClick={() => setShowHamburger(false)}
                    />
                    <div className="absolute left-4 top-16 z-40 w-72 origin-top-left animate-[scaleIn_0.15s_ease-out]">
                        <div className="bg-[#1E1E1E] rounded-xl shadow-2xl ring-1 ring-white/10 overflow-hidden flex flex-col">
                            <button
                                onClick={() => { setShowHamburger(false); navigate('/shift-setup'); }}
                                className="flex items-center gap-3 w-full px-4 py-4 text-left hover:bg-white/5 active:bg-white/10 transition-colors group"
                            >
                                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                    <span className="material-symbols-outlined text-[20px]">swap_horiz</span>
                                </div>
                                <div className="flex flex-col flex-1">
                                    <span className="text-[15px] font-medium text-white leading-tight">Cambiar Zona Física</span>
                                    <span className="text-[11px] text-white/50 leading-tight mt-0.5">Seleccionar otra área</span>
                                </div>
                            </button>
                            <div className="h-px w-full bg-white/5 mx-auto"></div>
                            <button
                                onClick={() => { setShowHamburger(false); navigate('/shift-setup'); }}
                                className="flex items-center gap-3 w-full px-4 py-3.5 text-left hover:bg-white/5 active:bg-white/10 transition-colors"
                            >
                                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#2C2C2C] text-white/70">
                                    <span className="material-symbols-outlined text-[20px]">group</span>
                                </div>
                                <span className="text-[15px] font-normal text-white/90">Seleccionar Pacientes</span>
                            </button>
                            <div className="h-px w-full bg-white/5 mx-auto"></div>
                            <button
                                onClick={() => { setShowHamburger(false); navigate('/sbar-review', { state: { patients } }); }}
                                className="flex items-center gap-3 w-full px-4 py-4 text-left hover:bg-white/5 active:bg-white/10 transition-colors group"
                            >
                                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/20 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                    <span className="material-symbols-outlined text-[20px]">ios_share</span>
                                </div>
                                <div className="flex flex-col flex-1">
                                    <span className="text-[15px] font-medium text-white leading-tight">Exportar Pacientes</span>
                                    <span className="text-[11px] text-white/50 leading-tight mt-0.5">Generar SBAR (IA) & CSV</span>
                                </div>
                            </button>
                            <div className="h-px w-full bg-white/5 mx-auto"></div>
                            <button
                                onClick={() => { setShowHamburger(false); navigate('/close-shift'); }}
                                className="flex items-center gap-3 w-full px-4 py-4 text-left hover:bg-white/5 active:bg-white/10 transition-colors group"
                            >
                                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/20 text-red-400 group-hover:bg-red-500 group-hover:text-white transition-colors">
                                    <span className="material-symbols-outlined text-[20px]">logout</span>
                                </div>
                                <div className="flex flex-col flex-1">
                                    <span className="text-[15px] font-medium text-white leading-tight">Cerrar Turno</span>
                                    <span className="text-[11px] text-white/50 leading-tight mt-0.5">Registro de salida</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Dropdown Menu (Right) - OPCIONES DE VISTA */}
            {showDropdown && (
                <>
                    <div
                        className="absolute inset-0 z-30 bg-black/60 backdrop-blur-[1px] transition-all duration-300"
                        onClick={() => setShowDropdown(false)}
                    />
                    <div className="absolute right-4 top-16 z-40 w-64 origin-top-right animate-[scaleIn_0.15s_ease-out]">
                        <div className="bg-[#1E1E1E] rounded-xl shadow-2xl ring-1 ring-white/10 overflow-hidden flex flex-col">
                            <button
                                onClick={() => { setShowAllPatients(!showAllPatients); setShowDropdown(false); }}
                                className="flex items-center gap-3 w-full px-4 py-4 text-left hover:bg-white/5 active:bg-white/10 transition-colors group"
                            >
                                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                                    <span className="material-symbols-outlined text-[20px]">{showAllPatients ? 'visibility_off' : 'visibility'}</span>
                                </div>
                                <div className="flex flex-col flex-1">
                                    <span className="text-[15px] font-medium text-white leading-tight">Ver Toda la Planta</span>
                                    <span className="text-[11px] text-white/50 leading-tight mt-0.5">{showAllPatients ? 'Activado' : 'Solo mis pacientes'}</span>
                                </div>
                                {showAllPatients && (
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                )}
                            </button>
                            <div className="h-px w-full bg-white/5 mx-auto"></div>
                            <button
                                onClick={() => { setShowDropdown(false); navigate('/feedback'); }}
                                className="flex items-center gap-3 w-full px-4 py-3.5 text-left hover:bg-white/5 active:bg-white/10 transition-colors"
                            >
                                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#2C2C2C] text-white/70">
                                    <span className="material-symbols-outlined text-[20px]">feedback</span>
                                </div>
                                <span className="text-[15px] font-normal text-white/90">Feedback y Peticiones</span>
                            </button>
                        </div>
                    </div>
                </>
            )}

            <main className="flex-1 overflow-y-auto no-scrollbar px-3 pb-24 pt-2">
                <div className="grid grid-cols-2 gap-3">
                    {patients.map((p, i) => (
                        <div key={i}
                            onClick={() => !p.isBlocked && !p.isFree && navigate(`/patient/${p.id}`)}
                            className={`relative flex flex-col justify-between rounded-2xl shadow-sm overflow-hidden min-h-[180px] ${p.bgColor} ${p.isBlocked || p.isFree ? '' : 'cursor-pointer active:scale-[0.98] transition-all'}`}
                        >
                            {p.isolation && (
                                <div className="bg-green-500 w-full py-1 px-2 flex items-center justify-center space-x-1">
                                    <div className="w-2 h-2 rounded-full bg-green-900 animate-ping absolute opacity-75"></div>
                                    <div className="w-2 h-2 rounded-full bg-green-900 relative"></div>
                                    <span className="text-[10px] font-extrabold text-green-900 uppercase tracking-wide">AISL. CONTACTO</span>
                                </div>
                            )}

                            <div className="p-4 flex flex-col h-full relative z-10">
                                <div className="flex flex-col">
                                    <h2 className={`text-2xl font-bold mb-0.5 ${p.textColor}`}>{p.initials}</h2>
                                    {p.subtitle && <p className={`text-xs font-medium ${p.subTextColor || 'text-gray-600'}`}>{p.subtitle}</p>}
                                </div>

                                {p.isBlocked ? (
                                    <div className="mt-auto space-y-3">
                                        <div className="flex items-center justify-center space-x-2">
                                            <span className="material-icons-round text-red-500 text-2xl">remove_circle</span>
                                            <span className="text-red-500 font-bold tracking-wider uppercase">Bloqueada</span>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Motivo del bloqueo..."
                                            value={blockReasons[p.id] || ''}
                                            onChange={(e) => setBlockReasons({ ...blockReasons, [p.id]: e.target.value })}
                                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                ) : p.isFree ? (
                                    <div className="mt-auto mb-6 flex items-center justify-center space-x-2">
                                        <span className="material-icons-round text-gray-400 dark:text-gray-500 text-2xl">radio_button_unchecked</span>
                                        <span className="text-gray-400 dark:text-gray-500 font-bold tracking-wider uppercase">Libre</span>
                                    </div>
                                ) : (
                                    <div className="mt-4 flex flex-col space-y-2 items-start">
                                        {p.alerts?.map((alert: any, j) => (
                                            <div key={j} className={`flex items-center space-x-1 text-[10px] font-bold px-2 py-1 rounded-full ${alert.bg} ${alert.text} ${alert.animate || ''}`}>
                                                {alert.icon && <span className={`material-icons-round text-xs ${alert.iconColor || ''} ${alert.iconClass || ''}`}>{alert.icon}</span>}
                                                <span>{alert.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {!p.isBlocked && !p.isFree && p.tasks && (
                                <div className={`mt-auto mx-2 mb-2 p-2 rounded-xl text-center backdrop-blur-sm relative z-10 ${p.footerBg}`}>
                                    <p className={`text-xs font-medium ${p.footerText}`}>{p.tasks}</p>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Ghost cards for fullness */}
                    <div className="relative flex flex-col justify-between rounded-2xl bg-orange-100 dark:bg-[#964B00] shadow-sm overflow-hidden min-h-[180px] opacity-50">
                        <div className="p-4 flex flex-col h-full">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-0.5">206A</h2>
                            <p className="text-xs font-medium text-gray-600 dark:text-orange-100">Male • Own Spec</p>
                        </div>
                        <div className="mt-auto mx-2 mb-2 p-2 bg-black/10 dark:bg-black/20 rounded-xl text-center">
                            <p className="text-xs font-medium text-gray-800 dark:text-orange-50">0 Tareas Pendientes</p>
                        </div>
                    </div>
                </div>
            </main>

            {/* Global Components */}
            <FloatingActions />
            <BottomNav activeTab="kardex" />
        </div>
    );
}
