import React, { useState, useEffect } from 'react';
import { useDoc } from '@docusaurus/plugin-content-docs/client';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

interface SummaryData {
  date_range: {
    start: string;
    end: string;
    days: number;
  };
}

export default function DefitunaBanner(): JSX.Element | null {
  const { metadata } = useDoc();
  const baseUrl = useBaseUrl('/');
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSummary() {
      try {
        const response = await fetch(`${baseUrl}data/summary.json`);
        const data: SummaryData = await response.json();
        setDateRange({
          start: data.date_range.start,
          end: data.date_range.end,
        });
      } catch (err) {
        console.error('Error loading summary data for banner:', err);
      } finally {
        setLoading(false);
      }
    }

    loadSummary();
  }, [baseUrl]);

  // Only show banner on DefiTuna + usage analytics pages
  const id = metadata.id?.toLowerCase() ?? '';
  const isDefitunaPage = id.includes('defituna');
  const isUsagePage = id.includes('usage-statistics');
  if (!isDefitunaPage && !isUsagePage) {
    return null;
  }

  // Don't show banner until data is loaded
  if (loading || !dateRange) {
    return null;
  }

  const treasuryAddress = 'G9XfJoY81n8A9bZKaJFhJYomRrcvFkuJ22em2g8rZuCh';
  const solscanUrl = `https://solscan.io/account/${treasuryAddress}`;

  return (
    <div className={styles.banner}>
      <strong>Treasury Address:</strong>{' '}
      <a href={solscanUrl} target="_blank" rel="noopener noreferrer">
        {treasuryAddress}
      </a>
      <span className={styles.separator}>•</span>
      <strong>Loaded Date Range:</strong> {dateRange.start} to {dateRange.end}
    </div>
  );
}
