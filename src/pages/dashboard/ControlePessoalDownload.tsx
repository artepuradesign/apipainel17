import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SimpleTitleBar from '@/components/dashboard/SimpleTitleBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useApiModules } from '@/hooks/useApiModules';
import {
  controlePessoalDownloadService,
  type ControlePessoalDownloadFile,
} from '@/services/controlePessoalDownloadService';

const formatFileSize = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** power;
  return `${value.toFixed(value >= 10 || power === 0 ? 0 : 1)} ${units[power]}`;
};

const formatDate = (isoDate: string) => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('pt-BR');
};

const ControlePessoalDownload = () => {
  const MODULE_ID = 185;
  const navigate = useNavigate();
  const { modules } = useApiModules();
  const [files, setFiles] = useState<ControlePessoalDownloadFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

  const currentModule = useMemo(
    () => modules.find((module) => Number(module.id) === MODULE_ID) || null,
    [modules]
  );

  const sortedFiles = useMemo(
    () => [...files].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [files]
  );

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const responseFiles = await controlePessoalDownloadService.listFiles();
      setFiles(responseFiles);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao carregar arquivos';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleDownload = useCallback(async (fileName: string) => {
    setDownloadingFile(fileName);
    try {
      const fileBlob = await controlePessoalDownloadService.downloadFile(fileName);
      const url = window.URL.createObjectURL(fileBlob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao baixar arquivo';
      toast.error(message);
    } finally {
      setDownloadingFile(null);
    }
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6">
      <SimpleTitleBar
        title={currentModule?.title?.toString().trim() || 'Controle Pessoal • Downloads'}
        subtitle={
          currentModule?.description?.toString().trim() ||
          'Baixe os arquivos disponíveis na pasta de download'
        }
        onBack={() => navigate('/dashboard')}
      />

      <Card>
        <CardHeader className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <CardTitle>Arquivos disponíveis</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={loadFiles} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando arquivos...</p>
          ) : sortedFiles.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum arquivo encontrado na pasta download.</p>
          ) : (
            <div className="space-y-2">
              {sortedFiles.map((file) => (
                <div
                  key={file.name}
                  className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)} • Atualizado em {formatDate(file.updated_at)}
                    </p>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleDownload(file.name)}
                    disabled={downloadingFile === file.name}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {downloadingFile === file.name ? 'Baixando...' : 'Baixar'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ControlePessoalDownload;
