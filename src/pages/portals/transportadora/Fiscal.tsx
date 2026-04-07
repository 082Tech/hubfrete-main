import { ConfigFiscalTab } from '@/components/fiscal/ConfigFiscalTab';

export default function Fiscal() {
  return (
    <div className="p-4 md:p-8 h-full overflow-auto">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurações Fiscais</h1>
          <p className="text-muted-foreground">CT-e, ICMS e configurações para emissão de documentos fiscais</p>
        </div>
        <ConfigFiscalTab />
      </div>
    </div>
  );
}
