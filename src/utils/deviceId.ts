import { v4 as uuidv4 } from 'uuid';
import { getCookie, setCookie } from '@/utils/cookies';

const DEVICE_ID_KEY = 'device_id';

export function getDeviceId(): string {
  let deviceId = getCookie(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = uuidv4();
    setCookie(DEVICE_ID_KEY, deviceId, 365);
  }
  return deviceId;
}