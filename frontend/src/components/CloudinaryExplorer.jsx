import React, { useState } from 'react';
import {
  FolderGit2,
  Trash2,
  Play,
  RefreshCw,
  RotateCcw,
  Eye
} from 'lucide-react';

export default function CloudinaryExplorer({
  mediaList,
  folder,
  isMock,
  onRefresh,
  onDeleteMedia,
  onResetDemo,
  onTriggerMediaPost,
  onSelectPreview,
  isPublishing
}) {
  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-gray-500" />
              Media Library
            </h2>
            {isMock && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                Demo Mode
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Folder: <span className="font-mono text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">{folder || 'nutrifitness'}</span>
            {' · '}Total queued: <strong className="text-gray-800">{mediaList.length} files</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-700 transition-colors"
            title="Refresh from Cloudinary"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>

          {isMock && (
            <button
              onClick={onResetDemo}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-700 transition-colors"
              title="Reload demo media"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reload demo
            </button>
          )}
        </div>
      </div>

      {/* Media Grid */}
      {mediaList.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {mediaList.map((item, index) => {
            const isFirst = index === 0;
            return (
              <div
                key={item.public_id || index}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-colors flex flex-col"
              >
                {/* Image */}
                <div className="relative aspect-[4/5] bg-gray-100 overflow-hidden">
                  <img
                    src={item.secure_url}
                    alt={item.title || item.public_id}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2">
                    {isFirst ? (
                      <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                        #1 Next
                      </span>
                    ) : (
                      <span className="bg-black/50 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                        #{index + 1}
                      </span>
                    )}
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-mono px-2 py-0.5 rounded">
                    {item.aspect_ratio || '1:1'}
                  </div>
                </div>

                {/* Info & Actions */}
                <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-medium text-xs text-gray-800 truncate">
                      {item.title || item.public_id.split('/').pop()}
                    </h4>
                    <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
                      <span>{item.resource_type?.toUpperCase()} · {item.format?.toUpperCase()}</span>
                      <span>{item.width}×{item.height}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => onSelectPreview(item)}
                      className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors"
                      title="Preview in AI Studio"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onTriggerMediaPost(item.public_id)}
                      disabled={isPublishing}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-gray-900 hover:bg-gray-700 text-white text-xs font-semibold transition-colors disabled:opacity-40"
                      title="Publish & remove from Cloudinary"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      Publish
                    </button>

                    <button
                      onClick={() => onDeleteMedia(item.public_id, item.resource_type)}
                      className="p-1.5 rounded-lg bg-red-50 hover:bg-red-500 text-red-500 hover:text-white border border-red-200 hover:border-red-500 transition-colors"
                      title="Delete from Cloudinary"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl p-12 text-center space-y-3">
          <FolderGit2 className="w-10 h-10 text-gray-300 mx-auto" />
          <h3 className="font-semibold text-sm text-gray-700">No media in this folder</h3>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            Upload photos or videos to your Cloudinary folder to feed the 3-posts-per-day publishing queue.
          </p>
          <button
            onClick={onResetDemo}
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white font-semibold text-xs hover:bg-gray-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Load demo media
          </button>
        </div>
      )}

    </div>
  );
}
