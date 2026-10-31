import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';

export default function WelcomeCountScreen() {
    const navigate = useNavigate();
    const { currentUser, selectedBedsCount } = useAppStore();
    const [isTransitioning, setIsTransitioning] = useState(false);

    // Display name logic
    const displayName = currentUser?.preferredName || currentUser?.name || 'Usuario';
    const patientCount = selectedBedsCount || 0;

    // Auto-navigate after 3.5 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            handleNavigateToKardex();
        }, 3500);

        return () => clearTimeout(timer);
    }, []);

    const handleNavigateToKardex = () => {
        setIsTransitioning(true);
        setTimeout(() => {
            navigate('/kardex');
        }, 500); // Wait for transition animation
    };

    return (
        <div className={`bg-background-dark text-gray-100 font-sans antialiased h-screen overflow-hidden flex justify-center transition-all duration-500 ${isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
            }`}>
            <style>{`
                .bg-background-dark { background-color: #000000; }
                .bg-surface-dark { background-color: #1C1C1E; }
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .animate-float { animation: float 3s ease-in-out infinite; }
                @keyframes blob {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                .animate-blob { animation: blob 7s infinite; }
                .animation-delay-2000 { animation-delay: 2s; }
                @keyframes slideUp {
                    from { 
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to { 
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-slide-up {
                    animation: slideUp 0.6s ease-out forwards;
                }
                .delay-100 { animation-delay: 0.1s; opacity: 0; }
                .delay-200 { animation-delay: 0.2s; opacity: 0; }
                .delay-300 { animation-delay: 0.3s; opacity: 0; }
            `}</style>
            <div className="w-full max-w-md h-full flex flex-col relative bg-background-dark">
                {/* Status Bar Mock */}
                <div className="px-6 pt-3 pb-2 flex justify-between items-center text-xs font-medium z-20 text-gray-300">
                    <span>9:41</span>
                    <div className="flex items-center space-x-2">
                        <span className="material-icons-round text-base">signal_cellular_alt</span>
                        <span className="material-icons-round text-base">wifi</span>
                        <span className="material-icons-round text-base rotate-90">battery_full</span>
                    </div>
                </div>

                <main className="flex-1 flex flex-col items-center justify-center px-8 relative z-10">
                    <div className="absolute top-1/4 left-0 w-72 h-72 bg-blue-600 rounded-full mix-blend-multiply filter blur-[80px] opacity-20 animate-blob"></div>
                    <div className="absolute bottom-1/4 right-0 w-72 h-72 bg-purple-600 rounded-full mix-blend-multiply filter blur-[80px] opacity-20 animate-blob animation-delay-2000"></div>

                    <div className="text-center mb-10 space-y-2 animate-slide-up delay-100">
                        <h1 className="text-4xl font-bold tracking-tight text-white">
                            Hola, <span className="text-blue-400">{displayName}!</span>
                        </h1>
                        <p className="text-gray-400 text-lg">Todo listo para tu guardia.</p>
                    </div>

                    <div className="relative mb-12 group animate-slide-up delay-200">
                        <div className="absolute -inset-1 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-full blur opacity-60 group-hover:opacity-80 transition duration-500 animate-pulse"></div>
                        <div className="relative w-56 h-56 bg-surface-dark rounded-full flex flex-col items-center justify-center border border-gray-800 shadow-2xl z-10">
                            <span className="material-icons-round text-blue-500 text-3xl mb-1 opacity-80">assignment_ind</span>
                            <span className="text-8xl font-extrabold text-white tracking-tighter leading-none">{patientCount}</span>
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest mt-2">Pacientes</span>
                        </div>
                        <div className="absolute top-2 right-4 bg-green-500 text-black p-2 rounded-full border-4 border-black z-20 shadow-lg animate-bounce" style={{ animationDuration: '3s' }}>
                            <span className="material-icons-round text-xl">check</span>
                        </div>
                    </div>

                    <div className="text-center space-y-4 max-w-xs animate-slide-up delay-300">
                        <p className="text-xl text-gray-200 font-medium">
                            Tienes <span className="text-blue-400 font-bold">{patientCount} pacientes</span> asignados.
                        </p>
                        <p className="text-sm text-gray-500">
                            Tu kardex se ha sincronizado correctamente y está listo para uso offline.
                        </p>
                    </div>

                    <div className="flex-1"></div>

                    <div className="w-full pb-10 animate-slide-up delay-300">
                        <button
                            onClick={handleNavigateToKardex}
                            className="w-full py-4 bg-[#3B82F6] hover:bg-blue-600 active:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-900/40 transition-all transform active:scale-95 flex items-center justify-center space-x-2"
                        >
                            <span>Ver Kardex</span>
                            <span className="material-icons-round">arrow_forward</span>
                        </button>
                        <p className="text-center text-xs text-gray-500 mt-3">
                            Navegando automáticamente en unos segundos...
                        </p>
                    </div>
                </main>
            </div>
        </div>
    );
}
