import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Save, FileText, DollarSign, 
  ChefHat, ArrowRight, Printer, History,
  AlertTriangle, Scale, Edit2, TrendingUp,
  PieChart, BarChart2, Activity, X, Loader2, Cloud, FileSpreadsheet, Download, Wine, Layers, ChevronLeft, Settings, ToggleLeft, ToggleRight, Target, Search, MoreHorizontal, Calendar, Box, CheckSquare, Square, AlertCircle, CheckCircle, Info
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, Legend, ResponsiveContainer, PieChart as RePieChart, Pie, Cell 
} from 'recharts';

import { supabase } from './services/supabaseClient';
import { Login } from './components/Login';
import type { FixedExpense, Ingredient, Recipe, RecipeItemDB } from './types';

// --- UTILS ---
const UNITS = ['kg', 'g', 'L', 'ml', 'un', 'maço', 'cx', 'pct'];

const formatCurrency = (val: number | undefined | null) => {
    if (val === undefined || val === null || isNaN(val)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR');
    } catch (e) {
        return '-';
    }
};

const formatMonth = (m: number) => {
  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  return months[m - 1] || m;
};

// --- UI COMPONENTS ---
const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>
    {children}
  </div>
);

const InputGroup = ({ label, children, className = "" }: { label: string, children: React.ReactNode, className?: string }) => (
  <div className={`flex flex-col gap-1.5 ${className}`}>
    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
    {children}
  </div>
);

const StyledInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input 
    {...props}
    className={`w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed ${props.className || ''}`}
  />
);

const StyledSelect = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select 
    {...props}
    className={`w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all cursor-pointer ${props.className || ''}`}
  >
    {props.children}
  </select>
);

