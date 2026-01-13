import { useState, useCallback } from 'react';

export interface GeocodedAddress {
  logradouro: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  latitude: number;
  longitude: number;
  displayName: string;
}

interface UseReverseGeocodeReturn {
  address: GeocodedAddress | null;
  isLoading: boolean;
  error: string | null;
  reverseGeocode: (lat: number, lng: number) => Promise<GeocodedAddress | null>;
  reset: () => void;
}

export function useReverseGeocode(): UseReverseGeocodeReturn {
  const [address, setAddress] = useState<GeocodedAddress | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<GeocodedAddress | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Using Nominatim (OpenStreetMap's geocoding service)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=pt-BR`,
        {
          headers: {
            'User-Agent': 'HubFrete/1.0',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao buscar endereço');
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const addr = data.address || {};
      
      const result: GeocodedAddress = {
        logradouro: addr.road || addr.pedestrian || addr.street || '',
        bairro: addr.suburb || addr.neighbourhood || addr.district || '',
        cidade: addr.city || addr.town || addr.municipality || addr.village || '',
        estado: addr.state || '',
        cep: addr.postcode || '',
        latitude: lat,
        longitude: lng,
        displayName: data.display_name || '',
      };

      // Map state names to UF codes
      const stateMap: Record<string, string> = {
        'Acre': 'AC', 'Alagoas': 'AL', 'Amapá': 'AP', 'Amazonas': 'AM',
        'Bahia': 'BA', 'Ceará': 'CE', 'Distrito Federal': 'DF', 'Espírito Santo': 'ES',
        'Goiás': 'GO', 'Maranhão': 'MA', 'Mato Grosso': 'MT', 'Mato Grosso do Sul': 'MS',
        'Minas Gerais': 'MG', 'Pará': 'PA', 'Paraíba': 'PB', 'Paraná': 'PR',
        'Pernambuco': 'PE', 'Piauí': 'PI', 'Rio de Janeiro': 'RJ', 'Rio Grande do Norte': 'RN',
        'Rio Grande do Sul': 'RS', 'Rondônia': 'RO', 'Roraima': 'RR', 'Santa Catarina': 'SC',
        'São Paulo': 'SP', 'Sergipe': 'SE', 'Tocantins': 'TO',
      };

      if (stateMap[result.estado]) {
        result.estado = stateMap[result.estado];
      }

      setAddress(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setAddress(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { address, isLoading, error, reverseGeocode, reset };
}
