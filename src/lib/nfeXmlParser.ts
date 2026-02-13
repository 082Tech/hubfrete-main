/**
 * Utility to parse NF-e XML and extract key information.
 * Extracts chave de acesso (<chNFe>) and other metadata.
 */

export interface ParsedNfe {
  chaveAcesso: string | null;
  numero: string | null;
  valor: number | null;
  remetenteCnpj: string | null;
  remetenteRazaoSocial: string | null;
  destinatarioCnpj: string | null;
  destinatarioRazaoSocial: string | null;
  pesoBruto: number | null;
  dataEmissao: string | null;
}

/**
 * Parse NF-e XML content and extract key fields.
 */
export function parseNfeXml(xmlContent: string): ParsedNfe {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'text/xml');

  const getTagValue = (tagName: string, parent?: Element) => {
    const elements = (parent || doc).getElementsByTagName(tagName);
    return elements.length > 0 ? elements[0].textContent?.trim() || null : null;
  };

  // Try to extract chave de acesso from <chNFe> tag (inside <protNFe> or <infProt>)
  let chaveAcesso: string | null = getTagValue('chNFe');

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

  // Extract remetente (emit)
  const emit = doc.getElementsByTagName('emit')[0];
  const remetenteCnpj = emit ? getTagValue('CNPJ', emit) : null;
  const remetenteRazaoSocial = emit ? getTagValue('xNome', emit) : null;

  // Extract destinatario (dest)
  const dest = doc.getElementsByTagName('dest')[0];
  const destinatarioCnpj = dest ? getTagValue('CNPJ', dest) : null;
  const destinatarioRazaoSocial = dest ? getTagValue('xNome', dest) : null;

  // Extract peso bruto
  const pesoB = getTagValue('pesoB');
  const pesoBruto = pesoB ? parseFloat(pesoB) : null;

  // Extract data emissao
  const dataEmissao = getTagValue('dhEmi');

  // Extract numero from <nNF>
  const numero = getTagValue('nNF');

  // Extract valor total from <vNF>
  const vNF = getTagValue('vNF');
  const valor = vNF ? parseFloat(vNF) : null;

  return { 
    chaveAcesso, 
    numero, 
    valor, 
    remetenteCnpj, 
    remetenteRazaoSocial, 
    destinatarioCnpj, 
    destinatarioRazaoSocial, 
    pesoBruto, 
    dataEmissao 
  };
}
