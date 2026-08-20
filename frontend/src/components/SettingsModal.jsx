import React, { useState } from 'react';
import { 
  X, 
  Key, 
  FolderGit2, 
  Clock, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Radio, 
  HelpCircle,
  Save,
  Sparkles
} from 'lucide-react';

export default function SettingsModal({ 
  isOpen, 
  onClose, 
  settings, 
  onSaveSettings 
}) {
  const [formData, setFormData] = useState(settings || {});
  const [testingBlotato, setTestingBlotato] = useState(false);
  const [testingCloudinary, setTestingCloudinary] = useState(false);
  const [blotatoTestResult, setBlotatoTestResult] = useState(null);
  const [cloudinaryTestResult, setCloudinaryTestResult] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleTestBlotato = async () => {
    setTestingBlotato(true);
    setBlotatoTestResult(null);
    try {
      const res = await fetch('/api/settings/test-blotato', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: formData.blotato?.apiKey })
      });
      const data = await res.json();
      setBlotatoTestResult(data);
    } catch (err) {
      setBlotatoTestResult({ connected: false, message: err.message });
    } finally {
      setTestingBlotato(false);
    }
  };

  const handleTestCloudinary = async () => {
    setTestingCloudinary(true);
    setCloudinaryTestResult(null);
    try {
      const res = await fetch('/api/settings/test-cloudinary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      setCloudinaryTestResult(data);
    } catch (err) {
      setCloudinaryTestResult({ connected: false, message: err.message });
    } finally {
      setTestingCloudinary(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    await onSaveSettings(formData);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col justify-between">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Paramètres & Connexions API</h3>
              <p className="text-xs text-slate-400">Configurez Blotato, Cloudinary et les règles de publication</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-6">
          
          {/* Section 1: Blotato API Settings */}
          <div className="space-y-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  1. Blotato API (Instagram & Pinterest)
                </span>
              </div>
              <button
                type="button"
                onClick={handleTestBlotato}
                disabled={testingBlotato}
                className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold"
              >
                {testingBlotato ? 'Test...' : 'Tester Clé Blotato'}
              </button>
            </div>

            {blotatoTestResult && (
              <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                blotatoTestResult.connected 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              }`}>
                {blotatoTestResult.connected ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{blotatoTestResult.message}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Clé API Blotato (blotato-api-key)
                </label>
                <input
                  type="password"
                  value={formData.blotato?.apiKey || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    blotato: { ...formData.blotato, apiKey: e.target.value }
                  })}
                  placeholder="blotato_api_key_..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  ID Compte Client (Blotato Account ID)
                </label>
                <input
                  type="text"
                  value={formData.blotato?.accountId || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    blotato: { ...formData.blotato, accountId: e.target.value }
                  })}
                  placeholder="acc_123456..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-900">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Sous-compte Instagram (Optionnel)
                </label>
                <input
                  type="text"
                  value={formData.blotato?.instagramSubaccountId || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    blotato: { ...formData.blotato, instagramSubaccountId: e.target.value }
                  })}
                  placeholder="Laissez vide si compte principal"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Pinterest Board ID (Optionnel)
                </label>
                <input
                  type="text"
                  value={formData.blotato?.pinterestBoardId || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    blotato: { ...formData.blotato, pinterestBoardId: e.target.value }
                  })}
                  placeholder="ID du tableau Pinterest"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Cloudinary Settings */}
          <div className="space-y-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">
                2. Dossier & Clés Cloudinary
              </span>
              <button
                type="button"
                onClick={handleTestCloudinary}
                disabled={testingCloudinary}
                className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold"
              >
                {testingCloudinary ? 'Test...' : 'Tester Cloudinary'}
              </button>
            </div>

            {cloudinaryTestResult && (
              <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                cloudinaryTestResult.connected 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              }`}>
                {cloudinaryTestResult.connected ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{cloudinaryTestResult.message}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Nom du dossier Cloudinary
                </label>
                <input
                  type="text"
                  value={formData.cloudinary?.folder || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    cloudinary: { ...formData.cloudinary, folder: e.target.value }
                  })}
                  placeholder="nutrifitness/posts"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Cloud Name
                </label>
                <input
                  type="text"
                  value={formData.cloudinary?.cloudName || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    cloudinary: { ...formData.cloudinary, cloudName: e.target.value }
                  })}
                  placeholder="votre_cloud_name"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  API Key
                </label>
                <input
                  type="password"
                  value={formData.cloudinary?.apiKey || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    cloudinary: { ...formData.cloudinary, apiKey: e.target.value }
                  })}
                  placeholder="123456789..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  API Secret
                </label>
                <input
                  type="password"
                  value={formData.cloudinary?.apiSecret || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    cloudinary: { ...formData.cloudinary, apiSecret: e.target.value }
                  })}
                  placeholder="secret..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Scheduling & Auto-Delete Policy */}
          <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider block">
              3. Règles de Planification & Suppression
            </span>

            <div className="space-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.scheduling?.autoDeleteMediaOnSuccess !== false}
                  onChange={(e) => setFormData({
                    ...formData,
                    scheduling: { ...formData.scheduling, autoDeleteMediaOnSuccess: e.target.checked }
                  })}
                  className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700"
                />
                <span className="text-xs font-semibold text-slate-200">
                  Supprimer définitivement le média de Cloudinary dès publication réussie (Requis)
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.scheduling?.enabled !== false}
                  onChange={(e) => setFormData({
                    ...formData,
                    scheduling: { ...formData.scheduling, enabled: e.target.checked }
                  })}
                  className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700"
                />
                <span className="text-xs font-semibold text-slate-200">
                  Activer la publication automatique aux 3 créneaux quotidiens (08:30, 12:30, 18:30 CET)
                </span>
              </label>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saveSuccess ? 'Enregistré avec succès !' : 'Enregistrer les paramètres'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
