import { Helmet } from 'react-helmet';
import { useQuery } from '@tanstack/react-query';
import { getSettings } from '@/services/api/settings';

const Seo = () => {
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings
  });

  return (
    <Helmet>
      {settings?.seoTitle && <title>{settings.seoTitle}</title>}
      {settings?.seoDescription && (
        <meta name="description" content={settings.seoDescription} />
      )}
      {settings?.seoKeywords && (
        <meta name="keywords" content={settings.seoKeywords} />
      )}
    </Helmet>
  );
};

export default Seo;

