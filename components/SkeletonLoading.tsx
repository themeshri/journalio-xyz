'use client';

import React from 'react';

export function TradeCycleCardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm animate-pulse">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-6 w-48 bg-gray-200 rounded"></div>
          <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
        </div>
        <div className="h-6 w-24 bg-gray-200 rounded"></div>
      </div>

      {/* Three-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="h-4 w-24 bg-gray-200 rounded mb-3"></div>
            <div className="space-y-2">
              <div className="h-8 w-32 bg-gray-200 rounded"></div>
              <div className="h-6 w-28 bg-gray-200 rounded"></div>
              <div className="h-5 w-24 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SummaryViewSkeleton() {
  return (
    <div className="max-w-6xl mx-auto mt-8">
      {/* Summary Statistics Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
            <div className="h-3 w-20 bg-gray-200 rounded mb-2"></div>
            <div className="h-8 w-16 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>

      {/* Trade Cycles Header Skeleton */}
      <div className="h-8 w-40 bg-gray-200 rounded mb-6 animate-pulse"></div>

      {/* Trade Cycle Cards Skeleton */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <TradeCycleCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function TransactionListSkeleton() {
  return (
    <div className="max-w-6xl mx-auto mt-8">
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="h-4 w-40 bg-gray-200 rounded"></div>
              <div className="h-4 w-24 bg-gray-200 rounded"></div>
            </div>
            <div className="flex items-center gap-4 mb-3">
              <div className="h-6 w-32 bg-gray-200 rounded"></div>
              <div className="h-6 w-8 bg-gray-200 rounded"></div>
              <div className="h-6 w-32 bg-gray-200 rounded"></div>
            </div>
            <div className="h-4 w-full bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ModalSkeleton() {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 animate-pulse">
          <div className="h-6 w-48 bg-gray-200 rounded"></div>
          <div className="h-6 w-6 bg-gray-200 rounded"></div>
        </div>
        <div className="p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-4 animate-pulse">
              <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
              <div className="h-6 w-full bg-gray-200 rounded mb-2"></div>
              <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
