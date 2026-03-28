import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Bot, KeyRound, MessageSquareText, Save, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import SimpleTitleBar from '@/components/dashboard/SimpleTitleBar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const agentSchema = z.object({
  apiKey: z.string().trim().min(20, 'Informe uma API Key válida da OpenAI').max(255, 'API Key inválida'),
  agentName: z.string().trim().min(2, 'Informe o nome do agente').max(80, 'Máximo de 80 caracteres'),
  prompt: z.string().trim().min(20, 'Informe um prompt com mais contexto').max(5000, 'Máximo de 5000 caracteres'),
});

const CnpjChatInteligente = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    apiKey: '',
    agentName: '',
    prompt: '',
  });
  const [saving, setSaving] = useState(false);

  const canFillMainFields = useMemo(() => form.apiKey.trim().length > 0, [form.apiKey]);

  const handleSave = async () => {
    const parsed = agentSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || 'Verifique os campos do agente');
      return;
    }

    setSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      toast.success('Configuração do agente salva com sucesso');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 px-1 sm:px-0 max-w-full overflow-x-hidden">
      <SimpleTitleBar
        title="CNPJ Chat Inteligente"
        subtitle="Configure seu agente de IA para atendimento no WhatsApp"
        icon={<Bot className="h-4 w-4 sm:h-5 sm:w-5" />}
        onBack={() => navigate('/dashboard/cnpj-produtos')}
        right={
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/cpnj-conexoes')}>
            <LinkIcon className="mr-2 h-4 w-4" />
            Ir para conexões
          </Button>
        }
      />

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">OpenAI</Badge>
            <Badge variant="outline">WhatsApp Agent</Badge>
          </div>
          <CardTitle className="text-base sm:text-lg">Dados do agente</CardTitle>
          <CardDescription>
            Preencha a API Key e configure nome e prompt para criar o comportamento do seu agente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="apiKey" className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              API Key (OpenAI)
            </Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="sk-..."
              value={form.apiKey}
              onChange={(event) => setForm((prev) => ({ ...prev, apiKey: event.target.value }))}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="agentName">Nome do agente</Label>
              <Input
                id="agentName"
                placeholder="Ex.: Assistente Comercial"
                disabled={!canFillMainFields}
                value={form.agentName}
                onChange={(event) => setForm((prev) => ({ ...prev, agentName: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Canal</Label>
              <Input value="WhatsApp" disabled />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt" className="flex items-center gap-2">
              <MessageSquareText className="h-4 w-4" />
              Prompt do agente
            </Label>
            <Textarea
              id="prompt"
              placeholder="Explique como o agente deve responder, tom de voz, regras e limites..."
              className="min-h-44"
              disabled={!canFillMainFields}
              value={form.prompt}
              onChange={(event) => setForm((prev) => ({ ...prev, prompt: event.target.value }))}
            />
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => navigate('/dashboard/cpnj-conexoes')}>
              Configurar conexão WhatsApp
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Salvando...' : 'Salvar agente'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CnpjChatInteligente;