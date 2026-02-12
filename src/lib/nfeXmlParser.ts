/**
 * Utility to parse NF-e XML and extract key information.
 * Extracts chave de acesso (<chNFe>) and other metadata.
 */

export interface ParsedNfe {
  chaveAcesso: string | null;
  numero: string | null;
  valor: number | null;
}

/**
 * Parse NF-e XML content and extract key fields.
 */
export function parseNfeXml(xmlContent: string): ParsedNfe {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'text/xml');

  // Try to extract chave de acesso from <chNFe> tag (inside <protNFe> or <infProt>)
  let chaveAcesso: string | null = null;
  const chNFeElements = doc.getElementsByTagName('chNFe');
  if (chNFeElements.length > 0) {
    chaveAcesso = chNFeElements[0].textContent?.trim() || null;
  }

  // If not found in <chNFe>, try the Id attribute of <infNFe> (format: "NFe" + 44 digits)
  if (!chaveAcesso) {
    const infNFeElements = doc.getElementsByTagName('infNFe');
    if (infNFeElements.length > 0) {
      const id = infNFeElements[0].getAttribute('Id');
      if (id && id.startsWith('NFe')) {
        chaveAcesso = id.replace('NFe', '');
      }
    }
  }

  // Extract numero from <nNF>
  let numero: string | null = null;
  const nNFElements = doc.getElementsByTagName('nNF');
  if (nNFElements.length > 0) {
    numero = nNFElements[0].textContent?.trim() || null;
  }

  // Extract valor total from <vNF>
  let valor: number | null = null;
  const vNFElements = doc.getElementsByTagName('vNF');
  if (vNFElements.length > 0) {
    const valorStr = vNFElements[0].textContent?.trim();
    if (valorStr) {
      valor = parseFloat(valorStr);
      if (isNaN(valor)) valor = null;
    }
  }

  return { chaveAcesso, numero, valor };
}
