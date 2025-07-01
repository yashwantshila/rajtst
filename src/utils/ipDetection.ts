// Client-side IP detection utilities
export const getClientIP = async (): Promise<string | null> => {
  try {
    // Try multiple IP detection services
    const ipServices = [
      'https://api.ipify.org?format=json',
      'https://api.myip.com',
      'https://ipapi.co/json/',
      'https://httpbin.org/ip'
    ];

    for (const service of ipServices) {
      try {
        const response = await fetch(service, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          const ip = data.ip || data.query || data.origin;
          
          if (ip && ip !== '127.0.0.1' && ip !== 'localhost') {
            return ip;
          }
        }
      } catch (error) {
        console.log(`Failed to get IP from ${service}:`, error);
        continue;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error detecting client IP:', error);
    return null;
  }
};

// Validate IP address format
export const isValidIP = (ip: string): boolean => {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}; 