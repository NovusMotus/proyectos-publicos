import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface PendingTask {
    id: string;
    priority: 'urgent' | 'medium';
    title: string;
    description: string;
    patientId: string;
    patientName: string;
    createdAt: string;
    isCompleted: boolean;
}

// Mock data
const MOCK_TASKS: PendingTask[] = [
    { id: '1', priority: 'urgent', title: 'Administrar insulin', description: 'Glucemia 45 mg/dL. Revisar protocolo hipoglucemia.', patientId: '203A', patientName: 'J.M.', createdAt: new Date().toISOString(), isCompleted: false },
    { id: '2', priority: 'urgent', title: 'Revisar TA', description: 'TA 180/110. Valorar medicación antihipertensiva.', patientId: '201B', patientName: 'A.G.', createdAt: new Date(Date.now() - 1800000).toISOString(), isCompleted: false },
    { id: '3', priority: 'medium', title: 'Cambiar vía periférica', description: 'Vía con más de 72h. Programar cambio.', patientId: '204B', patientName: 'M.R.', createdAt: new Date(Date.now() - 3600000).toISOString(), isCompleted: false },
    { id: '4', priority: 'medium', title: 'Solicitar radiología', description: 'Pendiente RX tórax control.', patientId: '205C', patientName: 'L.P.', createdAt: new Date(Date.now() - 7200000).toISOString(), isCompleted: false }
];

export default function PendientesScreen() {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState<PendingTask[]>(MOCK_TASKS);
    const [filter, setFilter] = useState<'all' | 'urgent' | 'medium'>('all');

    const toggleComplete = (id: string) => {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, isCompleted: !t.isCompleted } : t));
    };

    const filteredTasks = tasks.filter(t => {
        if (t.isCompleted) return false; // Don't show completed
        if (filter === 'urgent') return t.priority === 'urgent';
        if (filter === 'medium') return t.priority === 'medium';
        return true;
    });

    const urgentCount = tasks.filter(t => !t.isCompleted && t.priority === 'urgent').length;
    const mediumCount = tasks.filter(t => !t.isCompleted && t.priority === 'medium').length;

    return (
        <div className="bg-black text-white font-display min-h-screen flex flex-col max-w-md mx-auto">
            <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/10">
                <div className="flex items-center justify-between p-4">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-white/10">
                        <span className="material-symbols-outlined text-[24px]">arrow_back</span>
                    </button>
                    <h1 className="text-lg font-bold">Pendientes</h1>
                    <div className="w-10"></div>
                </div>

                {/* Filters */}
                <div className="flex gap-2 px-4 pb-3">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === 'all' ? 'bg-primary text-white' : 'bg-white/10 text-gray-400'
                            }`}
                    >
                        Todos ({urgentCount + mediumCount})
                    </button>
                    <button
                        onClick={() => setFilter('urgent')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${filter === 'urgent' ? 'bg-red-500 text-white' : 'bg-white/10 text-gray-400'
                            }`}
                    >
                        <span>Urgentes</span>
                        {urgentCount > 0 && <span className="bg-white/30 px-1.5 rounded-full text-[10px]">{urgentCount}</span>}
                    </button>
                    <button
                        onClick={() => setFilter('medium')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${filter === 'medium' ? 'bg-gray-500 text-white' : 'bg-white/10 text-gray-400'
                            }`}
                    >
                        <span>Medias</span>
                        {mediumCount > 0 && <span className="bg-white/30 px-1.5 rounded-full text-[10px]">{mediumCount}</span>}
                    </button>
                </div>
            </header>

            <main className="flex-1 p-4 space-y-2 pb-20">
                {filteredTasks.length === 0 ? (
                    <div className="text-center py-12">
                        <span className="material-symbols-outlined text-gray-600 text-[64px]">task_alt</span>
                        <p className="text-gray-400 mt-4">No hay tareas pendientes</p>
                    </div>
                ) : (
                    filteredTasks.map(task => (
                        <div
                            key={task.id}
                            className={`p-4 rounded-xl border transition-all ${task.priority === 'urgent'
                                    ? 'bg-red-500/10 border-red-500/30'
                                    : 'bg-gray-500/10 border-gray-500/30'
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                <button
                                    onClick={() => toggleComplete(task.id)}
                                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${task.isCompleted
                                            ? 'bg-green-500 border-green-500'
                                            : task.priority === 'urgent'
                                                ? 'border-red-500 hover:bg-red-500/20'
                                                : 'border-gray-500 hover:bg-gray-500/20'
                                        }`}
                                >
                                    {task.isCompleted && (
                                        <span className="material-symbols-outlined text-white text-[16px]">check</span>
                                    )}
                                </button>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-sm">{task.title}</h3>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${task.priority === 'urgent'
                                                    ? 'bg-red-500/20 text-red-400'
                                                    : 'bg-gray-500/20 text-gray-400'
                                                }`}>
                                                {task.priority === 'urgent' ? 'URGENTE' : 'MEDIA'}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-gray-500 shrink-0">
                                            {new Date(task.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400 mb-2">{task.description}</p>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-lg">
                                            <span className="material-symbols-outlined text-[14px] text-gray-400">person</span>
                                            <span className="text-[10px] font-medium">{task.patientName}</span>
                                        </div>
                                        <div className="bg-white/10 px-2 py-1 rounded-lg text-[10px] font-medium">
                                            {task.patientId}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </main>
        </div>
    );
}
