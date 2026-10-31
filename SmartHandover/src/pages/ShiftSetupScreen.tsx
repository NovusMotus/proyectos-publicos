import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
// Local images
import zoneNorth from '../assets/images/zone_north.jpg';
import zoneSouth from '../assets/images/zone_south.jpg';
import zoneUci from '../assets/images/zone_uci.jpg';
import zoneEr from '../assets/images/zone_er.jpg';

// --- Types & Mock Data ---
type Bed = { id: string; initials: string; specialty: string; isIsolation?: boolean };
type Room = { id: string; beds: Bed[] };
type Zone = { id: string; name: string; patientsCount: number; image: string; rooms: Room[] };
type Hallway = { id: string; name: string; roomIds: string[] };

// TODO: Añadir buscador de camas de TODO EL HOSPITAL
// Componente SearchBar que permita buscar por número de cama (ej: "203A", "U01")
// y mostrar paciente + ubicación independiente de la zona actual
// Ejemplo: GET /api/hospital/search?bed=203A → { bedId: '203A', patient: {...}, zone: 'north', room: '203' }

const MOCK_ZONES: Record<string, Zone> = {
    north: {
        id: 'north', name: 'Planta 2 - Norte', patientsCount: 12, image: zoneNorth,
        rooms: [
            { id: '201', beds: [{ id: '201A', initials: 'J.M.', specialty: 'Trauma' }, { id: '201B', initials: 'A.G.', specialty: 'Trauma' }] },
            { id: '202', beds: [{ id: '202A', initials: 'M.R.', specialty: 'Trauma', isIsolation: true }] },
            { id: '203', beds: [{ id: '203A', initials: 'L.P.', specialty: 'Cirugía' }, { id: '203B', initials: 'K.O.', specialty: 'Cirugía' }] },
            { id: '204', beds: [{ id: '204A', initials: 'R.T.', specialty: 'Medicina' }] }
        ]
    },
    south: {
        id: 'south', name: 'Planta 2 - Sur', patientsCount: 8, image: zoneSouth,
        rooms: [
            { id: '210', beds: [{ id: '210A', initials: 'S.S.', specialty: 'Digestivo' }, { id: '210B', initials: 'D.D.', specialty: 'Digestivo' }] },
            { id: '211', beds: [{ id: '211A', initials: 'F.F.', specialty: 'Digestivo' }] }
        ]
    },
    uci: {
        id: 'uci', name: 'UCI General', patientsCount: 5, image: zoneUci,
        rooms: [
            { id: 'U01', beds: [{ id: 'U01', initials: 'CRIT-1', specialty: 'UCI', isIsolation: true }] },
            { id: 'U02', beds: [{ id: 'U02', initials: 'CRIT-2', specialty: 'UCI' }] },
            { id: 'U03', beds: [{ id: 'U03', initials: 'CRIT-3', specialty: 'UCI' }] }
        ]
    }
};

// Predefined hallway groups (admin-configured)
const MOCK_HALLWAYS: Record<string, Hallway[]> = {
    north: [
        { id: 'pasillo-a', name: 'Pasillo A (201-202)', roomIds: ['201', '202'] },
        { id: 'pasillo-b', name: 'Pasillo B (203-204)', roomIds: ['203', '204'] }
    ],
    south: [
        { id: 'pasillo-c', name: 'Pasillo C (210-211)', roomIds: ['210', '211'] }
    ],
    uci: [
        { id: 'pasillo-uci', name: 'Pasillo UCI (Todas)', roomIds: ['U01', 'U02', 'U03'] }
    ]
};

