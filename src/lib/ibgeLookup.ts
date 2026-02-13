/**
 * IBGE Municipal Code Lookup
 * Fetches 7-digit IBGE codes from the IBGE API based on city name + UF
 */

interface MunicipioIBGE {
  id: number;
  nome: string;
}

// Cache to avoid repeated API calls
const cache = new Map<string, MunicipioIBGE[]>();

function normalizeStr(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

/**
 * Fetches the 7-digit IBGE municipal code for a given city and state.
 * Returns the code as a string, or null if not found.
 */
export async function getCodigoMunicipioIBGE(
  cidade: string,
  uf: string
): Promise<string | null> {
  if (!cidade || !uf) return null;

  const ufUpper = uf.toUpperCase().trim();
  const cidadeNorm = normalizeStr(cidade);

  try {
    let municipios = cache.get(ufUpper);

    if (!municipios) {
      const response = await fetch(
        `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${ufUpper}/municipios`
      );

      if (!response.ok) return null;

      municipios = (await response.json()) as MunicipioIBGE[];
      cache.set(ufUpper, municipios);
    }

    // Exact match first
    const exact = municipios.find(
      (m) => normalizeStr(m.nome) === cidadeNorm
    );
    if (exact) return String(exact.id);

    // Partial match fallback
    const partial = municipios.find(
      (m) =>
        normalizeStr(m.nome).includes(cidadeNorm) ||
        cidadeNorm.includes(normalizeStr(m.nome))
    );
    if (partial) return String(partial.id);

    return null;
  } catch (error) {
    console.error('Erro ao buscar código IBGE:', error);
    return null;
  }
}
