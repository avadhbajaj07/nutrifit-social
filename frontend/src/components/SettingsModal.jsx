import React, { useState } from 'react';
import {
  X,
  Key,
  CheckCircle2,
  AlertCircle,
  Save,
  Radio
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
        body: JSON.stringify({})
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white border border-gray-200 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-900">Settings</h3>
              <p className="text-xs text-gray-400">API keys are managed via Vercel environment variables</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">

          {/* API Connections — read-only test */}
          <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wide block">
              API Connections
            </span>
            <p className="text-[11px] text-gray-400">
              Keys are loaded from Vercel environment variables. Use the buttons below to verify connectivity.
            </p>

            {/* Blotato test */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Radio className="w-3.5 h-3.5" />
                  <span className="font-medium">Blotato (Instagram & Pinterest)</span>
                </div>
                <button
                  type="button"
                  onClick={handleTestBlotato}
                  disabled={testingBlotato}
                  className="text-xs px-2.5 py-1 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 font-semibold transition-colors disabled:opacity-50"
                >
                  {testingBlotato ? 'Testing...' : 'Test connection'}
                </button>
              </div>
              {blotatoTestResult && (
                <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                  blotatoTestResult.connected
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-red-50 text-red-600 border border-red-200'
                }`}>
                  {blotatoTestResult.connected
                    ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                  <span>{blotatoTestResult.message}</span>
                </div>
              )}
            </div>

            {/* Cloudinary test */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Radio className="w-3.5 h-3.5" />
                  <span className="font-medium">Cloudinary</span>
                </div>
                <button
                  type="button"
                  onClick={handleTestCloudinary}
                  disabled={testingCloudinary}
                  className="text-xs px-2.5 py-1 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 font-semibold transition-colors disabled:opacity-50"
                >
                  {testingCloudinary ? 'Testing...' : 'Test connection'}
                </button>
              </div>
              {cloudinaryTestResult && (
                <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                  cloudinaryTestResult.connected
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-red-50 text-red-600 border border-red-200'
                }`}>
                  {cloudinaryTestResult.connected
                    ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                  <span>{cloudinaryTestResult.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Cloudinary folder (config, not a secret) */}
          <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wide block">
              Cloudinary
            </span>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                Folder name
              </label>
              <input
                type="text"
                value={formData.cloudinary?.folder || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  cloudinary: { ...formData.cloudinary, folder: e.target.value }
                })}
                placeholder="nutrifitness"
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-800 font-mono focus:outline-none focus:border-gray-400"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                The Cloudinary folder where your media files are stored.
              </p>
            </div>
          </div>

          {/* Scheduling */}
          <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wide block">
              Scheduling
            </span>

            <p className="text-xs text-gray-600 leading-relaxed">
              Automatic folder publishing is disabled. Publish or schedule only from a client-approved post; Cloudinary source files are always preserved.
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-700 text-white font-semibold text-xs transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saveSuccess ? 'Saved!' : 'Save settings'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
