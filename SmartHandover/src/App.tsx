import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginScreen from './pages/LoginScreen';
import QRAccessScreen from './pages/QRAccessScreen';
import ShiftSetupScreen from './pages/ShiftSetupScreen';
import ShiftTimeScreen from './pages/ShiftTimeScreen';
import WelcomeLegalScreen from './pages/WelcomeLegalScreen';
import WelcomeCountScreen from './pages/WelcomeCountScreen';
import KardexScreen from './pages/KardexScreen';
import PatientDetailScreen from './pages/PatientDetailScreen';
import CodeBlueScreen from './pages/CodeBlueScreen';
import AudioTranscriptionScreen from './pages/AudioTranscriptionScreen';
import HandoverReviewScreen from './pages/HandoverReviewScreen';
import SbarReviewScreen from './pages/SbarReviewScreen';
import ProfileSettingsScreen from './pages/ProfileSettingsScreen';
import DisclaimerScreen from './pages/DisclaimerScreen';
import CloseShiftScreen from './pages/CloseShiftScreen';
import FeedbackScreen from './pages/FeedbackScreen';
import AvisosScreen from './pages/AvisosScreen';
import PendientesScreen from './pages/PendientesScreen';
import { useAppStore } from './store/useAppStore';

// Protected route wrapper - checks authentication
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
    const currentUser = useAppStore(s => s.currentUser);

    if (!currentUser) {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public Routes */}
                <Route path="/" element={<LoginScreen />} />
                <Route path="/code-blue" element={<CodeBlueScreen />} />
                <Route path="/qr-access" element={<QRAccessScreen />} />

                {/* Protected Routes */}
                <Route path="/shift-setup" element={<ProtectedRoute><ShiftSetupScreen /></ProtectedRoute>} />
                <Route path="/shift-time" element={<ProtectedRoute><ShiftTimeScreen /></ProtectedRoute>} />
                <Route path="/welcome-legal" element={<ProtectedRoute><WelcomeLegalScreen /></ProtectedRoute>} />
                <Route path="/welcome-count" element={<ProtectedRoute><WelcomeCountScreen /></ProtectedRoute>} />
                <Route path="/disclaimer" element={<ProtectedRoute><DisclaimerScreen /></ProtectedRoute>} />
                <Route path="/kardex" element={<ProtectedRoute><KardexScreen /></ProtectedRoute>} />
                <Route path="/patient/:id" element={<ProtectedRoute><PatientDetailScreen /></ProtectedRoute>} />
                <Route path="/audio-transcription" element={<ProtectedRoute><AudioTranscriptionScreen /></ProtectedRoute>} />
                <Route path="/handover-review" element={<ProtectedRoute><HandoverReviewScreen /></ProtectedRoute>} />
                <Route path="/sbar-review" element={<ProtectedRoute><SbarReviewScreen /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><ProfileSettingsScreen /></ProtectedRoute>} />
                <Route path="/close-shift" element={<ProtectedRoute><CloseShiftScreen /></ProtectedRoute>} />
                <Route path="/feedback" element={<ProtectedRoute><FeedbackScreen /></ProtectedRoute>} />
                <Route path="/avisos" element={<ProtectedRoute><AvisosScreen /></ProtectedRoute>} />
                <Route path="/pendientes" element={<ProtectedRoute><PendientesScreen /></ProtectedRoute>} />
            </Routes>
        </BrowserRouter>
    );
}
