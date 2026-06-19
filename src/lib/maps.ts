export function parseCoordinatesFromLink(url: string): { lat: number, lng: number } | null {
  if (!url) return null;
  let match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (match) return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  
  match = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (match) return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  
  match = url.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (match) return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  
  return null;
}

export async function resolveCoordinates(url: string): Promise<{ lat: number | null; lng: number | null; invalidLink: boolean }> {
  if (!url) {
    return { lat: null, lng: null, invalidLink: false };
  }

  const trimmed = url.trim();
  const isUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.includes('maps.google') || trimmed.includes('goo.gl') || trimmed.includes('google.com/maps');

  if (!isUrl) {
    return { lat: null, lng: null, invalidLink: false };
  }

  // 1. Try to parse directly from the input URL
  const directCoords = parseCoordinatesFromLink(trimmed);
  if (directCoords) {
    return { lat: directCoords.lat, lng: directCoords.lng, invalidLink: false };
  }

  // 2. If it is a URL, follow redirects and parse coordinates from final URL or HTML page content
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(trimmed, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    clearTimeout(timeoutId);

    const finalUrl = res.url;
    const finalCoords = parseCoordinatesFromLink(finalUrl);
    if (finalCoords) {
      return { lat: finalCoords.lat, lng: finalCoords.lng, invalidLink: false };
    }

    // Try HTML extraction
    const html = await res.text();
    const staticMapMatch = html.match(/staticmap\?[^"]*center=(-?\d+\.\d+)(?:%2C|,)(-?\d+\.\d+)/) || html.match(/center=(-?\d+\.\d+)(?:%2C|,)(-?\d+\.\d+)/);
    if (staticMapMatch) {
      return {
        lat: parseFloat(staticMapMatch[1]),
        lng: parseFloat(staticMapMatch[2]),
        invalidLink: false
      };
    }

    const appStateMatch = html.match(/window\.APP_INITIALIZATION_STATE=\[\[\[(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (appStateMatch) {
      return {
        lat: parseFloat(appStateMatch[1]),
        lng: parseFloat(appStateMatch[2]),
        invalidLink: false
      };
    }
  } catch (err) {
    console.error('Error resolving Google Maps coordinates:', err);
  }

  // If we reached here, a Google Maps link was provided but the system could not extract coordinates
  return { lat: null, lng: null, invalidLink: true };
}
