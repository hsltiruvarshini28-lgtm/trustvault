'use client';

import React, { useEffect } from 'react';

export function DocumentsClientSync() {
  useEffect(() => {
    try {
      const stored = localStorage.getItem('trustvault_local_docs');
      if (!stored) return;
      const list = JSON.parse(stored);
      if (!Array.isArray(list) || list.length === 0) return;

      // Check if any local document is missing from the cookie
      const cookieStr = document.cookie || '';
      if (!cookieStr.includes('trustvault_custom_docs=')) {
        // Cookie is missing entirely; sync the most recent document
        const mostRecent = list[0];
        if (mostRecent && mostRecent.id) {
          fetch('/api/documents/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ document: mostRecent }),
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.success) {
                window.location.reload();
              }
            })
            .catch(() => {});
        }
      }
    } catch {
      // Ignore
    }
  }, []);

  return null;
}
