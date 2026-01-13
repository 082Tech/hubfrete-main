import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type UserType = 'embarcador' | 'transportadora' | 'motorista' | null;
export type UserCargo = 'ADMIN' | 'OPERADOR' | null;

export interface Filial {
  id: number;
  nome: string | null;
  cnpj: string | null;
}

export interface Empresa {
  id: number;
  tipo: 'EMBARCADOR' | 'TRANSPORTADORA';
  classe: string;
}

export interface CompanyInfo {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
}

export interface UserContextData {
  userType: UserType;
  cargo: UserCargo;
  empresa: Empresa | null;
  companyInfo: CompanyInfo | null;
  filiais: Filial[];
  filialAtiva: Filial | null;
  loading: boolean;
  setFilialAtiva: (filial: Filial) => void;
  refresh: () => Promise<void>;
}

const UserContext = createContext<UserContextData | undefined>(undefined);

export function UserContextProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [userType, setUserType] = useState<UserType>(null);
  const [cargo, setCargo] = useState<UserCargo>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [filialAtiva, setFilialAtivaState] = useState<Filial | null>(null);
  const [loading, setLoading] = useState(true);

  const setFilialAtiva = useCallback((filial: Filial) => {
    setFilialAtivaState(filial);
    // Persist to localStorage for page refreshes
    localStorage.setItem('hubfrete_filial_ativa', JSON.stringify(filial));
  }, []);

  const loadUserContext = useCallback(async () => {
    if (!user) {
      setUserType(null);
      setCargo(null);
      setEmpresa(null);
      setCompanyInfo(null);
      setFiliais([]);
      setFilialAtivaState(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Check if user is a motorista first
      const { data: motorista } = await supabase
        .from('motoristas')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (motorista) {
        setUserType('motorista');
        setLoading(false);
        return;
      }

      // Get empresa tipo using database function
      const { data: empresaTipo } = await supabase
        .rpc('get_user_empresa_tipo', { _user_id: user.id });

      const type: UserType = empresaTipo === 'EMBARCADOR'
        ? 'embarcador'
        : empresaTipo === 'TRANSPORTADORA'
          ? 'transportadora'
          : null;

      setUserType(type);

      // Load company structure for embarcador/transportadora
      if (type) {
        // Get Usuario record and their filiais
        const { data: usuarioData } = await supabase
          .from('usuarios')
          .select(`
            id,
            cargo,
            usuarios_filiais (
              cargo_na_filial,
              filial_id,
              filiais (
                id,
                nome,
                cnpj,
                empresa_id,
                empresas (
                  id,
                  tipo,
                  classe
                )
              )
            )
          `)
          .eq('auth_user_id', user.id)
          .maybeSingle();

        if (usuarioData) {
          // Set cargo (highest privilege if multiple)
          const cargos = usuarioData.usuarios_filiais?.map((uf: any) => uf.cargo_na_filial) || [];
          setCargo(cargos.includes('ADMIN') ? 'ADMIN' : cargos[0] as UserCargo);

          // Extract unique filiais and empresa info
          const filiaisData: Filial[] = [];
          let empresaData: Empresa | null = null;

          usuarioData.usuarios_filiais?.forEach((uf: any) => {
            if (uf.filiais) {
              filiaisData.push({
                id: uf.filiais.id,
                nome: uf.filiais.nome,
                cnpj: uf.filiais.cnpj,
              });
              if (!empresaData && uf.filiais.empresas) {
                empresaData = {
                  id: uf.filiais.empresas.id,
                  tipo: uf.filiais.empresas.tipo,
                  classe: uf.filiais.empresas.classe,
                };
              }
            }
          });

          setFiliais(filiaisData);
          setEmpresa(empresaData);

          // Get company info from first filial
          if (filiaisData.length > 0 && usuarioData.usuarios_filiais?.[0]?.filiais) {
            const firstFilial = usuarioData.usuarios_filiais[0].filiais as any;
            setCompanyInfo({
              id: String(empresaData?.id || 0),
              razao_social: firstFilial.nome || 'Empresa',
              nome_fantasia: firstFilial.nome,
              cnpj: firstFilial.cnpj || '',
            });
          }

          // Try to restore filial ativa from localStorage, or use first one
          const storedFilial = localStorage.getItem('hubfrete_filial_ativa');
          if (storedFilial) {
            try {
              const parsed = JSON.parse(storedFilial);
              const found = filiaisData.find(f => f.id === parsed.id);
              if (found) {
                setFilialAtivaState(found);
              } else if (filiaisData.length > 0) {
                setFilialAtivaState(filiaisData[0]);
              }
            } catch {
              if (filiaisData.length > 0) {
                setFilialAtivaState(filiaisData[0]);
              }
            }
          } else if (filiaisData.length > 0) {
            setFilialAtivaState(filiaisData[0]);
          }
        }
      }
    } catch (error) {
      console.error('Error loading user context:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      loadUserContext();
    }
  }, [authLoading, loadUserContext]);

  return (
    <UserContext.Provider
      value={{
        userType,
        cargo,
        empresa,
        companyInfo,
        filiais,
        filialAtiva,
        loading: authLoading || loading,
        setFilialAtiva,
        refresh: loadUserContext,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUserContext() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUserContext must be used within a UserContextProvider');
  }
  return context;
}
