import { fetchApiConfig, getApiUrl } from '@/config/api';
import { cookieUtils } from '@/utils/cookieUtils';

export interface ControlePessoalDownloadFile {
  name: string;
  size: number;
  updated_at: string;
  extension: string;
}

interface ControlePessoalDownloadResponse {
  success: boolean;
  data?: {
    files?: ControlePessoalDownloadFile[];
  };
  error?: string;
  message?: string;
}

const getSessionToken = () =>
  cookieUtils.get('session_token') ||
  cookieUtils.get('api_session_token') ||
  localStorage.getItem('session_token') ||
  localStorage.getItem('api_session_token');

const getAuthHeaders = () => {
  const token = getSessionToken();

  return {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const controlePessoalDownloadService = {
  async listFiles(): Promise<ControlePessoalDownloadFile[]> {
    await fetchApiConfig();

    const response = await fetch(getApiUrl('/controlepessoal-download/list'), {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    const data = (await response.json()) as ControlePessoalDownloadResponse;

    if (!response.ok || !data.success) {
      throw new Error(data.error || data.message || 'Não foi possível carregar os arquivos.');
    }

    return Array.isArray(data.data?.files) ? data.data!.files! : [];
  },

  async downloadFile(fileName: string): Promise<Blob> {
    await fetchApiConfig();

    const response = await fetch(
      getApiUrl(`/controlepessoal-download/file?name=${encodeURIComponent(fileName)}`),
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error('Não foi possível baixar o arquivo.');
    }

    return response.blob();
  },
};
