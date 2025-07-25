import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAdsenseConfig } from '@/services/api/adsense';

interface AdsenseAdProps {
  slotId?: string;
  className?: string;
  style?: React.CSSProperties;
}

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

const AdsenseAd = ({ slotId, className, style }: AdsenseAdProps) => {
  const { data } = useQuery({ queryKey: ['adsense'], queryFn: getAdsenseConfig });

  useEffect(() => {
    if (!data?.enabled || !data.adClient) return;

    const existing = document.getElementById('adsbygoogle-js');
    if (!existing) {
      const script = document.createElement('script');
      script.id = 'adsbygoogle-js';
      script.async = true;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${data.adClient}`;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    }
  }, [data]);

  if (!data?.enabled || !data.adClient || !data.adSlot) {
    return null;
  }

  return (
    <ins
      className={`adsbygoogle ${className ?? ''}`}
      style={style || { display: 'block' }}
      data-ad-client={data.adClient}
      data-ad-slot={slotId || data.adSlot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
};

export default AdsenseAd;
