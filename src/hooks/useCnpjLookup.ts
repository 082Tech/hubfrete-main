import { useState, useCallback } from 'react';

export interface CnpjData {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  telefone: string;
  email: string;
  situacao: string;
}

interface UseCnpjLookupReturn {
  data: CnpjData | null;
  isLoading: boolean;
  error: string | null;
  lookup: (cnpj: string) => Promise<CnpjData | null>;
  reset: () => void;
}

export function useCnpjLookup(): UseCnpjLookupReturn {
  const [data, setData] = useState<CnpjData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = useCallback(async (cnpj: string): Promise<CnpjData | null> => {
    // Clean CNPJ - remove special characters
    const cleanCnpj = cnpj.replace(/\D/g, '');
    
    if (cleanCnpj.length !== 14) {
      setError('CNPJ deve ter 14 dígitos');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('CNPJ não encontrado');
        }
        throw new Error('Erro ao buscar CNPJ');
      }

      const apiData = await response.json();
      
      const result: CnpjData = {
        cnpj: apiData.cnpj || cleanCnpj,
        razao_social: apiData.razao_social || '',
        nome_fantasia: apiData.nome_fantasia || '',
        logradouro: apiData.logradouro || '',
        numero: apiData.numero || '',
        complemento: apiData.complemento || '',
        bairro: apiData.bairro || '',
        municipio: apiData.municipio || '',
        uf: apiData.uf || '',
        cep: apiData.cep || '',
        telefone: apiData.ddd_telefone_1 || '',
        email: apiData.email || '',
        situacao: apiData.descricao_situacao_cadastral || '',
      };

      setData(result);
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
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { data, isLoading, error, lookup, reset };
}