const Badge = ({ children, color = "slate" }: { children: React.ReactNode, color?: "slate" | "emerald" | "red" | "blue" | "orange" | "purple" | "yellow" }) => {
  const colors = {
    slate: "bg-slate-100 text-slate-600",
    emerald: "bg-emerald-100 text-emerald-700",
    red: "bg-red-100 text-red-700",
    blue: "bg-blue-100 text-blue-700",
    orange: "bg-orange-100 text-orange-700",
    purple: "bg-purple-100 text-purple-700",
    yellow: "bg-yellow-100 text-yellow-700",
  };
  return (
    <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${colors[color] || colors.slate}`}>
      {children}
    </span>
  );
};

// --- PRINT COMPONENT ---
const PrintPreviewComponent = ({ recipe, ingredients, recipes, onClose }: { recipe: Recipe, ingredients: Ingredient[], recipes: Recipe[], onClose: () => void }) => {
    // ... (Keeping logic identical)
    const isSubRecipe = recipe.type === 'sub_recipe';
    const availableSubRecipes = recipes
        .filter(r => r.type === 'sub_recipe' && r.id !== recipe.id)
        .map(r => {
            const rItemsCost = (r.items || []).reduce((acc, item) => {
                if (item.item_type === 'ingredient') {
                    const ing = ingredients.find(i => i.id === item.ref_id);
                    return acc + (ing ? item.qty * ing.cost_per_unit : 0);
                } else { return acc; }
            }, 0);
            const rTotalCost = rItemsCost + (Number(r.extra_utilities||0) + Number(r.extra_packaging||0));
            const yieldVal = Number(r.portions) || 1;
            const costPerUnit = yieldVal > 0 ? rTotalCost / yieldVal : 0;
            return { id: r.id, name: `(BASE) ${r.name}`, unit: r.unit || 'kg', cost_per_unit: costPerUnit };
        });

    const allIngredientsMap = new Map(ingredients.map(i => [i.id, i]));
    const allSubRecipesMap = new Map(availableSubRecipes.map(s => [s.id!, s]));

    const totalIngCost = (recipe.items || []).reduce((a, item) => {
         let unitCost = 0;
         if (item.item_type === 'ingredient') {
             const ing = allIngredientsMap.get(item.ref_id);
             if (ing) unitCost = ing.cost_per_unit;
         } else {
             const sub = allSubRecipesMap.get(item.ref_id);
             if (sub) unitCost = sub.cost_per_unit;
         }
         return a + (item.qty * unitCost);
     }, 0);
     
    const totalExtra = Number(recipe.extra_packaging||0) + 
                       Number(recipe.extra_labor||0) + 
                       Number(recipe.extra_utilities||0) + 
                       Number(recipe.extra_fixed_cost||0) + 
                       Number(recipe.extra_other_direct||0) + 
                       Number(recipe.extra_ice_garnish||0);

    const totalCost = totalIngCost + totalExtra;
    const costPerPortion = totalCost / (Number(recipe.portions) || 1);
    
    const price = Number(recipe.final_price) || 0;
    const taxes = price * ((Number(recipe.taxes_pct)||0)/100);
    const cardFee = price * ((Number(recipe.card_fee_pct)||0)/100);
    const profit = price - costPerPortion - taxes - cardFee;
    
    const handlePrint = () => {
        window.print();
    };

    useEffect(() => {
        const timer = setTimeout(handlePrint, 500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="fixed inset-0 bg-slate-900 z-[9999] overflow-auto flex justify-center py-8 print:p-0 print:bg-white print:static print:block">
            <div id="print-section" className="max-w-[21cm] w-full bg-white shadow-2xl min-h-[29.7cm] p-[1.5cm] relative print:shadow-none print:w-full print:h-auto print:p-0 rounded-none">
                <div className="absolute top-4 right-4 flex gap-2 no-print">
                    <button onClick={handlePrint} className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg shadow-lg hover:bg-emerald-700 flex items-center gap-2 font-bold transition-all"><Printer size={18}/> Imprimir</button>
                    <button onClick={onClose} className="bg-slate-100 text-slate-800 px-4 py-2.5 rounded-lg hover:bg-slate-200 font-medium transition-all">Fechar</button>
                </div>
                
                <header className="border-b-2 border-slate-900 pb-6 mb-8 flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-extrabold text-slate-900 uppercase tracking-tight">{recipe.name}</h1>
                        <p className="text-xl mt-1 font-medium text-slate-500">{recipe.category}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-xs font-black bg-slate-900 text-white px-3 py-1 mb-2 inline-block tracking-widest uppercase">Ficha Técnica</div>
                        <div className="text-sm text-slate-500 font-medium">Versão {recipe.version} • {formatDate(new Date().toISOString())}</div>
                        <div className="text-base font-bold mt-1 text-emerald-700 flex items-center justify-end gap-1"><ChefHat size={16}/> HUBChef</div>
                    </div>
                </header>

                <div className="grid grid-cols-4 gap-6 mb-8">
                    <div className="border border-slate-200 p-5 rounded-xl bg-slate-50">
                        <div className="text-xs uppercase text-slate-500 font-bold mb-1">Rendimento</div>
                        <div className="text-2xl font-bold text-slate-800">{recipe.portions} <span className="text-sm font-medium text-slate-500">{isSubRecipe ? recipe.unit : ''}</span></div>
                    </div>
                    <div className="border border-slate-200 p-5 rounded-xl bg-slate-50">
                        <div className="text-xs uppercase text-slate-500 font-bold mb-1">Tempo Total</div>
                        <div className="text-2xl font-bold text-slate-800">{(Number(recipe.operational_prep) || 0) + (Number(recipe.operational_cook) || 0) + (Number(recipe.operational_plating) || 0)} <span className="text-sm font-medium text-slate-500">min</span></div>
                    </div>
                    <div className="border border-slate-200 p-5 rounded-xl bg-white shadow-sm">
                        <div className="text-xs uppercase text-slate-500 font-bold mb-1">Custo / {isSubRecipe ? 'Un' : 'Porção'}</div>
                        <div className="text-2xl font-bold text-slate-800">{formatCurrency(costPerPortion)}</div>
                    </div>
                        {!isSubRecipe && (
                        <div className="border border-emerald-100 p-5 rounded-xl bg-emerald-50">
                            <div className="text-xs uppercase text-emerald-600 font-bold mb-1">Preço Sugerido</div>
                            <div className="text-2xl font-bold text-emerald-800">{formatCurrency(price)}</div>
                        </div>
                    )}
                </div>

                <div className="mb-8">
                    <h3 className="font-bold text-sm uppercase border-b-2 border-slate-200 mb-4 pb-2 text-slate-800">Composição</h3>
                    <table className="w-full text-sm">
                        <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-xs">
                            <tr>
                                <th className="text-left p-3 rounded-l-lg">Item</th>
                                <th className="text-right p-3">Qtd</th>
                                <th className="text-center p-3">Un</th>
                                <th className="text-right p-3 rounded-r-lg">Custo Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {(recipe.items || []).map((item, idx) => { 
                                let name = 'Item Desconhecido';
                                let cost = 0;
                                if (item.item_type === 'ingredient') {
                                    const ing = allIngredientsMap.get(item.ref_id);
                                    if(ing) { name = ing.name; cost = item.qty * ing.cost_per_unit; }
                                } else {
                                    const sub = allSubRecipesMap.get(item.ref_id);
                                    if(sub) { name = sub.name; cost = item.qty * sub.cost_per_unit; }
                                }
                                return (
                                    <tr key={idx}>
                                        <td className="p-3 font-medium text-slate-700">{name}</td>
                                        <td className="p-3 text-right text-slate-600">{item.qty}</td>
                                        <td className="p-3 text-center text-slate-400 text-xs uppercase">{item.unit}</td>
                                        <td className="p-3 text-right font-bold text-slate-800">{formatCurrency(cost)}</td>
                                    </tr>
                                ); 
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="grid grid-cols-2 gap-12">
                    <div>
                        <h3 className="font-bold text-sm uppercase border-b-2 border-slate-200 mb-4 pb-2 text-slate-800">Modo de Preparo</h3>
                        <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed text-justify font-serif">
                            {recipe.instructions || "Nenhuma instrução cadastrada."}
                        </p>
                    </div>
                    <div>
                        <h3 className="font-bold text-sm uppercase border-b-2 border-slate-200 mb-4 pb-2 text-slate-800">Detalhamento Financeiro</h3>
                        <ul className="text-sm space-y-3">
                            <li className="flex justify-between border-b border-slate-100 pb-2">
                                <span className="text-slate-500">Insumos Totais</span> 
                                <span className="font-medium">{formatCurrency(totalIngCost)}</span>
                            </li>
                            <li className="flex justify-between border-b border-slate-100 pb-2">
                                <span className="text-slate-500">Embalagem</span> 
                                <span className="font-medium">{formatCurrency(recipe.extra_packaging)}</span>
                            </li>
                            <li className="flex justify-between border-b border-slate-100 pb-2">
                                <span className="text-slate-500">Custos Fixos (Rateio)</span> 
                                <span className="font-medium">{formatCurrency(recipe.extra_fixed_cost)}</span>
                            </li>
                            <li className="flex justify-between border-b border-slate-100 pb-2">
                                <span className="text-slate-500">Impostos & Taxas</span> 
                                <span className="font-medium text-red-600">{formatCurrency(taxes + cardFee)}</span>
                            </li>
                            <li className="flex justify-between pt-2 items-center bg-slate-50 p-2 rounded-lg -mx-2">
                                <span className="font-bold text-slate-800 uppercase text-xs">Custo Total Produção</span> 
                                <span className="font-bold text-slate-900 text-lg">{formatCurrency(totalCost)}</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- TYPES FOR IMPORT & DELETE ---
interface PreviewItem {
    id?: string; // temp id
    name: string;
    price: number;
    package_qty: number;
    unit: string;
    yield_factor: number;
    cost_per_unit: number;
    isValid: boolean;
    errorMsg?: string;
}

interface DeleteState {
    open: boolean;
    title: string;
    message: string;
    isBulk: boolean;
    ids: string[];
    type: 'ingredients' | 'recipes' | 'expenses' | 'categories';
}

// --- MAIN APP COMPONENT ---
export default function App() {
  const [session, setSession] = useState<any>(null);
  const [view, setView] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  // Data State
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [expenses, setExpenses] = useState<FixedExpense[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  
  // Selection State (Mass Delete)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // UI State
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isSidebarOpen = mobileMenuOpen || isSidebarHovered; 
  
  // Recipe Editor State
  const [currentRecipe, setCurrentRecipe] = useState<Recipe | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingView, setPendingView] = useState<string | null>(null);

  // Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");
  const [importPreviewData, setImportPreviewData] = useState<PreviewItem[]>([]);
  const [isImportReviewStep, setIsImportReviewStep] = useState(false);
  const [isProcessingImport, setIsProcessingImport] = useState(false);

  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState<DeleteState>({ open: false, title: '', message: '', isBulk: false, ids: [], type: 'ingredients' });
  const [isDeleting, setIsDeleting] = useState(false);

  // Forms
  const [newExpense, setNewExpense] = useState({ month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()), total: '', dishes: '' });
  const [ingForm, setIngForm] = useState<Partial<Ingredient>>({ unit: 'kg', package_qty: 1, yield_factor: 100 });
  const [newCatInput, setNewCatInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // --- INITIALIZATION ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- DATA FETCHING & REALTIME ---
  const fetchData = async () => {
    if (!session?.user) return;
    
    const { data: ingData } = await supabase.from('ingredients').select('*').order('name');
    if(ingData) setIngredients(ingData);

    const { data: recData } = await supabase.from('recipes').select('*, recipe_items(*)').order('last_update', { ascending: false });
    if(recData) {
        const mappedRecipes = recData.map(r => ({
            ...r,
            items: r.recipe_items || []
        }));
        setRecipes(mappedRecipes);
    }

    const { data: expData } = await supabase.from('fixed_expenses').select('*').order('year', {ascending:false}).order('month', {ascending:false});
    if(expData) setExpenses(expData);

    const { data: catData } = await supabase.from('categories').select('*').order('name');
    if(catData) setCategories(catData.map(c => c.name));
    else setCategories(['Prato Principal', 'Entrada', 'Sobremesa', 'Drink', 'Bebida Não Alcoólica', 'Base/Molho']);
  };

  useEffect(() => {
    if (session) {
      fetchData();
      const channels = supabase.channel('custom-all-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients' }, () => fetchData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'recipes' }, () => fetchData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'fixed_expenses' }, () => fetchData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => fetchData())
        .subscribe();
      return () => { supabase.removeChannel(channels); };
    }
  }, [session]);

  // --- SELECTION LOGIC ---
  const toggleSelection = (id: string) => {
      const newSet = new Set(selectedIds);
      if(newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedIds(newSet);
  };

  const toggleAll = (ids: string[]) => {
      if(selectedIds.size === ids.length) setSelectedIds(new Set());
      else setSelectedIds(new Set(ids));
  };

  // --- DELETE CONFIRMATION & EXECUTION ---
  const confirmDelete = (type: 'ingredients' | 'recipes' | 'expenses' | 'categories', ids: string[], isBulk = false) => {
      let title = '';
      let message = '';
      const count = ids.length;

      if (type === 'ingredients') {
          title = isBulk ? `Excluir ${count} Insumos?` : 'Excluir Insumo?';
          message = isBulk 
            ? 'Esta ação é irreversível. Se algum insumo estiver em uso, a exclusão falhará para proteger suas receitas.' 
            : 'Tem certeza que deseja excluir este insumo permanentemente?';
      } else if (type === 'recipes') {
          title = isBulk ? `Excluir ${count} Fichas?` : 'Excluir Ficha Técnica?';
          message = 'Esta ação removerá permanentemente a ficha técnica e seus itens.';
      } else if (type === 'expenses') {
          title = 'Excluir Despesa?';
          message = 'Deseja remover este registro de despesas fixas?';
      } else if (type === 'categories') {
          title = 'Excluir Categoria?';
          message = 'Deseja remover esta categoria?';
      }

      setDeleteModal({ open: true, title, message, isBulk, ids, type });
  };

  const executeDelete = async () => {
      setIsDeleting(true);
      const { type, ids } = deleteModal;
      
      const { error } = await supabase.from(type === 'expenses' ? 'fixed_expenses' : type).delete().in(type === 'categories' ? 'name' : 'id', ids);
      
      if(error) {
          console.error(error);
          if (error.code === '23503') {
             alert("Não foi possível excluir alguns itens pois eles estão sendo usados em outras partes do sistema (ex: Insumo usado em Receita).");
          } else {
             alert("Erro ao excluir: " + error.message);
          }
      } else {
          // Success
          setSelectedIds(new Set());
          if (type === 'ingredients') {
              setIngredients(prev => prev.filter(i => !ids.includes(i.id)));
              if(ingForm.id && ids.includes(ingForm.id)) setIngForm({ unit: 'kg', package_qty: 1, yield_factor: 100 });
          } else if (type === 'recipes') {
              setRecipes(prev => prev.filter(r => !ids.includes(r.id!)));
          } else if (type === 'expenses') {
              setExpenses(prev => prev.filter(e => !ids.includes(e.id)));
          } else if (type === 'categories') {
              setCategories(prev => prev.filter(c => !ids.includes(c)));
          }
      }
      setIsDeleting(false);
      setDeleteModal(prev => ({ ...prev, open: false }));
  };

  // --- LOGIC: Ingredients ---
  const calculateRealCost = (price: number, qty: number, yieldPct: number) => {
    if (!price || !qty || !yieldPct) return 0;
    const usableQty = qty * (yieldPct / 100);
    return usableQty > 0 ? price / usableQty : 0;
  };

  const handleSaveIngredient = async () => {
    if (!ingForm.name || !ingForm.price) return;
    
    if (!ingForm.id) {
        const exists = ingredients.some(i => i.name!.toLowerCase() === ingForm.name!.toLowerCase());
        if(exists) { alert('Nome duplicado!'); return; }
    }

    const yf = Number(ingForm.yield_factor);
    const cost = calculateRealCost(Number(ingForm.price), Number(ingForm.package_qty), yf);

    const payload = {
        name: ingForm.name,
        unit: ingForm.unit,
        price: Number(ingForm.price),
        package_qty: Number(ingForm.package_qty),
        yield_factor: yf / 100,
        cost_per_unit: cost,
        user_id: session.user.id
    };

    if (ingForm.id) {
        await supabase.from('ingredients').update(payload).eq('id', ingForm.id);
        setIngredients(prev => prev.map(i => i.id === ingForm.id ? { ...i, ...payload } as Ingredient : i));
    } else {
        const { data } = await supabase.from('ingredients').insert(payload).select().single();
        if(data) setIngredients(prev => [...prev, data].sort((a,b) => a.name.localeCompare(b.name)));
    }
    setIngForm({ unit: 'kg', package_qty: 1, yield_factor: 100 });
  };

  // --- LOGIC: Import Preview & Execution ---
  const parseImportData = (text: string) => {
      const lines = text.split(/\r?\n/);
      const parsed: PreviewItem[] = [];
      
      const parsePtBrNumber = (val: string) => {
          if(!val) return 0;
          return parseFloat(val.toString().replace(/[R$\s%]/g, '').replace(/\./g, '').replace(',', '.')) || 0;
      }
      
      const parseUnit = (str: string) => {
          if(!str) return 'kg';
          const match = str.match(/(kg|g|L|ml|un|maço|cx|pct)/i);
          return match ? match[0].toLowerCase() : 'kg';
      };

      lines.forEach((line, idx) => {
          if (!line.trim()) return;
          
          let cols = line.split('\t');
          if (cols.length < 2) cols = line.split(';');
          if (cols.length < 2) cols = line.split(',');

          if (cols[0].toLowerCase().includes('nome')) return; // Skip header

          const name = cols[0].trim();
          let price = 0, unit = 'kg', pkg = 1, yld = 100;
          let isValid = true;
          let errorMsg = "";

          if (cols.length >= 2) {
              price = parsePtBrNumber(cols[1]);
              if (cols.length >= 3) {
                 const pkgStr = cols[2];
                 pkg = parsePtBrNumber(pkgStr) || 1;
                 unit = parseUnit(pkgStr);
                 if (cols.length >= 6 && cols[5]?.trim()) unit = parseUnit(cols[5]);
              }
              if (cols.length >= 4) yld = parsePtBrNumber(cols[3]);
          }

          // Validation
          if (!name) { isValid = false; errorMsg = "Nome ausente"; }
          else if (ingredients.some(i => i.name.toLowerCase() === name.toLowerCase())) { isValid = false; errorMsg = "Duplicado"; }
          else if (price <= 0) { isValid = false; errorMsg = "Preço inválido"; }

          const cost = calculateRealCost(price, pkg, yld);

          parsed.push({ 
              id: `temp-${idx}`, name, price, package_qty: pkg, unit, yield_factor: yld, cost_per_unit: cost, isValid, errorMsg 
          });
      });
      return parsed;
  };

  const handlePreviewImport = () => {
      const data = parseImportData(importText);
      setImportPreviewData(data);
      setIsImportReviewStep(true);
  };

  const executeImport = async () => {
      setIsProcessingImport(true);
      const validItems = importPreviewData.filter(i => i.isValid);
      
      if (validItems.length === 0) {
          alert("Nenhum item válido para importar.");
          setIsProcessingImport(false);
          return;
      }

      const payload = validItems.map(i => ({
          user_id: session.user.id,
          name: i.name,
          unit: i.unit,
          price: i.price,
          package_qty: i.package_qty,
          yield_factor: i.yield_factor / 100,
          cost_per_unit: i.cost_per_unit
      }));

      const { error } = await supabase.from('ingredients').insert(payload);
      
      setIsProcessingImport(false);
      if (error) {
          alert("Erro ao salvar no banco de dados.");
          console.error(error);
      } else {
          // Success
          setShowImportModal(false);
          setIsImportReviewStep(false);
          setImportText("");
          setImportPreviewData([]);
          fetchData();
          alert(`${validItems.length} itens importados com sucesso!`);
      }
  };

  // --- LOGIC: Recipe Editor ---
  const startNewRecipe = (type: 'food' | 'drink' | 'sub_recipe') => {
      const lastFixed = expenses[0]?.cost_per_dish || 0;
      const isSub = type === 'sub_recipe';
      const isDrink = type === 'drink';
      
      setCurrentRecipe({
          id: null,
          user_id: session.user.id,
          type,
          name: '',
          category: isDrink ? 'Drink' : 'Prato Principal',
          portions: 1,
          unit: isSub ? 'kg' : 'porções',
          operational_prep: 0, operational_cook: 0, operational_plating: 0,
          extra_packaging: 0, extra_labor: 0, extra_utilities: 0,
          extra_fixed_cost: isSub ? 0 : lastFixed,
          extra_other_direct: 0, extra_ice_garnish: 0,
          taxes_pct: 0, card_fee_pct: 0,
          pricing_method: 'margin', pricing_target: 30, final_price: 0,
          instructions: '', version: 1, status: 'active',
          items: []
      });
      setView('recipe-editor');
      setHasUnsavedChanges(false);
  };

  const saveRecipe = async () => {
      if(!currentRecipe || !currentRecipe.name) return;
      
      const recipePayload = { ...currentRecipe };
      delete (recipePayload as any).items; 
      recipePayload.last_update = new Date().toISOString();
      if(recipePayload.id) recipePayload.version += 1;

      let recipeId = currentRecipe.id;
      
      if (!recipeId) {
          const { data, error } = await supabase.from('recipes').insert(recipePayload).select().single();
          if(error) { alert('Erro ao salvar'); console.error(error); return; }
          recipeId = data.id;
      } else {
          await supabase.from('recipes').update(recipePayload).eq('id', recipeId);
      }

      await supabase.from('recipe_items').delete().eq('recipe_id', recipeId);
      
      if (currentRecipe.items.length > 0) {
          const itemsPayload = currentRecipe.items.map((item, idx) => ({
              recipe_id: recipeId,
              user_id: session.user.id,
              item_type: item.item_type,
              ref_id: item.ref_id,
              qty: Number(item.qty),
              unit: item.unit,
              sort_order: idx
          }));
          await supabase.from('recipe_items').insert(itemsPayload);
      }

      setHasUnsavedChanges(false);
      setShowUnsavedModal(false);
      if(pendingView) { setView(pendingView); setPendingView(null); }
      else setView(currentRecipe.type === 'drink' ? 'drinks' : currentRecipe.type === 'sub_recipe' ? 'sub_recipes' : 'recipes');
      
      fetchData(); // Refresh list to show correct version/updates
  };

  // --- LOGIC: Cost Calculation ---
  const getRecipeCosts = (recipe: Recipe) => {
      const availableSubs = recipes.filter(r => r.type === 'sub_recipe' && r.id !== recipe.id);
      
      const getCost = (item: RecipeItemDB) => {
          if (item.item_type === 'ingredient') {
              const ing = ingredients.find(i => i.id === item.ref_id);
              return ing ? item.qty * ing.cost_per_unit : 0;
          } else {
              const sub = availableSubs.find(s => s.id === item.ref_id);
              if (!sub) return 0;
              const subItemsCost = (sub.items || []).reduce((acc, subItem) => {
                   const ing = ingredients.find(i => i.id === subItem.ref_id); 
                   return acc + (ing ? subItem.qty * ing.cost_per_unit : 0);
              }, 0);
              const subTotal = subItemsCost + Number(sub.extra_utilities || 0) + Number(sub.extra_packaging || 0);
              const subCostPerUnit = Number(sub.portions) > 0 ? subTotal / Number(sub.portions) : 0;
              return item.qty * subCostPerUnit;
          }
      };

      const itemsCost = (recipe.items || []).reduce((acc, item) => acc + getCost(item), 0);
      const extra = Number(recipe.extra_packaging||0) + Number(recipe.extra_labor||0) + 
                    Number(recipe.extra_utilities||0) + Number(recipe.extra_fixed_cost||0) + 
                    Number(recipe.extra_other_direct||0) + Number(recipe.extra_ice_garnish||0);
      
      const totalCost = itemsCost + extra;
      const portions = Number(recipe.portions) || 1;
      const costPerPortion = totalCost / portions;

      const price = Number(recipe.final_price) || 0;
      const tax = price * (Number(recipe.taxes_pct)/100);
      const card = price * (Number(recipe.card_fee_pct)/100);
      const profit = price - costPerPortion - tax - card;
      const margin = price > 0 ? (profit/price)*100 : 0;

      return { totalCost, itemsCost, costPerPortion, profit, margin, price, tax };
  };

  // --- RENDER HELPERS ---
  const NavButton = ({ icon: Icon, label, target }: any) => {
      const active = view === target;
      return (
        <button 
            onClick={() => {
                if(hasUnsavedChanges) { setPendingView(target); setShowUnsavedModal(true); }
                else { setView(target); setMobileMenuOpen(false); setSelectedIds(new Set()); /* Reset Selection on view change */ }
            }} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group relative ${active ? 'bg-emerald-600/10 text-emerald-500 font-medium' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'}`}
        >
            <Icon size={20} className={active ? 'text-emerald-500' : 'group-hover:text-white transition-colors'} strokeWidth={active ? 2.5 : 2} />
            {isSidebarOpen && <span className="whitespace-nowrap overflow-hidden transition-all delay-100">{label}</span>}
            {!isSidebarOpen && <div className="absolute left-14 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">{label}</div>}
        </button>
      );
  }

  // --- MAIN RENDER ---
  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-slate-900"><Loader2 className="animate-spin text-emerald-500" size={48}/></div>;
  if (!session) return <Login />;
  
  if (view === 'print-preview' && currentRecipe) {
      return <PrintPreviewComponent recipe={currentRecipe} ingredients={ingredients} recipes={recipes} onClose={() => setView('recipe-editor')} />;
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans text-slate-900">
        
        {/* SIDEBAR */}
        <nav 
            className={`bg-slate-900 flex flex-col transition-all duration-300 ease-in-out border-r border-slate-800 z-50 fixed md:relative h-full ${isSidebarOpen ? 'w-64' : 'w-20 hidden md:flex'}`}
            onMouseEnter={() => setIsSidebarHovered(true)}
            onMouseLeave={() => setIsSidebarHovered(false)}
        >
             <div className="h-16 flex items-center justify-center border-b border-slate-800/50 mb-4">
                {isSidebarOpen ? (
                    <div className="flex items-center gap-2 animate-in fade-in duration-300">
                        <div className="bg-emerald-600 p-1.5 rounded-lg"><ChefHat className="text-white" size={20}/></div>
                        <span className="text-white font-bold text-lg tracking-tight">HUBChef</span>
                    </div>
                ) : (
                    <div className="bg-emerald-600 p-2 rounded-lg"><ChefHat className="text-white" size={24}/></div>
                )}
            </div>

            <div className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
                <NavButton icon={Activity} label="Dashboard" target="dashboard" />
                <NavButton icon={BarChart2} label="Relatórios" target="reports" />
                
                <div className="my-4 border-t border-slate-800/50 mx-2"></div>
                {isSidebarOpen && <div className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Gestão</div>}

                <NavButton icon={ArrowRight} label="Insumos" target="ingredients" />
                <NavButton icon={Layers} label="Bases" target="sub_recipes" />
                <NavButton icon={FileText} label="Fichas Técnicas" target="recipes" />
                <NavButton icon={Wine} label="Drinks" target="drinks" />
                
                <div className="my-4 border-t border-slate-800/50 mx-2"></div>
                {isSidebarOpen && <div className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Financeiro</div>}
                
                <NavButton icon={TrendingUp} label="Despesas Fixas" target="fixed-expenses" />
                <NavButton icon={Settings} label="Categorias" target="categories" />
            </div>

            <div className="p-4 border-t border-slate-800">
                 <button onClick={() => supabase.auth.signOut()} className={`flex items-center gap-3 text-slate-400 hover:text-white w-full p-2 rounded-lg hover:bg-slate-800 transition-colors ${!isSidebarOpen && 'justify-center'}`}>
                    <ToggleLeft size={20}/>
                    {isSidebarOpen && <span>Sair</span>}
                 </button>
            </div>
        </nav>

        {/* MAIN CONTENT */}
        <main className="flex-1 flex flex-col h-full w-full relative overflow-hidden">
            
            {/* Top Bar for Mobile */}
            <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center shadow-lg z-40">
                <div className="flex items-center gap-2 font-bold"><ChefHat className="text-emerald-500"/> HUBChef</div>
                <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}><MoreHorizontal/></button>
            </div>

            <div className="flex-1 overflow-y-auto">
            {/* INGREDIENTS VIEW */}
            {view === 'ingredients' && (
                <div className="p-6 md:p-10 w-full max-w-7xl mx-auto">
                    <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Insumos</h1>
                            <p className="text-slate-500 mt-1">Gerencie os custos de matéria-prima.</p>
                        </div>
                        <div className="flex gap-3">
                             <div className="relative">
                                <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                                <input placeholder="Buscar insumo..." className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm" onChange={e => setSearchTerm(e.target.value)} />
                             </div>
                             <button onClick={() => { setShowImportModal(true); setIsImportReviewStep(false); setImportText(""); }} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg font-medium shadow-sm flex items-center gap-2 transition-colors"><Download size={18}/> Importar</button>
                             <button onClick={() => { setIngForm({ unit: 'kg', package_qty: 1, yield_factor: 100 }); window.scrollTo(0,0); document.getElementById('ing-form')?.focus(); }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-colors"><Plus size={18}/> Novo</button>
                        </div>
                    </header>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Form */}
                        <Card className="p-6 h-fit lg:sticky lg:top-6">
                            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 pb-4 border-b border-slate-100">{ingForm.id ? <Edit2 size={18} className="text-blue-500"/> : <Plus size={18} className="text-emerald-500"/>} {ingForm.id ? 'Editar Insumo' : 'Novo Insumo'}</h3>
                            <div className="space-y-4" id="ing-form">
                                <InputGroup label="Nome do Item"><StyledInput placeholder="Ex: Filé Mignon" value={ingForm.name || ''} onChange={e => setIngForm({...ingForm, name: e.target.value})} autoFocus/></InputGroup>
                                <div className="grid grid-cols-2 gap-4">
                                    <InputGroup label="Preço Pago (R$)"><StyledInput type="number" placeholder="0.00" value={ingForm.price || ''} onChange={e => setIngForm({...ingForm, price: Number(e.target.value)})} /></InputGroup>
                                    <InputGroup label="Unidade Compra"><StyledSelect value={ingForm.unit} onChange={e => setIngForm({...ingForm, unit: e.target.value})}>{UNITS.map(u => <option key={u} value={u}>{u}</option>)}</StyledSelect></InputGroup>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <InputGroup label="Qtd Embalagem"><StyledInput type="number" placeholder="1" value={ingForm.package_qty} onChange={e => setIngForm({...ingForm, package_qty: Number(e.target.value)})} /></InputGroup>
                                    <InputGroup label="Rendimento %"><StyledInput type="number" placeholder="100" value={ingForm.yield_factor} onChange={e => setIngForm({...ingForm, yield_factor: Number(e.target.value)})} /></InputGroup>
                                </div>
                            </div>
                            <div className="mt-8 bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <div className="text-xs font-bold text-slate-500 uppercase mb-1">Custo Real Calculado</div>
                                <div className="text-2xl font-bold text-emerald-600">{formatCurrency(calculateRealCost(Number(ingForm.price), Number(ingForm.package_qty), Number(ingForm.yield_factor)))} <span className="text-sm text-slate-400 font-medium">/ {ingForm.unit}</span></div>
                            </div>
                            <div className="mt-6 flex gap-3">
                                {ingForm.id && <button onClick={() => setIngForm({unit: 'kg', package_qty: 1, yield_factor: 100})} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium">Cancelar</button>}
                                <button onClick={handleSaveIngredient} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow-md shadow-emerald-600/20">Salvar Item</button>
                            </div>
                        </Card>

                        {/* List */}
                        <Card className="col-span-1 lg:col-span-2 overflow-hidden flex flex-col">
                            {/* BULK ACTION HEADER */}
                            {selectedIds.size > 0 && (
                                <div className="bg-red-50 p-3 flex justify-between items-center border-b border-red-100 animate-in slide-in-from-top-2">
                                    <div className="text-red-700 font-bold text-sm flex items-center gap-2">
                                        <CheckSquare size={18}/> {selectedIds.size} itens selecionados
                                    </div>
                                    <button 
                                        onClick={() => confirmDelete('ingredients', Array.from(selectedIds), true)}
                                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2"
                                    >
                                        <Trash2 size={14}/> Excluir Selecionados
                                    </button>
                                </div>
                            )}

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-xs border-b border-slate-200">
                                        <tr>
                                            <th className="p-4 w-10">
                                                <button onClick={() => toggleAll(ingredients.map(i => i.id))} className="text-slate-400 hover:text-slate-600">
                                                    {selectedIds.size === ingredients.length && ingredients.length > 0 ? <CheckSquare size={20} className="text-emerald-500"/> : <Square size={20}/>}
                                                </button>
                                            </th>
                                            <th className="p-4 pl-0">Nome</th>
                                            <th className="p-4">Compra</th>
                                            <th className="p-4 text-center">Rendimento</th>
                                            <th className="p-4 text-right">Custo Real</th>
                                            <th className="p-4 text-center pr-6">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {ingredients.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())).map(ing => (
                                            <tr key={ing.id} className={`hover:bg-slate-50 transition-colors cursor-pointer group ${selectedIds.has(ing.id) ? 'bg-blue-50/50' : ''}`} onClick={() => { setIngForm(ing); window.scrollTo({top:0, behavior:'smooth'}); }}>
                                                <td className="p-4 w-10" onClick={(e) => { e.stopPropagation(); toggleSelection(ing.id); }}>
                                                    {selectedIds.has(ing.id) ? <CheckSquare size={20} className="text-emerald-500"/> : <Square size={20} className="text-slate-300 group-hover:text-slate-400"/>}
                                                </td>
                                                <td className="p-4 pl-0 font-medium text-slate-800">{ing.name}</td>
                                                <td className="p-4 text-slate-500">{formatCurrency(ing.price)} <span className="text-xs">/ {ing.package_qty}{ing.unit}</span></td>
                                                <td className="p-4 text-center"><Badge color={ing.yield_factor < 1 ? "orange" : "blue"}>{Math.round(ing.yield_factor * 100)}%</Badge></td>
                                                <td className="p-4 text-right font-bold text-slate-700">{formatCurrency(ing.cost_per_unit)}</td>
                                                <td className="p-4 text-center pr-6">
                                                    <button onClick={(e) => { e.stopPropagation(); confirmDelete('ingredients', [ing.id]); }} className="text-slate-300 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50 z-10 relative"><Trash2 size={16}/></button>
                                                </td>
                                            </tr>
                                        ))}
                                        {ingredients.length === 0 && <tr><td colSpan={6} className="p-12 text-center text-slate-400">Nenhum insumo cadastrado. Comece adicionando um novo item.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {/* RECIPE LISTS */}
            {['recipes', 'drinks', 'sub_recipes'].includes(view) && (
                <div className="p-6 md:p-10 w-full max-w-7xl mx-auto">
                    <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3 tracking-tight">
                                {view === 'drinks' ? <Wine className="text-purple-600" size={32}/> : view === 'sub_recipes' ? <Layers className="text-orange-600" size={32}/> : <FileText className="text-emerald-600" size={32}/>} 
                                {view === 'drinks' ? 'Bebidas & Drinks' : view === 'sub_recipes' ? 'Bases & Sub-receitas' : 'Fichas Técnicas'}
                            </h1>
                            <p className="text-slate-500 mt-1 ml-11">Gerencie seu cardápio e composições.</p>
                        </div>
                        <div className="flex gap-2 items-center">
                            {selectedIds.size > 0 && (
                                <button onClick={() => confirmDelete('recipes', Array.from(selectedIds), true)} className="bg-red-600 text-white px-4 py-2.5 rounded-lg font-bold shadow-lg flex items-center gap-2 animate-in fade-in">
                                    <Trash2 size={18}/> Excluir ({selectedIds.size})
                                </button>
                            )}
                            <button onClick={() => startNewRecipe(view === 'drinks' ? 'drink' : view === 'sub_recipes' ? 'sub_recipe' : 'food')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-bold shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all transform active:scale-95">
                                <Plus size={20} /> Criar Nova
                            </button>
                        </div>
                    </header>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {recipes.filter(r => (view === 'sub_recipes' ? r.type === 'sub_recipe' : view === 'drinks' ? r.type === 'drink' : r.type === 'food')).map(r => {
                            const costs = getRecipeCosts(r);
                            const isSub = r.type === 'sub_recipe';
                            const isSelected = selectedIds.has(r.id!);
                            return (
                                <Card key={r.id} className={`group cursor-pointer hover:shadow-lg transition-all duration-300 relative overflow-hidden ${isSelected ? 'ring-2 ring-emerald-500 bg-emerald-50/10' : 'hover:border-emerald-500/30'}`}>
                                     {/* Selection Checkbox */}
                                     <div className="absolute top-3 left-3 z-20" onClick={(e) => { e.stopPropagation(); toggleSelection(r.id!); }}>
                                         {isSelected ? <CheckSquare className="text-emerald-500 bg-white rounded" size={24}/> : <Square className="text-slate-300 hover:text-emerald-400 bg-white/50 rounded" size={24}/>}
                                     </div>

                                     {/* Delete Button (Individual) */}
                                     <div className="absolute top-3 right-3 z-20">
                                         <button onClick={(e) => { e.stopPropagation(); confirmDelete('recipes', [r.id!]); }} className="p-2 bg-white/80 hover:bg-white text-slate-400 hover:text-red-500 rounded-full shadow-sm transition-colors border border-transparent hover:border-red-100">
                                             <Trash2 size={18}/>
                                         </button>
                                     </div>

                                     <div onClick={() => { setCurrentRecipe(r); setView('recipe-editor'); }} className="p-5 h-full flex flex-col pt-10">
                                        {r.status === 'inactive' && <div className="absolute top-0 right-0 bg-slate-100 text-slate-500 text-[10px] font-bold px-3 py-1 rounded-bl-lg">INATIVO</div>}
                                        
                                        <div className="mb-4">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">{r.category}</span>
                                            <h3 className="font-bold text-lg text-slate-800 leading-tight group-hover:text-emerald-700 transition-colors">{r.name}</h3>
                                        </div>

                                        <div className="flex items-center gap-4 text-xs text-slate-500 font-medium mb-6">
                                            <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded"><History size={12}/> v{r.version}</span>
                                            <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded"><Scale size={12}/> {r.portions} {isSub ? r.unit : 'un'}</span>
                                        </div>

                                        <div className="mt-auto pt-4 border-t border-slate-100">
                                            {isSub ? (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs font-bold text-orange-600 uppercase bg-orange-50 px-2 py-1 rounded">Custo / {r.unit}</span>
                                                    <span className="font-mono font-bold text-slate-700">{formatCurrency(costs.costPerPortion)}</span>
                                                </div>
                                            ) : (
                                                <div className="flex justify-between items-end">
                                                    <div>
                                                        <p className="text-[10px] text-slate-400 uppercase font-bold">Preço Venda</p>
                                                        <p className="font-bold text-slate-800 text-lg">{formatCurrency(r.final_price)}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] text-slate-400 uppercase font-bold">Lucro</p>
                                                        <p className={`font-mono font-bold ${costs.profit > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatCurrency(costs.profit)}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                     </div>
                                </Card>
                            )
                        })}
                        
                        {/* Empty State */}
                        <button onClick={() => startNewRecipe(view === 'drinks' ? 'drink' : view === 'sub_recipes' ? 'sub_recipe' : 'food')} className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-slate-400 hover:text-emerald-600 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all min-h-[200px] group">
                            <div className="bg-slate-100 p-4 rounded-full mb-3 group-hover:bg-white group-hover:shadow-md transition-all"><Plus size={32} /></div>
                            <span className="font-bold">Criar Nova Receita</span>
                        </button>
                    </div>
                </div>
            )}

            {/* DASHBOARD */}
            {view === 'dashboard' && (
                <div className="p-6 md:p-10 w-full max-w-[1600px] mx-auto">
                     <div className="mb-8">
                        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3"><Activity className="text-emerald-600"/> Dashboard</h1>
                        <p className="text-slate-500 mt-1 ml-11">Visão geral da saúde financeira do seu cardápio.</p>
                     </div>
                     
                     {/* Logic for dashboard */}
                     {(() => {
                         const activeRecs = recipes.filter(r => r.type !== 'sub_recipe' && r.status === 'active');
                         const stats = activeRecs.map(r => getRecipeCosts(r));
                         const avgMargin = stats.length ? stats.reduce((a,b) => a + b.margin, 0) / stats.length : 0;
                         const avgProfit = stats.length ? stats.reduce((a,b) => a + b.profit, 0) / stats.length : 0;
                         
                         const pieData = [
                             { name: 'Insumos', value: stats.reduce((a,b) => a + b.itemsCost, 0), color: '#3b82f6' },
                             { name: 'Custos/Fixos', value: stats.reduce((a,b) => a + (b.totalCost - b.itemsCost), 0), color: '#ef4444' },
                             { name: 'Impostos', value: stats.reduce((a,b) => a + b.tax, 0), color: '#f59e0b' },
                             { name: 'Lucro', value: stats.reduce((a,b) => a + b.profit, 0), color: '#10b981' },
                         ];

                         const barData = [
                             { name: 'Crítico (<15%)', count: stats.filter(s => s.margin < 15).length, fill: '#ef4444' },
                             { name: 'Ideal (15-30%)', count: stats.filter(s => s.margin >= 15 && s.margin <= 30).length, fill: '#f59e0b' },
                             { name: 'Excelente (>30%)', count: stats.filter(s => s.margin > 30).length, fill: '#10b981' }
                         ];

                         return (
                             <div className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <Card className="p-6 border-l-4 border-l-emerald-500">
                                        <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Margem Média</div>
                                        <div className={`text-4xl font-bold ${avgMargin < 20 ? 'text-red-500' : 'text-emerald-600'}`}>{avgMargin.toFixed(1)}%</div>
                                        <div className="mt-2 text-xs text-slate-400">Objetivo: &gt;25%</div>
                                    </Card>
                                    <Card className="p-6 border-l-4 border-l-blue-500">
                                        <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Lucro Médio / Prato</div>
                                        <div className="text-4xl font-bold text-slate-800">{formatCurrency(avgProfit)}</div>
                                        <div className="mt-2 text-xs text-slate-400">Contribuição por venda</div>
                                    </Card>
                                    <Card className="p-6 border-l-4 border-l-orange-500">
                                        <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Impostos Est.</div>
                                        <div className="text-4xl font-bold text-orange-600">{formatCurrency(stats.reduce((a,b)=>a+b.tax,0))}</div>
                                        <div className="mt-2 text-xs text-slate-400">Baseado no mix atual</div>
                                    </Card>
                                    <Card className="p-6 border-l-4 border-l-purple-500">
                                        <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Itens Ativos</div>
                                        <div className="text-4xl font-bold text-slate-800">{activeRecs.length}</div>
                                        <div className="mt-2 text-xs text-slate-400">Produtos no cardápio</div>
                                    </Card>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <Card className="p-6 h-[400px] flex flex-col">
                                        <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2"><PieChart size={20} className="text-slate-400"/> Destino da Receita</h3>
                                        <div className="flex-1 min-h-0">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <RePieChart>
                                                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={2} dataKey="value" stroke="none">
                                                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                                    </Pie>
                                                    <ReTooltip formatter={(value:number) => formatCurrency(value)} contentStyle={{borderRadius:'8px', border:'none', boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}} />
                                                    <Legend verticalAlign="bottom" height={36}/>
                                                </RePieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </Card>
                                    <Card className="p-6 h-[400px] flex flex-col">
                                        <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2"><Scale size={20} className="text-slate-400"/> Distribuição de Margens</h3>
                                        <div className="flex-1 min-h-0">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={barData} margin={{top: 20, right: 30, left: 20, bottom: 5}}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} dy={10} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                                                    <ReTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius:'8px', border:'none', boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}} />
                                                    <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={60} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </Card>
                                </div>
                             </div>
                         )
                     })()}
                </div>
            )}
            
            {/* FIXED EXPENSES */}
            {view === 'fixed-expenses' && (
                <div className="p-6 md:p-10 w-full max-w-5xl mx-auto">
                    <h1 className="text-3xl font-bold text-slate-900 mb-8 flex items-center gap-3"><TrendingUp className="text-amber-500"/> Despesas Fixas</h1>
                    
                    <Card className="p-6 mb-8 bg-slate-50 border-amber-200">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">Registrar Novo Período</h3>
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                            <InputGroup label="Mês" className="flex-1"><StyledSelect value={newExpense.month} onChange={e => setNewExpense({...newExpense, month: e.target.value})}>{Array.from({length:12}, (_,i) => <option key={i+1} value={i+1}>{formatMonth(i+1)}</option>)}</StyledSelect></InputGroup>
                            <InputGroup label="Ano" className="w-24"><StyledInput type="number" value={newExpense.year} onChange={e => setNewExpense({...newExpense, year: e.target.value})} /></InputGroup>
                            <InputGroup label="Total Despesas (R$)" className="flex-1"><StyledInput type="number" value={newExpense.total} onChange={e => setNewExpense({...newExpense, total: e.target.value})} /></InputGroup>
                            <InputGroup label="Pratos Vendidos" className="flex-1"><StyledInput type="number" value={newExpense.dishes} onChange={e => setNewExpense({...newExpense, dishes: e.target.value})} /></InputGroup>
                            <button onClick={async () => {
                                const cost = Number(newExpense.total) / Number(newExpense.dishes);
                                await supabase.from('fixed_expenses').insert({ user_id: session.user.id, month: Number(newExpense.month), year: Number(newExpense.year), total_expenses: Number(newExpense.total), total_dishes_sold: Number(newExpense.dishes), cost_per_dish: cost });
                                setNewExpense({...newExpense, total: '', dishes: ''});
                            }} className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-lg font-bold shadow-lg shadow-amber-500/20 mb-[1px]">Salvar</button>
                        </div>
                    </Card>

                    <Card>
                         <table className="w-full text-left text-sm">
                             <thead className="bg-slate-50 text-slate-500 uppercase text-xs border-b"><tr><th className="p-4 pl-6">Período</th><th className="p-4 text-right">Despesas Totais</th><th className="p-4 text-right">Vendas</th><th className="p-4 text-right">Custo Fixo / Prato</th><th className="p-4"></th></tr></thead>
                             <tbody className="divide-y divide-slate-100">
                                 {expenses.map(exp => (
                                     <tr key={exp.id} className="hover:bg-slate-50">
                                         <td className="p-4 pl-6 font-bold text-slate-700">{formatMonth(exp.month)} <span className="text-slate-400 font-normal">/ {exp.year}</span></td>
                                         <td className="p-4 text-right">{formatCurrency(exp.total_expenses)}</td>
                                         <td className="p-4 text-right">{exp.total_dishes_sold}</td>
                                         <td className="p-4 text-right text-amber-600 font-bold bg-amber-50/50">{formatCurrency(exp.cost_per_dish)}</td>
                                         <td className="p-4 text-center"><button onClick={() => confirmDelete('expenses', [exp.id])} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button></td>
                                     </tr>
                                 ))}
                                 {expenses.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400">Nenhum registro encontrado.</td></tr>}
                             </tbody>
                         </table>
                    </Card>
                </div>
            )}

            {/* CATEGORIES */}
            {view === 'categories' && (
                <div className="p-10 max-w-2xl mx-auto">
                    <h1 className="text-3xl font-bold text-slate-900 mb-8">Gerenciar Categorias</h1>
                    <Card className="p-6 mb-6">
                        <div className="flex gap-4">
                            <StyledInput placeholder="Nova Categoria (ex: Entradas Frias)" value={newCatInput} onChange={e => setNewCatInput(e.target.value)} />
                            <button onClick={async () => { if(newCatInput) { await supabase.from('categories').insert({user_id: session.user.id, name: newCatInput}); setNewCatInput(''); }}} className="bg-slate-900 text-white px-6 rounded-lg font-bold">Adicionar</button>
                        </div>
                    </Card>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {categories.map(cat => (
                            <Card key={cat} className="p-4 flex justify-between items-center group">
                                <span className="font-medium text-slate-700">{cat}</span>
                                <button onClick={() => confirmDelete('categories', [cat])} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Reports */}
            {view === 'reports' && (
                <div className="p-6 md:p-10 w-full max-w-6xl mx-auto">
                    <h1 className="text-3xl font-bold text-slate-900 mb-8 flex items-center gap-3"><BarChart2 className="text-blue-600"/> Relatórios Avançados</h1>
                    {/* Reuse recipe logic for reports */}
                    {(() => {
                        const activeRecs = recipes.filter(r => r.type !== 'sub_recipe' && r.status === 'active').map(r => ({...r, stats: getRecipeCosts(r)})).sort((a,b) => b.stats.profit - a.stats.profit);
                        return (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <Card className="col-span-2 p-6">
                                    <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2"><Target size={20} className="text-emerald-500"/> Top Performance - Maior Lucro</h3>
                                    <div className="space-y-4">
                                        {activeRecs.slice(0,5).map((r, i) => (
                                            <div key={r.id} className="flex justify-between items-center py-3 border-b border-slate-50 hover:bg-slate-50 px-2 rounded transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${i===0 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'}`}>{i+1}</span>
                                                    <div>
                                                        <span className="font-medium text-slate-800 block">{r.name}</span>
                                                        <span className="text-xs text-slate-400">{r.category}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold text-emerald-600">{formatCurrency(r.stats.profit)}</div>
                                                    <div className="text-xs text-slate-400">{r.stats.margin.toFixed(1)}% Margem</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                                <div className="space-y-8">
                                    <Card className="p-6 text-center bg-gradient-to-br from-white to-emerald-50 border-emerald-100">
                                        <h3 className="font-bold text-slate-700 mb-2">Simulador de Faturamento</h3>
                                        <p className="text-xs text-slate-400 mb-6">Projeção se vender 100 unidades de cada item ativo.</p>
                                        <div className="text-4xl font-bold text-emerald-600">{formatCurrency(activeRecs.reduce((a,b) => a + (b.stats.profit * 100), 0))}</div>
                                        <div className="mt-4 text-xs font-bold text-emerald-800 uppercase tracking-widest opacity-60">Lucro Líquido Projetado</div>
                                    </Card>
                                </div>
                            </div>
                        )
                    })()}
                </div>
            )}
            </div>

            {/* RECIPE EDITOR - FULL SCREEN OVERLAY MODE */}
            {view === 'recipe-editor' && currentRecipe && (
                <div className="absolute inset-0 z-50 bg-slate-50 flex flex-col h-full w-full">
                    {/* Header */}
                    <div className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center shadow-sm shrink-0">
                         <div className="flex items-center gap-4 flex-1">
                            <button onClick={() => { if(hasUnsavedChanges) setShowUnsavedModal(true); else setView(currentRecipe.type === 'drink' ? 'drinks' : currentRecipe.type === 'sub_recipe' ? 'sub_recipes' : 'recipes'); }} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"><ChevronLeft/></button>
                            <div className="h-8 w-px bg-slate-200"></div>
                            <input className="text-xl font-bold bg-transparent outline-none placeholder-slate-300 w-full text-slate-800" placeholder="Nome da Ficha Técnica" value={currentRecipe.name} onChange={e => { setCurrentRecipe({...currentRecipe, name: e.target.value}); setHasUnsavedChanges(true); }} autoFocus/>
                         </div>
                         <div className="flex gap-3 items-center">
                            <button onClick={() => { setCurrentRecipe({...currentRecipe, status: currentRecipe.status === 'active' ? 'inactive' : 'active'}); setHasUnsavedChanges(true); }} className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border transition-all ${currentRecipe.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                {currentRecipe.status === 'active' ? <ToggleRight size={18}/> : <ToggleLeft size={18}/>} {currentRecipe.status === 'active' ? 'Ativo' : 'Inativo'}
                            </button>
                            <div className="h-6 w-px bg-slate-200 mx-2"></div>
                            <button onClick={() => setView('print-preview')} className="flex items-center gap-2 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-100 font-medium transition-colors"><Printer size={18}/> Imprimir</button>
                            <button onClick={saveRecipe} className="bg-slate-900 text-white px-6 py-2 rounded-lg shadow-lg hover:bg-slate-800 flex items-center gap-2 font-bold transition-all transform active:scale-95"><Save size={18}/> Salvar</button>
                         </div>
                    </div>

                    <div className="flex-1 overflow-hidden flex flex-row">
                        {/* LEFT: Ingredients & Prep (Scrollable) */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/50">
                             {/* Basic Info */}
                             <div className="grid grid-cols-12 gap-6">
                                <Card className="col-span-8 p-6 grid grid-cols-2 gap-6">
                                    <InputGroup label="Categoria"><StyledSelect value={currentRecipe.category} onChange={e => {setCurrentRecipe({...currentRecipe, category: e.target.value}); setHasUnsavedChanges(true);}}>{categories.map(c => <option key={c} value={c}>{c}</option>)}</StyledSelect></InputGroup>
                                    <InputGroup label="Rendimento Final">
                                        <div className="flex gap-2">
                                            <StyledInput type="number" value={currentRecipe.portions} onChange={e => {setCurrentRecipe({...currentRecipe, portions: Number(e.target.value)}); setHasUnsavedChanges(true);}} /> 
                                            <span className="flex items-center justify-center bg-slate-100 border border-slate-200 px-4 rounded-lg text-sm text-slate-600 font-medium min-w-[80px]">{currentRecipe.unit}</span>
                                        </div>
                                    </InputGroup>
                                </Card>
                                {currentRecipe.type !== 'sub_recipe' && (
                                    <Card className="col-span-4 p-6">
                                        <InputGroup label="Tempo Operacional (min)">
                                            <div className="flex gap-2">
                                                <div className="flex-1 text-center"><StyledInput placeholder="Prep" className="text-center" type="number" value={currentRecipe.operational_prep} onChange={e => {setCurrentRecipe({...currentRecipe, operational_prep: Number(e.target.value)}); setHasUnsavedChanges(true);}}/><span className="text-[10px] text-slate-400 mt-1 block">PREP</span></div>
                                                <div className="flex-1 text-center"><StyledInput placeholder="Cook" className="text-center" type="number" value={currentRecipe.operational_cook} onChange={e => {setCurrentRecipe({...currentRecipe, operational_cook: Number(e.target.value)}); setHasUnsavedChanges(true);}}/><span className="text-[10px] text-slate-400 mt-1 block">FOGO</span></div>
                                                <div className="flex-1 text-center"><StyledInput placeholder="Plate" className="text-center" type="number" value={currentRecipe.operational_plating} onChange={e => {setCurrentRecipe({...currentRecipe, operational_plating: Number(e.target.value)}); setHasUnsavedChanges(true);}}/><span className="text-[10px] text-slate-400 mt-1 block">MONTAGEM</span></div>
                                            </div>
                                        </InputGroup>
                                    </Card>
                                )}
                             </div>

                             {/* Items Table */}
                             <Card className="overflow-hidden min-h-[400px] flex flex-col">
                                 <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                     <h3 className="font-bold text-slate-700 flex items-center gap-2"><Layers size={18} className="text-slate-400"/> Composição</h3>
                                     <div className="flex gap-2">
                                         <button onClick={() => { setCurrentRecipe({...currentRecipe, items: [...currentRecipe.items, { item_type: 'ingredient', ref_id: '', qty: 0, unit: 'kg' }]}); setHasUnsavedChanges(true); }} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 px-3 py-2 rounded-lg flex items-center gap-1 font-bold transition-colors"><Plus size={14}/> Adicionar Insumo</button>
                                         <button onClick={() => { setCurrentRecipe({...currentRecipe, items: [...currentRecipe.items, { item_type: 'sub_recipe', ref_id: '', qty: 0, unit: 'kg' }]}); setHasUnsavedChanges(true); }} className="text-xs bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 px-3 py-2 rounded-lg flex items-center gap-1 font-bold transition-colors"><Plus size={14}/> Adicionar Base</button>
                                     </div>
                                 </div>
                                 <div className="flex-1 overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-white border-b border-slate-100 text-slate-500">
                                            <tr>
                                                <th className="p-3 pl-6 text-left w-20">Tipo</th>
                                                <th className="p-3 text-left w-[40%]">Item</th>
                                                <th className="p-3 w-24">Qtd</th>
                                                <th className="p-3 w-20 text-center">Un</th>
                                                <th className="p-3 text-right">Custo</th>
                                                <th className="w-16"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {currentRecipe.items.map((item, idx) => {
                                                let cost = 0;
                                                let options = [];
                                                if(item.item_type === 'ingredient') {
                                                    options = ingredients;
                                                    const ing = ingredients.find(i => i.id === item.ref_id);
                                                    if(ing) cost = item.qty * ing.cost_per_unit;
                                                } else {
                                                    options = recipes.filter(r => r.type === 'sub_recipe' && r.id !== currentRecipe.id);
                                                    const sub = options.find((o:any) => o.id === item.ref_id) as Recipe;
                                                    if(sub) {
                                                        const subCost = getRecipeCosts(sub).costPerPortion;
                                                        cost = item.qty * subCost;
                                                    }
                                                }
                                                
                                                const updateItem = (field: keyof RecipeItemDB, val: any) => {
                                                    const newItems = [...currentRecipe.items];
                                                    newItems[idx] = { ...newItems[idx], [field]: val };
                                                    if(field === 'ref_id') {
                                                        const found = options.find((o:any) => o.id === val);
                                                        if(found) newItems[idx].unit = (found as any).unit;
                                                    }
                                                    setCurrentRecipe({...currentRecipe, items: newItems});
                                                    setHasUnsavedChanges(true);
                                                };

                                                return (
                                                    <tr key={idx} className="group hover:bg-slate-50/50">
                                                        <td className="p-2 pl-6">
                                                            <Badge color={item.item_type === 'ingredient' ? 'blue' : 'orange'}>{item.item_type === 'ingredient' ? 'INS' : 'BASE'}</Badge>
                                                        </td>
                                                        <td className="p-2">
                                                            <StyledSelect value={item.ref_id} onChange={e => updateItem('ref_id', e.target.value)}>
                                                                <option value="">Selecione...</option>
                                                                {options.map((o:any) => <option key={o.id} value={o.id}>{o.name}</option>)}
                                                            </StyledSelect>
                                                        </td>
                                                        <td className="p-2"><StyledInput type="number" className="text-center font-medium" value={item.qty} onChange={e => updateItem('qty', Number(e.target.value))} /></td>
                                                        <td className="p-2 text-center text-slate-500 text-xs font-bold uppercase">{item.unit}</td>
                                                        <td className="p-2 text-right font-mono text-slate-700 font-medium">{formatCurrency(cost)}</td>
                                                        <td className="p-2 text-center"><button onClick={() => { const newItems = currentRecipe.items.filter((_, i) => i !== idx); setCurrentRecipe({...currentRecipe, items: newItems}); setHasUnsavedChanges(true); }} className="text-slate-300 hover:text-red-500 p-1.5 rounded-full hover:bg-red-50 transition-colors"><X size={16}/></button></td>
                                                    </tr>
                                                )
                                            })}
                                            {currentRecipe.items.length === 0 && (
                                                <tr><td colSpan={6} className="p-12 text-center text-slate-400 italic">Nenhum item adicionado à receita.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                 </div>
                             </Card>

                             {/* Extras & Instructions Grid */}
                             <div className="grid grid-cols-12 gap-6">
                                 <Card className="col-span-12 lg:col-span-7 p-6">
                                     <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2"><TrendingUp size={18}/> Custos Indiretos & Extras</h3>
                                     <div className="grid grid-cols-2 gap-4 mb-4">
                                        <InputGroup label="Embalagem"><StyledInput type="number" value={currentRecipe.extra_packaging} onChange={e => {setCurrentRecipe({...currentRecipe, extra_packaging: Number(e.target.value)}); setHasUnsavedChanges(true);}} /></InputGroup>
                                        <InputGroup label={currentRecipe.type === 'drink' ? 'Gelo/Guarnição' : 'Energia/Gás'}><StyledInput type="number" value={currentRecipe.type === 'drink' ? currentRecipe.extra_ice_garnish : currentRecipe.extra_utilities} onChange={e => {setCurrentRecipe({...currentRecipe, [currentRecipe.type === 'drink' ? 'extra_ice_garnish' : 'extra_utilities']: Number(e.target.value)}); setHasUnsavedChanges(true);}} /></InputGroup>
                                     </div>
                                     <div className="grid grid-cols-2 gap-4">
                                        <InputGroup label="Outros"><StyledInput type="number" value={currentRecipe.extra_other_direct} onChange={e => {setCurrentRecipe({...currentRecipe, extra_other_direct: Number(e.target.value)}); setHasUnsavedChanges(true);}} /></InputGroup>
                                        <InputGroup label="Rateio Custo Fixo"><StyledInput className="border-amber-200 bg-amber-50 focus:ring-amber-500" type="number" value={currentRecipe.extra_fixed_cost} onChange={e => {setCurrentRecipe({...currentRecipe, extra_fixed_cost: Number(e.target.value)}); setHasUnsavedChanges(true);}} /></InputGroup>
                                     </div>
                                 </Card>
                                 <Card className="col-span-12 lg:col-span-5 flex flex-col overflow-hidden">
                                     <div className="bg-slate-50 p-3 border-b border-slate-200 font-bold text-sm text-slate-700">Modo de Preparo</div>
                                     <textarea className="w-full h-full p-4 resize-none outline-none text-sm text-slate-700 leading-relaxed bg-white" placeholder="Descreva o passo a passo..." value={currentRecipe.instructions} onChange={e => {setCurrentRecipe({...currentRecipe, instructions: e.target.value}); setHasUnsavedChanges(true);}} />
                                 </Card>
                             </div>
                        </div>

                        {/* RIGHT: Pricing Engine (Fixed Width) */}
                        <div className="w-[400px] bg-white border-l border-slate-200 flex flex-col z-10 shadow-xl shadow-slate-200/50">
                             <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                                <h3 className="font-bold text-lg flex items-center gap-2 mb-1 text-slate-800"><DollarSign className="text-emerald-500"/> Precificação</h3>
                                <p className="text-xs text-slate-500">Análise financeira em tempo real.</p>
                             </div>
                             
                             <div className="flex-1 overflow-y-auto p-6 space-y-8">
                                 {(() => {
                                     const costs = getRecipeCosts(currentRecipe);
                                     
                                     // Suggested Price Logic
                                     let suggested = 0;
                                     const targetDec = Number(currentRecipe.pricing_target)/100;
                                     if(currentRecipe.pricing_method === 'margin') {
                                         const div = 1 - (Number(currentRecipe.taxes_pct)/100) - (Number(currentRecipe.card_fee_pct)/100) - targetDec;
                                         suggested = div > 0 ? costs.costPerPortion / div : 0;
                                     } else {
                                         suggested = costs.costPerPortion * (1 + targetDec);
                                     }

                                     return (
                                         <>
                                            <div className="space-y-3 pb-6 border-b border-slate-100">
                                                <div className="flex justify-between items-center"><span className="text-sm text-slate-500 font-medium">Custo Produção Total</span> <span className="font-mono text-slate-700">{formatCurrency(costs.totalCost)}</span></div>
                                                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                    <span className="text-xs font-bold uppercase text-slate-500">Custo / {currentRecipe.type === 'sub_recipe' ? currentRecipe.unit : 'Porção'}</span> 
                                                    <span className="font-bold text-lg text-slate-800">{formatCurrency(costs.costPerPortion)}</span>
                                                </div>
                                            </div>

                                            {currentRecipe.type !== 'sub_recipe' && (
                                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                                    <div>
                                                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Método de Precificação</label>
                                                        <div className="flex bg-slate-100 p-1 rounded-lg">
                                                            <button onClick={() => {setCurrentRecipe({...currentRecipe, pricing_method: 'margin'}); setHasUnsavedChanges(true);}} className={`flex-1 text-xs py-2 rounded-md font-bold transition-all ${currentRecipe.pricing_method === 'margin' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Margem</button>
                                                            <button onClick={() => {setCurrentRecipe({...currentRecipe, pricing_method: 'markup'}); setHasUnsavedChanges(true);}} className={`flex-1 text-xs py-2 rounded-md font-bold transition-all ${currentRecipe.pricing_method === 'markup' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Markup</button>
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-4">
                                                        <div className="flex-1">
                                                            <InputGroup label="Meta %">
                                                                <StyledInput type="number" className="text-right font-bold" value={currentRecipe.pricing_target} onChange={e => {setCurrentRecipe({...currentRecipe, pricing_target: Number(e.target.value)}); setHasUnsavedChanges(true);}} />
                                                            </InputGroup>
                                                        </div>
                                                        <div className="flex-1">
                                                            <InputGroup label="Sugerido">
                                                                <div className="w-full bg-slate-100 border border-slate-200 text-slate-500 text-sm rounded-lg px-3 py-2.5 text-right font-mono font-bold cursor-not-allowed">
                                                                    {formatCurrency(suggested)}
                                                                </div>
                                                            </InputGroup>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="pt-6 border-t border-slate-100">
                                                        <label className="text-xs font-bold text-slate-900 uppercase flex items-center gap-2 mb-2">Preço de Venda <span className="text-[10px] font-normal text-slate-400 bg-slate-100 px-1.5 rounded">FINAL</span></label>
                                                        <div className="flex items-center gap-3 relative">
                                                            <span className="absolute left-0 top-1 text-emerald-600 font-bold text-2xl">R$</span>
                                                            <input type="number" className="bg-transparent text-4xl font-black text-slate-900 w-full outline-none border-b-2 border-slate-200 focus:border-emerald-500 pl-8 transition-colors pb-1" placeholder="0.00" value={currentRecipe.final_price} onChange={e => {setCurrentRecipe({...currentRecipe, final_price: Number(e.target.value)}); setHasUnsavedChanges(true);}} />
                                                        </div>
                                                    </div>

                                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                                                        <div className="flex justify-between text-xs text-slate-500 items-center">
                                                            <span>Impostos ({currentRecipe.taxes_pct}%)</span>
                                                            <input type="number" className="w-12 bg-white border rounded px-1 text-right text-xs" value={currentRecipe.taxes_pct} onChange={e => setCurrentRecipe({...currentRecipe, taxes_pct: Number(e.target.value)})}/>
                                                        </div>
                                                        <div className="flex justify-between text-xs text-slate-500 items-center">
                                                            <span>Taxas Cartão ({currentRecipe.card_fee_pct}%)</span>
                                                            <input type="number" className="w-12 bg-white border rounded px-1 text-right text-xs" value={currentRecipe.card_fee_pct} onChange={e => setCurrentRecipe({...currentRecipe, card_fee_pct: Number(e.target.value)})}/>
                                                        </div>
                                                        <div className="pt-2 border-t border-slate-200 flex justify-between text-xs font-bold text-slate-700">
                                                            <span>Receita Líquida</span>
                                                            <span>{formatCurrency(costs.price - costs.tax - (costs.price * (Number(currentRecipe.card_fee_pct)/100)))}</span>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <div className="flex justify-between items-end">
                                                            <label className="text-xs font-bold text-slate-400 uppercase">Lucro Líquido</label>
                                                            <span className={`text-2xl font-bold ${costs.profit > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatCurrency(costs.profit)}</span>
                                                        </div>
                                                        
                                                        <div>
                                                            <div className="flex justify-between items-end mb-2">
                                                                <label className="text-xs font-bold text-slate-400 uppercase">Margem Real</label>
                                                                <span className={`text-xl font-bold ${costs.margin >= 20 ? 'text-emerald-600' : costs.margin > 0 ? 'text-orange-500' : 'text-red-500'}`}>{costs.margin.toFixed(1)}%</span>
                                                            </div>
                                                            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner">
                                                                <div className={`h-full transition-all duration-500 ${costs.margin >= 20 ? 'bg-emerald-500' : costs.margin > 0 ? 'bg-orange-400' : 'bg-red-500'}`} style={{width: `${Math.min(Math.max(costs.margin, 0), 100)}%`}}></div>
                                                            </div>
                                                            <p className="text-[10px] text-slate-400 mt-1 text-center">Ideal: &gt; 25%</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                         </>
                                     )
                                 })()}
                             </div>
                        </div>
                    </div>
                </div>
            )}

            {/* IMPORT MODAL (PREVIEW & INPUT) */}
            {showImportModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100]">
                    <div className={`bg-white p-8 rounded-2xl shadow-2xl w-full border border-slate-100 transform transition-all scale-100 ${isImportReviewStep ? 'max-w-4xl' : 'max-w-lg'}`}>
                        <div className="flex justify-between mb-6 items-center">
                            <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2"><Download className="text-blue-500"/> {isImportReviewStep ? 'Revisar Dados' : 'Importar Dados'}</h3>
                            <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600"><X/></button>
                        </div>

                        {!isImportReviewStep ? (
                            <>
                                <div className="mb-4 text-sm text-slate-500 bg-blue-50 p-4 rounded-lg border border-blue-100">
                                    Cole seus dados do Excel/CSV abaixo. O sistema identificará automaticamente:<br/>
                                    <span className="font-mono text-xs text-blue-700 mt-1 block">Nome | Preço | Embalagem | Rendimento</span>
                                    <span className="text-xs text-slate-400 mt-1 block">Ex: Acafrao | R$ 30,00 | 1 kg | 100%</span>
                                </div>
                                <textarea className="w-full h-40 border border-slate-300 rounded-lg p-3 text-xs font-mono mb-6 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Cole seus dados aqui..." value={importText} onChange={e => setImportText(e.target.value)}></textarea>
                                <button onClick={handlePreviewImport} disabled={!importText.trim()} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold shadow-lg shadow-blue-600/20 transition-all flex justify-center items-center gap-2">
                                    Processar Texto
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="max-h-[500px] overflow-y-auto mb-6 border rounded-lg">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 text-slate-500 font-semibold text-xs sticky top-0">
                                            <tr>
                                                <th className="p-3">Nome</th>
                                                <th className="p-3">Preço</th>
                                                <th className="p-3">Emb.</th>
                                                <th className="p-3">Rend.</th>
                                                <th className="p-3">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {importPreviewData.map((item, idx) => (
                                                <tr key={idx} className={item.isValid ? 'bg-white' : 'bg-red-50'}>
                                                    <td className="p-3 font-medium">{item.name}</td>
                                                    <td className="p-3">{formatCurrency(item.price)}</td>
                                                    <td className="p-3">{item.package_qty} {item.unit}</td>
                                                    <td className="p-3">{item.yield_factor}%</td>
                                                    <td className="p-3">
                                                        {item.isValid ? 
                                                            <span className="text-emerald-600 text-xs font-bold flex items-center gap-1"><CheckCircle size={14}/> Válido</span> : 
                                                            <span className="text-red-600 text-xs font-bold flex items-center gap-1"><AlertCircle size={14}/> {item.errorMsg}</span>
                                                        }
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg">
                                    <div className="text-sm text-slate-600">
                                        <span className="font-bold text-slate-800">{importPreviewData.filter(i => i.isValid).length}</span> itens válidos prontos para importar.
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => setIsImportReviewStep(false)} className="text-slate-600 px-4 py-2 hover:bg-slate-200 rounded-lg">Voltar</button>
                                        <button onClick={executeImport} disabled={isProcessingImport || importPreviewData.filter(i => i.isValid).length === 0} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-bold shadow-lg flex items-center gap-2">
                                            {isProcessingImport && <Loader2 className="animate-spin" size={18}/>}
                                            Confirmar Importação
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* DELETE CONFIRMATION MODAL */}
            {deleteModal.open && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[150]">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm text-center border border-slate-100 animate-in zoom-in-95 duration-200">
                        <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Trash2 className="text-red-600" size={32}/>
                        </div>
                        <h3 className="font-bold text-xl text-slate-900 mb-2">{deleteModal.title}</h3>
                        <p className="text-sm text-slate-500 mb-8 leading-relaxed">{deleteModal.message}</p>
                        
                        <div className="flex flex-col gap-3">
                            <button onClick={executeDelete} disabled={isDeleting} className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-red-600/20 transition-all flex justify-center items-center gap-2">
                                {isDeleting ? <Loader2 className="animate-spin" size={20}/> : 'Sim, Excluir'}
                            </button>
                            <button onClick={() => setDeleteModal(prev => ({ ...prev, open: false }))} disabled={isDeleting} className="w-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 py-3 rounded-xl font-medium transition-all">
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* UNSAVED CHANGES MODAL */}
            {showUnsavedModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100]">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm text-center border border-slate-100">
                        <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="text-amber-500" size={32}/>
                        </div>
                        <h3 className="font-bold text-xl text-slate-800 mb-2">Alterações não salvas</h3>
                        <p className="text-sm text-slate-500 mb-8">Você tem alterações pendentes. Se sair agora, perderá o progresso não salvo.</p>
                        <div className="flex flex-col gap-3">
                            <button onClick={saveRecipe} className="bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-600/20 transition-all">Salvar e Sair</button>
                            <button onClick={() => { setHasUnsavedChanges(false); setShowUnsavedModal(false); if(pendingView) { setView(pendingView); setPendingView(null); } else setView('recipes'); }} className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 py-3 rounded-xl font-medium transition-all">Descartar Alterações</button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    </div>
  );
}