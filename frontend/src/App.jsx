import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import DashboardOverview from './components/DashboardOverview';
import CloudinaryExplorer from './components/CloudinaryExplorer';
import AICaptionStudio from './components/AICaptionStudio';
import HistoryLog from './components/HistoryLog';
import ClientApprovalPortal from './components/ClientApprovalPortal';
import SettingsModal from './components/SettingsModal';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('approval'); // Default to Client Approval workflow!
  const [schedule, setSchedule] = useState(null);
  const [mediaList, setMediaList] = useState([]);
  const [history, setHistory] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [selectedPreviewMedia, setSelectedPreviewMedia] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = async () => {
    try {
      const [schedRes, mediaRes, histRes, settRes, draftsRes] = await Promise.all([
        fetch('/api/posts/schedule'),
        fetch('/api/media'),
        fetch('/api/posts/history'),
        fetch('/api/settings'),
        fetch('/api/drafts')
      ]);

      const [schedData, mediaData, histData, settData, draftsData] = await Promise.all([
        schedRes.json(),
        mediaRes.json(),
        histRes.json(),
        settRes.json(),
        draftsRes.json()
      ]);

      setSchedule(schedData);
      setMediaList(mediaData.resources || []);
      setHistory(histData.history || []);
      setSettings(settData);
      setDrafts(draftsData.drafts || []);

      if (mediaData.resources?.length > 0 && !selectedPreviewMedia) {
        setSelectedPreviewMedia(mediaData.resources[0]);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const pendingCount = drafts.filter(d => d.status === 'PENDING_APPROVAL').length;

  const handleTriggerSlot = async (slotTheme) => {
    setIsPublishing(true);
    try {
      const res = await fetch('/api/posts/trigger-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotTheme })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Créneau ${slotTheme.toUpperCase()} publié avec succès ! Média purgé de Cloudinary.`);
        await fetchData();
      } else {
        showToast(data.message || 'Erreur lors de la publication', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleTriggerMediaPost = async (publicId) => {
    setIsPublishing(true);
    try {
      const res = await fetch('/api/posts/trigger-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedMediaId: publicId, slotTheme: 'motivation' })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Média publié avec succès sur Instagram & Pinterest et supprimé de Cloudinary !');
        await fetchData();
      } else {
        showToast(data.message || 'Erreur de publication', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleTriggerCustomPublish = async (customPayload) => {
    setIsPublishing(true);
    try {
      const res = await fetch('/api/posts/trigger-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotTheme: customPayload.theme,
          selectedMediaId: selectedPreviewMedia?.public_id,
          customCaption: customPayload
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Post personnalisé publié sur Instagram & Pinterest ! Média supprimé de Cloudinary.');
        await fetchData();
      } else {
        showToast(data.message || 'Erreur lors de la publication', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDeleteMedia = async (publicId, resourceType) => {
    try {
      const res = await fetch(`/api/media/${encodeURIComponent(publicId)}?resourceType=${resourceType || 'image'}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        showToast('Média supprimé du stockage avec succès.');
        await fetchData();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleResetDemo = async () => {
    try {
      const res = await fetch('/api/media/reset-demo', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('Médias démo rechargés avec succès !');
        await fetchData();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleSaveSettings = async (newSettings) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        showToast('Paramètres mis à jour !');
        await fetchData();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 animate-bounce">
          <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl border text-xs font-bold ${
            toast.type === 'success'
              ? 'bg-emerald-500 text-slate-950 border-emerald-400'
              : 'bg-rose-500 text-white border-rose-400'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSettings={() => setIsSettingsOpen(false || true)}
        onTriggerNow={() => handleTriggerSlot('motivation')}
        isPublishing={isPublishing}
        stats={{ mediaCount: mediaList.length }}
        pendingApprovalCount={pendingCount}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8">
        {activeTab === 'approval' && (
          <ClientApprovalPortal
            allMedia={mediaList}
            onRefreshHistory={fetchData}
            showToast={showToast}
          />
        )}

        {activeTab === 'overview' && (
          <DashboardOverview
            schedule={schedule}
            mediaList={mediaList}
            history={history}
            onTriggerSlot={handleTriggerSlot}
            isPublishing={isPublishing}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'cloudinary' && (
          <CloudinaryExplorer
            mediaList={mediaList}
            folder={settings?.cloudinary?.folder}
            isMock={!settings?.cloudinary?.apiKey}
            onRefresh={fetchData}
            onDeleteMedia={handleDeleteMedia}
            onResetDemo={handleResetDemo}
            onTriggerMediaPost={handleTriggerMediaPost}
            onSelectPreview={(item) => {
              setSelectedPreviewMedia(item);
              setActiveTab('studio');
            }}
            isPublishing={isPublishing}
          />
        )}

        {activeTab === 'studio' && (
          <AICaptionStudio
            selectedMedia={selectedPreviewMedia || mediaList[0]}
            onTriggerPublishWithCustom={handleTriggerCustomPublish}
            isPublishing={isPublishing}
          />
        )}

        {activeTab === 'history' && (
          <HistoryLog
            history={history}
            onRefresh={fetchData}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-4 px-4 text-center text-xs text-slate-500">
        <p>NutriFitness Social Suite 🇨🇭 • Automatisation Instagram & Pinterest pour nutrifitness.ch (Suisse Romande)</p>
      </footer>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
      />

    </div>
  );
}
