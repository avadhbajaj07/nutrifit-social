import React from 'react';
import {
  Flame,
  Settings,
  Play,
  Layers,
  Sparkles,
  History,
  FolderGit2,
  UserCheck
} from 'lucide-react';

export default function Navbar({
  activeTab,
  setActiveTab,
  onOpenSettings,
  onTriggerNow,
  isPublishing,
  stats,
  pendingApprovalCount = 0
}) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">

        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gray-900 flex items-center justify-center text-white">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-gray-900">NutriFitness.ch</span>
            <p className="text-[11px] text-gray-400 leading-none mt-0.5">Social Media Automation</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-0.5 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('approval')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeTab === 'approval'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Client Approval
            {pendingApprovalCount > 0 && (
              <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {pendingApprovalCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeTab === 'overview'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Overview
          </button>

          <button
            onClick={() => setActiveTab('cloudinary')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeTab === 'cloudinary'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            Media ({stats?.mediaCount || 0})
          </button>

          <button
            onClick={() => setActiveTab('studio')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeTab === 'studio'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Studio
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeTab === 'history'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            History
          </button>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onTriggerNow}
            disabled={isPublishing || stats?.mediaCount === 0}
            className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-700 text-white text-xs font-semibold px-3 py-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Immediately publish the next post"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isPublishing ? 'animate-spin' : ''}`} />
            <span>{isPublishing ? 'Posting...' : 'Post Now'}</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-gray-800 transition-colors"
            title="Settings — Blotato & Cloudinary"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
}
