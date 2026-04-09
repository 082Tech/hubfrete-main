import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from './useUserContext';

export interface OnboardingStep {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  href: string;
}

export function useOnboardingChecklist() {
  const { empresa, userType, filiais } = useUserContext();
  const empresaId = empresa?.id;
  const portalPrefix = userType === 'embarcador' ? '/embarcador' : '/transportadora';

  // Fetch empresa details
  const { data: empresaData } = useQuery({
    queryKey: ['onboarding-empresa', empresaId],
    queryFn: async () => {
      if (!empresaId) return null;
      const { data } = await supabase
        .from('empresas')
        .select('cnpj_matriz, razao_social, nome_fantasia, dados_bancarios, inscricao_estadual, email, telefone')
        .eq('id', empresaId)
        .single();
      return data;
    },
    enabled: !!empresaId,
  });

  // Fetch veiculos count (transportadora only)
  const { data: veiculosCount } = useQuery({
    queryKey: ['onboarding-veiculos', empresaId],
    queryFn: async () => {
      if (!empresaId) return 0;
      const { count } = await supabase
        .from('veiculos')
        .select('id', { count: 'exact', head: true })
        .eq('empresa_id', empresaId);
      return count || 0;
    },
    enabled: !!empresaId && userType === 'transportadora',
  });

  // Fetch motoristas count (transportadora only)
  const { data: motoristasCount } = useQuery({
    queryKey: ['onboarding-motoristas', empresaId],
    queryFn: async () => {
      if (!empresaId) return 0;
      const { count } = await supabase
        .from('motoristas')
        .select('id', { count: 'exact', head: true })
        .eq('empresa_id', empresaId);
      return count || 0;
    },
    enabled: !!empresaId && userType === 'transportadora',
  });

  // Fetch contatos count (embarcador only)
  const { data: contatosCount } = useQuery({
    queryKey: ['onboarding-contatos', empresaId],
    queryFn: async () => {
      if (!empresaId) return 0;
      const { count } = await supabase
        .from('contatos_destino')
        .select('id', { count: 'exact', head: true })
        .eq('empresa_id', empresaId);
      return count || 0;
    },
    enabled: !!empresaId && userType === 'embarcador',
  });

  const steps = useMemo<OnboardingStep[]>(() => {
    if (!empresaData || !userType) return [];

    const hasBasicData = !!(empresaData.cnpj_matriz && empresaData.razao_social);
    const hasFilial = filiais.length > 0;

    if (userType === 'embarcador') {
      return [
        {
          id: 'dados-empresa',
          label: 'Dados da Empresa',
          description: 'Preencha CNPJ, razão social e dados de contato',
          completed: hasBasicData,
          href: `${portalPrefix}/dados-empresa`,
        },
        {
          id: 'filial',
          label: 'Cadastrar Filial',
          description: 'Adicione pelo menos uma filial com endereço',
          completed: hasFilial,
          href: `${portalPrefix}/filiais`,
        },
        {
          id: 'contato-destino',
          label: 'Cadastrar Destinatário',
          description: 'Adicione pelo menos um contato de destino',
          completed: (contatosCount || 0) > 0,
          href: `${portalPrefix}/contatos`,
        },
      ];
    }

    // Transportadora
    const bankData = empresaData.dados_bancarios as Record<string, any> | null;
    const hasBankAccount = !!(bankData && bankData.banco && bankData.agencia && bankData.conta);

    return [
      {
        id: 'dados-empresa',
        label: 'Dados da Empresa',
        description: 'Preencha CNPJ, razão social e dados de contato',
        completed: hasBasicData,
        href: `${portalPrefix}/dados-empresa`,
      },
      {
        id: 'conta-bancaria',
        label: 'Conta Bancária',
        description: 'Configure os dados bancários para recebimento',
        completed: hasBankAccount,
        href: `${portalPrefix}/conta-bancaria`,
      },
      {
        id: 'filial',
        label: 'Cadastrar Filial',
        description: 'Adicione pelo menos uma filial com endereço',
        completed: hasFilial,
        href: `${portalPrefix}/filiais`,
      },
      {
        id: 'veiculo',
        label: 'Cadastrar Veículo',
        description: 'Adicione pelo menos um veículo à sua frota',
        completed: (veiculosCount || 0) > 0,
        href: `${portalPrefix}/frota`,
      },
      {
        id: 'motorista',
        label: 'Cadastrar Motorista',
        description: 'Adicione pelo menos um motorista',
        completed: (motoristasCount || 0) > 0,
        href: `${portalPrefix}/motoristas`,
      },
    ];
  }, [empresaData, userType, filiais, contatosCount, veiculosCount, motoristasCount, portalPrefix]);

  const completedCount = steps.filter(s => s.completed).length;
  const totalCount = steps.length;
  const pendingCount = totalCount - completedCount;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isComplete = pendingCount === 0 && totalCount > 0;

  return { steps, completedCount, totalCount, pendingCount, progress, isComplete };
}
