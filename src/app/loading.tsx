import React from 'react';
import { Shield } from 'lucide-react';

export default function RootLoading() {
  return (
    <div className="min-h-screen bg-[#EDF2F4] flex flex-col items-center justify-center p-4 select-none">
      <div className="bg-white border border-[#D0D9DF] rounded-lg p-8 shadow-md max-w-sm w-full text-center space-y-4">
        <div className="relative mx-auto w-12 h-12 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-[#527C78]/20 border-t-[#527C78] animate-spin" />
          <div className="w-9 h-9 rounded bg-[#527C78] flex items-center justify-center text-white shadow-xs">
            <Shield className="w-5 h-5 text-white" />
          </div>
        </div>
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-[#263C50] tracking-tight">
            TrustVault Security Console
          </h2>
          <p className="text-xs text-[#677582]">
            Verifying cryptographic credentials and loading vault environment...
          </p>
        </div>
        <div className="w-full bg-[#EDF2F4] h-1 rounded overflow-hidden">
          <div className="bg-[#527C78] h-full w-1/2 animate-[pulse_1.5s_ease-in-out_infinite]" />
        </div>
      </div>
    </div>
  );
}
