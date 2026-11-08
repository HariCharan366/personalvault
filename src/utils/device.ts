/**
 * Device, Browser, and Environment Intelligence Utility
 */

export interface DeviceInfo {
  browser: string;
  browserVersion: string;
  os: string;
  deviceType: 'Desktop' | 'Mobile' | 'Tablet';
  deviceName: string;
  ipAddress?: string;
  location?: string;
}

export function detectDeviceInfo(): DeviceInfo {
  const ua = navigator.userAgent;

  // Detect OS
  let os = 'Unknown OS';
  if (/Windows NT 10.0/i.test(ua)) os = 'Windows 10/11';
  else if (/Windows NT 6.3/i.test(ua)) os = 'Windows 8.1';
  else if (/Windows NT 6.2/i.test(ua)) os = 'Windows 8';
  else if (/Windows NT 6.1/i.test(ua)) os = 'Windows 7';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  // Detect Device Type
  let deviceType: 'Desktop' | 'Mobile' | 'Tablet' = 'Desktop';
  if (/iPad|Tablet|(Android(?!.*Mobile))/i.test(ua)) {
    deviceType = 'Tablet';
  } else if (/Mobile|iPhone|Android/i.test(ua)) {
    deviceType = 'Mobile';
  }

  // Detect Browser and Version
  let browser = 'Unknown Browser';
  let browserVersion = '';

  if (/Edg\/([0-9.]+)/i.test(ua)) {
    browser = 'Microsoft Edge';
    browserVersion = RegExp.$1;
  } else if (/Chrome\/([0-9.]+)/i.test(ua) && !/Edg/i.test(ua)) {
    browser = 'Google Chrome';
    browserVersion = RegExp.$1;
  } else if (/Firefox\/([0-9.]+)/i.test(ua)) {
    browser = 'Mozilla Firefox';
    browserVersion = RegExp.$1;
  } else if (/Safari\/([0-9.]+)/i.test(ua) && !/Chrome/i.test(ua)) {
    browser = 'Apple Safari';
    browserVersion = RegExp.$1;
  } else if (/OPR\/([0-9.]+)/i.test(ua)) {
    browser = 'Opera';
    browserVersion = RegExp.$1;
  }

  const deviceName = `${os} ${deviceType} (${browser})`;

  return {
    browser,
    browserVersion,
    os,
    deviceType,
    deviceName,
  };
}

/**
 * Fetch approximate IP and location if allowed and online
 */
export async function fetchIpAndLocation(): Promise<{ ip: string; location: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error('IP service unreachable');
    const data = await res.json();
    return {
      ip: data.ip || '127.0.0.1',
      location: [data.city, data.region, data.country_name].filter(Boolean).join(', ') || 'Local / Private Network',
    };
  } catch {
    return {
      ip: '127.0.0.1 (Local)',
      location: 'Local / Private Network',
    };
  }
}
