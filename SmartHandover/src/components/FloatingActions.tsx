import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function FloatingActions() {
    const navigate = useNavigate();
    // TODO: Add left-handed mode from store
    const isLeftHanded = false;

    return (
        <div className={`fixed bottom-20 z-20 pointer-events-none ${isLeftHanded ? 'right-6' : 'left-6'}`}>
            {/* Solo botón rojo de emergencia */}
            <button
                onClick={() => navigate('/code-blue')}
                className="bg-red-600 hover:bg-red-700 text-white w-14 h-14 rounded-full shadow-lg shadow-red-600/30 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 border border-red-500/50 pointer-events-auto"
            >
                <span className="material-icons-round text-3xl">priority_high</span>
            </button>
        </div>
    );
}
