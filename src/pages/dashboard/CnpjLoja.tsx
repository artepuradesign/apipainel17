import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import SimpleTitleBar from '@/components/dashboard/SimpleTitleBar';
import { ShoppingBag, Star, Eye, Pencil, Trash2, RefreshCw, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cnpjProdutosService, type CnpjProduto } from '@/services/cnpjProdutosService';
import { normalizeProductPhotos, splitStoreSections, STORE_HIGHLIGHT_LABELS, getHighlightFromTags } from '@/components/cnpj-loja/storefrontUtils';
import { toast } from 'sonner';
import { useApiModules } from '@/hooks/useApiModules';

const formatPrice = (value: number) =>
  Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

const getDiscountByHighlight = (highlight: ReturnType<typeof getHighlightFromTags>) => {
  if (highlight === 'ofertas') return 15;
  if (highlight === 'mais_vendidos') return 10;
  return 0;
};

const getInstallments = (price: number) => {
  if (price >= 400) return 8;
  if (price >= 250) return 6;
  if (price >= 160) return 4;
  return 2;
};

const CnpjLoja = () => {
  const MODULE_ID = 184;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { modules } = useApiModules();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [produtos, setProdutos] = useState<CnpjProduto[]>([]);

  const currentModule = useMemo(
    () => modules.find((module) => Number(module.id) === MODULE_ID) || null,
    [modules]
  );

  const loadProdutos = useCallback(async () => {
    setLoading(true);
    setError('');

    const result = await cnpjProdutosService.list({
      limit: 200,
      offset: 0,
      cnpj: user?.cnpj || undefined,
      status: 'ativo',
    });

    if (!result.success || !result.data) {
      setProdutos([]);
      setError(result.error || 'Não foi possível carregar sua loja.');
      setLoading(false);
      return;
    }

    setProdutos(result.data.data || []);
    setLoading(false);
  }, [user?.cnpj]);

  useEffect(() => {
    loadProdutos();
  }, [loadProdutos]);

  const sections = useMemo(() => splitStoreSections(produtos), [produtos]);

  const handleOpenOnlineStore = () => {
    const cnpjDigits = (user?.cnpj || '').replace(/\D+/g, '');
    if (cnpjDigits.length !== 14) {
      toast.error('Preencha um CNPJ válido em Dados Pessoais para abrir sua loja online.');
      return;
    }

    window.open(`/vendas/loja/${cnpjDigits}`, '_blank', 'noopener,noreferrer');
  };

  const handleDeleteFromCard = async (produto: CnpjProduto) => {
    const confirmed = window.confirm(`Deseja excluir o produto \"${produto.nome_produto}\"?`);
    if (!confirmed) return;

    const result = await cnpjProdutosService.excluir(produto.id);
    if (!result.success) {
      toast.error(result.error || 'Não foi possível excluir o produto.');
      return;
    }

    setProdutos((prev) => prev.filter((item) => item.id !== produto.id));
    toast.success('Produto excluído com sucesso.');
  };

  const renderSection = (title: string, items: CnpjProduto[]) => {
    if (items.length === 0) return null;

    return (
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/cnpj-gerenciamento-produtos')}>
            Gerenciar
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
          {items.map((produto) => {
            const image = normalizeProductPhotos(produto)[0] || '';
            const highlight = getHighlightFromTags(produto.tags);
            const discountPercent = getDiscountByHighlight(highlight);
            const pixPrice = discountPercent > 0 ? produto.preco * (1 - discountPercent / 100) : produto.preco;
            const installments = getInstallments(produto.preco);
            const installmentValue = produto.preco / installments;

            return (
              <Card key={produto.id} className="h-full overflow-hidden rounded-2xl border-border/60 bg-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10">
                <CardContent className="p-0">
                  <div className="group w-full">
                    <div className="relative">
                      {image ? (
                        <img
                          src={image}
                          alt={`Imagem do produto ${produto.nome_produto}`}
                          loading="lazy"
                          className="h-40 w-full border-b border-border/60 object-cover transition-transform duration-300 group-hover:scale-[1.02] sm:h-44"
                        />
                      ) : (
                        <div className="flex h-40 w-full items-center justify-center border-b border-border/60 bg-muted/40 text-xs text-muted-foreground sm:h-44">
                          Sem imagem
                        </div>
                      )}

                      <Badge variant="secondary" className="absolute left-2 top-2 max-w-[62%] truncate text-[10px] shadow-sm">
                        {produto.categoria || 'Sem categoria'}
                      </Badge>

                      <div className="absolute right-2 top-2 flex items-center gap-1.5">
                        <Button
                          type="button"
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8 rounded-full shadow-sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            window.open(`/vendas/produto/${produto.id}`, '_blank', 'noopener,noreferrer');
                          }}
                          aria-label={`Visualizar página pública de ${produto.nome_produto}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8 rounded-full shadow-sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate('/dashboard/cnpj-produtos', {
                              state: { editingProduct: produto },
                            });
                          }}
                          aria-label={`Editar ${produto.nome_produto}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8 rounded-full shadow-sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteFromCard(produto);
                          }}
                          aria-label={`Excluir ${produto.nome_produto}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {highlight ? (
                        <Badge className="absolute left-2 top-10 bg-primary text-primary-foreground">
                          {STORE_HIGHLIGHT_LABELS[highlight]}
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex h-full flex-col gap-2.5 p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <Star key={idx} className="h-2.5 w-2.5" />
                        ))}
                        <span>0.0 (0)</span>
                      </div>
                    </div>

                    <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-tight">{produto.nome_produto}</h3>

                    {discountPercent > 0 ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground line-through">{formatPrice(produto.preco)}</span>
                        <Badge variant="outline" className="text-xs">{discountPercent}%</Badge>
                      </div>
                    ) : null}

                    <p className="text-base font-bold text-foreground sm:text-lg">{formatPrice(pixPrice)} no Pix</p>

                    <p className="line-clamp-2 min-h-[2rem] text-[11px] leading-relaxed text-muted-foreground">
                      em {installments}x de {formatPrice(installmentValue)} sem juros no cartão de crédito
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 px-1 sm:px-0">
      <SimpleTitleBar
        title={currentModule?.title?.toString().trim() || 'Loja Virtual CNPJ'}
        subtitle={
          currentModule?.description?.toString().trim() ||
          'Vitrine da sua empresa com produtos para venda'
        }
        icon={<Package className="h-4 w-4 sm:h-5 sm:w-5" />}
        right={
          <>
            <Button variant="ghost" size="sm" onClick={loadProdutos} disabled={loading} className="h-8 w-8 p-0">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </>
        }
        onBack={() => navigate('/dashboard')}
      />

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:p-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Modelo da loja</p>
            <h1 className="text-xl font-semibold tracking-tight">Sua loja online pronta para vender</h1>
            <p className="text-sm text-muted-foreground">Destaque lançamentos, produtos mais vendidos e ofertas com atualização automática.</p>
          </div>
          <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2">
            <Button variant="outline" className="w-full" onClick={() => navigate('/dashboard/cnpj-gerenciamento-produtos')}>Gerenciar produtos</Button>
            <Button className="w-full" onClick={handleOpenOnlineStore}>
              <ShoppingBag className="h-4 w-4" />
              Loja Online
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[280px] w-full rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">{error}</CardContent>
        </Card>
      ) : sections.todos.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Nenhum produto ativo encontrado para a loja.</CardContent>
        </Card>
      ) : (
        <>
          {renderSection('Lançamentos', sections.lancamentos)}
          {renderSection('Mais vendidos', sections.maisVendidos)}
          {renderSection('Ofertas', sections.ofertas)}
        </>
      )}
    </div>
  );
};

export default CnpjLoja;
