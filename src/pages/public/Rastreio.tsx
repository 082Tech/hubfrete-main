import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Search, Truck, MapPin, Calendar, Package, AlertCircle, ArrowRight, Scale, Car } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTheme } from 'next-themes';
import { PublicTrackingMap } from '@/components/maps/PublicTrackingMap';
import { useEffect } from 'react';

interface TrackingData {
    nfe: {
        numero: string;
        serie: string;
        emitente: string;
        destinatario: string;
        valor: number;
    } | null;
    entrega: {
        id: string;
        status: string;
        previsao_entrega: string | null;
        motorista: {
            nome: string | null;
            foto: string | null;
        } | null;
        veiculo: {
            placa: string | null;
            marca: string | null;
            modelo: string | null;
            tipo: string | null;
            carroceria: string | null;
            capacidade_kg: number | null;
            capacidade_m3: number | null;
        } | null;
        placa_veiculo: string | null;
        localizacao_atual: {
            latitude: number;
            longitude: number;
            updated_at: string;
        } | null;
        carga: {
            descricao: string | null;
            peso: number | null;
            peso_total_carga: number | null;
            volume: number | null;
            valor: number | null;
            quantidade: number | null;
        } | null;
    };
    eventos: {
        id: string;
        tipo: string;
        descricao: string;
        data: string;
        localizacao: string | null;
    }[];
}

