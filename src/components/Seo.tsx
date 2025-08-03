import { Helmet } from 'react-helmet';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getSettings, PageSeo } from '@/services/api/settings';

interface SeoProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string; // relative or absolute URL
}

const Seo = ({ title, description, keywords, canonical }: SeoProps) => {
  const location = useLocation();
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings
  });

  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://rajtest.com';
  const path = location.pathname;
  const pageSettings: PageSeo | undefined = settings?.pageSeo?.[path];

  const resolvedTitle = title || pageSettings?.title || settings?.seoTitle;
  const resolvedDescription =
    description || pageSettings?.description || settings?.seoDescription;
  const resolvedKeywords =
    keywords || pageSettings?.keywords || settings?.seoKeywords;
  const rawCanonical =
    canonical || pageSettings?.canonical || path;

  const canonicalUrl = rawCanonical
    ? rawCanonical.startsWith('http')
      ? rawCanonical
      : `${siteUrl}${rawCanonical}`
    : undefined;

  return (
    <Helmet>
      {resolvedTitle && <title>{resolvedTitle}</title>}
      {resolvedDescription && (
        <meta name="description" content={resolvedDescription} />
      )}
      {resolvedKeywords && <meta name="keywords" content={resolvedKeywords} />}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
    </Helmet>
  );
};

export default Seo;

