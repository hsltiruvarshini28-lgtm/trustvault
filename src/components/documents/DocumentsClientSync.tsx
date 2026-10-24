'use client';

import React, { useEffect } from 'react';

export function DocumentsClientSync() {
  useEffect(() => {
    try {
      const stored = localStorage.getItem('trustvault_local_docs');
      if (!stored) return;
      const list = JSON.parse(stored);
      if (!Array.isArray(list) || list.length === 0) return;

      const mostRecent = list[0];
      if (mostRecent && mostRecent.id) {
        const syncedKey = `trustvault_docs_synced_${mostRecent.id}`;
        if (localStorage.getItem(syncedKey)) return;
        fetch('/api/documents/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ document: mostRecent }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              localStorage.setItem(syncedKey, '1');
              window.location.reload();
            }
          })
          .catch(() => {});
      }
    } catch {
      // Ignore
    }
  }, []);

  return null;
}
