import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import Sidebar  from './components/Sidebar';
import Header   from './components/Header';
import Toaster  from './components/Toaster';
import ChatBot  from './components/ChatBot';
import { socket } from './socket';
import { toast } from './hooks/useToast';
import { LanguageProvider } from './i18n/LanguageContext';

import Dashboard         from './pages/Dashboard';
import Hospitals         from './pages/Hospitals';
import Responders        from './pages/Responders';
import Analytics         from './pages/Analytics';
import TriageDemo        from './pages/TriageDemo';
import Earnings          from './pages/Earnings';
import Training          from './pages/Training';
import Notifications     from './pages/Notifications';
import RegisterResponder from './pages/RegisterResponder';
import AuditLog          from './pages/AuditLog';
import Settings          from './pages/Settings';
import EmergencyHistory  from './pages/EmergencyHistory';
import PatientView       from './pages/PatientView';

const TYPE_EMOJI = { cardiac: '❤️', accident: '🚗', delivery: '👶', general: '🏥' };

function SocketListener() {
  const qc = useQueryClient();

  useEffect(() => {
    function onCreated(em) {
      toast(`🆘 New ${em.type} emergency in ${em.village}`, 'sos', 6000);
      qc.invalidateQueries({ queryKey: ['emergencies-active'] });
      qc.invalidateQueries({ queryKey: ['emergencies-all'] });
      qc.invalidateQueries({ queryKey: ['active'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
    }

    function onUpdated(em) {
      if (em.status === 'matched') {
        toast(`🚗 ${em.responder_name} matched → ${em.village} (ETA ${em.eta_minutes}m)`, 'success');
      } else if (em.status === 'done') {
        toast(`✅ Emergency resolved in ${em.village}`, 'success');
      } else if (em.status === 'en_route') {
        toast(`🏃 Responder en route to ${em.village}`, 'info');
      }
      qc.invalidateQueries({ queryKey: ['emergencies-active'] });
      qc.invalidateQueries({ queryKey: ['emergencies-all'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
      qc.invalidateQueries({ queryKey: ['active'] });
    }

    function onEscalationFailed(data) {
      toast(`⚠️ No responders found for ${data.village} (radius ${data.radius}km)`, 'warning', 8000);
    }

    function onNotification(n) {
      if (n.type === 'ride_completed') {
        toast(`💰 ${n.message}`, 'success');
        qc.invalidateQueries({ queryKey: ['earnings-rides'] });
        qc.invalidateQueries({ queryKey: ['earnings-summary'] });
      }
      qc.invalidateQueries({ queryKey: ['notifications'] });
    }

    function onHospitalBeds(data) {
      qc.invalidateQueries({ queryKey: ['hospitals'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
    }

    socket.on('emergency:created',          onCreated);
    socket.on('emergency:updated',          onUpdated);
    socket.on('emergency:escalation_failed', onEscalationFailed);
    socket.on('notification:new',           onNotification);
    socket.on('hospital:beds_updated',      onHospitalBeds);

    return () => {
      socket.off('emergency:created',          onCreated);
      socket.off('emergency:updated',          onUpdated);
      socket.off('emergency:escalation_failed', onEscalationFailed);
      socket.off('notification:new',           onNotification);
      socket.off('hospital:beds_updated',      onHospitalBeds);
    };
  }, [qc]);

  return null;
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <BrowserRouter>
      <LanguageProvider>
      <SocketListener />
      <Toaster />
      <ChatBot />

      <div className="app-shell">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {sidebarOpen && (
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        <div className="main-area">
          <Header onMenuClick={() => setSidebarOpen((o) => !o)} />
          <main className="page-content">
            <Routes>
              <Route path="/"              element={<Dashboard />} />
              <Route path="/hospitals"     element={<Hospitals />} />
              <Route path="/responders"    element={<Responders />} />
              <Route path="/analytics"     element={<Analytics />} />
              <Route path="/triage"        element={<TriageDemo />} />
              <Route path="/earnings"      element={<Earnings />} />
              <Route path="/training"      element={<Training />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/register"      element={<RegisterResponder />} />
              <Route path="/audit"         element={<AuditLog />} />
              <Route path="/settings"      element={<Settings />} />
              <Route path="/history"       element={<EmergencyHistory />} />
              <Route path="/patient/:id"   element={<PatientView />} />
              <Route path="*"              element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
      </LanguageProvider>
    </BrowserRouter>
  );
}
