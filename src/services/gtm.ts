import TagManager from 'react-gtm-module';

const GTM_ID = 'GTM-5BBC2M5M';

export const initializeGTM = () => {
  TagManager.initialize({
    gtmId: GTM_ID,
  });
};

export const pushToDataLayer = (data: any) => {
  TagManager.dataLayer({
    dataLayer: data,
  });
}; 