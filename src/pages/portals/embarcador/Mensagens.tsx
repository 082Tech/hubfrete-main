import { PortalLayout } from '@/components/portals/PortalLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Construction } from 'lucide-react';

export default function Mensagens() {
  return (
    <PortalLayout expectedUserType="embarcador">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-7 w-7 text-primary" />
            Mensagens
          </h1>
          <p className="text-muted-foreground">
            Comunique-se com transportadoras e motoristas
          </p>
        </div>

        {/* Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Construction className="h-5 w-5 text-orange-500" />
              Em Desenvolvimento
            </CardTitle>
            <CardDescription>
              O sistema de mensagens está sendo desenvolvido
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <MessageSquare className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Em breve!</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Você poderá conversar diretamente com transportadoras e motoristas 
                para acompanhar suas cargas e resolver questões em tempo real.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
}
