import React from 'react';

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#F7F7F4] p-4 sm:p-6 lg:p-7 select-none animate-pulse">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header / Session Bar Skeleton */}
        <div className="bg-white border border-[#D0D9DF] rounded p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2.5">
              <div className="h-5 w-48 bg-[#E2E8F0] rounded" />
              <div className="h-4 w-16 bg-[#E2E8F0] rounded" />
            </div>
            <div className="h-3 w-64 bg-[#E2E8F0] rounded" />
          </div>
          <div className="flex items-center space-x-2.5">
            <div className="h-8 w-32 bg-[#E2E8F0] rounded" />
            <div className="h-8 w-36 bg-[#E2E8F0] rounded" />
          </div>
        </div>

        {/* 4 Enterprise Metrics Strip Skeleton */}
        <div className="bg-white border border-[#D0D9DF] rounded shadow-xs overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#D0D9DF]">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="h-3 w-28 bg-[#E2E8F0] rounded" />
                  <div className="h-4 w-4 bg-[#E2E8F0] rounded-full" />
                </div>
                <div className="h-7 w-16 bg-[#E2E8F0] rounded" />
                <div className="h-3 w-32 bg-[#E2E8F0] rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity & Security Controls Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-[#D0D9DF] rounded p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D0D9DF]">
              <div className="space-y-1">
                <div className="h-4 w-44 bg-[#E2E8F0] rounded" />
                <div className="h-3 w-32 bg-[#E2E8F0] rounded" />
              </div>
              <div className="h-3 w-20 bg-[#E2E8F0] rounded" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="py-2.5 flex items-center justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <div className="h-3.5 w-24 bg-[#E2E8F0] rounded" />
                      <div className="h-3 w-12 bg-[#E2E8F0] rounded" />
                    </div>
                    <div className="h-2.5 w-40 bg-[#E2E8F0] rounded" />
                  </div>
                  <div className="h-3 w-24 bg-[#E2E8F0] rounded" />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white border border-[#D0D9DF] rounded p-5 shadow-xs space-y-3">
              <div className="h-4 w-32 bg-[#E2E8F0] rounded" />
              <div className="h-3 w-40 bg-[#E2E8F0] rounded" />
              <div className="space-y-2 pt-1">
                <div className="h-16 bg-[#F4F7F9] border border-[#D0D9DF] rounded" />
                <div className="h-16 bg-[#F4F7F9] border border-[#D0D9DF] rounded" />
              </div>
            </div>
            <div className="p-4 bg-[#203142] border border-[#16222E] rounded shadow-xs space-y-2">
              <div className="h-3 w-32 bg-[#2B3F52] rounded" />
              <div className="h-3 w-full bg-[#2B3F52] rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
