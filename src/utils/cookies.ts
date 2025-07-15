import Cookies from 'js-cookie';

export const setCookie = (key: string, value: string, expiresDays = 7) => {
  Cookies.set(key, value, { expires: expiresDays, secure: true, sameSite: 'strict' });
};

export const getCookie = (key: string): string | undefined => {
  return Cookies.get(key);
};

export const removeCookie = (key: string) => {
  Cookies.remove(key);
};
