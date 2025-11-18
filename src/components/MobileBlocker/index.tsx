import React, { useState, useEffect } from 'react';
import styles from './styles.module.css';

export default function MobileBlocker(): React.ReactElement | null {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      // Block access when sidebar collapses to mobile menu (< 997px)
      // This matches Docusaurus's mobile breakpoint where layout becomes unusable
      setIsMobile(window.innerWidth < 997);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Don't render on server-side or if not mobile
  if (!mounted || !isMobile) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.content}>
        <div className={styles.icon}>📱</div>
        <h1 className={styles.title}>Mobile Not Supported</h1>
        <p className={styles.message}>
          This application is optimized for larger screens.
        </p>
        <p className={styles.suggestion}>
          Please use a <strong>tablet</strong> or <strong>desktop device</strong> for the best experience.
        </p>
      </div>
    </div>
  );
}
