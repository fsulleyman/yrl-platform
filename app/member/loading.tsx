import React from 'react';

export default function MemberLoading() {
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 animate-pulse">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header Skeleton */}
        <div className="bg-slate-200 rounded-2xl h-48 w-full" />

        {/* Status / Membership Card Skeleton */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-4">
          <div className="h-6 bg-slate-200 rounded w-1/3" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
            <div className="h-20 bg-slate-100 rounded-lg" />
            <div className="h-20 bg-slate-100 rounded-lg" />
            <div className="h-20 bg-slate-100 rounded-lg" />
            <div className="h-20 bg-slate-100 rounded-lg" />
          </div>
        </div>

        {/* Profile Card Skeleton */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-4">
          <div className="h-6 bg-slate-200 rounded w-1/4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
            <div className="h-20 bg-slate-100 rounded-lg" />
            <div className="h-20 bg-slate-100 rounded-lg" />
            <div className="h-20 bg-slate-100 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
