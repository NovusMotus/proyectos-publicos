import { useState } from 'react';
import { TubeSelection } from '../../types/actions';

interface TubeSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (tubes: TubeSelection, notes?: string) => void;
}

const tubeTypes = [
    { key: 'malvaGrande', label: 'Tubo Malva Grande', color: 'bg-purple-500' },
    { key: 'malvaPequeno', label: 'Tubo Malva Pequeño', color: 'bg-purple-400' },
    { key: 'rojoGrande', label: 'Tubo Rojo Grande', color: 'bg-red-500' },
    { key: 'rojoPequeno', label: 'Tubo Rojo Pequeño', color: 'bg-red-400' },
    { key: 'verde', label: 'Tubo Verde', color: 'bg-green-500' },
    { key: 'amarillo', label: 'Tubo Amarillo', color: 'bg-yellow-500' },
    { key: 'azulon', label: 'Tubo Azulón', color: 'bg-blue-600' },
    { key: 'gasesVenosos', label: 'Gases Venosos', color: 'bg-indigo-500' },
    { key: 'gasesArteriales', label: 'Gases Arteriales', color: 'bg-red-600' },
    { key: 'tuboConico', label: 'Tubo Cónico', color: 'bg-gray-400' },
    { key: 'urocultivo', label: 'Urocultivo', color: 'bg-amber-500' },
] as const;

export default function TubeSelectionModal({ isOpen, onClose, onSubmit }: TubeSelectionModalProps) {
    const [tubes, setTubes] = useState<TubeSelection>({
        malvaGrande: 0,
        malvaPequeno: 0,
        rojoGrande: 0,
        rojoPequeno: 0,
        verde: 0,
        amarillo: 0,
        azulon: 0,
        gasesVenosos: 0,
        gasesArteriales: 0,
        tuboConico: 0,
        urocultivo: 0,
    });

    const [notes, setNotes] = useState('');

    const updateTube = (key: keyof TubeSelection, delta: number) => {
        setTubes(prev => ({
            ...prev,
            [key]: Math.max(0, prev[key] + delta)
        }));
    };

    const handleSubmit = () => {
        onSubmit(tubes, notes);
        // Reset
        setTubes({
            malvaGrande: 0,
            malvaPequeno: 0,
            rojoGrande: 0,
            rojoPequeno: 0,
            verde: 0,
            amarillo: 0,
            azulon: 0,
            gasesVenosos: 0,
            gasesArteriales: 0,
            tuboConico: 0,
            urocultivo: 0,
        });
        setNotes('');
    };

    if (!isOpen) return null;

    const totalTubes = Object.values(tubes).reduce((sum, count) => sum + count, 0);

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-[2px] pb-6">
            <div className="w-full max-w-sm mx-4 bg-[#1E1E1E] ring-1 ring-white/10 rounded-3xl p-5 shadow-2xl relative max-h-[80vh] overflow-y-auto">
                {/* Handle bar */}
                <div className="w-full flex justify-center mb-4">
                    <div className="w-10 h-1 bg-gray-600/60 rounded-full"></div>
                </div>

                <h2 className="text-lg font-bold text-white mb-1 text-center">Seleccionar Tubos</h2>
                <p className="text-sm text-gray-400 text-center mb-4">Analítica extraída</p>

                {/* Tube selection grid */}
                <div className="space-y-3 mb-4">
                    {tubeTypes.map(({ key, label, color }) => (
                        <div key={key} className="flex items-center justify-between bg-[#2C2C2E] rounded-xl p-3">
                            <div className="flex items-center gap-3 flex-1">
                                <div className={`w-3 h-8 ${color} rounded-full`}></div>
                                <span className="text-sm text-white font-medium">{label}</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => updateTube(key as keyof TubeSelection, -1)}
                                    disabled={tubes[key as keyof TubeSelection] === 0}
                                    className="w-8 h-8 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center hover:bg-red-600/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                >
                                    <span className="material-icons-round text-red-400 text-lg">remove</span>
                                </button>

                                <span className="w-8 text-center text-white font-mono font-bold">
                                    {tubes[key as keyof TubeSelection]}
                                </span>

                                <button
                                    onClick={() => updateTube(key as keyof TubeSelection, 1)}
                                    className="w-8 h-8 rounded-full bg-green-600/20 border border-green-500/30 flex items-center justify-center hover:bg-green-600/30 transition-all"
                                >
                                    <span className="material-icons-round text-green-400 text-lg">add</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Optional notes */}
                <div className="mb-4">
                    <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-2">
                        Notas adicionales (opcional)
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Observaciones sobre la extracción..."
                        className="w-full bg-[#2C2C2E] text-white rounded-xl p-3 text-sm border border-gray-700 focus:border-primary focus:outline-none resize-none"
                        rows={3}
                    />
                </div>

                {/* Total count */}
                {totalTubes > 0 && (
                    <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 mb-4">
                        <p className="text-sm text-primary font-bold text-center">
                            Total: {totalTubes} tubo{totalTubes !== 1 ? 's' : ''} seleccionado{totalTubes !== 1 ? 's' : ''}
                        </p>
                    </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 h-12 bg-[#2C2C2E] border border-gray-700 text-gray-300 rounded-xl font-bold hover:bg-gray-700/50 transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={totalTubes === 0}
                        className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Registrar
                    </button>
                </div>
            </div>
        </div>
    );
}
