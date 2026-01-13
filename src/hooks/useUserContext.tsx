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

export interface UserContextData {
  userType: UserType;
  cargo: UserCargo;
  empresa: Empresa | null;
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
      setFiliais([]);
      setFilialAtivaState(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Check user type by membership tables
      const [
        { data: embarcador },
        { data: transportadora },
        { data: motorista }
      ] = await Promise.all([
        supabase.from('embarcadores').select('id').eq('user_id', user.id).maybeSingle(),
        supabase.from('transportadoras').select('id').eq('user_id', user.id).maybeSingle(),
        supabase.from('motoristas').select('id').eq('user_id', user.id).maybeSingle(),
      ]);

      const type: UserType = embarcador
        ? 'embarcador'
        : transportadora
          ? 'transportadora'
          : motorista
            ? 'motorista'
            : null;

      setUserType(type);

      // Load company structure for embarcador/transportadora
      if (type === 'embarcador' || type === 'transportadora') {
        // Get Usuario record and their filiais
        const { data: usuarioData } = await supabase
          .from('Usuarios')
          .select(`
            id,
            cargo,
            Usuarios_Filiais (
              cargo_na_filial,
              filial_id,
              Filiais (
                id,
                nome,
                cnpj,
                empresa_id,
                Empresas (
                  id,
                  tipo,
                  classe
                )
              )
            )
          `)
          .eq('auth_user_id', user.id)
          .single();

        if (usuarioData) {
          // Set cargo (highest privilege if multiple)
          const cargos = usuarioData.Usuarios_Filiais?.map(uf => uf.cargo_na_filial) || [];
          setCargo(cargos.includes('ADMIN') ? 'ADMIN' : cargos[0] as UserCargo);

          // Extract unique filiais
          const filiaisData: Filial[] = [];
          let empresaData: Empresa | null = null;

          usuarioData.Usuarios_Filiais?.forEach((uf: any) => {
            if (uf.Filiais) {
              filiaisData.push({
                id: uf.Filiais.id,
                nome: uf.Filiais.nome,
                cnpj: uf.Filiais.cnpj,
              });
              if (!empresaData && uf.Filiais.Empresas) {
                empresaData = {
                  id: uf.Filiais.Empresas.id,
                  tipo: uf.Filiais.Empresas.tipo,
                  classe: uf.Filiais.Empresas.classe,
                };
              }
            }
          });

          setFiliais(filiaisData);
          setEmpresa(empresaData);

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
