// Input mask utilities for Brazilian documents

export const masks = {
  cpf: (value: string): string => {
    return value
      .replace(/\D/g, '')
      .slice(0, 11)
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  },

  cnpj: (value: string): string => {
    return value
      .replace(/\D/g, '')
      .slice(0, 14)
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  },

  cpfCnpj: (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 11) {
      return masks.cpf(value);
    }
    return masks.cnpj(value);
  },

  phone: (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 10) {
      // Telefone fixo: (00) 0000-0000
      return digits
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
    }
    // Celular: (00) 00000-0000
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
  },

  cnh: (value: string): string => {
    return value.replace(/\D/g, '').slice(0, 11);
  },

  cep: (value: string): string => {
    return value
      .replace(/\D/g, '')
      .slice(0, 8)
      .replace(/(\d{5})(\d{1,3})$/, '$1-$2');
  },

  plate: (value: string): string => {
    // Suporta placas antigas (ABC-1234) e Mercosul (ABC1D23)
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
    
    if (cleaned.length <= 3) {
      return cleaned;
    }
    
    // Formato antigo ABC-1234
    if (/^[A-Z]{3}[0-9]{4}$/.test(cleaned)) {
      return cleaned.replace(/([A-Z]{3})(\d{4})/, '$1-$2');
    }
    
    // Formato Mercosul ABC1D23
    if (/^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(cleaned)) {
      return cleaned;
    }
    
    // Durante digitação
    if (cleaned.length > 3) {
      const letters = cleaned.slice(0, 3);
      const rest = cleaned.slice(3);
      // Verifica se é formato Mercosul (4º caractere é número, 5º é letra)
      if (rest.length >= 2 && /^[0-9][A-Z]/.test(rest)) {
        return letters + rest;
      }
      // Formato antigo
      return letters + '-' + rest;
    }
    
    return cleaned;
  },

  renavam: (value: string): string => {
    return value.replace(/\D/g, '').slice(0, 11);
  },

  rntrc: (value: string): string => {
    return value.replace(/\D/g, '').slice(0, 8);
  },
};

// Unmask functions to get raw values
export const unmask = {
  digits: (value: string): string => value.replace(/\D/g, ''),
  alphanumeric: (value: string): string => value.replace(/[^A-Za-z0-9]/g, ''),
};

// Currency formatting helpers (BRL)
export const currencyMask = {
  /** Format a number to BRL display: 1234.56 → "1.234,56" */
  format: (value: number | null | undefined): string => {
    if (value == null || value === 0) return '';
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },
  /** Parse a BRL formatted string back to number: "1.234,56" → 1234.56 */
  parse: (text: string): number => {
    if (!text) return 0;
    // Remove thousand separators (dots), replace comma with dot
    const cleaned = text.replace(/[^\d,]/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : Math.round(num * 100) / 100;
  },
  /** Apply mask as user types */
  apply: (raw: string): string => {
    // Keep only digits
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    const cents = parseInt(digits, 10);
    const reais = cents / 100;
    return reais.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },
};

// Weight formatting helpers (kg with up to 4 decimal places)
export const weightMask = {
  /** Format a number to weight display: 15000.5 → "15.000,5" */
  format: (value: number | null | undefined): string => {
    if (value == null || value === 0) return '';
    // Show up to 4 decimals, trim trailing zeros
    const formatted = value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 4 });
    return formatted;
  },
  /** Parse a BR formatted string back to number: "15.000,5" → 15000.5 */
  parse: (text: string): number => {
    if (!text) return 0;
    // Remove thousand separators (dots), replace comma with dot
    const cleaned = text.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : Math.max(0, parseFloat(num.toFixed(4)));
  },
  /** Apply mask as user types - allows comma for decimals */
  apply: (raw: string): string => {
    // Allow digits, one comma, and up to 4 decimal places
    let cleaned = raw.replace(/[^\d,]/g, '');
    // Only allow one comma
    const parts = cleaned.split(',');
    if (parts.length > 2) {
      cleaned = parts[0] + ',' + parts.slice(1).join('');
    }
    // Limit decimal places to 4
    if (parts.length === 2 && parts[1].length > 4) {
      cleaned = parts[0] + ',' + parts[1].slice(0, 4);
    }
    // Add thousand separators to integer part
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    if (parts.length === 2) {
      return intPart + ',' + parts[1].slice(0, 4);
    }
    return intPart;
  },
};

// Validation functions
export const validators = {
  cpf: (value: string): boolean => {
    const digits = value.replace(/\D/g, '');
    if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false;
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(digits[i]) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(digits[9])) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(digits[i]) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    return remainder === parseInt(digits[10]);
  },

  cnpj: (value: string): boolean => {
    const digits = value.replace(/\D/g, '');
    if (digits.length !== 14 || /^(\d)\1+$/.test(digits)) return false;
    
    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(digits[i]) * weights1[i];
    }
    let remainder = sum % 11;
    const digit1 = remainder < 2 ? 0 : 11 - remainder;
    if (digit1 !== parseInt(digits[12])) return false;
    
    sum = 0;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(digits[i]) * weights2[i];
    }
    remainder = sum % 11;
    const digit2 = remainder < 2 ? 0 : 11 - remainder;
    return digit2 === parseInt(digits[13]);
  },

  phone: (value: string): boolean => {
    const digits = value.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 11;
  },

  cnh: (value: string): boolean => {
    const digits = value.replace(/\D/g, '');
    return digits.length === 11;
  },

  cep: (value: string): boolean => {
    const digits = value.replace(/\D/g, '');
    return digits.length === 8;
  },

  plate: (value: string): boolean => {
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    // Formato antigo: ABC1234 ou Mercosul: ABC1D23
    return /^[A-Z]{3}[0-9]{4}$/.test(cleaned) || /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(cleaned);
  },
};

export type MaskType = keyof typeof masks;
