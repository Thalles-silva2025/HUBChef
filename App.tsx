import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Trash2, Save, FileText, DollarSign, 
  ChefHat, ArrowRight, Printer, History,
  AlertTriangle, Scale, Edit2, TrendingUp,
  PieChart, BarChart2, Activity, X, Loader2, Cloud, FileSpreadsheet, Download, Wine, Layers, ChevronLeft, Settings, ToggleLeft, ToggleRight, Target, Search, MoreHorizontal, Calendar, Box, CheckSquare, Square, AlertCircle, CheckCircle, Info, Calculator, ClipboardCheck, Timer, TrendingDown, ArrowUpRight, ArrowDownRight, Eye
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, Legend, ResponsiveContainer, PieChart as RePieChart, Pie, Cell 
} from 'recharts';

import { supabase } from './services/supabaseClient';
import { Login } from './components/Login';
import type { FixedExpense, Ingredient, Recipe, RecipeItemDB, Category, FixedExpenseItem, ProductionRun, ProductionItem } from './types';

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
        return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
    } catch (e) {
        return '-';
    }
};

const formatMonth = (m: number) => {
  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  return months[m - 1] || m;
};

// --- CONSTANTS: PLANO DE CONTAS PADRÃO ---
const DEFAULT_EXPENSE_CATEGORIES = [
    "01. Ocupação (Aluguel, Condomínio, IPTU)",
    "02. Pessoal (Salários, 13º, Férias)",
    "03. Encargos Sociais & Benefícios",
    "04. Utilidades (Energia, Água, Gás)",
    "05. Manutenção & Reparos",
    "06. Marketing & Publicidade",
    "07. Serviços Administrativos (Contabilidade, Jurídico)",
    "08. Sistemas & Tecnologia",
    "09. Material de Consumo & Limpeza",
    "10. Despesas Financeiras & Bancárias",
    "11. Logística & Transporte"
];

