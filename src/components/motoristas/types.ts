// Types for Motorista CRUD

export interface MotoristaFormData {
  // Credenciais de Acesso (para app mobile)
  auth_email: string;
  auth_password: string;
  auth_password_confirm: string;
  
  // Etapa 1: Dados Pessoais
  nome_completo: string;
  cpf: string;
  email: string;
  telefone: string;
  uf: string;
  tipo_cadastro: 'autonomo' | 'frota';
  foto_url: string | null;
  
  // CNH
  cnh: string;
  categoria_cnh: string;
  validade_cnh: string;
  cnh_tem_qrcode: boolean;
  cnh_digital_url: string | null;
  
  // Comprovante de Endereço
  comprovante_endereco_url: string | null;
  comprovante_endereco_titular_nome: string;
  comprovante_endereco_titular_doc_url: string | null;
  
  // Comprovante de Vínculo (se frota)
  comprovante_vinculo_url: string | null;
  
  // Etapa 2: Ajudante
  possui_ajudante: boolean;
  ajudante_nome: string;
  ajudante_cpf: string;
  ajudante_telefone: string;
  ajudante_tipo_cadastro: 'autonomo' | 'frota';
  ajudante_comprovante_vinculo_url: string | null;
  
  // Etapa 3: Veículo PF
  veiculo_id: string;
  veiculo_uf: string;
  veiculo_documento_url: string | null;
  veiculo_antt_rntrc: string;
  veiculo_comprovante_endereco_proprietario_url: string | null;
  veiculo_proprietario_nome: string;
  veiculo_proprietario_cpf_cnpj: string;
  
  // Etapa 4: Carroceria
  carroceria_id: string;
  
  // Referências
  referencias: MotoristaReferencia[];
}

export interface MotoristaReferencia {
  id?: string;
  tipo: 'pessoal' | 'comercial';
  ordem: number;
  nome: string;
  telefone: string;
  empresa?: string;
  ramo?: string;
}

export interface MotoristaCompleto {
  id: string;
  nome_completo: string;
  cpf: string;
  email: string | null;
  telefone: string | null;
  uf: string | null;
  tipo_cadastro: 'autonomo' | 'frota' | null;
  cnh: string;
  categoria_cnh: string;
  validade_cnh: string;
  cnh_tem_qrcode: boolean | null;
  cnh_digital_url: string | null;
  comprovante_endereco_url: string | null;
  comprovante_endereco_titular_nome: string | null;
  comprovante_endereco_titular_doc_url: string | null;
  comprovante_vinculo_url: string | null;
  possui_ajudante: boolean | null;
  ativo: boolean;
  foto_url: string | null;
  veiculos: VeiculoSimples[];
  carrocerias: CarroceriaSimples[];
  ajudantes: AjudanteSimples[];
  referencias: MotoristaReferencia[];
}

export interface VeiculoSimples {
  id: string;
  placa: string;
  tipo: string;
  carroceria: string;
  marca: string | null;
  modelo: string | null;
  uf: string | null;
  antt_rntrc: string | null;
  documento_veiculo_url: string | null;
  comprovante_endereco_proprietario_url: string | null;
  proprietario_nome: string | null;
  proprietario_cpf_cnpj: string | null;
  motorista_id: string | null;
  carroceria_integrada: boolean;
  capacidade_kg: number | null;
  capacidade_m3: number | null;
}

// Tipos de veículo que tipicamente têm carroceria integrada
export const VEICULOS_COM_CARROCERIA_INTEGRADA = ['vuc', 'tres_quartos', 'toco', 'truck', 'bitruck'];

// Tipos de veículo que tipicamente precisam carroceria separada
export const VEICULOS_SEM_CARROCERIA_INTEGRADA = ['carreta', 'carreta_ls', 'bitrem', 'rodotrem', 'vanderleia'];

export interface CarroceriaSimples {
  id: string;
  placa: string;
  tipo: string;
  marca: string | null;
  modelo: string | null;
  capacidade_kg: number | null;
  capacidade_m3: number | null;
  motorista_id: string | null;
}

export interface AjudanteSimples {
  id: string;
  nome: string;
  cpf: string;
  telefone: string | null;
  tipo_cadastro: 'autonomo' | 'frota';
  comprovante_vinculo_url: string | null;
  ativo: boolean;
}

export const ESTADOS_BRASIL = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
];

export const CATEGORIAS_CNH = ['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'];

export const tipoVeiculoLabels: Record<string, string> = {
  truck: 'Truck',
  toco: 'Toco',
  tres_quartos: '3/4',
  vuc: 'VUC',
  carreta: 'Carreta',
  carreta_ls: 'Carreta LS',
  bitrem: 'Bitrem',
  rodotrem: 'Rodotrem',
  vanderleia: 'Vanderleia',
  bitruck: 'Bitruck',
};

export const tipoCarroceriaLabels: Record<string, string> = {
  aberta: 'Aberta',
  fechada_bau: 'Baú',
  graneleira: 'Graneleira',
  tanque: 'Tanque',
  sider: 'Sider',
  frigorifico: 'Frigorífico',
  cegonha: 'Cegonha',
  prancha: 'Prancha',
  container: 'Container',
  graneleiro: 'Graneleiro',
  grade_baixa: 'Grade Baixa',
  cacamba: 'Caçamba',
  plataforma: 'Plataforma',
  bau: 'Baú',
  bau_frigorifico: 'Baú Frigorífico',
  bau_refrigerado: 'Baú Refrigerado',
  silo: 'Silo',
  gaiola: 'Gaiola',
  bug_porta_container: 'Bug Porta Container',
  munk: 'Munk',
  apenas_cavalo: 'Apenas Cavalo',
  cavaqueira: 'Cavaqueira',
  hopper: 'Hopper',
};

export const getInitialFormData = (): MotoristaFormData => ({
  auth_email: '',
  auth_password: '',
  auth_password_confirm: '',
  nome_completo: '',
  cpf: '',
  email: '',
  telefone: '',
  uf: '',
  tipo_cadastro: 'frota',
  foto_url: null,
  cnh: '',
  categoria_cnh: '',
  validade_cnh: '',
  cnh_tem_qrcode: false,
  cnh_digital_url: null,
  comprovante_endereco_url: null,
  comprovante_endereco_titular_nome: '',
  comprovante_endereco_titular_doc_url: null,
  comprovante_vinculo_url: null,
  possui_ajudante: false,
  ajudante_nome: '',
  ajudante_cpf: '',
  ajudante_telefone: '',
  ajudante_tipo_cadastro: 'autonomo',
  ajudante_comprovante_vinculo_url: null,
  veiculo_id: '',
  veiculo_uf: '',
  veiculo_documento_url: null,
  veiculo_antt_rntrc: '',
  veiculo_comprovante_endereco_proprietario_url: null,
  veiculo_proprietario_nome: '',
  veiculo_proprietario_cpf_cnpj: '',
  carroceria_id: '',
  referencias: [
    { tipo: 'pessoal', ordem: 1, nome: '', telefone: '' },
    { tipo: 'pessoal', ordem: 2, nome: '', telefone: '' },
  ],
});
