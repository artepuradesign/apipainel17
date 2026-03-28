import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Smartphone, Link as LinkIcon, Bot, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import SimpleTitleBar from '@/components/dashboard/SimpleTitleBar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const CpnjConexoes = () => {
  const navigate = useNavigate();
  const [sessionName, setSessionName] = useState('Minha conexão WhatsApp');
  const [phone, setPhone] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);

  const handleConnect = async () => {
    if (phone.replace(/\D+/g, '').length < 10) {
      toast.error('Informe um WhatsApp válido com DDD');
      return;
    }

    setConnecting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 700));
      setConnected(true);
      toast.success('Conexão preparada! Agora finalize a integração do WhatsApp.');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 px-1 sm:px-0 max-w-full overflow-x-hidden">
      <SimpleTitleBar
        title="Conexões do Chat"
        subtitle="Conecte o WhatsApp para o agente de IA atender seus clientes"
        icon={<LinkIcon className="h-4 w-4 sm:h-5 sm:w-5" />}
        onBack={() => navigate('/dashboard/cnpj-chatinteligente')}
        right={
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/cnpj-chatinteligente')}>
            <Bot className="mr-2 h-4 w-4" />
            Voltar ao agente
          </Button>
        }
      />

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
                {connected ? <CheckCircle2 className="h-4 w-4" /> : <QrCode className="h-4 w-4" />}
                {connected ? 'Conexão pronta para uso' : 'Aguardando conexão'}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {connected
                  ? 'Seu WhatsApp está vinculado e pronto para receber mensagens com IA.'
                  : 'Preencha os dados e clique em conectar para iniciar o vínculo com seu WhatsApp.'}
              </p>
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