// --- UI COMPONENTS ---
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
}
const Card: React.FC<CardProps> = ({ children, className = "", ...props }) => (
  <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`} {...props}>
    {children}
  </div>
);

interface InputGroupProps {
  label: string;
  children?: React.ReactNode;
  className?: string;
}
const InputGroup: React.FC<InputGroupProps> = ({ label, children, className = "" }) => (
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

interface BadgeProps {
  children?: React.ReactNode;
  color?: "slate" | "emerald" | "red" | "blue" | "orange" | "purple" | "yellow";
}
const Badge: React.FC<BadgeProps> = ({ children, color = "slate" }) => {
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
    
    const handlePrint = () => {
        window.print();
    };

    useEffect(() => {
        const timer = setTimeout(handlePrint, 500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="fixed inset-0 bg-slate-900 z-[9999] overflow-auto flex justify-center py-8 print:p-0 print:bg-white print:static print:block print:h-auto print:overflow-visible">
            <div id="print-section" className="max-w-[21cm] w-full bg-white shadow-2xl min-h-[29.7cm] p-[1.5cm] relative print:shadow-none print:w-full print:h-auto print:p-0 rounded-none print:m-0 print:overflow-visible">
                <div className="absolute top-4 right-4 flex gap-2 no-print">
                    <button onClick={handlePrint} className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg shadow-lg hover:bg-emerald-700 flex items-center gap-2 font-bold transition-all"><Printer size={18}/> Imprimir</button>
                    <button onClick={onClose} className="bg-slate-100 text-slate-800 px-4 py-2.5 rounded-lg hover:bg-slate-200 font-medium transition-all">Fechar</button>
                </div>
                
                <header className="border-b-2 border-slate-900 pb-6 mb-8 flex justify-between items-end avoid-break">
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

                <div className="grid grid-cols-4 gap-6 mb-8 avoid-break">
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
                    <h3 className="font-bold text-sm uppercase border-b-2 border-slate-200 mb-4 pb-2 text-slate-800 avoid-break">Composição</h3>
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
                                    <tr key={idx} className="avoid-break">
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
                        <h3 className="font-bold text-sm uppercase border-b-2 border-slate-200 mb-4 pb-2 text-slate-800 avoid-break">Modo de Preparo</h3>
                        <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed text-justify font-serif">
                            {recipe.instructions || "Nenhuma instrução cadastrada."}
                        </p>
                    </div>
                    <div className="avoid-break">
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
    type: 'ingredients' | 'recipes' | 'expenses' | 'categories' | 'production';
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [productionRuns, setProductionRuns] = useState<ProductionRun[]>([]);
  
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

  // Production Wizard State
  const [prodWizardStep, setProdWizardStep] = useState(1); // 1: Select, 2: Execute, 3: Review
  const [currentProduction, setCurrentProduction] = useState<Partial<ProductionRun> & { items: ProductionItem[] }>({
      items: [], actual_time_minutes: 0, actual_yield: 0
  });
  const [viewingProduction, setViewingProduction] = useState<ProductionRun | null>(null);

  // Expense Editor State
  const [activeExpenseId, setActiveExpenseId] = useState<string | 'new' | null>(null);
  const [expenseForm, setExpenseForm] = useState<{
      id: string | null;
      month: string;
      year: string;
      dishes: string;
      items: { category_id: string; amount: string }[];
  }>({ id: null, month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()), dishes: '', items: [] });

  // Category Manager State
  const [catTab, setCatTab] = useState<'recipe' | 'expense'>('recipe');

  // Auto-scroll ref
  const editorScrollRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = () => {
    setTimeout(() => {
        if(editorScrollRef.current) {
            editorScrollRef.current.scrollTo({ top: editorScrollRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, 100);
  };

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

    const { data: prodData } = await supabase.from('production_runs').select('*, production_items(*)').order('created_at', { ascending: false });
    if(prodData) {
        const mappedRuns = prodData.map(p => ({
            ...p,
            items: p.production_items || []
        }));
        setProductionRuns(mappedRuns);
    }

    // Fetch expenses and their items
    const { data: expData } = await supabase.from('fixed_expenses').select('*, fixed_expense_items(*)').order('year', {ascending:false}).order('month', {ascending:false});
    if(expData) {
        const mappedExpenses = expData.map(e => ({
            ...e,
            items: e.fixed_expense_items || []
        }));
        setExpenses(mappedExpenses);
    }

    const { data: catData } = await supabase.from('categories').select('*').order('name');
    
    // AUTO-SEED: Check if expense categories exist. If not, insert defaults.
    let finalCategories = catData || [];
    const hasExpenses = finalCategories.some(c => c.type === 'expense');
    
    if (!hasExpenses && session?.user) {
        const { data: newCats } = await supabase.from('categories').insert(
            DEFAULT_EXPENSE_CATEGORIES.map(name => ({
                user_id: session.user.id,
                name,
                type: 'expense'
            }))
        ).select();
        
        if (newCats) {
            // Sort merged categories
            finalCategories = [...finalCategories, ...newCats].sort((a,b) => a.name.localeCompare(b.name));
        }
    }
    
    setCategories(finalCategories);
  };

  useEffect(() => {
    if (session) {
      fetchData();
      const channels = supabase.channel('custom-all-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients' }, () => fetchData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'recipes' }, () => fetchData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'fixed_expenses' }, () => fetchData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'fixed_expense_items' }, () => fetchData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => fetchData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'production_runs' }, () => fetchData())
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
  const confirmDelete = (type: DeleteState['type'], ids: string[], isBulk = false) => {
      let title = '';
      let message = '';
      const count = ids.length;

      if (type === 'production') {
          title = 'Excluir Produção?';
          message = 'Deseja remover este histórico de produção realizado? Esta ação não pode ser desfeita.';
      } else if (type === 'ingredients') {
          title = isBulk ? `Excluir ${count} Insumos?` : 'Excluir Insumo?';
          message = isBulk 
            ? 'Esta ação é irreversível. Se algum insumo estiver em uso, a exclusão falhará para proteger suas receitas.' 
            : 'Tem certeza que deseja excluir este insumo permanentemente?';
      } else if (type === 'recipes') {
          title = isBulk ? `Excluir ${count} Fichas?` : 'Excluir Ficha Técnica?';
          message = 'Esta ação removerá permanentemente a ficha técnica e seus itens.';
      } else if (type === 'expenses') {
          title = 'Excluir Despesa?';
          message = 'Deseja remover este registro de despesas fixas e todos os seus itens?';
      } else if (type === 'categories') {
          title = 'Excluir Categoria?';
          message = 'Deseja remover esta categoria? Itens associados podem perder a referência.';
      }

      setDeleteModal({ open: true, title, message, isBulk, ids, type });
  };

  const executeDelete = async () => {
      setIsDeleting(true);
      const { type, ids } = deleteModal;
      
      const { error } = await supabase.from(
          type === 'expenses' ? 'fixed_expenses' : 
          type === 'production' ? 'production_runs' : type
      ).delete().in(type === 'categories' ? 'id' : 'id', ids); // Categories now use ID
      
      if(error) {
          console.error(error);
          if (error.code === '23503') {
             alert("Não foi possível excluir alguns itens pois eles estão sendo usados em outras partes do sistema.");
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
              if(activeExpenseId && ids.includes(activeExpenseId)) setActiveExpenseId(null);
          } else if (type === 'categories') {
              setCategories(prev => prev.filter(c => !ids.includes(c.id)));
          } else if (type === 'production') {
              setProductionRuns(prev => prev.filter(p => !ids.includes(p.id)));
          }
      }
      setIsDeleting(false);
      setDeleteModal(prev => ({ ...prev, open: false }));
  };

  // --- LOGIC: Production Module ---
  const startProduction = () => {
      setProdWizardStep(1);
      setCurrentProduction({
          items: [],
          actual_time_minutes: 0,
          actual_yield: 0,
          notes: ''
      });
      setView('production-wizard');
  };

  const initProductionFromRecipe = (recipeId: string) => {
      const recipe = recipes.find(r => r.id === recipeId);
      if(!recipe) return;

      const items: ProductionItem[] = recipe.items.map(item => {
          let name = '';
          let unitCost = 0;
          let unit = item.unit;

          if (item.item_type === 'ingredient') {
              const ing = ingredients.find(i => i.id === item.ref_id);
              name = ing?.name || 'Item Removido';
              unitCost = ing?.cost_per_unit || 0;
          } else {
              const sub = recipes.find(r => r.id === item.ref_id);
              name = sub?.name || 'Base Removida';
              if(sub) {
                  // Calculate sub-recipe cost per unit (simplified logic re-use)
                  const subTotalCost = (sub.items || []).reduce((acc, subItem) => {
                      const si = ingredients.find(i => i.id === subItem.ref_id);
                      return acc + (si ? subItem.qty * si.cost_per_unit : 0);
                  }, 0); // ignoring extras for simplicity in this prompt context
                  unitCost = Number(sub.portions) > 0 ? subTotalCost / Number(sub.portions) : 0;
              }
          }

          return {
              item_name: name,
              unit: unit,
              unit_cost: unitCost,
              planned_qty: item.qty,
              actual_qty: item.qty // Default to planned
          };
      });

      const totalTime = (Number(recipe.operational_prep)||0) + (Number(recipe.operational_cook)||0) + (Number(recipe.operational_plating)||0);
      const totalPlannedCost = items.reduce((acc, i) => acc + (i.planned_qty * i.unit_cost), 0);

      setCurrentProduction({
          recipe_id: recipe.id!,
          recipe_name: recipe.name,
          planned_yield: recipe.portions,
          planned_time_minutes: totalTime,
          planned_cost: totalPlannedCost,
          actual_yield: recipe.portions, // Default
          actual_time_minutes: totalTime, // Default
          items: items
      });
      setProdWizardStep(2);
  };

  const saveProductionRun = async () => {
      if(!currentProduction.recipe_id) return;

      const actualCost = currentProduction.items!.reduce((acc, i) => acc + (i.actual_qty * i.unit_cost), 0);

      const runPayload = {
          user_id: session.user.id,
          recipe_id: currentProduction.recipe_id,
          recipe_name: currentProduction.recipe_name,
          planned_yield: currentProduction.planned_yield,
          planned_time_minutes: currentProduction.planned_time_minutes,
          planned_cost: currentProduction.planned_cost,
          actual_yield: currentProduction.actual_yield,
          actual_time_minutes: currentProduction.actual_time_minutes,
          actual_cost: actualCost,
          notes: currentProduction.notes
      };

      const { data: runData, error: runError } = await supabase.from('production_runs').insert(runPayload).select().single();
      
      if(runError) { alert('Erro ao salvar produção'); console.error(runError); return; }

      const itemsPayload = currentProduction.items!.map(item => ({
          production_run_id: runData.id,
          item_name: item.item_name,
          unit: item.unit,
          unit_cost: item.unit_cost,
          planned_qty: item.planned_qty,
          actual_qty: item.actual_qty
      }));

      const { error: itemsError } = await supabase.from('production_items').insert(itemsPayload);
      
      if(itemsError) { alert('Erro ao salvar itens'); console.error(itemsError); return; }

      alert('Produção salva com sucesso!');
      fetchData();
      setView('production');
  };

  // --- LOGIC: Expense Management ---
  const handleEditExpense = (expense?: FixedExpense) => {
      if (expense) {
          setActiveExpenseId(expense.id);
          const formItems = expense.items?.map(i => ({ category_id: i.category_id, amount: String(i.amount) })) || [];
          setExpenseForm({
              id: expense.id,
              month: String(expense.month),
              year: String(expense.year),
              dishes: String(expense.total_dishes_sold),
              items: formItems
          });
      } else {
          // New
          setActiveExpenseId('new');
          // Initialize with all expense categories with 0 amount
          const expCats = categories.filter(c => c.type === 'expense');
          setExpenseForm({
              id: null,
              month: String(new Date().getMonth() + 1),
              year: String(new Date().getFullYear()),
              dishes: '',
              items: expCats.map(c => ({ category_id: c.id, amount: '' }))
          });
      }
  };

  const handleSaveExpense = async () => {
      const { month, year, dishes, items, id } = expenseForm;
      const total = items.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
      const dishesNum = Number(dishes) || 1;
      const costPerDish = total / dishesNum;

      const payload = {
          user_id: session.user.id,
          month: Number(month),
          year: Number(year),
          total_expenses: total,
          total_dishes_sold: dishesNum,
          cost_per_dish: costPerDish
      };

      let expenseId = id;

      if (id) {
          const { error } = await supabase.from('fixed_expenses').update(payload).eq('id', id);
          if (error) { console.error(error); alert('Erro ao atualizar'); return; }
      } else {
          const { data, error } = await supabase.from('fixed_expenses').insert(payload).select().single();
          if (error) { console.error(error); alert('Erro ao criar'); return; }
          expenseId = data.id;
      }

      // Handle items: Delete all existing for this expense and re-insert (simple approach)
      await supabase.from('fixed_expense_items').delete().eq('fixed_expense_id', expenseId);
      
      const itemsPayload = items
          .filter(i => Number(i.amount) > 0) // Only save items with values
          .map(i => ({
              fixed_expense_id: expenseId,
              category_id: i.category_id,
              amount: Number(i.amount)
          }));
      
      if (itemsPayload.length > 0) {
          await supabase.from('fixed_expense_items').insert(itemsPayload);
      }

      setActiveExpenseId(null);
      fetchData();
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

  // ... [Import Logic skipped for brevity, keeping same structure] ...
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
          if (cols[0].toLowerCase().includes('nome')) return; 
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
      if (validItems.length === 0) { alert("Nenhum item válido."); setIsProcessingImport(false); return; }
      const payload = validItems.map(i => ({
          user_id: session.user.id, name: i.name, unit: i.unit, price: i.price, package_qty: i.package_qty, yield_factor: i.yield_factor / 100, cost_per_unit: i.cost_per_unit
      }));
      const { error } = await supabase.from('ingredients').insert(payload);
      setIsProcessingImport(false);
      if (error) { alert("Erro ao salvar."); console.error(error); } 
      else { setShowImportModal(false); setIsImportReviewStep(false); setImportText(""); setImportPreviewData([]); fetchData(); alert(`${validItems.length} itens importados!`); }
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
          category: isDrink ? 'Drink' : 'Prato Principal', // Default
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
      
      fetchData(); 
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

  // Filter Categories
  const recipeCategories = categories.filter(c => c.type === 'recipe');
  const expenseCategories = categories.filter(c => c.type === 'expense');

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

            <div className="flex-1 px-3 space-y-1 overflow-y-auto no-scrollbar">
                <NavButton icon={Activity} label="Dashboard" target="dashboard" />
                <NavButton icon={BarChart2} label="Relatórios" target="reports" />
                
                <div className="my-4 border-t border-slate-800/50 mx-2"></div>
                {isSidebarOpen && <div className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Gestão</div>}

                <NavButton icon={ArrowRight} label="Insumos" target="ingredients" />
                <NavButton icon={Layers} label="Bases" target="sub_recipes" />
                <NavButton icon={FileText} label="Fichas Técnicas" target="recipes" />
                <NavButton icon={Wine} label="Drinks" target="drinks" />
                <NavButton icon={ClipboardCheck} label="Produção" target="production" />
                
                <div className="my-4 border-t border-slate-800/50 mx-2"></div>
                {isSidebarOpen && <div className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Financeiro</div>}
                
                <NavButton icon={TrendingUp} label="Despesas Fixas" target="fixed-expenses" />
                <NavButton icon={Settings} label="Configurações" target="categories" />
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
            
            {/* PRODUCTION LIST VIEW */}
            {view === 'production' && (
                <div className="p-6 md:p-10 w-full max-w-7xl mx-auto">
                    <header className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                                <ClipboardCheck className="text-emerald-600" size={32}/> Controle de Produção
                            </h1>
                            <p className="text-slate-500 mt-1 ml-11">Realize a baixa de produção e compare custos Teóricos vs. Reais.</p>
                        </div>
                        <button onClick={startProduction} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-bold shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all transform active:scale-95">
                            <Plus size={20} /> Nova Produção
                        </button>
                    </header>

                    <Card className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-xs border-b border-slate-200">
                                    <tr>
                                        <th className="p-4">Data</th>
                                        <th className="p-4">Receita Produzida</th>
                                        <th className="p-4 text-center">Tempo (Real)</th>
                                        <th className="p-4 text-center">Rendimento (Real)</th>
                                        <th className="p-4 text-right">Custo Total</th>
                                        <th className="p-4 text-center">Variação</th>
                                        <th className="p-4"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {productionRuns.map(run => {
                                        const variance = ((run.actual_cost - run.planned_cost) / run.planned_cost) * 100;
                                        return (
                                            <tr key={run.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-4 text-slate-600">{formatDate(run.created_at)}</td>
                                                <td className="p-4 font-bold text-slate-800">{run.recipe_name}</td>
                                                <td className="p-4 text-center text-slate-600">{run.actual_time_minutes} min</td>
                                                <td className="p-4 text-center text-slate-600">{run.actual_yield} un</td>
                                                <td className="p-4 text-right font-mono font-medium text-slate-700">{formatCurrency(run.actual_cost)}</td>
                                                <td className="p-4 text-center">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${Math.abs(variance) < 2 ? 'bg-slate-100 text-slate-500' : variance > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                        {variance > 0 ? '+' : ''}{variance.toFixed(1)}%
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right flex gap-2 justify-end">
                                                    <button onClick={() => { setViewingProduction(run); setView('production-wizard'); setProdWizardStep(3); }} className="text-slate-300 hover:text-blue-500"><Eye size={16}/></button>
                                                    <button onClick={() => confirmDelete('production', [run.id])} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                    {productionRuns.length === 0 && (
                                        <tr><td colSpan={7} className="p-12 text-center text-slate-400">Nenhum registro de produção encontrado.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* PRODUCTION WIZARD VIEW */}
            {view === 'production-wizard' && (
                <div className="absolute inset-0 z-50 bg-slate-50 flex flex-col h-full w-full">
                    {/* Header Wizard */}
                    <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm shrink-0">
                        <div className="flex items-center gap-4">
                            <button onClick={() => { setView('production'); setViewingProduction(null); }} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"><ChevronLeft/></button>
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">{prodWizardStep === 3 ? 'Detalhes da Produção' : 'Nova Produção Realizada'}</h2>
                                {prodWizardStep !== 3 && (
                                    <div className="flex gap-2 mt-1">
                                        <span className={`text-xs px-2 py-0.5 rounded ${prodWizardStep === 1 ? 'bg-emerald-100 text-emerald-700 font-bold' : 'bg-slate-100 text-slate-400'}`}>1. Seleção</span>
                                        <span className={`text-xs px-2 py-0.5 rounded ${prodWizardStep === 2 ? 'bg-emerald-100 text-emerald-700 font-bold' : 'bg-slate-100 text-slate-400'}`}>2. Execução</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full">
                        {prodWizardStep === 1 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {recipes.filter(r => r.status === 'active').map(r => (
                                    <Card key={r.id} className="p-6 cursor-pointer hover:border-emerald-500 hover:shadow-md transition-all group" onClick={() => (r.id && initProductionFromRecipe(r.id))}>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{r.category}</span>
                                            <Badge color={r.type === 'sub_recipe' ? 'orange' : 'emerald'}>{r.type === 'sub_recipe' ? 'Base' : 'Receita'}</Badge>
                                        </div>
                                        <h3 className="font-bold text-lg text-slate-800 mb-1 group-hover:text-emerald-700">{r.name}</h3>
                                        <p className="text-sm text-slate-500">Rendimento Padrão: {r.portions} {r.unit}</p>
                                    </Card>
                                ))}
                            </div>
                        )}

                        {(prodWizardStep === 2 || prodWizardStep === 3) && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                                <Card className="p-6 border-l-4 border-l-emerald-500">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h2 className="text-2xl font-bold text-slate-800 mb-1">{prodWizardStep === 3 && viewingProduction ? viewingProduction.recipe_name : currentProduction.recipe_name}</h2>
                                            <p className="text-slate-500 text-sm">{prodWizardStep === 3 ? 'Relatório de execução finalizada.' : 'Insira os valores reais medidos durante a produção.'}</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs uppercase font-bold text-slate-400">Meta de Tempo</div>
                                            <div className="text-xl font-mono font-bold text-slate-700">{prodWizardStep === 3 && viewingProduction ? viewingProduction.planned_time_minutes : currentProduction.planned_time_minutes} min</div>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-6 mt-6 pt-6 border-t border-slate-100">
                                        <InputGroup label="Tempo Real (min)">
                                            <div className="relative">
                                                <Timer className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                                                <input disabled={prodWizardStep === 3} type="number" className="pl-10 w-full bg-slate-50 border border-slate-200 rounded-lg py-2 focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-70" value={prodWizardStep === 3 && viewingProduction ? viewingProduction.actual_time_minutes : currentProduction.actual_time_minutes} onChange={e => setCurrentProduction({...currentProduction, actual_time_minutes: Number(e.target.value)})}/>
                                            </div>
                                        </InputGroup>
                                        <InputGroup label="Rendimento Final (Real)">
                                            <div className="relative">
                                                <Scale className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                                                <input disabled={prodWizardStep === 3} type="number" className="pl-10 w-full bg-slate-50 border border-slate-200 rounded-lg py-2 focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-70" value={prodWizardStep === 3 && viewingProduction ? viewingProduction.actual_yield : currentProduction.actual_yield} onChange={e => setCurrentProduction({...currentProduction, actual_yield: Number(e.target.value)})}/>
                                            </div>
                                        </InputGroup>
                                        <div className="flex items-end">
                                            <div className="text-sm text-slate-500">
                                                Planejado: <span className="font-bold">{prodWizardStep === 3 && viewingProduction ? viewingProduction.planned_yield : currentProduction.planned_yield}</span> un
                                            </div>
                                        </div>
                                    </div>
                                </Card>

                                <Card className="overflow-hidden">
                                    <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-700 flex justify-between items-center">
                                        <span>Pesagem de Insumos</span>
                                        <span className="text-xs font-normal text-slate-500">{prodWizardStep === 3 ? 'Visualização' : 'Preencha o campo "Realizado"'}</span>
                                    </div>
                                    <table className="w-full text-sm">
                                        <thead className="bg-white text-slate-500 font-semibold border-b border-slate-100">
                                            <tr>
                                                <th className="p-4 text-left">Item</th>
                                                <th className="p-4 text-right w-32">Planejado</th>
                                                <th className="p-4 w-40 text-center bg-emerald-50/50 border-x border-emerald-100 text-emerald-700">REALIZADO</th>
                                                <th className="p-4 w-32 text-center">Desvio</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {(prodWizardStep === 3 && viewingProduction ? viewingProduction.items : currentProduction.items)?.map((item, idx) => {
                                                const variance = item.planned_qty > 0 ? ((item.actual_qty - item.planned_qty) / item.planned_qty) * 100 : 0;
                                                return (
                                                    <tr key={idx} className="hover:bg-slate-50">
                                                        <td className="p-4 font-medium text-slate-700">{item.item_name}</td>
                                                        <td className="p-4 text-right text-slate-500">{item.planned_qty} <span className="text-xs">{item.unit}</span></td>
                                                        <td className="p-2 border-x border-emerald-50 bg-emerald-50/10">
                                                            <input 
                                                                disabled={prodWizardStep === 3}
                                                                type="number" 
                                                                className="w-full text-center font-bold text-slate-800 bg-white border border-emerald-200 rounded p-1.5 focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-transparent disabled:border-none"
                                                                value={item.actual_qty}
                                                                onChange={(e) => {
                                                                    const newItems = [...currentProduction.items!];
                                                                    newItems[idx].actual_qty = Number(e.target.value);
                                                                    setCurrentProduction({...currentProduction, items: newItems});
                                                                }}
                                                            />
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            {Math.abs(variance) > 0.1 && (
                                                                <span className={`text-xs font-bold flex items-center justify-center gap-1 ${variance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                                    {variance > 0 ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}
                                                                    {Math.abs(variance).toFixed(1)}%
                                                                </span>
                                                            )}
                                                            {Math.abs(variance) <= 0.1 && <span className="text-slate-300">-</span>}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </Card>

                                <Card className="p-4">
                                    <InputGroup label="Observações de Produção">
                                        <textarea disabled={prodWizardStep === 3} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none h-24 disabled:opacity-70" placeholder="Ex: Forno estava desregulado, quebra de ovos acima do normal..." value={prodWizardStep === 3 && viewingProduction ? viewingProduction.notes : currentProduction.notes || ''} onChange={e => setCurrentProduction({...currentProduction, notes: e.target.value})}></textarea>
                                    </InputGroup>
                                </Card>

                                <div className="flex justify-end gap-4 pb-8">
                                    <button onClick={() => { setView('production'); setViewingProduction(null); }} className="px-6 py-3 text-slate-500 hover:bg-slate-100 rounded-lg font-medium transition-colors">{prodWizardStep === 3 ? 'Voltar' : 'Cancelar'}</button>
                                    {prodWizardStep === 2 && (
                                        <button onClick={saveProductionRun} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-lg font-bold shadow-lg shadow-emerald-600/20 flex items-center gap-2 transform active:scale-95 transition-all">
                                            <Save size={20}/> Finalizar Produção
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

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
                        <Card className="col-span-1 lg:col-span-2 overflow-hidden flex flex-col">
                            {selectedIds.size > 0 && (
                                <div className="bg-red-50 p-3 flex justify-between items-center border-b border-red-100 animate-in slide-in-from-top-2">
                                    <div className="text-red-700 font-bold text-sm flex items-center gap-2"><CheckSquare size={18}/> {selectedIds.size} itens selecionados</div>
                                    <button onClick={() => confirmDelete('ingredients', Array.from(selectedIds), true)} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2"><Trash2 size={14}/> Excluir Selecionados</button>
                                </div>
                            )}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-xs border-b border-slate-200">
                                        <tr>
                                            <th className="p-4 w-10"><button onClick={() => toggleAll(ingredients.map(i => i.id))} className="text-slate-400 hover:text-slate-600">{selectedIds.size === ingredients.length && ingredients.length > 0 ? <CheckSquare size={20} className="text-emerald-500"/> : <Square size={20}/>}</button></th>
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
                                                <td className="p-4 w-10" onClick={(e) => { e.stopPropagation(); toggleSelection(ing.id); }}>{selectedIds.has(ing.id) ? <CheckSquare size={20} className="text-emerald-500"/> : <Square size={20} className="text-slate-300 group-hover:text-slate-400"/>}</td>
                                                <td className="p-4 pl-0 font-medium text-slate-800">{ing.name}</td>
                                                <td className="p-4 text-slate-500">{formatCurrency(ing.price)} <span className="text-xs">/ {ing.package_qty}{ing.unit}</span></td>
                                                <td className="p-4 text-center"><Badge color={ing.yield_factor < 1 ? "orange" : "blue"}>{Math.round(ing.yield_factor * 100)}%</Badge></td>
                                                <td className="p-4 text-right font-bold text-slate-700">{formatCurrency(ing.cost_per_unit)}</td>
                                                <td className="p-4 text-center pr-6"><button onClick={(e) => { e.stopPropagation(); confirmDelete('ingredients', [ing.id]); }} className="text-slate-300 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50 z-10 relative"><Trash2 size={16}/></button></td>
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
                                     <div className="absolute top-3 left-3 z-20" onClick={(e) => { e.stopPropagation(); toggleSelection(r.id!); }}>{isSelected ? <CheckSquare className="text-emerald-500 bg-white rounded" size={24}/> : <Square className="text-slate-300 hover:text-emerald-400 bg-white/50 rounded" size={24}/>}</div>
                                     <div className="absolute top-3 right-3 z-20"><button onClick={(e) => { e.stopPropagation(); confirmDelete('recipes', [r.id!]); }} className="p-2 bg-white/80 hover:bg-white text-slate-400 hover:text-red-500 rounded-full shadow-sm transition-colors border border-transparent hover:border-red-100"><Trash2 size={18}/></button></div>
                                     <div onClick={() => { setCurrentRecipe(r); setView('recipe-editor'); }} className="p-5 h-full flex flex-col pt-10">
                                        {r.status === 'inactive' && <div className="absolute top-0 right-0 bg-slate-100 text-slate-500 text-[10px] font-bold px-3 py-1 rounded-bl-lg">INATIVO</div>}
                                        <div className="mb-4"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">{r.category}</span><h3 className="font-bold text-lg text-slate-800 leading-tight group-hover:text-emerald-700 transition-colors">{r.name}</h3></div>
                                        <div className="flex items-center gap-4 text-xs text-slate-500 font-medium mb-6"><span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded"><History size={12}/> v{r.version}</span><span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded"><Scale size={12}/> {r.portions} {isSub ? r.unit : 'un'}</span></div>
                                        <div className="mt-auto pt-4 border-t border-slate-100">
                                            {isSub ? (
                                                <div className="flex justify-between items-center"><span className="text-xs font-bold text-orange-600 uppercase bg-orange-50 px-2 py-1 rounded">Custo / {r.unit}</span><span className="font-mono font-bold text-slate-700">{formatCurrency(costs.costPerPortion)}</span></div>
                                            ) : (
                                                <div className="flex justify-between items-end"><div><p className="text-[10px] text-slate-400 uppercase font-bold">Preço Venda</p><p className="font-bold text-slate-800 text-lg">{formatCurrency(r.final_price)}</p></div><div className="text-right"><p className="text-[10px] text-slate-400 uppercase font-bold">Lucro</p><p className={`font-mono font-bold ${costs.profit > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatCurrency(costs.profit)}</p></div></div>
                                            )}
                                        </div>
                                     </div>
                                </Card>
                            )
                        })}
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
            
            {/* FIXED EXPENSES - NEW SPLIT VIEW */}
            {view === 'fixed-expenses' && (
                <div className="p-6 md:p-10 w-full max-w-[1600px] mx-auto flex gap-8 h-full overflow-hidden">
                    {/* Left: List */}
                    <div className="w-1/3 flex flex-col gap-4">
                        <div className="flex justify-between items-center mb-2">
                            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><TrendingUp className="text-amber-500"/> Despesas Fixas</h1>
                            <button onClick={() => handleEditExpense()} className="bg-slate-900 text-white p-2 rounded-lg hover:bg-slate-700"><Plus/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                            {expenses.map(exp => (
                                <Card key={exp.id} className={`p-4 cursor-pointer hover:border-amber-400 transition-all ${activeExpenseId === exp.id ? 'border-amber-500 ring-1 ring-amber-500 bg-amber-50' : ''}`} >
                                    <div className="flex justify-between items-start mb-2" onClick={() => handleEditExpense(exp)}>
                                        <div>
                                            <span className="font-bold text-lg text-slate-800">{formatMonth(exp.month)} / {exp.year}</span>
                                            <div className="text-xs text-slate-500">{exp.total_dishes_sold} pratos vendidos</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-amber-600">{formatCurrency(exp.total_expenses)}</div>
                                            <div className="text-[10px] font-bold uppercase text-slate-400">Total</div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-slate-100" onClick={() => handleEditExpense(exp)}>
                                        <span className="text-xs text-slate-500">Custo Fixo Unitário</span>
                                        <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{formatCurrency(exp.cost_per_dish)}</span>
                                    </div>
                                    <div className="flex justify-end mt-2">
                                        <button onClick={(e) => { e.stopPropagation(); confirmDelete('expenses', [exp.id]); }} className="text-slate-300 hover:text-red-500 p-1"><Trash2 size={14}/></button>
                                    </div>
                                </Card>
                            ))}
                            {expenses.length === 0 && <div className="text-center text-slate-400 py-10">Nenhum registro encontrado.</div>}
                        </div>
                    </div>

                    {/* Right: Editor */}
                    <div className="flex-1 flex flex-col h-full overflow-hidden">
                        {activeExpenseId ? (
                            <Card className="flex-1 flex flex-col overflow-hidden h-full border-amber-200">
                                <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                        {activeExpenseId === 'new' ? 'Novo Registro' : 'Editar Registro'}
                                    </h3>
                                    <div className="flex gap-2">
                                        <button onClick={() => setActiveExpenseId(null)} className="px-4 py-2 text-slate-500 hover:bg-slate-200 rounded-lg">Cancelar</button>
                                        <button onClick={handleSaveExpense} className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-amber-500/20 flex items-center gap-2"><Save size={18}/> Salvar</button>
                                    </div>
                                </div>
                                
                                <div className="p-6 overflow-y-auto flex-1">
                                    <div className="grid grid-cols-3 gap-6 mb-8">
                                        <InputGroup label="Mês"><StyledSelect value={expenseForm.month} onChange={e => setExpenseForm({...expenseForm, month: e.target.value})}>{Array.from({length:12}, (_,i) => <option key={i+1} value={i+1}>{formatMonth(i+1)}</option>)}</StyledSelect></InputGroup>
                                        <InputGroup label="Ano"><StyledInput type="number" value={expenseForm.year} onChange={e => setExpenseForm({...expenseForm, year: e.target.value})} /></InputGroup>
                                        <InputGroup label="Pratos Vendidos"><StyledInput type="number" value={expenseForm.dishes} onChange={e => setExpenseForm({...expenseForm, dishes: e.target.value})} /></InputGroup>
                                    </div>

                                    <h4 className="font-bold text-sm text-slate-500 uppercase tracking-wider mb-4 border-b pb-2 flex justify-between items-center">
                                        Detalhamento por Categoria
                                        <span className="text-xs normal-case font-normal bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100">Configure as categorias em Configurações</span>
                                    </h4>
                                    
                                    <div className="space-y-3">
                                        {expenseForm.items.map((item, idx) => {
                                            const catName = categories.find(c => c.id === item.category_id)?.name || 'Categoria Desconhecida';
                                            return (
                                                <div key={item.category_id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-amber-200 transition-colors">
                                                    <span className="font-medium text-slate-700">{catName}</span>
                                                    <div className="w-40">
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-2.5 text-slate-400 text-xs">R$</span>
                                                            <input 
                                                                type="number" 
                                                                className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-right font-mono font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                                                                placeholder="0.00"
                                                                value={item.amount}
                                                                onChange={(e) => {
                                                                    const newItems = [...expenseForm.items];
                                                                    newItems[idx].amount = e.target.value;
                                                                    setExpenseForm({...expenseForm, items: newItems});
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        {expenseCategories.length === 0 && (
                                            <div className="text-center p-8 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                                                <p className="text-slate-500 mb-2">Nenhuma categoria de despesa configurada.</p>
                                                <button onClick={() => setView('categories')} className="text-blue-600 font-bold hover:underline">Ir para Configurações</button>
                                            </div>
                                        )}
                                        {/* Button to add missing categories to this specific expense record if new ones were created after record creation */}
                                        {activeExpenseId !== 'new' && expenseCategories.some(c => !expenseForm.items.find(i => i.category_id === c.id)) && (
                                            <button 
                                                onClick={() => {
                                                    const missing = expenseCategories.filter(c => !expenseForm.items.find(i => i.category_id === c.id));
                                                    setExpenseForm(prev => ({
                                                        ...prev,
                                                        items: [...prev.items, ...missing.map(c => ({ category_id: c.id, amount: '' }))]
                                                    }));
                                                }}
                                                className="w-full py-2 border border-dashed border-slate-300 text-slate-500 rounded-lg hover:bg-slate-50 hover:text-slate-700 text-sm mt-4"
                                            >
                                                + Adicionar categorias faltantes
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                                    <div className="text-sm opacity-80">Total Despesas</div>
                                    <div className="text-2xl font-bold">{formatCurrency(expenseForm.items.reduce((acc, i) => acc + (Number(i.amount)||0), 0))}</div>
                                </div>
                            </Card>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                <Calculator size={48} className="mb-4 opacity-50"/>
                                <p>Selecione um mês ou crie um novo registro</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* CATEGORIES - NEW SPLIT VIEW */}
            {view === 'categories' && (
                <div className="p-10 max-w-4xl mx-auto">
                    <h1 className="text-3xl font-bold text-slate-900 mb-8 flex items-center gap-3"><Settings className="text-slate-600"/> Configurações</h1>
                    
                    <div className="flex gap-4 mb-6 border-b border-slate-200">
                        <button onClick={() => setCatTab('recipe')} className={`pb-3 px-4 font-bold text-sm transition-all border-b-2 ${catTab === 'recipe' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Categorias de Receitas</button>
                        <button onClick={() => setCatTab('expense')} className={`pb-3 px-4 font-bold text-sm transition-all border-b-2 ${catTab === 'expense' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Plano de Contas (Despesas)</button>
                    </div>

                    <Card className="p-6 mb-6">
                        <div className="flex gap-4">
                            <StyledInput placeholder={catTab === 'recipe' ? "Nova Categoria (ex: Entradas Frias)" : "Nova Conta (ex: Marketing)"} value={newCatInput} onChange={e => setNewCatInput(e.target.value)} />
                            <button onClick={async () => { 
                                if(newCatInput) { 
                                    await supabase.from('categories').insert({user_id: session.user.id, name: newCatInput, type: catTab}); 
                                    setNewCatInput(''); 
                                    fetchData();
                                }
                            }} className={`text-white px-6 rounded-lg font-bold ${catTab === 'recipe' ? 'bg-emerald-600' : 'bg-amber-600'}`}>Adicionar</button>
                        </div>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {categories.filter(c => c.type === catTab).map(cat => (
                            <Card key={cat.id} className="p-4 flex justify-between items-center group hover:shadow-md transition-all">
                                <span className="font-medium text-slate-700">{cat.name}</span>
                                <button onClick={() => confirmDelete('categories', [cat.id])} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                            </Card>
                        ))}
                        {categories.filter(c => c.type === catTab).length === 0 && (
                            <div className="col-span-2 text-center py-8 text-slate-400 italic">Nenhuma categoria cadastrada.</div>
                        )}
                    </div>
                </div>
            )}
            
            {/* REPORTS VIEW */}
            {view === 'reports' && (
                <div className="p-6 md:p-10 w-full max-w-6xl mx-auto">
                    <h1 className="text-3xl font-bold text-slate-900 mb-8 flex items-center gap-3"><BarChart2 className="text-blue-600"/> Relatórios Avançados</h1>
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
                            <input className="text-xl font-bold bg-transparent outline-none placeholder-slate-300 w-full text-slate-800" placeholder="Nome da Ficha Técnica" value={currentRecipe.name} onChange={e => {setCurrentRecipe({...currentRecipe, name: e.target.value}); setHasUnsavedChanges(true); }} autoFocus/>
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
                        <div ref={editorScrollRef} className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/50 scroll-smooth">
                             {/* Basic Info */}
                             <div className="grid grid-cols-12 gap-6">
                                <Card className="col-span-8 p-6 grid grid-cols-2 gap-6">
                                    <InputGroup label="Categoria"><StyledSelect value={currentRecipe.category} onChange={e => {setCurrentRecipe({...currentRecipe, category: e.target.value}); setHasUnsavedChanges(true);}}>{recipeCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</StyledSelect></InputGroup>
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
                             <Card className="col-span-12 shadow-sm border border-slate-200">
                                 <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0 sticky top-0