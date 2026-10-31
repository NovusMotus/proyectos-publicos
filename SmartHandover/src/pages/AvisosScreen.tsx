import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Notification {
    id: string;
    type: 'urgent' | 'new' | 'normal';
    title: string;
    message: string;
    timestamp: string;
    isRead: boolean;
    patientId?: string;
}

// Mock data
const MOCK_NOTIFICATIONS: Notification[] = [
    { id: '1', type: 'urgent', title: 'Glucemia crítica - 203A', message: 'Glucemia de 45 mg/dL. Requiere atención inmediata.', timestamp: new Date().toISOString(), isRead: false, patientId: '203A' },
    { id: '2', type: 'urgent', title: 'TA alta - 201B', message: 'Tensión arterial 180/110. Valorar medicación.', timestamp: new Date(Date.now() - 3600000).toISOString(), isRead: false, patientId: '201B' },
    { id: '3', type: 'new', title: 'Resultados analítica - 205C', message: 'Disponibles resultados de analítica completa.', timestamp: new Date(Date.now() - 7200000).toISOString(), isRead: false, patientId: '205C' },
    { id: '4', type: 'normal', title: 'Soporte ha respondido', message: 'El equipo de desarrollo ha contestado a tu feedback sobre el error de exportación.', timestamp: new Date(Date.now() - 86400000).toISOString(), isRead: false }
];

export default function AvisosScreen() {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
    const [filter, setFilter] = useState<'all' | 'urgent' | 'new'>('all');

    const markAsRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    };

    const filteredNotifications = notifications.filter(n => {
        if (filter === 'urgent') return n.type === 'urgent';
        if (filter === 'new') return !n.isRead;
        return true;
    });

    const urgentCount = notifications.filter(n => n.type === 'urgent' && !n.isRead).length;
    const newCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className="bg-black text-white font-display min-h-screen flex flex-col max-w-md mx-auto">
            <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/10">
                <div className="flex items-center justify-between p-4">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-white/10">
                        <span className="material-symbols-outlined text-[24px]">arrow_back</span>
                    </button>
                    <h1 className="text-lg font-bold">Avisos</h1>
                    <button onClick={markAllAsRead} className="text-xs text-primary font-medium">
                        Marcar todo
                    </button>
                </div>

                {/* Filters */}
                <div className="flex gap-2 px-4 pb-3">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === 'all' ? 'bg-primary text-white' : 'bg-white/10 text-gray-400'}`}
                    >
                        Todos ({notifications.length})
                    </button>
                    <button
                        onClick={() => setFilter('urgent')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${filter === 'urgent' ? 'bg-red-500 text-white' : 'bg-white/10 text-gray-400'}`}
                    >
                        <span>Urgentes</span>
                        {urgentCount > 0 && <span className="bg-white/30 px-1.5 rounded-full text-[10px]">{urgentCount}</span>}
                    </button>
                    <button
                        onClick={() => setFilter('new')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${filter === 'new' ? 'bg-orange-500 text-white' : 'bg-white/10 text-gray-400'}`}
                    >
                        <span>Nuevos</span>
                        {newCount > 0 && <span className="bg-white/30 px-1.5 rounded-full text-[10px]">{newCount}</span>}
                    </button>
                </div>
            </header>

            <main className="flex-1 p-4 space-y-2 pb-20">
                {filteredNotifications.length === 0 ? (
                    <div className="text-center py-12">
                        <span className="material-symbols-outlined text-gray-600 text-[64px]">notifications_off</span>
                        <p className="text-gray-400 mt-4">No hay avisos</p>
                    </div>
                ) : (
                    filteredNotifications.map(notification => (
                        <div
                            key={notification.id}
                            onClick={() => markAsRead(notification.id)}
                            className={`p-4 rounded-xl border transition-all cursor-pointer active:scale-[0.98] ${notification.isRead
                                ? 'bg-[#1C1C1E] border-white/10 opacity-60'
                                : notification.type === 'urgent'
                                    ? 'bg-red-500/10 border-red-500/30'
                                    : 'bg-blue-500/10 border-blue-500/30'
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${notification.type === 'urgent' ? 'bg-red-500' : 'bg-orange-500'}`}></div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <h3 className="font-bold text-sm truncate">{notification.title}</h3>
                                        <span className="text-[10px] text-gray-500 shrink-0">
                                            {new Date(notification.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400 leading-relaxed">{notification.message}</p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </main>
        </div>
    );
}