export default function Rastreio() {
    const [searchParams, setSearchParams] = useSearchParams();
    // Default to 'codigo' param, fallback to 'chave' for backward-compat (though logic changed)
    const [trackingCode, setTrackingCode] = useState(searchParams.get('codigo') || searchParams.get('chave') || '');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<TrackingData | null>(null);
    const [searched, setSearched] = useState(false);
    const { setTheme } = useTheme();

    // Force light mode on mount, restore on unmount
    useEffect(() => {
        // Save current preference
        const previousTheme = localStorage.getItem('theme');

        // Force light
        setTheme('light');

        return () => {
            // Restore preference
            if (previousTheme) {
                setTheme(previousTheme);
            } else {
                setTheme('system');
            }
        };
    }, [setTheme]);

    // Auto-search if code is present in URL on load
    useEffect(() => {
        const code = searchParams.get('codigo') || searchParams.get('chave');
        if (code && !searched) {
            handleSearch(undefined, code);
        }
    }, []);

    const handleSearch = async (e?: React.FormEvent, codeOverride?: string) => {
        e?.preventDefault();

        const codeToSearch = codeOverride || trackingCode;

        if (!codeToSearch) {
            toast.error('Digite o código de rastreio');
            return;
        }

        setLoading(true);
        setSearched(true);
        setData(null);

        // Update URL
        setSearchParams({ codigo: codeToSearch });

        try {
            const { data: result, error } = await supabase.rpc('get_public_tracking_info', {
                _tracking_code: codeToSearch
            });

            if (error) throw error;

            if ((result as any).error) {
                toast.error((result as any).error);
                return;
            }

            setData(result as unknown as TrackingData);
        } catch (error) {
            console.error('Error fetching tracking info:', error);
            toast.error('Erro ao buscar informações de rastreio');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ENTREGUE': return 'text-green-600 bg-green-100';
            case 'EM_ROTA': return 'text-blue-600 bg-blue-100';
            case 'PENDENTE': return 'text-yellow-600 bg-yellow-100';
            case 'CANCELADO': return 'text-red-600 bg-red-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'ENTREGUE': return 'Entregue';
            case 'EM_ROTA': return 'Em Rota';
            case 'PENDENTE': return 'Pendente';
            case 'CANCELADO': return 'Cancelado';
            case 'AGUARDANDO_COLETA': return 'Aguardando Coleta';
            default: return status;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 py-4 px-6 md:px-12 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary rounded-lg">
                        <Truck className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <span className="text-xl font-bold text-gray-900">
                        Hub<span className="text-primary">Frete</span> Rastreio
                    </span>
                </div>
            </header>

            <main className="flex-1 container mx-auto px-4 py-8 md:py-16 max-w-4xl">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">Rastreie sua encomenda</h1>
                    <p className="text-gray-600">Digite o código de rastreio recebido para acompanhar o status da entrega.</p>
                </div>

                {/* Search Box */}
                <Card className="mb-8 shadow-lg border-primary/10">
                    <CardContent className="pt-6">
                        <form onSubmit={(e) => handleSearch(e)} className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <Input
                                    type="text"
                                    placeholder="Código de Rastreio (ex: A1B2C3D4E5F6)"
                                    className="pl-10 h-12 text-lg uppercase"
                                    value={trackingCode}
                                    onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                                />
                            </div>
                            <Button type="submit" size="lg" className="h-12 px-8 text-lg" disabled={loading}>
                                {loading ? 'Buscando...' : 'Rastrear'}
                                {!loading && <ArrowRight className="ml-2 w-5 h-5" />}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Results */}
                {data && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Status Card */}
                        <Card>
                            <CardHeader className="border-b border-gray-100 bg-gray-50/50">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <CardTitle className="text-xl mb-1">Status da Entrega</CardTitle>
                                        <CardDescription>
                                            {data.nfe ? `NF-e: ${data.nfe.numero} - Série ${data.nfe.serie}` : 'Detalhes da entrega'}
                                        </CardDescription>
                                    </div>
                                    <span className={`px-4 py-2 rounded-full font-bold text-sm uppercase tracking-wide ${getStatusColor(data.entrega.status)}`}>
                                        {getStatusLabel(data.entrega.status)}
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    {data.nfe ? (
                                        <div className="space-y-6">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <span className="text-sm text-gray-500 block mb-1">Remetente</span>
                                                    <p className="font-medium text-gray-900">{data.nfe.emitente}</p>
                                                </div>
                                                <div>
                                                    <span className="text-sm text-gray-500 block mb-1">Destinatário</span>
                                                    <p className="font-medium text-gray-900">{data.nfe.destinatario}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 mb-6">
                                            <p className="text-sm text-yellow-800 flex items-center gap-2">
                                                <AlertCircle className="w-4 h-4" />
                                                Dados da Nota Fiscal não disponíveis
                                            </p>
                                        </div>
                                    )}

                                    {data.entrega.carga && (
                                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                                <Package className="w-4 h-4 text-primary" />
                                                Detalhes da Carga
                                            </h4>
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div className="col-span-2">
                                                    <span className="text-gray-500 block text-xs">Produto / Descrição</span>
                                                    <p className="font-medium text-gray-900">{data.entrega.carga.descricao || 'Não informado'}</p>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500 block text-xs">Peso</span>
                                                    <p className="font-medium text-gray-900">
                                                        {data.entrega.carga.peso ? `${data.entrega.carga.peso} kg` : '-'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500 block text-xs">Volume</span>
                                                    <p className="font-medium text-gray-900">
                                                        {data.entrega.carga.volume ? `${data.entrega.carga.volume} m³` : '-'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500 block text-xs">Quantidade</span>
                                                    <p className="font-medium text-gray-900">{data.entrega.carga.quantidade || '-'}</p>
                                                </div>

                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <span className="text-sm text-gray-500 block mb-1">Previsão de Entrega</span>
                                        <p className="font-medium text-gray-900 flex items-center gap-2 text-lg">
                                            <Calendar className="w-5 h-5 text-primary" />
                                            {data.entrega.previsao_entrega
                                                ? format(new Date(data.entrega.previsao_entrega), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                                                : 'Não informada'}
                                        </p>
                                    </div>

                                    {data.entrega.motorista && (
                                        <div className="bg-white border-2 border-dashed border-gray-200 p-4 rounded-xl flex items-center gap-4">
                                            {data.entrega.motorista.foto ? (
                                                <img
                                                    src={data.entrega.motorista.foto}
                                                    alt={data.entrega.motorista.nome || 'Motorista'}
                                                    className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm"
                                                />
                                            ) : (
                                                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center border-2 border-white shadow-sm">
                                                    <Truck className="w-8 h-8 text-gray-400" />
                                                </div>
                                            )}
                                            <div>
                                                <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Motorista Responsável</span>
                                                <p className="font-bold text-gray-900 text-lg">{data.entrega.motorista.nome}</p>
                                                {data.entrega.placa_veiculo && (
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded font-mono border border-gray-200">
                                                            {data.entrega.placa_veiculo}
                                                        </span>
                                                        {data.entrega.veiculo?.modelo && (
                                                            <span className="text-gray-500 text-sm font-medium">
                                                                {data.entrega.veiculo.modelo}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}


                                </div>
                            </CardContent>
                        </Card>

                        {/* Map */}
                        <Card className="overflow-hidden">
                            <CardHeader className="border-b border-gray-100 bg-gray-50/50">
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-primary" />
                                    <CardTitle>Localização em Tempo Real</CardTitle>
                                </div>
                            </CardHeader>
                            <div className="h-[400px] w-full relative">
                                <PublicTrackingMap
                                    latitude={data.entrega.localizacao_atual?.latitude}
                                    longitude={data.entrega.localizacao_atual?.longitude}
                                    lastUpdate={data.entrega.localizacao_atual?.updated_at}
                                />
                            </div>
                        </Card>

                        {/* Timeline */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Histórico de Eventos</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="relative pl-8 md:pl-12 space-y-8 before:absolute before:left-3 md:before:left-5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                                    {data.eventos.map((evento, index) => (
                                        <div key={evento.id} className="relative">
                                            {/* Dot */}
                                            <div className={`absolute -left-8 md:-left-[3.25rem] w-6 h-6 rounded-full border-4 border-white flex items-center justify-center
                        ${index === 0 ? 'bg-primary ring-4 ring-primary/20' : 'bg-gray-300'}`}>
                                                {index === 0 && <div className="w-2 h-2 bg-white rounded-full" />}
                                            </div>

                                            {/* Content */}
                                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-2">
                                                <div>
                                                    <h4 className={`font-semibold text-lg ${index === 0 ? 'text-primary' : 'text-gray-900'}`}>
                                                        {evento.descricao}
                                                    </h4>
                                                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" />
                                                        {evento.localizacao || 'Localização não informada'}
                                                    </p>
                                                </div>
                                                <span className="text-sm bg-gray-100 px-3 py-1 rounded-full text-gray-600 font-medium whitespace-nowrap">
                                                    {format(new Date(evento.data), "dd/MM/yyyy 'às' HH:mm")}
                                                </span>
                                            </div>
                                        </div>
                                    ))}

                                    {data.eventos.length === 0 && (
                                        <div className="text-center py-8 text-gray-500">
                                            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                            <p>Nenhum evento registrado ainda.</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {searched && !data && !loading && (
                    <div className="text-center py-12">
                        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-medium text-gray-900">Nenhuma entrega encontrada</h3>
                        <p className="text-gray-500 mt-2">Verifique se a chave de acesso está correta e tente novamente.</p>
                    </div>
                )}
            </main>
        </div>
    );
}