export default function ShiftSetupScreen() {
    const navigate = useNavigate();
    const [activeZone, setActiveZone] = useState<string>('north');
    const [mode, setMode] = useState<'rooms' | 'individual' | 'hallway'>('individual');
    const [selectedBeds, setSelectedBeds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [searchResults, setSearchResults] = useState<Array<{ bed: Bed, room: Room, zone: Zone }>>([]);
    const [showCrossZoneModal, setShowCrossZoneModal] = useState(false);
    const [dontAskAgain, setDontAskAgain] = useState(false);

    // Derived Data
    const currentZoneData = MOCK_ZONES[activeZone];
    const allBedIdsInZone = useMemo(() =>
        currentZoneData.rooms.flatMap(r => r.beds.map(b => b.id)),
        [currentZoneData]);

    const isAllSelected = allBedIdsInZone.length > 0 && allBedIdsInZone.every(id => selectedBeds.includes(id));

    // Handlers
    const handleZoneChange = (zoneId: string) => {
        setActiveZone(zoneId);
        // NO resetear selección - mantener pacientes de otras zonas
    };

    const toggleBed = (bedId: string) => {
        setSelectedBeds(prev => prev.includes(bedId) ? prev.filter(id => id !== bedId) : [...prev, bedId]);
    };

    // Hospital-wide bed search
    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        const results: Array<{ bed: Bed, room: Room, zone: Zone }> = [];
        const searchLower = query.toLowerCase();

        // Search across ALL zones
        Object.values(MOCK_ZONES).forEach(zone => {
            zone.rooms.forEach(room => {
                room.beds.forEach(bed => {
                    if (bed.id.toLowerCase().includes(searchLower) ||
                        bed.initials.toLowerCase().includes(searchLower)) {
                        results.push({ bed, room, zone });
                    }
                });
            });
        });

        setSearchResults(results);
    };

    // Check if disclaimer is accepted
    const checkDisclaimerAccepted = (): boolean => {
        try {
            const stored = localStorage.getItem('smarthandover_disclaimer_accepted');
            if (!stored) return false;
            const data = JSON.parse(stored);
            if (data.disclaimerVersion !== '1.0') return false;
            return data.accepted;
        } catch (error) {
            return false;
        }
    };

    // Navigate to next screen based on disclaimer status
    const navigateToNextScreen = () => {
        // Check if cross-zone warning should be shown
        const skipWarning = localStorage.getItem('skip_cross_zone_warning') === 'true';

        if (!skipWarning) {
            // Detect if beds are from multiple zones
            const zonesUsed = new Set<string>();
            selectedBeds.forEach(bedId => {
                Object.values(MOCK_ZONES).forEach(zone => {
                    zone.rooms.forEach(room => {
                        if (room.beds.some(bed => bed.id === bedId)) {
                            zonesUsed.add(zone.name);
                        }
                    });
                });
            });

            if (zonesUsed.size > 1) {
                // Show confirmation modal
                setShowCrossZoneModal(true);
                return;
            }
        }

        proceedToNext();
    };

    const proceedToNext = () => {
        const isAccepted = checkDisclaimerAccepted();
        if (isAccepted) {
            navigate('/welcome-count');
        } else {
            navigate('/welcome-legal');
        }
    };

    const handleCrossZoneConfirm = () => {
        if (dontAskAgain) {
            localStorage.setItem('skip_cross_zone_warning', 'true');
        }
        setShowCrossZoneModal(false);
        proceedToNext();
    };

    const toggleRoom = (room: Room) => {
        const roomBedIds = room.beds.map(b => b.id);
        const allRoomSelected = roomBedIds.every(id => selectedBeds.includes(id));

        if (allRoomSelected) {
            // Deselect all in room
            setSelectedBeds(prev => prev.filter(id => !roomBedIds.includes(id)));
        } else {
            // Select all in room
            const newIds = roomBedIds.filter(id => !selectedBeds.includes(id));
            setSelectedBeds(prev => [...prev, ...newIds]);
        }
    };

    const handleSelectAll = () => {
        if (isAllSelected) {
            setSelectedBeds([]);
        } else {
            setSelectedBeds(allBedIdsInZone);
        }
    };

    // Components
    const BedItem = ({ bed, isChecked }: { bed: Bed, isChecked: boolean }) => (
        <label className={`flex items-center p-3.5 rounded-xl border cursor-pointer relative overflow-hidden transition-all active:scale-[0.98] ${isChecked ? 'bg-[#1f2937] border-primary' : 'bg-[#111827] border-[#374151] hover:bg-[#1f2937]'}`}>
            <input type="checkbox" className="sr-only peer" checked={isChecked} onChange={() => toggleBed(bed.id)} />
            <div className={`flex items-center justify-center size-10 rounded-full mr-4 shrink-0 transition-colors ${isChecked ? 'bg-primary/20 text-primary' : 'bg-white/5 text-gray-500'}`}>
                <span className="font-bold text-sm">{bed.id}</span>
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className={`font-bold truncate ${isChecked ? 'text-white' : 'text-gray-400'}`}>
                        {bed.initials}
                    </p>
                    {bed.isIsolation && <span className="bg-orange-900/40 text-orange-400 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">Aislamiento</span>}
                </div>
                <p className="text-gray-500 text-xs truncate mt-0.5">{bed.specialty}</p>
            </div>
            <div className={`size-6 rounded-full flex items-center justify-center transition-colors ${isChecked ? 'bg-primary text-white shadow-sm' : 'border-2 border-[#374151]'}`}>
                {isChecked && <span className="material-symbols-outlined text-[16px]">check</span>}
            </div>
        </label>
    );

    const RoomItem = ({ room }: { room: Room }) => {
        const roomBedIds = room.beds.map(b => b.id);
        const selectedCount = roomBedIds.filter(id => selectedBeds.includes(id)).length;
        const isFullySelected = selectedCount === roomBedIds.length;
        const isPartiallySelected = selectedCount > 0 && !isFullySelected;

        return (
            <div
                onClick={() => toggleRoom(room)}
                className={`flex flex-col p-4 rounded-xl border cursor-pointer transition-all active:scale-[0.98] ${isFullySelected ? 'bg-[#1f2937] border-primary' : 'bg-[#111827] border-[#374151] hover:bg-[#1f2937]'}`}
            >
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-gray-400">meeting_room</span>
                        <span className={`font-bold text-lg ${isFullySelected ? 'text-white' : 'text-gray-300'}`}>Habitación {room.id}</span>
                    </div>
                    <div className={`size-6 rounded-full flex items-center justify-center transition-colors ${isFullySelected ? 'bg-primary text-white' : (isPartiallySelected ? 'bg-primary/50 text-white' : 'border-2 border-[#374151]')}`}>
                        {isFullySelected && <span className="material-symbols-outlined text-[16px]">check</span>}
                        {isPartiallySelected && <span className="material-symbols-outlined text-[16px]">remove</span>}
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 pl-9">
                    {room.beds.map(bed => (
                        <span key={bed.id} className={`text-xs px-2 py-1 rounded border ${selectedBeds.includes(bed.id) ? 'bg-primary/20 border-primary/30 text-primary' : 'bg-black/20 border-white/10 text-gray-500'}`}>
                            {bed.id}
                        </span>
                    ))}
                </div>
            </div>
        );
    };

    const HallwayItem = ({ hallway }: { hallway: Hallway }) => {
        const hallwayRoomBedIds = hallway.roomIds.flatMap(roomId => {
            const room = currentZoneData.rooms.find(r => r.id === roomId);
            return room ? room.beds.map(b => b.id) : [];
        });
        const selectedCount = hallwayRoomBedIds.filter(id => selectedBeds.includes(id)).length;
        const isFullySelected = selectedCount === hallwayRoomBedIds.length;
        const isPartiallySelected = selectedCount > 0 && !isFullySelected;

        const toggleHallway = () => {
            if (isFullySelected) {
                setSelectedBeds(prev => prev.filter(id => !hallwayRoomBedIds.includes(id)));
            } else {
                const newIds = hallwayRoomBedIds.filter(id => !selectedBeds.includes(id));
                setSelectedBeds(prev => [...prev, ...newIds]);
            }
        };

        return (
            <div
                onClick={toggleHallway}
                className={`flex flex-col p-4 rounded-xl border cursor-pointer transition-all active:scale-[0.98] ${isFullySelected ? 'bg-[#1f2937] border-primary' : 'bg-[#111827] border-[#374151] hover:bg-[#1f2937]'}`}
            >
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-gray-400">route</span>
                        <span className={`font-bold text-lg ${isFullySelected ? 'text-white' : 'text-gray-300'}`}>{hallway.name}</span>
                    </div>
                    <div className={`size-6 rounded-full flex items-center justify-center transition-colors ${isFullySelected ? 'bg-primary text-white' : (isPartiallySelected ? 'bg-primary/50 text-white' : 'border-2 border-[#374151]')}`}>
                        {isFullySelected && <span className="material-symbols-outlined text-[16px]">check</span>}
                        {isPartiallySelected && <span className="material-symbols-outlined text-[16px]">remove</span>}
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 pl-9">
                    <span className="text-xs text-gray-400">{hallwayRoomBedIds.length} camas en {hallway.roomIds.length} habitaciones</span>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-black text-white font-display antialiased relative flex h-full min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto shadow-2xl">
            <header className="sticky top-0 z-50 flex items-center justify-between bg-black/90 p-4 backdrop-blur-md border-b border-white/10">
                <button onClick={() => navigate(-1)} className="flex items-center justify-center p-2 -ml-2 rounded-full text-white hover:bg-white/10 transition-colors">
                    <span className="material-symbols-outlined text-[24px]">arrow_back</span>
                </button>
                <h1 className="text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center">Setup de Turno</h1>
                <button
                    onClick={() => {
                        setSelectedBeds(allBedIdsInZone);
                        useAppStore.getState().setSelectedBedsCount(allBedIdsInZone.length);
                        navigateToNextScreen();
                    }}
                    className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-xl shadow-lg shadow-blue-500/20 transition-transform active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-blue-500/30"
                >
                    <span className="font-bold text-base">Todos</span>
                    <div className="flex items-center gap-1.5 bg-white/20 px-2 py-0.5 rounded-lg backdrop-blur-sm">
                        <span className="material-symbols-outlined text-[18px]">person</span>
                        <span className="font-bold text-sm">({allBedIdsInZone.length})</span>
                    </div>
                </button>
            </header>

            <main className="flex-1 pb-32">
                <section className="mt-4">
                    <div className="px-4 pb-3 pt-2">
                        <h2 className="text-white text-xl font-bold leading-tight">Selección de Zona Física</h2>
                        <p className="text-gray-400 text-sm font-medium mt-1">¿Dónde estarás trabajando hoy?</p>
                    </div>
                    <div className="flex overflow-y-auto hide-scrollbar snap-x snap-mandatory px-4 pb-4 gap-3">
                        {Object.values(MOCK_ZONES).map(zone => {
                            const isActive = activeZone === zone.id;
                            return (
                                <div
                                    key={zone.id}
                                    onClick={() => handleZoneChange(zone.id)}
                                    className={`snap-center shrink-0 flex flex-col gap-3 rounded-2xl min-w-[160px] w-[160px] cursor-pointer transition-all ${isActive ? 'ring-2 ring-primary bg-[#1f2937]' : 'bg-[#111827] border border-white/5 opacity-70 hover:opacity-100'}`}
                                >
                                    <div className="w-full h-24 bg-cover bg-center rounded-t-2xl relative" style={{ backgroundImage: `url("${zone.image}")` }}>
                                        {isActive && (
                                            <div className="absolute inset-0 bg-primary/40 rounded-t-2xl flex items-center justify-center animate-in fade-in">
                                                <span className="material-symbols-outlined text-white text-[32px] drop-shadow-md">check_circle</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-3 pt-0">
                                        <p className="text-white text-base font-bold leading-tight">{zone.name}</p>
                                        <div className={`flex items-center gap-1 mt-1 ${isActive ? 'text-primary' : 'text-gray-500'}`}>
                                            <span className="material-symbols-outlined text-[16px]">group</span>
                                            <p className="text-xs font-semibold">{zone.patientsCount} Pacientes</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <div className="h-4 w-full bg-black/50 border-y border-white/5 my-2"></div>

                <section className="mt-4 px-4">
                    <div className="pb-3 pt-2">
                        <h2 className="text-white text-xl font-bold leading-tight">Selección de Pacientes</h2>
                        <p className="text-gray-400 text-sm font-medium mt-1">Busca específicos o selecciona por grupos</p>
                    </div>

                    {/* Hospital-Wide Bed Search */}
                    <div className="mb-4">
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-[20px]">
                                search
                            </span>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                placeholder="Buscar cama en todo el hospital (ej: 203A, U01)..."
                                className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => handleSearch('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[18px]">close</span>
                                </button>
                            )}
                        </div>

                        {/* Search Results */}
                        {searchResults.length > 0 && (
                            <div className="mt-2 max-h-48 overflow-y-auto space-y-2 bg-[#111827] rounded-xl p-2 border border-white/10">
                                <p className="text-xs text-gray-400 font-medium px-1">{searchResults.length} encontrado(s)</p>
                                {searchResults.map((result, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => toggleBed(result.bed.id)}
                                        className="flex items-center justify-between p-2 bg-[#1C1C1E] rounded-lg border border-white/10 hover:bg-[#1f2937] cursor-pointer transition-all active:scale-[0.98]"
                                    >
                                        <div className="flex items-center gap-2 flex-1">
                                            <div className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 text-[10px] font-bold ${selectedBeds.includes(result.bed.id) ? 'bg-primary text-white' : 'bg-primary/20 text-primary'
                                                }`}>
                                                {result.bed.id}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <p className="font-bold text-white text-xs">{result.bed.initials}</p>
                                                    {result.bed.isIsolation && <span className="bg-orange-900/40 text-orange-400 text-[8px] px-1 py-0.5 rounded font-bold">AISL</span>}
                                                </div>
                                                <p className="text-gray-400 text-[10px] truncate">{result.bed.specialty}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="text-right">
                                                <p className="text-[10px] text-gray-400">Hab. {result.room.id}</p>
                                                <p className="text-[9px] text-gray-500">{result.zone.name}</p>
                                            </div>
                                            {selectedBeds.includes(result.bed.id) && (
                                                <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-[14px]">check</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {searchQuery && searchResults.length === 0 && (
                            <div className="mt-2 p-3 bg-[#111827] rounded-xl border border-white/10 text-center">
                                <span className="material-symbols-outlined text-gray-600 text-[24px]">search_off</span>
                                <p className="text-gray-400 text-xs mt-1">No se encontraron camas</p>
                            </div>
                        )}
                    </div>

                    <div className="flex p-1 bg-[#111827] rounded-xl mb-6 border border-white/5">
                        <label className="flex-1 cursor-pointer">
                            <input className="peer sr-only" name="mode" type="radio" value="individual" checked={mode === 'individual'} onChange={() => setMode('individual')} />
                            <div className="flex items-center justify-center py-2.5 rounded-[0.6rem] text-xs font-medium transition-all duration-200 text-gray-400 peer-checked:bg-primary peer-checked:text-white peer-checked:shadow-sm">
                                <span className="material-symbols-outlined text-[16px] mr-1">person_search</span>
                                Individual
                            </div>
                        </label>
                        <label className="flex-1 cursor-pointer">
                            <input className="peer sr-only" name="mode" type="radio" value="rooms" checked={mode === 'rooms'} onChange={() => setMode('rooms')} />
                            <div className="flex items-center justify-center py-2.5 rounded-[0.6rem] text-xs font-medium transition-all duration-200 text-gray-400 peer-checked:bg-primary peer-checked:text-white peer-checked:shadow-sm">
                                <span className="material-symbols-outlined text-[16px] mr-1">meeting_room</span>
                                Habitaciones
                            </div>
                        </label>
                        <label className="flex-1 cursor-pointer">
                            <input className="peer sr-only" name="mode" type="radio" value="hallway" checked={mode === 'hallway'} onChange={() => setMode('hallway')} />
                            <div className="flex items-center justify-center py-2.5 rounded-[0.6rem] text-xs font-medium transition-all duration-200 text-gray-400 peer-checked:bg-primary peer-checked:text-white peer-checked:shadow-sm">
                                <span className="material-symbols-outlined text-[16px] mr-1">route</span>
                                Pasillo
                            </div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                        <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">
                            {mode === 'individual'
                                ? `Camas (${allBedIdsInZone.length})`
                                : mode === 'rooms'
                                    ? `Habitaciones (${currentZoneData.rooms.length})`
                                    : `Pasillos (${MOCK_HALLWAYS[activeZone]?.length || 0})`
                            }
                        </p>
                        <button
                            onClick={handleSelectAll}
                            className={`text-sm font-bold hover:opacity-80 transition-opacity ${isAllSelected ? 'text-primary' : 'text-gray-400'}`}
                        >
                            {isAllSelected ? 'Deseleccionar Todo' : 'Seleccionar Todo'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {mode === 'individual' ? (
                            currentZoneData.rooms.flatMap(room =>
                                room.beds.map(bed => (
                                    <BedItem key={bed.id} bed={bed} isChecked={selectedBeds.includes(bed.id)} />
                                ))
                            )
                        ) : mode === 'rooms' ? (
                            currentZoneData.rooms.map(room => (
                                <RoomItem key={room.id} room={room} />
                            ))
                        ) : (
                            (MOCK_HALLWAYS[activeZone] || []).map(hallway => (
                                <HallwayItem key={hallway.id} hallway={hallway} />
                            ))
                        )}
                    </div>
                </section>
            </main>

            <footer className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black to-transparent pt-12 max-w-md mx-auto z-40">
                <button
                    onClick={() => {
                        useAppStore.getState().setSelectedBedsCount(selectedBeds.length);
                        navigateToNextScreen();
                    }}
                    disabled={selectedBeds.length === 0}
                    className="w-full h-14 bg-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-between px-6 transition-transform active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-blue-500/30"
                >
                    <span className="font-bold text-lg tracking-tight">Confirmar Turno</span>
                    <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-lg backdrop-blur-sm">
                        <span className="material-symbols-outlined text-[20px]">person</span>
                        <span className="font-bold text-sm">{selectedBeds.length} Pacientes</span>
                    </div>
                </button>
            </footer>

            {/* Cross-Zone Confirmation Modal */}
            {showCrossZoneModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#1C1C1E] rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-white/10 animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center">
                                <span className="material-symbols-outlined text-orange-500 text-[32px]">warning</span>
                            </div>
                            <div>
                                <h3 className="text-white text-lg font-bold mb-2">Selección Multi-Zona</h3>
                                <p className="text-gray-400 text-sm leading-relaxed">
                                    Has seleccionado pacientes de <strong className="text-white">{
                                        (() => {
                                            const zonesUsed = new Set<string>();
                                            selectedBeds.forEach(bedId => {
                                                Object.values(MOCK_ZONES).forEach(zone => {
                                                    zone.rooms.forEach(room => {
                                                        if (room.beds.some(bed => bed.id === bedId)) {
                                                            zonesUsed.add(zone.name);
                                                        }
                                                    });
                                                });
                                            });
                                            return zonesUsed.size;
                                        })()
                                    } áreas físicas diferentes</strong>. ¿Estás seguro de continuar?
                                </p>
                            </div>

                            {/* Don't Ask Again Checkbox */}
                            <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg hover:bg-white/5 transition-colors w-full">
                                <input
                                    type="checkbox"
                                    checked={dontAskAgain}
                                    onChange={(e) => setDontAskAgain(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-0"
                                />
                                <span className="text-gray-400 text-xs">No volver a preguntar</span>
                            </label>

                            {/* Action Buttons */}
                            <div className="flex gap-3 w-full mt-2">
                                <button
                                    onClick={() => {
                                        setShowCrossZoneModal(false);
                                        setDontAskAgain(false);
                                    }}
                                    className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-all active:scale-95"
                                >
                                    No
                                </button>
                                <button
                                    onClick={handleCrossZoneConfirm}
                                    className="flex-1 px-4 py-3 bg-primary hover:bg-blue-600 text-white rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                                >
                                    Sí, continuar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
