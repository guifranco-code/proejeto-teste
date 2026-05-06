/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Package, 
  ShoppingCart, 
  History, 
  Plus, 
  Search, 
  TrendingUp, 
  AlertCircle,
  MoreVertical,
  Trash,
  Edit,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/src/lib/supabase';
import { Product, Sale } from '@/src/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Toaster, toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSupabaseConfigured, setIsSupabaseConfigured] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSellDialogOpen, setIsSellDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sellQuantity, setSellQuantity] = useState(1);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: 0,
    stock: 0,
    category: ''
  });

  useEffect(() => {
    const isConfigured = checkConnection();
    if (isConfigured) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, []);

  const checkConnection = () => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const configured = !!(url && !url.includes('placeholder') && key && !key.includes('placeholder'));
    setIsSupabaseConfigured(configured);
    return configured;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('name');
      
      if (productsError) throw productsError;
      setProducts(productsData || []);

      // Sales
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select(`
          *,
          product:products(name)
        `)
        .order('created_at', { ascending: false });

      if (salesError) throw salesError;
      setSales(salesData || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      // We don't toast error here if it's just missing credentials
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      toast.error("Configure o Supabase primeiro!");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .insert([newProduct])
        .select();

      if (error) throw error;
      
      toast.success("Produto cadastrado com sucesso!");
      setIsAddDialogOpen(false);
      setNewProduct({ name: '', description: '', price: 0, stock: 0, category: '' });
      fetchData();
    } catch (error: any) {
      toast.error("Erro ao cadastrar: " + error.message);
    }
  };

  const handleSellProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (sellQuantity > selectedProduct.stock) {
      toast.error("Estoque insuficiente!");
      return;
    }

    try {
      const totalPrice = selectedProduct.price * sellQuantity;
      
      // 1. Record Sale
      const { error: saleError } = await supabase
        .from('sales')
        .insert([{
          product_id: selectedProduct.id,
          quantity: sellQuantity,
          total_price: totalPrice
        }]);

      if (saleError) throw saleError;

      // 2. Update Stock
      const { error: updateError } = await supabase
        .from('products')
        .update({ stock: selectedProduct.stock - sellQuantity })
        .eq('id', selectedProduct.id);

      if (updateError) throw updateError;

      toast.success(`Venda registrada! R$ ${totalPrice.toFixed(2)}`);
      setIsSellDialogOpen(false);
      setSellQuantity(1);
      fetchData();
    } catch (error: any) {
      toast.error("Erro na venda: " + error.message);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Produto removido!");
      fetchData();
    } catch (error: any) {
      toast.error("Erro ao remover: " + error.message);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalInventoryValue = products.reduce((acc, p) => acc + (p.price * p.stock), 0);
  const totalItems = products.reduce((acc, p) => acc + p.stock, 0);
  const lowStockCount = products.filter(p => p.stock < 5).length;

  if (!isSupabaseConfigured) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="text-amber-500" />
              Configuração Necessária
            </CardTitle>
            <CardDescription>
              Para usar este sistema, você precisa configurar as variáveis de ambiente do Supabase.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-zinc-600">
              Vá em <strong>Secrets</strong> e adicione:
            </p>
            <ul className="text-xs font-mono space-y-2 bg-zinc-100 p-3 rounded">
              <li>VITE_SUPABASE_URL</li>
              <li>VITE_SUPABASE_ANON_KEY</li>
            </ul>
            <p className="text-sm text-zinc-600">
              Você também precisará criar as tabelas <code className="bg-zinc-100 px-1 rounded">products</code> e <code className="bg-zinc-100 px-1 rounded">sales</code> no seu projeto Supabase.
            </p>
          </CardContent>
          <CardFooter>
             <Button className="w-full" onClick={() => window.location.reload()}>Tentar Novamente</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      <Toaster position="top-center" />
      
      {/* Header */}
      <header className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-black text-white p-2 rounded-lg">
              <Package size={24} />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Estoque <span className="text-zinc-500">Pro</span></h1>
          </div>
          <div className="flex gap-2">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger render={<Button className="gap-2"><Plus size={18} /> Cadastrar Produto</Button>} />
              <DialogContent>
                <form onSubmit={handleAddProduct}>
                  <DialogHeader>
                    <DialogTitle>Novo Produto</DialogTitle>
                    <DialogDescription>Insira os detalhes do produto para adicionar ao seu estoque.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Nome do Produto</Label>
                      <Input id="name" required value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="price">Preço (R$)</Label>
                        <Input id="price" type="number" step="0.01" required value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value)})} />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="stock">Estoque Inicial</Label>
                        <Input id="stock" type="number" required value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: parseInt(e.target.value)})} />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="category">Categoria</Label>
                      <Input id="category" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Descrição (Opcional)</Label>
                      <Input id="description" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="w-full">Salvar Produto</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Statistics */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-zinc-500">Valor Total Inventory</CardTitle>
                <TrendingUp size={16} className="text-zinc-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">R$ {totalInventoryValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                <p className="text-xs text-zinc-500 mt-1">Valor somado de todos os itens</p>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-zinc-500">Itens em Estoque</CardTitle>
                <Package size={16} className="text-zinc-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{totalItems}</div>
                <p className="text-xs text-zinc-500 mt-1">Unidades totais registradas</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-zinc-500">Alerta de Estoque</CardTitle>
                <AlertCircle size={16} className={lowStockCount > 0 ? "text-amber-500" : "text-zinc-500"} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{lowStockCount}</div>
                <p className="text-xs text-zinc-500 mt-1">Produtos com menos de 5 unidades</p>
              </CardContent>
            </Card>
          </motion.div>
        </section>

        {/* Main Content Tabs */}
        <Tabs defaultValue="inventory" className="space-y-6">
          <TabsList className="bg-zinc-100 p-1">
            <TabsTrigger value="inventory" className="gap-2">
              <Package size={16} /> Inventário
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History size={16} /> Histórico de Vendas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 border rounded-xl shadow-sm">
              <div className="relative w-full max-w-sm">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input 
                  placeholder="Pesquisar produto ou categoria..." 
                  className="pl-10 bg-zinc-50 border-none shadow-none focus-visible:ring-1 ring-zinc-200"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <Card className="overflow-hidden">
              <Table>
                <TableHeader className="bg-zinc-50">
                  <TableRow>
                    <TableHead className="w-[300px]">Produto</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Estoque</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-zinc-500">Carregando estoque...</TableCell>
                    </TableRow>
                  ) : filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-zinc-500">Nenhum produto encontrado.</TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((product) => (
                      <TableRow key={product.id} className="group transition-colors hover:bg-zinc-50/50">
                        <TableCell>
                          <div className="font-medium text-zinc-900">{product.name}</div>
                          {product.description && <div className="text-sm text-zinc-500 truncate w-64">{product.description}</div>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-zinc-100 font-normal">{product.category || 'Geral'}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">R$ {product.price.toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${product.stock < 5 ? 'text-amber-600' : 'text-zinc-700'}`}>
                              {product.stock}
                            </span>
                            {product.stock === 0 && <Badge variant="destructive" className="h-4 px-1 text-[10px]">Esgotado</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="gap-1 px-2 border-zinc-200 hover:bg-zinc-100 hover:text-black transition-all"
                              onClick={() => {
                                setSelectedProduct(product);
                                setIsSellDialogOpen(true);
                              }}
                              disabled={product.stock === 0}
                            >
                              <ShoppingCart size={14} /> Vender
                            </Button>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreVertical size={14} /></Button>} />
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem className="gap-2 text-zinc-600">
                                  <Edit size={14} /> Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="gap-2 text-red-600 focus:text-red-600"
                                  onClick={() => handleDeleteProduct(product.id)}
                                >
                                  <Trash size={14} /> Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card className="overflow-hidden">
              <Table>
                <TableHeader className="bg-zinc-50">
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-zinc-500">Nenhuma venda registrada ainda.</TableCell>
                    </TableRow>
                  ) : (
                    sales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="text-sm text-zinc-500">
                          {new Date(sale.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell className="font-medium">{sale.product?.name || 'Produto Excluído'}</TableCell>
                        <TableCell>{sale.quantity}</TableCell>
                        <TableCell className="font-mono text-sm font-semibold text-emerald-600">
                          R$ {sale.total_price.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                           <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100">Confirmada</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Sell Dialog */}
        <Dialog open={isSellDialogOpen} onOpenChange={setIsSellDialogOpen}>
          <DialogContent>
            <form onSubmit={handleSellProduct}>
              <DialogHeader>
                <DialogTitle>Registrar Venda</DialogTitle>
                <DialogDescription>
                  Vender "{selectedProduct?.name}" por R$ {selectedProduct?.price.toFixed(2)}/un.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-lg border border-dashed">
                  <div className="text-sm text-zinc-500">Estoque disponível</div>
                  <div className="font-bold text-lg">{selectedProduct?.stock}</div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sale-qty">Quantidade para vender</Label>
                  <div className="flex gap-3">
                    <Input 
                      id="sale-qty" 
                      type="number" 
                      min="1" 
                      max={selectedProduct?.stock} 
                      value={sellQuantity} 
                      onChange={e => setSellQuantity(parseInt(e.target.value) || 1)}
                    />
                    <div className="flex items-center justify-center bg-zinc-900 text-white px-4 rounded-lg font-mono text-sm whitespace-nowrap">
                      Total: R$ {(selectedProduct ? selectedProduct.price * sellQuantity : 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full h-12 text-lg font-medium bg-emerald-600 hover:bg-emerald-700 transition-colors gap-2">
                   Confirmar Venda <ArrowRight size={18} />
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      </main>

      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t text-center space-y-4">
        <p className="text-zinc-400 text-sm italic serif">Crafted for efficient inventory management.</p>
        <div className="flex justify-center gap-4 text-[10px] uppercase tracking-[0.2em] font-mono text-zinc-400">
          <span>Precision</span>
          <span>•</span>
          <span>Reliability</span>
          <span>•</span>
          <span>Growth</span>
        </div>
      </footer>
    </div>
  );
}

