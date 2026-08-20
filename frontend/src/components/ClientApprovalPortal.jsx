import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Play, 
  Sparkles, 
  MessageSquare, 
  Edit3, 
  ChevronLeft, 
  ChevronRight, 
  Layers, 
  Clock, 
  Image as ImageIcon,
  Send,
  Trash2,
  Check,
  AlertTriangle,
  RotateCcw,
  Mail,
  MailCheck,
  ExternalLink,
  Smartphone,
  Eye
} from 'lucide-react';
import PostPreview from './PostPreview';

export default function ClientApprovalPortal({ 
  allMedia, 
  onRefreshHistory,
  showToast 
}) {
  const [drafts, setDrafts] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filter, setFilter] = useState('ALL');
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [isPublishingDraft, setIsPublishingDraft] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [clientEmail, setClientEmail] = useState('client@nutrifitness.ch');
  const [showEmailPreviewModal, setShowEmailPreviewModal] = useState(false);
  const [lastEmailResult, setLastEmailResult] = useState(null);
  
  // Interactive Email Simulator state
  const [simulatedReplyText, setSimulatedReplyText] = useState('Approuvé ! Top pour Instagram.');
  const [isSimulatingReply, setIsSimulatingReply] = useState(false);

  // Editable draft fields
  const [editInstagramCaption, setEditInstagramCaption] = useState('');
  const [editPinterestTitle, setEditPinterestTitle] = useState('');
  const [editPinterestDesc, setEditPinterestDesc] = useState('');
  const [showImagePicker, setShowImagePicker] = useState(false);

  const fetchDrafts = async () => {
    try {
      const res = await fetch('/api/drafts');
      const data = await res.json();
      setDrafts(data.drafts || []);
    } catch (err) {
      console.error('Error fetching drafts:', err);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, []);

  const filteredDrafts = drafts.filter(d => {
    if (filter === 'ALL') return true;
    return d.status === filter;
  });

  const currentDraft = filteredDrafts[currentIndex] || filteredDrafts[0];

  useEffect(() => {
    if (currentDraft) {
      setEditInstagramCaption(currentDraft.captions?.instagramCaption || '');
      setEditPinterestTitle(currentDraft.captions?.pinterestTitle || '');
      setEditPinterestDesc(currentDraft.captions?.pinterestDescription || '');
    }
  }, [currentDraft]);

  const handleGenerateBatch = async () => {
    setIsGeneratingBatch(true);
    try {
      const res = await fetch('/api/drafts/generate-daily-batch', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(`3 posts générés avec succès pour validation client !`);
        await fetchDrafts();
        setCurrentIndex(0);
      } else {
        showToast(data.message || 'Erreur lors de la génération', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsGeneratingBatch(false);
    }
  };

  const handleSendEmail = async () => {
    if (!currentDraft) return;
    setIsSendingEmail(true);
    try {
      const res = await fetch(`/api/email-approval/send/${currentDraft.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientEmail })
      });
      const data = await res.json();
      if (data.success) {
        setLastEmailResult(data);
        showToast(`Email de validation envoyé au client (${clientEmail}) !`);
        await fetchDrafts();
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSimulateClientReply = async () => {
    if (!currentDraft) return;
    setIsSimulatingReply(true);
    try {
      const res = await fetch('/api/email-approval/simulate-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftId: currentDraft.id,
          replyBody: simulatedReplyText
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Réponse email du client reçue : "${data.message}"`);
        await fetchDrafts();
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSimulatingReply(false);
    }
  };

  const handleSaveEdits = async () => {
    if (!currentDraft) return;
    try {
      const res = await fetch(`/api/drafts/${currentDraft.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          captions: {
            instagramCaption: editInstagramCaption,
            pinterestTitle: editPinterestTitle,
            pinterestDescription: editPinterestDesc
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Modifications de la légende enregistrées !');
        await fetchDrafts();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleApprove = async () => {
    if (!currentDraft) return;
    try {
      const res = await fetch(`/api/drafts/${currentDraft.id}/approve`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('Post approuvé pour publication automatique !');
        await fetchDrafts();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handlePublishNow = async () => {
    if (!currentDraft) return;
    setIsPublishingDraft(true);
    try {
      const res = await fetch(`/api/drafts/${currentDraft.id}/publish-now`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('Post publié avec succès sur Instagram & Pinterest ! Média purgé de Cloudinary.');
        await fetchDrafts();
        onRefreshHistory();
      } else {
        showToast(data.message || 'Erreur lors de la publication', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsPublishingDraft(false);
    }
  };

  const handleChangeImage = async (newMedia) => {
    if (!currentDraft) return;
    try {
      const res = await fetch(`/api/drafts/${currentDraft.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media: newMedia })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Visuel mis à jour !');
        setShowImagePicker(false);
        await fetchDrafts();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner: Email-Driven Workflow Summary */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-emerald-400" />
              Workflow Approbation Email Client (1 par 1)
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              1. Envoi Email ➡️ 2. Réponse Client ➡️ 3. Publication Auto
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Générez le post avec sa légende en français, envoyez-le par email au client. Dès qu'il répond "Approuvé" ou avec ses corrections, le post est programmé et publié sur Instagram !
          </p>
        </div>

        <button
          onClick={handleGenerateBatch}
          disabled={isGeneratingBatch}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all"
        >
          <Sparkles className={`w-4 h-4 ${isGeneratingBatch ? 'animate-spin' : ''}`} />
          <span>{isGeneratingBatch ? 'Génération...' : 'Créer les 3 Posts du Jour'}</span>
        </button>
      </div>

      {/* Filter Tabs & Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
        
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {[
            { id: 'ALL', label: 'Tous' },
            { id: 'PENDING_APPROVAL', label: 'En attente email client' },
            { id: 'APPROVED', label: 'Approuvés par email ✅' },
            { id: 'POSTED', label: 'Publiés sur Instagram 🚀' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setFilter(tab.id); setCurrentIndex(0); }}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 ${
                filter === tab.id
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label} ({drafts.filter(d => tab.id === 'ALL' || d.status === tab.id).length})
            </button>
          ))}
        </div>

        {/* 1-by-1 Navigator */}
        {filteredDrafts.length > 1 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-semibold">
              Post {currentIndex + 1} sur {filteredDrafts.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={currentIndex >= filteredDrafts.length - 1}
                onClick={() => setCurrentIndex(prev => Math.min(filteredDrafts.length - 1, prev + 1))}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Main 1-by-1 Workspace */}
      {currentDraft ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Email Dispatch & Review Controls (7 cols) */}
          <div className="lg:col-span-7 space-y-5 bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 shadow-xl">
            
            {/* Post Status Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-slate-950 text-white font-mono">
                  ⏰ Créneau : {currentDraft.slotTime || '08:30'} • {currentDraft.theme?.toUpperCase()}
                </span>
                
                {currentDraft.status === 'APPROVED' ? (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Approuvé ({currentDraft.approvedVia || 'Email'})
                  </span>
                ) : (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    En attente de réponse email
                  </span>
                )}
              </div>
            </div>

            {/* Step 1: Send to Client via Email */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/5 border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="w-4 h-4" />
                  Étape 1 : Envoyer ce post par Email au Client
                </span>
                <button
                  onClick={() => setShowEmailPreviewModal(true)}
                  className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Aperçu de l'email
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="email-client@nutrifitness.ch"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 font-mono"
                />
                <button
                  onClick={handleSendEmail}
                  disabled={isSendingEmail}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all"
                >
                  <Send className={`w-3.5 h-3.5 ${isSendingEmail ? 'animate-spin' : ''}`} />
                  <span>{isSendingEmail ? 'Envoi...' : 'Envoyer Email'}</span>
                </button>
              </div>

              {currentDraft.emailSentAt && (
                <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <MailCheck className="w-3.5 h-3.5" />
                  Dernier email envoyé à {currentDraft.emailSentTo} à {new Date(currentDraft.emailSentAt).toLocaleTimeString('fr-CH')}
                </p>
              )}
            </div>

            {/* Step 2: Interactive Email Reply Simulator (Simuler la réponse du client) */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
              <label className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                Étape 2 : Réception de la réponse email du client
              </label>
              <p className="text-[11px] text-slate-400">
                Testez comment le système réagit quand le client répond à l'email :
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={simulatedReplyText}
                  onChange={(e) => setSimulatedReplyText(e.target.value)}
                  placeholder="Ex: 'Approuvé !' ou 'Change la légende par : ...'"
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                />
                <button
                  onClick={handleSimulateClientReply}
                  disabled={isSimulatingReply}
                  className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  Simuler Réponse
                </button>
              </div>
            </div>

            {/* Step 3: Image Switcher & Caption Refinement */}
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-black overflow-hidden border border-slate-800 shrink-0">
                    <img src={currentDraft.media?.secure_url} alt="Draft" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white line-clamp-1">
                      {currentDraft.media?.title || currentDraft.media?.filename || 'Visuel Sélectionné'}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Modèle Athlétique Style Pinterest (0 texte)
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowImagePicker(!showImagePicker)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  Changer d'image ({allMedia.length})
                </button>
              </div>

              {showImagePicker && (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">
                      Sélectionnez une autre image de nutrifitness.ch :
                    </span>
                    <button onClick={() => setShowImagePicker(false)} className="text-xs text-slate-400">
                      Fermer
                    </button>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto pr-1">
                    {allMedia.map((m, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleChangeImage(m)}
                        className="aspect-[4/5] rounded-lg overflow-hidden border border-slate-800 hover:border-emerald-500"
                      >
                        <img src={m.secure_url} alt="Option" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* French Caption Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Légende Instagram en Français
                  </label>
                  <button
                    onClick={handleSaveEdits}
                    className="text-xs bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Enregistrer
                  </button>
                </div>

                <textarea
                  value={editInstagramCaption}
                  onChange={(e) => setEditInstagramCaption(e.target.value)}
                  rows={6}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 font-sans leading-relaxed focus:outline-none focus:border-emerald-500 resize-y"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={handleApprove}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Valider Manuellement ✅</span>
              </button>

              <button
                onClick={handlePublishNow}
                disabled={isPublishingDraft}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-sky-500/20 disabled:opacity-50 transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isPublishingDraft ? 'Publication...' : 'Publier sur Instagram & Pinterest'}</span>
              </button>
            </div>

          </div>

          {/* Right Column: Live Mobile Preview (5 cols) */}
          <div className="lg:col-span-5">
            <PostPreview
              media={currentDraft.media}
              caption={editInstagramCaption}
              pinterestTitle={editPinterestTitle}
              pinterestDescription={editPinterestDesc}
              theme={currentDraft.theme}
            />
          </div>

        </div>
      ) : (
        <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <Mail className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="font-bold text-base text-white">Aucun post prêt pour envoi email</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Générez les 3 posts du jour pour envoyer les emails de validation à votre client un par un.
          </p>
          <button
            onClick={handleGenerateBatch}
            disabled={isGeneratingBatch}
            className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs shadow-lg shadow-emerald-500/20"
          >
            <Sparkles className="w-4 h-4" />
            Créer les 3 Posts du Jour
          </button>
        </div>
      )}

      {/* Email Preview Modal */}
      {showEmailPreviewModal && currentDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl flex flex-col justify-between p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-400" />
                Aperçu de l'Email Envoyé au Client ({clientEmail})
              </h3>
              <button onClick={() => setShowEmailPreviewModal(false)} className="text-xs text-slate-400 hover:text-white">
                Fermer
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
              <div className="text-xs text-slate-400 border-b border-slate-800 pb-2">
                <strong>Objet :</strong> [Validation Requise] Post Instagram & Pinterest - {currentDraft.theme?.toUpperCase()} ({currentDraft.slotTime || '08:30'})
              </div>
              <div className="aspect-[4/5] max-h-64 rounded-lg overflow-hidden bg-black mx-auto">
                <img src={currentDraft.media?.secure_url} alt="Email visual" className="w-full h-full object-cover" />
              </div>
              <div className="p-3 bg-slate-900 rounded-lg text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                {editInstagramCaption}
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <span className="bg-emerald-600 text-white font-bold text-xs px-4 py-2 rounded-lg">
                  ✅ APPROUVER & PROGRAMMER (Bouton dans l'email)
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => { setShowEmailPreviewModal(false); handleSendEmail(); }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl"
              >
                Envoyer cet email maintenant
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
