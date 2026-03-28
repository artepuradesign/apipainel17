import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Smartphone, Link as LinkIcon, Bot, CheckCircle2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { toast } from 'sonner';
import SimpleTitleBar from '@/components/dashboard/SimpleTitleBar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useApiModules } from '@/hooks/useApiModules';
import { useAuth } from '@/contexts/AuthContext';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { cnpjChatInteligenteService, type WhatsAppConnection } from '@/services/cnpjChatInteligenteService';

const MODULE_ID = 188;

const CpnjConexoes = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { modules } = useApiModules();
  const { hasActiveSubscription, subscription, discountPercentage, calculateDiscountedPrice } = useUserSubscription();
  const [sessionName, setSessionName] = useState('Minha conexão WhatsApp');
  const [phone, setPhone] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connections, setConnections] = useState<WhatsAppConnection[]>([]);

  const currentModule = useMemo(
    () => (modules || []).find((module: any) => Number(module?.id) === MODULE_ID) || null,
    [modules]
  );

  const ModuleIcon = useMemo(() => {
    const iconName = String(currentModule?.icon || 'Link');
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent || LinkIcon;
  }, [currentModule?.icon]);

  const modulePrice = useMemo(() => Number(currentModule?.price ?? 0), [currentModule?.price]);
  const { discountedPrice: finalPrice, hasDiscount } = hasActiveSubscription && modulePrice > 0
    ? calculateDiscountedPrice(modulePrice)
    : { discountedPrice: modulePrice, hasDiscount: false };
  const userPlan = hasActiveSubscription && subscription
    ? subscription.plan_name
    : (user ? localStorage.getItem(`user_plan_${user.id}`) || 'Pré-Pago' : 'Pré-Pago');

  const activeConnection = useMemo(
    () => connections.find((item) => item.connection_status === 'conectado') || null,
    [connections]
  );

  useEffect(() => {
    const loadConnections = async () => {
      const result = await cnpjChatInteligenteService.listConnections();
      if (result.success && result.data?.data) {
        setConnections(result.data.data);
      }
    };

    void loadConnections();
  }, []);

  const handleConnect = async () => {
    if (phone.replace(/\D+/g, '').length < 10) {
      toast.error('Informe um WhatsApp válido com DDD');
      return;
    }

    setConnecting(true);
    try {
      const createResult = await cnpjChatInteligenteService.createConnection({
        session_name: sessionName.trim() || 'Minha conexão WhatsApp',
        whatsapp_number: phone.trim(),
      });

      if (!createResult.success || !createResult.data?.id) {
        toast.error(createResult.error || 'Não foi possível criar a conexão');
        return;
      }

      const statusResult = await cnpjChatInteligenteService.updateConnectionStatus({
        id: createResult.data.id,
        connection_status: 'conectado',
      });

      if (!statusResult.success) {
        toast.error(statusResult.error || 'Conexão criada, mas não foi possível ativar o status');
      }

      const listResult = await cnpjChatInteligenteService.listConnections();
      if (listResult.success && listResult.data?.data) {
        setConnections(listResult.data.data);
      }

      toast.success('Conexão preparada! Agora finalize a integração do WhatsApp.');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 px-1 sm:px-0 max-w-full overflow-x-hidden">
      <SimpleTitleBar
        title={currentModule?.title || 'Conexões do Chat'}
        subtitle={currentModule?.description || 'Conecte o WhatsApp para o agente de IA atender seus clientes'}
        icon={<ModuleIcon className="h-4 w-4 sm:h-5 sm:w-5" />}
        onBack={() => navigate('/dashboard/cnpj-chatinteligente')}
        useModuleMetadata={false}
        right={
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/cnpj-chatinteligente')}>
            <Bot className="mr-2 h-4 w-4" />
            Voltar ao agente
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Plano Ativo</p>
              <p className="text-sm sm:text-base font-semibold truncate">{userPlan}</p>
            </div>
            <div className="text-right shrink-0">
              {hasDiscount ? <p className="text-xs text-muted-foreground line-through">R$ {modulePrice.toFixed(2)}</p> : null}
              <p className="text-lg sm:text-xl font-bold">R$ {finalPrice.toFixed(2)}</p>
              <p className="text-[10px] text-muted-foreground">Valor do módulo {MODULE_ID}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">WhatsApp</Badge>
              <Badge variant="outline">Canal principal</Badge>
            </div>
            <CardTitle className="text-base sm:text-lg">Dados da conexão</CardTitle>
            <CardDescription>
              Configure os dados iniciais para vincular o WhatsApp ao seu agente de IA.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sessionName">Nome da conexão</Label>
              <Input
                id="sessionName"
                value={sessionName}
                onChange={(event) => setSessionName(event.target.value)}
                placeholder="Ex.: WhatsApp Loja Centro"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Número do WhatsApp</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => navigate('/dashboard/cnpj-chatinteligente')}>
                Ajustar agente
              </Button>
              <Button onClick={handleConnect} disabled={connecting}>
                <Smartphone className="mr-2 h-4 w-4" />
                {connecting ? 'Conectando...' : 'Conectar WhatsApp'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status da integração</CardTitle>
            <CardDescription>Acompanhe o estado da conexão para ativar o agente.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                {activeConnection ? <CheckCircle2 className="h-4 w-4" /> : <QrCode className="h-4 w-4" />}
                {activeConnection ? 'Conexão pronta para uso' : 'Aguardando conexão'}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {activeConnection
                  ? 'Seu WhatsApp está vinculado e pronto para receber mensagens com IA.'
                  : 'Preencha os dados e clique em conectar para iniciar o vínculo com seu WhatsApp.'}
              </p>
              {activeConnection ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Sessão ativa: <strong>{activeConnection.session_name}</strong> • Número: <strong>{activeConnection.whatsapp_number}</strong>
                </p>
              ) : null}
            </div>

            <Button className="w-full" variant="outline" onClick={() => navigate('/dashboard/cnpj-chatinteligente')}>
              Ir para configuração do agente
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CpnjConexoes;