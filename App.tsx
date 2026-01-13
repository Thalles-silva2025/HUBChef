import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { 
  Plus, Trash2, Save, FileText, DollarSign, 
  ChefHat, ArrowRight, Printer, History,
  AlertTriangle, Scale, Edit2, TrendingUp,
  PieChart, BarChart2, Activity, X, Loader2, Cloud, FileSpreadsheet, Download, Wine, Layers, ChevronLeft, Settings, ToggleLeft, ToggleRight, Target, Search, MoreHorizontal, Calendar, Box, CheckSquare, Square, AlertCircle, CheckCircle, Info, Calculator, ClipboardCheck, Timer, TrendingDown, ArrowUpRight, ArrowDownRight, Eye, RefreshCw, ClipboardList, List, Clock, RotateCcw, Zap, CheckCircle2,
  Filter, SlidersHorizontal, ArrowUpDown, ShoppingBag, Bike, User, HelpCircle, Package, Divide, Hammer, ShieldAlert, Store, TrendingDown as TrendingDownIcon
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, Legend, ResponsiveContainer, PieChart as RePieChart, Pie, Cell,
  ScatterChart, Scatter, ZAxis, ReferenceLine, AreaChart, Area, ComposedChart, Line
} from 'recharts';

import { supabase } from './services/supabaseClient';
import { Login } from './components/Login';
import type { FixedExpense, Ingredient, Recipe, RecipeItemDB, Category, FixedExpenseItem, ProductionRun, ProductionItem, DeliveryPlatform } from './types';

// --- TOAST NOTIFICATION SYSTEM ---
type ToastType = 'success' | 'error';

interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (type: ToastType, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => removeToast(id), 4000); // Auto close after 4s
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div 
            key={toast.id} 
            className={`pointer-events-auto flex items-center gap-3 p-4 rounded-xl shadow-xl border border-slate-100 bg-white min-w-[320px] max-w-sm transform transition-all duration-500 ease-in-out animate-in slide-in-from-right-full fade-in`}
          >
            <div className={`p-2 rounded-full shrink-0 ${toast.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
              {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            </div>
            <div className="flex-1">
              <h4 className={`text-sm font-bold ${toast.type === 'success' ? 'text-emerald-700' : 'text-red-700'}`}>
                {toast.type === 'success' ? 'Sucesso' : 'Atenção'}
              </h4>
              <p className="text-xs text-slate-600 font-medium mt-0.5">{toast.message}</p>
            </div>
            <button onClick={() => removeToast(toast.id)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition-colors">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

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
    const handlePrint = () => { window.print(); };
    useEffect(() => { const timer = setTimeout(handlePrint, 500); return () => clearTimeout(timer); }, []);
    return (
        <div className="fixed inset-0 bg-white z-[9999] p-8 overflow-auto">
            <div className="max-w-3xl mx-auto">
                <div className="flex justify-between items-center mb-8 no-print">
                    <h2 className="text-2xl font-bold">Impressão: {recipe.name}</h2>
                    <button onClick={onClose} className="bg-slate-200 px-4 py-2 rounded">Fechar</button>
                </div>
                <div className="print-content">
                    <h1 className="text-4xl font-bold mb-2">{recipe.name}</h1>
                    <p className="text-slate-500 mb-8">{recipe.category} - {recipe.portions} {recipe.unit}</p>
                    <div className="border p-4 mb-4 rounded">
                        <h3 className="font-bold border-b mb-2">Ingredientes</h3>
                        {recipe.items.map((i, idx) => (
                            <div key={idx} className="flex justify-between py-1 border-b border-slate-100">
                                <span>{i.qty} {i.unit}</span>
                                <span>{i.item_type === 'ingredient' ? ingredients.find(x=>x.id===i.ref_id)?.name : recipes.find(x=>x.id===i.ref_id)?.name}</span>
                            </div>
                        ))}
                    </div>
                    <div className="border p-4 rounded">
                        <h3 className="font-bold border-b mb-2">Preparo</h3>
                        <p className="whitespace-pre-wrap">{recipe.instructions}</p>
                    </div>
                </div>
            </div>
        </div>
    )
};

// --- TYPES FOR IMPORT & DELETE ---
interface PreviewItem {
    id?: string; name: string; price: number; package_qty: number; unit: string; yield_factor: number; cost_per_unit: number; isValid: boolean; errorMsg?: string;
}

interface DeleteState {
    open: boolean; title: string; message: string; isBulk: boolean; ids: string[]; type: 'ingredients' | 'recipes' | 'expenses' | 'categories' | 'production' | 'delivery_platforms';
}

interface OpStep {
    id: number;
    description: string;
    time_minutes: number;
    category: 'prep' | 'cook' | 'plating';
}

type ExtendedProductionRun = Partial<ProductionRun> & { 
    items: (ProductionItem & { ref_id?: string; item_type?: 'ingredient'|'sub_recipe' })[];
    actual_prep?: number;
    actual_cook?: number;
    actual_plating?: number;
    steps: OpStep[];
};

// --- MAIN APP LOGIC (INNER) ---
function HubChefApp() {
  const [session, setSession] = useState<any>(null);
  const [view, setView] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  // Data State
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [expenses, setExpenses] = useState<FixedExpense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [productionRuns, setProductionRuns] = useState<ProductionRun[]>([]);
  const [deliveryPlatforms, setDeliveryPlatforms] = useState<DeliveryPlatform[]>([]);
  
  // Filters State
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [ingredientSort, setIngredientSort] = useState("name");
  
  const [recipeSearch, setRecipeSearch] = useState("");
  const [recipeCategoryFilter, setRecipeCategoryFilter] = useState("all");
  const [recipeSort, setRecipeSort] = useState("name");
  
  const [productionSearch, setProductionSearch] = useState("");
  const [productionDateFilter, setProductionDateFilter] = useState("all");

  // Selection State
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
  const [prodWizardStep, setProdWizardStep] = useState(1);
  const [currentProduction, setCurrentProduction] = useState<ExtendedProductionRun>({ items: [], actual_time_minutes: 0, actual_yield: 0, notes: '', actual_prep: 0, actual_cook: 0, actual_plating: 0, steps: [] });
  const [viewingProduction, setViewingProduction] = useState<ProductionRun | null>(null);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  
  const [showAddProdItemModal, setShowAddProdItemModal] = useState(false);
  const [selectedExtraIngredientId, setSelectedExtraIngredientId] = useState("");

  // Expense Editor State
  const [activeExpenseId, setActiveExpenseId] = useState<string | 'new' | null>(null);
  const [expenseForm, setExpenseForm] = useState<{ id: string | null; month: string; year: string; dishes: string; items: { category_id: string; amount: string; }[]; }>({ id: null, month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()), dishes: '', items: [] });
  const [quickCatName, setQuickCatName] = useState("");

  // Category & Platform Manager State
  const [catTab, setCatTab] = useState<'recipe' | 'expense' | 'platform'>('recipe');
  const [platformForm, setPlatformForm] = useState({ name: '', percentage: '' });

  const editorScrollRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = () => { setTimeout(() => { if(editorScrollRef.current) { editorScrollRef.current.scrollTo({ top: editorScrollRef.current.scrollHeight, behavior: 'smooth' }); } }, 100); };

  // Import/Delete Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");
  const [importPreviewData, setImportPreviewData] = useState<PreviewItem[]>([]);
  const [isImportReviewStep, setIsImportReviewStep] = useState(false);
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const [deleteModal, setDeleteModal] = useState<DeleteState>({ open: false, title: '', message: '', isBulk: false, ids: [], type: 'ingredients' });
  const [isDeleting, setIsDeleting] = useState(false);

  // Forms
  const [ingForm, setIngForm] = useState<Partial<Ingredient>>({ unit: 'kg', package_qty: 1, yield_factor: 100 });
  const [newCatInput, setNewCatInput] = useState("");
  
  useEffect(() => {
      setIngredientSearch("");
      setRecipeSearch("");
      setProductionSearch("");
      setSelectedIds(new Set());
  }, [view]);

  // --- INITIALIZATION & FETCH DATA ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setSession(session); setLoading(false); });
    return () => subscription.unsubscribe();
  }, []);

  const fetchData = async () => {
    if (!session?.user) return;
    const { data: ingData } = await supabase.from('ingredients').select('*').order('name');
    if(ingData) setIngredients(ingData);
    const { data: recData } = await supabase.from('recipes').select('*, recipe_items(*)').order('last_update', { ascending: false });
    if(recData) { setRecipes(recData.map(r => ({ ...r, items: r.recipe_items || [] }))); }
    const { data: prodData } = await supabase.from('production_runs').select('*, production_items(*)').order('created_at', { ascending: false });
    if(prodData) { setProductionRuns(prodData.map(p => ({ ...p, items: p.production_items || [] }))); }
    const { data: expData } = await supabase.from('fixed_expenses').select('*, fixed_expense_items(*)').order('year', {ascending:false}).order('month', {ascending:false});
    if(expData) { setExpenses(expData.map(e => ({ ...e, items: e.fixed_expense_items || [] }))); }
    const { data: catData } = await supabase.from('categories').select('*').order('name');
    let finalCategories = catData || [];
    const hasExpenses = finalCategories.some(c => c.type === 'expense');
    if (!hasExpenses && session?.user) {
        const { data: newCats } = await supabase.from('categories').insert(DEFAULT_EXPENSE_CATEGORIES.map(name => ({ user_id: session.user.id, name, type: 'expense' }))).select();
        if (newCats) finalCategories = [...finalCategories, ...newCats].sort((a,b) => a.name.localeCompare(b.name));
    }
    setCategories(finalCategories);

    try {
        const { data: platData, error } = await supabase.from('delivery_platforms').select('*').order('name');
        
        if (error) {
            console.warn("Table delivery_platforms likely missing. Using mocks for demonstration.");
            const defaultPlatforms = [
                { id: 'ifood-mock', user_id: session.user.id, name: 'iFood (Básico)', percentage: 12 },
                { id: 'ifood-entreg-mock', user_id: session.user.id, name: 'iFood (Entrega Parceira)', percentage: 23 },
                { id: 'rappi-mock', user_id: session.user.id, name: 'Rappi', percentage: 18 },
                { id: 'proprio-mock', user_id: session.user.id, name: 'Delivery Próprio', percentage: 0 },
                { id: 'cardapio-digital-mock', user_id: session.user.id, name: 'Cardápio Digital', percentage: 5 }
            ];
            setDeliveryPlatforms(defaultPlatforms);
        } else {
            setDeliveryPlatforms(platData || []);
        }
    } catch (e) {
        console.log("Error fetching platforms", e);
    }
  };

  useEffect(() => {
    if (session) {
      fetchData();
      const channels = supabase.channel('custom-all-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients' }, () => fetchData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'recipes' }, () => fetchData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'production_runs' }, () => fetchData())
        .subscribe();
      return () => { supabase.removeChannel(channels); };
    }
  }, [session]);

  // --- SHARED LOGIC ---
  const toggleSelection = (id: string) => { const newSet = new Set(selectedIds); if(newSet.has(id)) newSet.delete(id); else newSet.add(id); setSelectedIds(newSet); };
  const toggleAll = (ids: string[]) => { if(selectedIds.size === ids.length) setSelectedIds(new Set()); else setSelectedIds(new Set(ids)); };
  
  const confirmDelete = (type: DeleteState['type'], ids: string[], isBulk = false) => {
      let title = '', message = '';
      if (type === 'production') { title = 'Excluir Produção?'; message = 'Isso não afetará a ficha técnica, apenas o histórico.'; }
      else if (type === 'ingredients') { title = isBulk ? 'Excluir Insumos?' : 'Excluir Insumo?'; message = 'Ação irreversível.'; }
      else if (type === 'recipes') { title = 'Excluir Ficha?'; message = 'A ficha e seus itens serão removidos.'; }
      else if (type === 'expenses') { title = 'Excluir Despesa?'; message = 'Todos os itens desta despesa serão removidos.'; }
      else if (type === 'categories') { title = 'Excluir Categoria?'; message = 'Itens podem perder a referência.'; }
      else if (type === 'delivery_platforms') { title = 'Excluir Plataforma?'; message = 'Ação irreversível.'; }
      setDeleteModal({ open: true, title, message, isBulk, ids, type });
  };

  const executeDelete = async () => {
      setIsDeleting(true);
      const { type, ids } = deleteModal;
      if (type === 'delivery_platforms') {
          const isMock = ids.some(id => id.includes('mock'));
          if (isMock) {
              setDeliveryPlatforms(prev => prev.filter(p => !ids.includes(p.id)));
              showToast('success', 'Item excluído (Simulação).');
          } else {
              const { error } = await supabase.from(type).delete().in('id', ids);
              if(!error) {
                  setDeliveryPlatforms(prev => prev.filter(p => !ids.includes(p.id)));
                  showToast('success', 'Plataforma excluída com sucesso.');
              } else {
                  showToast('error', "Erro ao excluir: " + error.message);
              }
          }
      } else {
          const { error } = await supabase.from(type === 'expenses' ? 'fixed_expenses' : type === 'production' ? 'production_runs' : type).delete().in(type === 'categories' ? 'id' : 'id', ids);
          if(!error) {
              setSelectedIds(new Set());
              if (type === 'ingredients') { setIngredients(prev => prev.filter(i => !ids.includes(i.id))); if(ingForm.id && ids.includes(ingForm.id)) setIngForm({ unit: 'kg', package_qty: 1, yield_factor: 100 }); }
              else if (type === 'recipes') { setRecipes(prev => prev.filter(r => !ids.includes(r.id!))); }
              else if (type === 'expenses') { setExpenses(prev => prev.filter(e => !ids.includes(e.id))); if(activeExpenseId && ids.includes(activeExpenseId)) setActiveExpenseId(null); }
              else if (type === 'categories') { setCategories(prev => prev.filter(c => !ids.includes(c.id))); }
              else if (type === 'production') { setProductionRuns(prev => prev.filter(p => !ids.includes(p.id))); }
              showToast('success', 'Item excluído com sucesso.');
          } else { 
              showToast('error', "Erro ao excluir: " + error.message); 
          }
      }
      setIsDeleting(false);
      setDeleteModal(prev => ({ ...prev, open: false }));
  };

  const handleSavePlatform = async () => {
      if (!platformForm.name) return;
      const percentage = Number(platformForm.percentage) || 0;
      const newPlatform = { name: platformForm.name, percentage: percentage, user_id: session.user.id };
      const { data, error } = await supabase.from('delivery_platforms').insert(newPlatform).select().single();
      if (error) {
          if (error.code === '42P01') { 
             const mockId = 'local-' + Date.now();
             setDeliveryPlatforms(prev => [...prev, { ...newPlatform, id: mockId }]);
             showToast('success', 'Plataforma salva (Localmente - Tabela não criada).');
          } else {
             showToast('error', 'Erro ao salvar plataforma: ' + error.message);
             return;
          }
      } else if (data) {
          setDeliveryPlatforms(prev => [...prev, data]);
          showToast('success', 'Plataforma salva com sucesso!');
      }
      setPlatformForm({ name: '', percentage: '' });
  };

  // --- PRODUCTION MODULE LOGIC ---
  const startProduction = () => { setProdWizardStep(1); setShowUpdateConfirm(false); setCurrentProduction({ items: [], actual_time_minutes: 0, actual_yield: 0, notes: '', actual_prep: 0, actual_cook: 0, actual_plating: 0, steps: [] }); setView('production-wizard'); };
  const initProductionFromRecipe = (recipeId: string) => {
      const recipe = recipes.find(r => r.id === recipeId);
      if(!recipe) return;
      const items = recipe.items.map(item => {
          let name = '', unitCost = 0, unit = item.unit;
          if (item.item_type === 'ingredient') {
              const ing = ingredients.find(i => i.id === item.ref_id);
              name = ing?.name || 'Item Removido'; unitCost = ing?.cost_per_unit || 0;
          } else {
              const sub = recipes.find(r => r.id === item.ref_id);
              name = sub?.name || 'Base Removida';
              if(sub) { 
                  const subCost = (sub.items || []).reduce((acc, si) => { const i = ingredients.find(x => x.id === si.ref_id); return acc + (i ? si.qty * i.cost_per_unit : 0); }, 0);
                  unitCost = Number(sub.portions) > 0 ? subCost / Number(sub.portions) : 0; 
              }
          }
          return { item_name: name, unit: unit, unit_cost: unitCost, planned_qty: item.qty, actual_qty: item.qty, ref_id: item.ref_id, item_type: item.item_type };
      });
      const totalTime = (Number(recipe.operational_prep)||0) + (Number(recipe.operational_cook)||0) + (Number(recipe.operational_plating)||0);
      const totalPlannedCost = items.reduce((acc, i) => acc + (i.planned_qty * i.unit_cost), 0);
      setCurrentProduction({
          recipe_id: recipe.id!, recipe_name: recipe.name, planned_yield: recipe.portions, planned_time_minutes: totalTime, planned_cost: totalPlannedCost,
          actual_yield: recipe.portions, actual_time_minutes: totalTime, items: items,
          actual_prep: Number(recipe.operational_prep)||0, actual_cook: Number(recipe.operational_cook)||0, actual_plating: Number(recipe.operational_plating)||0, steps: []
      });
      setProdWizardStep(2);
  };
  const addOpStep = () => { setCurrentProduction(prev => ({ ...prev, steps: [...prev.steps, { id: Date.now(), description: '', time_minutes: 0, category: 'prep' }] })); };
  const updateOpStep = (id: number, field: keyof OpStep, val: any) => {
      setCurrentProduction(prev => {
          const newSteps = prev.steps.map(s => s.id === id ? { ...s, [field]: val } : s);
          const newPrep = newSteps.filter(s => s.category === 'prep').reduce((acc, step) => acc + (Number(step.time_minutes) || 0), 0);
          const newCook = newSteps.filter(s => s.category === 'cook').reduce((acc, step) => acc + (Number(step.time_minutes) || 0), 0);
          const newPlate = newSteps.filter(s => s.category === 'plating').reduce((acc, step) => acc + (Number(step.time_minutes) || 0), 0);
          return { ...prev, steps: newSteps, actual_prep: newPrep, actual_cook: newCook, actual_plating: newPlate, actual_time_minutes: newPrep + newCook + newPlate };
      });
  };
  const addExtraProdItem = () => {
      if(!selectedExtraIngredientId) return;
      const ing = ingredients.find(i => i.id === selectedExtraIngredientId);
      if(!ing) return;
      const newItem: ProductionItem & { ref_id: string; item_type: 'ingredient' } = { item_name: ing.name, unit: ing.unit, unit_cost: ing.cost_per_unit, planned_qty: 0, actual_qty: 0, ref_id: ing.id, item_type: 'ingredient' };
      setCurrentProduction(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
      setShowAddProdItemModal(false); setSelectedExtraIngredientId("");
  };
  const initiateProductionSave = () => { if(currentProduction.actual_yield === undefined || currentProduction.actual_yield <= 0) { showToast('error', "Informe o rendimento real."); return; } setShowUpdateConfirm(true); };
  const saveProductionRun = async (shouldUpdateRecipe: boolean) => {
      if(!currentProduction.recipe_id) return;
      const actualCost = currentProduction.items!.reduce((acc, i) => acc + (i.actual_qty * i.unit_cost), 0);
      const totalActualTime = (Number(currentProduction.actual_prep) || 0) + (Number(currentProduction.actual_cook) || 0) + (Number(currentProduction.actual_plating) || 0);
      const originalRecipe = recipes.find(r => r.id === currentProduction.recipe_id);
      const dateStr = new Date().toLocaleDateString('pt-BR');
      let detailedNotes = `[Registro de Produção ${dateStr}]`;
      if (currentProduction.steps.length > 0) {
          detailedNotes += `\n\n=== Mapeamento de Processos ===`;
          currentProduction.steps.forEach((step, idx) => { detailedNotes += `\n${idx + 1}. ${step.description} (${step.time_minutes} min)`; });
      }
      if (currentProduction.notes) detailedNotes += `\n\nNotas: ${currentProduction.notes}`;
      const runPayload = {
          user_id: session.user.id, recipe_id: currentProduction.recipe_id, recipe_name: currentProduction.recipe_name,
          planned_yield: currentProduction.planned_yield, planned_time_minutes: currentProduction.planned_time_minutes, planned_cost: currentProduction.planned_cost,
          actual_yield: currentProduction.actual_yield, actual_time_minutes: totalActualTime, actual_cost: actualCost, notes: detailedNotes
      };
      const { data: runData, error: runError } = await supabase.from('production_runs').insert(runPayload).select().single();
      if(runError) { showToast('error', 'Erro ao salvar: ' + runError.message); return; }
      const itemsPayload = currentProduction.items!.map(item => ({ production_run_id: runData.id, item_name: item.item_name, unit: item.unit, unit_cost: item.unit_cost, planned_qty: item.planned_qty, actual_qty: item.actual_qty }));
      await supabase.from('production_items').insert(itemsPayload);
      if (shouldUpdateRecipe && originalRecipe) {
          let newInstructions = originalRecipe.instructions ? `${originalRecipe.instructions}\n\n${detailedNotes}` : detailedNotes;
          await supabase.from('recipes').update({ portions: currentProduction.actual_yield, operational_prep: currentProduction.actual_prep, operational_cook: currentProduction.actual_cook, operational_plating: currentProduction.actual_plating, instructions: newInstructions, last_update: new Date().toISOString() }).eq('id', currentProduction.recipe_id);
      }
      setShowUpdateConfirm(false); showToast('success', 'Produção salva!'); fetchData(); setView('production');
  };

  // --- EXPENSE/INGREDIENT/IMPORT LOGIC ---
  const handleEditExpense = (expense?: FixedExpense) => { setActiveExpenseId(expense ? expense.id : 'new'); setExpenseForm(expense ? { id: expense.id, month: String(expense.month), year: String(expense.year), dishes: String(expense.total_dishes_sold), items: expense.items?.map(i => ({ category_id: i.category_id, amount: String(i.amount) })) || [] } : { id: null, month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()), dishes: '', items: categories.filter(c => c.type === 'expense').map(c => ({ category_id: c.id, amount: '' })) }); setQuickCatName(""); };
  const handleSaveExpense = async () => { 
      const { month, year, dishes, items, id } = expenseForm; const total = items.reduce((acc, i) => acc + (Number(i.amount) || 0), 0); const payload = { user_id: session.user.id, month: Number(month), year: Number(year), total_expenses: total, total_dishes_sold: Number(dishes) || 1, cost_per_dish: total / (Number(dishes) || 1) };
      try { let expenseId = id; if (id) await supabase.from('fixed_expenses').update(payload).eq('id', id); else { const { data } = await supabase.from('fixed_expenses').insert(payload).select().single(); expenseId = data.id; } await supabase.from('fixed_expense_items').delete().eq('fixed_expense_id', expenseId!); const itemsToInsert = items.filter(i => Number(i.amount) > 0).map(i => ({ fixed_expense_id: expenseId, category_id: i.category_id, amount: Number(i.amount) })); if(itemsToInsert.length) await supabase.from('fixed_expense_items').insert(itemsToInsert); setActiveExpenseId(null); showToast('success', 'Despesa salva!'); fetchData(); } catch(e: any) { showToast('error', e.message); }
  };
  const handleAddQuickCategory = async () => { if (!quickCatName.trim()) return; const { data: newCat } = await supabase.from('categories').insert({ user_id: session.user.id, name: quickCatName, type: 'expense' }).select().single(); if (newCat) { setCategories(prev => [...prev, newCat].sort((a,b) => a.name.localeCompare(b.name))); setExpenseForm(prev => ({ ...prev, items: [...prev.items, { category_id: newCat.id, amount: '' }] })); setQuickCatName(""); showToast('success', 'Categoria criada!'); }};
  const calculateRealCost = (price: number, qty: number, yieldPct: number) => { const safeYield = (yieldPct && yieldPct > 0) ? yieldPct : 100; const usableQty = qty * (safeYield / 100); return usableQty > 0 ? price / usableQty : 0; };
  const handleSaveIngredient = async () => { if(!ingForm.name) return; const cost = calculateRealCost(Number(ingForm.price), Number(ingForm.package_qty), Number(ingForm.yield_factor)); const payload = { name: ingForm.name, unit: ingForm.unit, price: Number(ingForm.price), package_qty: Number(ingForm.package_qty), yield_factor: Number(ingForm.yield_factor) / 100, cost_per_unit: cost, user_id: session.user.id }; if(ingForm.id) await supabase.from('ingredients').update(payload).eq('id', ingForm.id); else await supabase.from('ingredients').insert(payload); setIngForm({ unit: 'kg', package_qty: 1, yield_factor: 100 }); showToast('success', 'Insumo salvo!'); fetchData(); };
  const handlePreviewImport = () => { if (!importText.trim()) return; const lines = importText.split('\n'); const preview: PreviewItem[] = lines.map(line => { if (!line.trim()) return null; const parts = line.split(/[|\t;]+/).map(p => p.trim()); let name = parts[0] || ''; let priceStr = parts[1] || '0'; let qtyStr = parts[2] || '1'; let yieldStr = parts[3] || '100'; const price = parseFloat(priceStr.replace(/[^0-9.,]/g, '').replace(',', '.')) || 0; const qtyMatch = qtyStr.match(/([0-9.,]+)\s*([a-zA-Zçã]*)/); const package_qty = qtyMatch ? parseFloat(qtyMatch[1].replace(',', '.')) : 1; let unit = (qtyMatch && qtyMatch[2]) ? qtyMatch[2].toLowerCase() : 'un'; if (!UNITS.includes(unit)) unit = 'un'; const yield_factor = parseFloat(yieldStr.replace(/[^0-9.,]/g, '').replace(',', '.')) || 100; const isValid = !!name && !isNaN(price) && !isNaN(package_qty) && !isNaN(yield_factor); let errorMsg = ''; if(!name) errorMsg = 'Sem nome'; const cost = calculateRealCost(price, package_qty, yield_factor); return { name, price, package_qty, unit, yield_factor, cost_per_unit: cost, isValid, errorMsg }; }).filter(Boolean) as PreviewItem[]; setImportPreviewData(preview); setIsImportReviewStep(true); };
  const executeImport = async () => { if (!session?.user?.id) return; setIsProcessingImport(true); const validItems = importPreviewData.filter(i => i.isValid); const payload = validItems.map(item => ({ user_id: session.user.id, name: item.name, price: item.price, package_qty: item.package_qty, unit: item.unit, yield_factor: item.yield_factor / 100, cost_per_unit: item.cost_per_unit })); await supabase.from('ingredients').insert(payload); showToast('success', `${validItems.length} importados!`); setImportText(""); setImportPreviewData([]); setIsImportReviewStep(false); setShowImportModal(false); fetchData(); setIsProcessingImport(false); };
  
  // --- RECIPE LOGIC ---
  const startNewRecipe = (type: 'food' | 'drink' | 'sub_recipe') => { const lastFixed = expenses[0]?.cost_per_dish || 0; setCurrentRecipe({ id: null, user_id: session.user.id, type, name: '', category: type === 'drink' ? 'Drink' : 'Prato Principal', portions: 1, unit: type === 'sub_recipe' ? 'kg' : 'porções', operational_prep: 0, operational_cook: 0, operational_plating: 0, extra_packaging: 0, extra_labor: 0, extra_utilities: 0, extra_fixed_cost: type === 'sub_recipe' ? 0 : lastFixed, extra_other_direct: 0, extra_ice_garnish: 0, taxes_pct: 0, card_fee_pct: 0, pricing_method: 'margin', pricing_target: 30, final_price: 0, instructions: '', version: 1, status: 'active', items: [], delivery_platform_id: null, extra_delivery_fee: 0 }); setView('recipe-editor'); setHasUnsavedChanges(false); };
  const saveRecipe = async () => { 
      if(!currentRecipe || !currentRecipe.name) { showToast('error', 'Nome obrigatório.'); return; }
      const recipePayload = { user_id: session.user.id, type: currentRecipe.type, name: currentRecipe.name, category: currentRecipe.category, portions: Number(currentRecipe.portions), unit: currentRecipe.unit, operational_prep: Number(currentRecipe.operational_prep), operational_cook: Number(currentRecipe.operational_cook), operational_plating: Number(currentRecipe.operational_plating), extra_packaging: Number(currentRecipe.extra_packaging), extra_labor: Number(currentRecipe.extra_labor), extra_utilities: Number(currentRecipe.extra_utilities), extra_fixed_cost: Number(currentRecipe.extra_fixed_cost), extra_other_direct: Number(currentRecipe.extra_other_direct), extra_ice_garnish: Number(currentRecipe.extra_ice_garnish), taxes_pct: Number(currentRecipe.taxes_pct), card_fee_pct: Number(currentRecipe.card_fee_pct), pricing_method: currentRecipe.pricing_method, pricing_target: Number(currentRecipe.pricing_target), final_price: Number(currentRecipe.final_price), instructions: currentRecipe.instructions, status: currentRecipe.status, delivery_platform_id: currentRecipe.delivery_platform_id, extra_delivery_fee: Number(currentRecipe.extra_delivery_fee), last_update: new Date().toISOString() };
      let recipeId = currentRecipe.id; 
      try { if (!recipeId) { const { data } = await supabase.from('recipes').insert({...recipePayload, version: 1}).select().single(); recipeId = data.id; } else { await supabase.from('recipes').update({...recipePayload, version: (currentRecipe.version || 1) + 1}).eq('id', recipeId); } await supabase.from('recipe_items').delete().eq('recipe_id', recipeId); if (currentRecipe.items.length > 0) { const itemsPayload = currentRecipe.items.map((item, idx) => ({ recipe_id: recipeId, user_id: session.user.id, item_type: item.item_type, ref_id: item.ref_id, qty: Number(item.qty), unit: item.unit, sort_order: idx })); await supabase.from('recipe_items').insert(itemsPayload); } setHasUnsavedChanges(false); setShowUnsavedModal(false); if(pendingView) { setView(pendingView); setPendingView(null); } else { setView(currentRecipe.type === 'drink' ? 'drinks' : currentRecipe.type === 'sub_recipe' ? 'sub_recipes' : 'recipes'); } showToast('success', 'Salvo com sucesso!'); fetchData(); } catch (err: any) { showToast('error', 'Erro ao salvar.'); }
  };
  const getRecipeCosts = (recipe: Recipe) => { 
    const availableSubs = recipes.filter(r => r.type === 'sub_recipe' && r.id !== recipe.id); 
    const getCost = (item: RecipeItemDB) => { 
        if (item.item_type === 'ingredient') { const ing = ingredients.find(i => i.id === item.ref_id); return ing ? Number(item.qty) * Number(ing.cost_per_unit) : 0; } 
        else { const sub = availableSubs.find(s => s.id === item.ref_id); if (!sub) return 0; const subItemsCost = (sub.items || []).reduce((acc, subItem) => { const ing = ingredients.find(i => i.id === subItem.ref_id); return acc + (ing ? Number(subItem.qty) * Number(ing.cost_per_unit) : 0); }, 0); const subTotal = subItemsCost + Number(sub.extra_utilities || 0) + Number(sub.extra_packaging || 0); const subCostPerUnit = Number(sub.portions) > 0 ? subTotal / Number(sub.portions) : 0; return Number(item.qty) * subCostPerUnit; } 
    }; 
    const itemsCost = (recipe.items || []).reduce((acc, item) => acc + getCost(item), 0); 
    const extra = Number(recipe.extra_packaging||0) + Number(recipe.extra_labor||0) + Number(recipe.extra_utilities||0) + Number(recipe.extra_fixed_cost||0) + Number(recipe.extra_other_direct||0) + Number(recipe.extra_ice_garnish||0); 
    const totalCost = itemsCost + extra; 
    const portions = Number(recipe.portions) || 1; 
    const costPerPortion = totalCost / portions; 
    const price = Number(recipe.final_price) || 0; 
    const tax = price * (Number(recipe.taxes_pct)/100); 
    const card = price * (Number(recipe.card_fee_pct)/100); 
    let platformFee = 0; let extraDelivery = Number(recipe.extra_delivery_fee) || 0;
    if (recipe.delivery_platform_id) { const platform = deliveryPlatforms.find(p => p.id === recipe.delivery_platform_id); if (platform) platformFee = price * (platform.percentage / 100); }
    const profit = price - costPerPortion - tax - card - platformFee - extraDelivery; 
    const margin = price > 0 ? (profit/price)*100 : 0; 
    const cmvPct = price > 0 ? (costPerPortion / price) * 100 : 0;
    return { totalCost, itemsCost, costPerPortion, profit, margin, price, tax, cmvPct, platformFee, extraDelivery, extra, card }; 
  };

  // --- RENDER HELPERS ---
  const NavButton = ({ icon: Icon, label, target }: any) => {
      const active = view === target;
      return <button type="button" onClick={() => { if(hasUnsavedChanges) { setPendingView(target); setShowUnsavedModal(true); } else { setView(target); setMobileMenuOpen(false); setSelectedIds(new Set()); } }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group relative ${active ? 'bg-emerald-600/10 text-emerald-500 font-medium' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'}`}><Icon size={20} className={active ? 'text-emerald-500' : 'group-hover:text-white transition-colors'} strokeWidth={active ? 2.5 : 2} />{isSidebarOpen && <span>{label}</span>}</button>;
  }

  // --- MAIN RENDER ---
  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-slate-900"><Loader2 className="animate-spin text-emerald-500" size={48}/></div>;
  if (!session) return <Login />;
  if (view === 'print-preview' && currentRecipe) return <PrintPreviewComponent recipe={currentRecipe} ingredients={ingredients} recipes={recipes} onClose={() => setView('recipe-editor')} />;

  const recipeCategories = categories.filter(c => c.type === 'recipe');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans text-slate-900">
        <nav className={`bg-slate-900 flex flex-col transition-all duration-300 ease-in-out border-r border-slate-800 z-50 fixed md:relative h-full ${isSidebarOpen ? 'w-64' : 'w-20 hidden md:flex'}`} onMouseEnter={() => setIsSidebarHovered(true)} onMouseLeave={() => setIsSidebarHovered(false)}>
             <div className="h-16 flex items-center justify-center border-b border-slate-800/50 mb-4">{isSidebarOpen ? <div className="flex items-center gap-2 animate-in fade-in duration-300"><div className="bg-emerald-600 p-1.5 rounded-lg"><ChefHat className="text-white" size={20}/></div><span className="text-white font-bold text-lg tracking-tight">HUBChef</span></div> : <div className="bg-emerald-600 p-2 rounded-lg"><ChefHat className="text-white" size={24}/></div>}</div>
            <div className="flex-1 px-3 space-y-1 overflow-y-auto no-scrollbar">
                <NavButton icon={Activity} label="Dashboard" target="dashboard" />
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
            <div className="p-4 border-t border-slate-800"><button onClick={() => supabase.auth.signOut()} className={`flex items-center gap-3 text-slate-400 hover:text-white w-full p-2 rounded-lg hover:bg-slate-800 transition-colors ${!isSidebarOpen && 'justify-center'}`}><ToggleLeft size={20}/>{isSidebarOpen && <span>Sair</span>}</button></div>
        </nav>

        <main className="flex-1 flex flex-col h-full w-full relative overflow-hidden">
            <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center shadow-lg z-40"><div className="flex items-center gap-2 font-bold"><ChefHat className="text-emerald-500"/> HUBChef</div><button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}><MoreHorizontal/></button></div>

            <div className="flex-1 overflow-y-auto">
            {view === 'dashboard' && (
                <div className="p-6 md:p-10 w-full max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
                     <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                                <Activity className="text-emerald-600" size={32}/>
                                Dashboard de Inteligência
                            </h1>
                            <p className="text-slate-500 mt-1 ml-11">Análise estratégica de performance e engenharia de cardápio.</p>
                        </div>
                        <div className="flex gap-2 mt-4 md:mt-0">
                            <span className="bg-white border border-slate-200 px-4 py-2 rounded-lg text-xs font-bold text-slate-500 flex items-center gap-2 shadow-sm"><Calendar size={14}/> Visão Geral</span>
                        </div>
                     </div>

                     {(() => {
                         const activeRecs = recipes.filter(r => r.type !== 'sub_recipe' && r.status === 'active');
                         const recipeStats = activeRecs.map(r => {
                             const costs = getRecipeCosts(r);
                             return { ...r, ...costs };
                         });

                         // --- AGGREGATE METRICS ---
                         const totalActiveItems = recipeStats.length;
                         const avgMargin = totalActiveItems ? recipeStats.reduce((a,b) => a + b.margin, 0) / totalActiveItems : 0;
                         const avgProfit = totalActiveItems ? recipeStats.reduce((a,b) => a + b.profit, 0) / totalActiveItems : 0;
                         
                         // Efficiency Score
                         const recentRuns = productionRuns.slice(0, 50); 
                         const totalVariance = recentRuns.reduce((acc, run) => {
                             if(!run.planned_cost) return acc;
                             return acc + ((run.actual_cost - run.planned_cost) / run.planned_cost);
                         }, 0);
                         const efficiencyScore = recentRuns.length ? Math.max(0, 100 - (totalVariance / recentRuns.length * 100)) : 100;

                         // --- DELIVERY IMPACT ANALYSIS ---
                         const avgPlatformFee = deliveryPlatforms.length > 0 ? deliveryPlatforms.reduce((a,b) => a + b.percentage, 0) / deliveryPlatforms.length : 20; // Default 20% if no platforms
                         
                         const deliveryComparisonData = [
                             { name: 'Balcão (Sem Taxa)', margin: avgMargin, fill: '#10b981' },
                             { name: `Delivery (Média ${avgPlatformFee.toFixed(0)}%)`, margin: 0, fill: '#8b5cf6' } // Will calc below
                         ];

                         // Calculate Avg Margin if ALL items were sold via delivery with the avg fee
                         const avgMarginDelivery = recipeStats.reduce((acc, r) => {
                             // Simulate Delivery Cost Structure
                             const deliveryFee = r.price * (avgPlatformFee / 100);
                             const profitDelivery = r.profit - deliveryFee; // Approximate since platform fee is on gross
                             const marginDelivery = r.price > 0 ? (profitDelivery / r.price) * 100 : 0;
                             return acc + marginDelivery;
                         }, 0) / (totalActiveItems || 1);
                         
                         deliveryComparisonData[1].margin = avgMarginDelivery;


                         // --- EFFICIENCY MATRIX: Profit vs Time (Effort) ---
                         const efficiencyData = recipeStats.map(r => {
                             const totalTime = (Number(r.operational_prep)||0) + (Number(r.operational_cook)||0) + (Number(r.operational_plating)||0);
                             return {
                                 name: r.name,
                                 x: totalTime || 1, 
                                 y: r.profit,       
                                 z: 100,            
                                 category: r.category
                             };
                         });
                         
                         const avgTime = efficiencyData.reduce((a,b) => a + b.x, 0) / (efficiencyData.length || 1);
                         const avgProf = efficiencyData.reduce((a,b) => a + b.y, 0) / (efficiencyData.length || 1);

                         // --- ABC ANALYSIS ---
                         const ingredientUsage = new Map<string, number>();
                         recipeStats.forEach(r => {
                             r.items.forEach(item => {
                                 if(item.item_type === 'ingredient') {
                                     const ing = ingredients.find(i => i.id === item.ref_id);
                                     if(ing) {
                                         const cost = item.qty * ing.cost_per_unit;
                                         ingredientUsage.set(ing.name, (ingredientUsage.get(ing.name) || 0) + cost);
                                     }
                                 }
                             });
                         });
                         const abcData = Array.from(ingredientUsage.entries())
                            .map(([name, value]) => ({ name, value }))
                            .sort((a,b) => b.value - a.value)
                            .slice(0, 10); 

                         // --- INFLATION SENSITIVITY ANALYSIS (MARKET RISK) ---
                         const calculateMarginScenario = (factor: number) => {
                             if (!totalActiveItems) return 0;
                             const total = recipeStats.reduce((acc, r) => {
                                 const adjustedItemCost = r.itemsCost * factor;
                                 const newTotalCost = adjustedItemCost + r.extra;
                                 const newProfit = r.price - newTotalCost - r.tax - r.card - r.platformFee - r.extraDelivery;
                                 const newMargin = r.price > 0 ? (newProfit / r.price) * 100 : 0;
                                 return acc + newMargin;
                             }, 0);
                             return total / totalActiveItems;
                         };

                         const currentM = avgMargin;
                         const inflation10 = calculateMarginScenario(1.10);
                         const inflation20 = calculateMarginScenario(1.20);

                         const inflationRiskData = [
                             { name: 'Margem Atual', margin: currentM, fill: '#10b981' }, // Emerald
                             { name: '+10% Insumos', margin: inflation10, fill: '#f59e0b' }, // Amber
                             { name: '+20% Insumos', margin: inflation20, fill: '#ef4444' }, // Red
                         ];

                         const totalFixed = expenses.length > 0 ? expenses[0].total_expenses : 0;
                         const bepRevenue = (totalFixed > 0 && avgMargin > 0) ? totalFixed / (avgMargin / 100) : 0;
                         const bepUnits = (totalFixed > 0 && avgProfit > 0) ? Math.ceil(totalFixed / avgProfit) : 0;

                         return (
                             <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                {/* --- ROW 1: HIGH LEVEL KPIS --- */}
                                <Card className="p-6 border-l-4 border-l-emerald-500 bg-white shadow-md hover:shadow-lg transition-all">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Lucro Médio / Prato</p>
                                            <h3 className="text-3xl font-bold text-slate-800">{formatCurrency(avgProfit)}</h3>
                                        </div>
                                        <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600"><DollarSign size={20}/></div>
                                    </div>
                                    <div className="mt-4 flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded">
                                        <ArrowUpRight size={14}/> Potencial de Caixa
                                    </div>
                                </Card>

                                <Card className="p-6 border-l-4 border-l-blue-500 bg-white shadow-md hover:shadow-lg transition-all">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Margem Média</p>
                                            <h3 className="text-3xl font-bold text-slate-800">{avgMargin.toFixed(1)}%</h3>
                                        </div>
                                        <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Activity size={20}/></div>
                                    </div>
                                    <div className="mt-4 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500" style={{width: `${Math.min(avgMargin, 100)}%`}}></div>
                                    </div>
                                </Card>

                                <Card className="p-6 border-l-4 border-l-purple-500 bg-white shadow-md hover:shadow-lg transition-all">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Score de Eficiência</p>
                                            <h3 className={`text-3xl font-bold ${efficiencyScore >= 90 ? 'text-emerald-600' : 'text-orange-500'}`}>{efficiencyScore.toFixed(0)}/100</h3>
                                        </div>
                                        <div className="bg-purple-100 p-2 rounded-lg text-purple-600"><Zap size={20}/></div>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-4">Baseado na fidelidade da execução (Previsto vs Real).</p>
                                </Card>

                                <Card className="p-6 border-l-4 border-l-orange-500 bg-white shadow-md hover:shadow-lg transition-all">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Ponto de Equilíbrio (Mês)</p>
                                            <h3 className="text-3xl font-bold text-slate-800">
                                                {formatCurrency(bepRevenue)}
                                            </h3>
                                        </div>
                                        <div className="bg-orange-100 p-2 rounded-lg text-orange-600"><Scale size={20}/></div>
                                    </div>
                                    <div className="mt-4 flex flex-col gap-1">
                                        <div className="text-xs font-bold text-orange-700 bg-orange-50 px-2 py-1 rounded w-fit">
                                            Necessário: {bepUnits} vendas/mês
                                        </div>
                                        <div className="text-[10px] text-slate-400">
                                            Para cobrir custo fixo de {formatCurrency(totalFixed)}
                                        </div>
                                    </div>
                                </Card>

                                {/* --- ROW 1.5: DELIVERY IMPACT ANALYSIS --- */}
                                <Card className="md:col-span-2 p-6 shadow-md border-0 h-[400px] flex flex-col bg-slate-50 border-slate-200">
                                    <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><Bike className="text-purple-600"/> Balcão vs. Delivery (Impacto na Margem)</h3>
                                    <p className="text-xs text-slate-500 mb-6">Comparativo da margem média atual se vendido no balcão vs. plataformas (taxa média ~{avgPlatformFee.toFixed(0)}%).</p>
                                    <div className="flex-1 w-full min-h-0">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={deliveryComparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                                <XAxis type="number" hide />
                                                <YAxis dataKey="name" type="category" width={150} tick={{fontSize: 12, fill: '#64748b', fontWeight: 'bold'}} />
                                                <ReTooltip cursor={{fill: '#f1f5f9'}} formatter={(val: number) => `${val.toFixed(1)}%`} contentStyle={{borderRadius:'8px', border:'none', boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}} />
                                                <Bar dataKey="margin" radius={[0, 4, 4, 0]} barSize={40}>
                                                    {deliveryComparisonData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3">
                                        <TrendingDownIcon className="text-red-500 shrink-0 mt-0.5" size={16}/>
                                        <div>
                                            <p className="text-xs font-bold text-red-800">Alerta de Erosão de Margem</p>
                                            <p className="text-[10px] text-red-600 leading-snug">
                                                Vender no delivery pelo mesmo preço do balcão reduz sua margem em média <strong>{(avgMargin - avgMarginDelivery).toFixed(1)}%</strong>. Considere criar um cardápio com preços diferenciados.
                                            </p>
                                        </div>
                                    </div>
                                </Card>

                                {/* --- ROW 1.5: MARKET RISK / INFLATION SENSITIVITY --- */}
                                <Card className="md:col-span-2 p-6 shadow-md border-0 h-[400px] flex flex-col">
                                    <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><ShieldAlert className="text-red-500"/> Simulação de Resistência à Inflação</h3>
                                    <p className="text-xs text-slate-500 mb-6">Impacto na sua Margem Média se os insumos subirem de preço hoje.</p>
                                    <div className="flex-1 w-full min-h-0">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={inflationRiskData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }} barSize={60}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} dy={10}/>
                                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} tickFormatter={(val) => `${val.toFixed(0)}%`} domain={[0, 'auto']}/>
                                                <ReTooltip cursor={{fill: '#f8fafc'}} formatter={(val: number) => `${val.toFixed(1)}%`} contentStyle={{borderRadius:'8px', border:'none', boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}} />
                                                <Bar dataKey="margin" radius={[8, 8, 0, 0]}>
                                                    {inflationRiskData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                                        <span>Margem Segura: &gt; 20%</span>
                                        <span className="flex items-center gap-2">
                                            {inflation20 < 10 && <span className="flex items-center gap-1 text-red-600 font-bold bg-red-50 px-2 py-1 rounded"><AlertTriangle size={12}/> Risco Alto</span>}
                                            {inflation20 >= 10 && inflation20 < 20 && <span className="flex items-center gap-1 text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded"><AlertCircle size={12}/> Atenção</span>}
                                            {inflation20 >= 20 && <span className="flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded"><CheckCircle size={12}/> Resiliente</span>}
                                        </span>
                                    </div>
                                </Card>

                                {/* --- ROW 2: PROFIT vs EFFORT MATRIX --- */}
                                <Card className="md:col-span-3 p-6 shadow-md border-0 h-[500px] flex flex-col relative overflow-hidden bg-white">
                                    <div className="flex justify-between items-center mb-6 z-10">
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Hammer className="text-indigo-500"/> Raio-X: Lucratividade vs. Esforço Operacional</h3>
                                            <p className="text-xs text-slate-500">Identifique quais pratos valem a pena o trabalho da cozinha.</p>
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-slate-500"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Minas de Ouro (Rápido, Alto Lucro)</div>
                                            <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-slate-500"><div className="w-2 h-2 rounded-full bg-red-400"></div> Drenos (Lento, Baixo Lucro)</div>
                                        </div>
                                    </div>
                                    
                                    {/* Quadrant Backgrounds */}
                                    <div className="absolute inset-0 top-20 left-12 right-4 bottom-8 pointer-events-none opacity-5">
                                        <div className="w-full h-full grid grid-cols-2 grid-rows-2">
                                            {/* Top Left: Low Time, High Profit (GOLD MINE) */}
                                            <div className="bg-emerald-600 border-r border-b border-slate-900 flex items-start justify-start p-4"><span className="text-lg font-black text-emerald-900 uppercase">Minas de Ouro</span></div>
                                            {/* Top Right: High Time, High Profit (PREMIUM) */}
                                            <div className="bg-blue-300 border-b border-slate-900 flex items-start justify-end p-4"><span className="text-lg font-black text-blue-900 uppercase">Premium / Artesanal</span></div>
                                            {/* Bottom Left: Low Time, Low Profit (COMMODITY) */}
                                            <div className="bg-slate-300 border-r border-slate-900 flex items-end justify-start p-4"><span className="text-lg font-black text-slate-900 uppercase">Giro Rápido</span></div>
                                            {/* Bottom Right: High Time, Low Profit (DRAIN) */}
                                            <div className="bg-red-600 flex items-end justify-end p-4"><span className="text-lg font-black text-red-900 uppercase">Drenos de Produtividade</span></div>
                                        </div>
                                    </div>

                                    <div className="flex-1 w-full min-h-0 z-20">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis type="number" dataKey="x" name="Tempo (min)" unit=" min" label={{ value: 'Tempo Total de Preparo (Esforço)', position: 'bottom', offset: 0, fontSize: 12, fill: '#64748b' }} />
                                                <YAxis type="number" dataKey="y" name="Lucro" unit=" R$" label={{ value: 'Lucro Líquido por Prato (R$)', angle: -90, position: 'insideLeft', fontSize: 12, fill: '#64748b' }} />
                                                <ZAxis type="number" dataKey="z" range={[100, 100]} />
                                                <ReTooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
                                                    if (active && payload && payload.length) {
                                                        const data = payload[0].payload;
                                                        const profitPerMinute = data.x > 0 ? data.y / data.x : 0;
                                                        return (
                                                            <div className="bg-white p-4 shadow-xl rounded-xl border border-slate-100 ring-1 ring-slate-900/5">
                                                                <p className="font-bold text-slate-900 text-sm mb-1">{data.name}</p>
                                                                <p className="text-xs text-slate-500 mb-3 uppercase tracking-wide">{data.category}</p>
                                                                <div className="space-y-2 text-xs">
                                                                    <div className="flex justify-between gap-6 border-b border-slate-50 pb-1">
                                                                        <span className="text-slate-500">Lucro Líquido:</span> 
                                                                        <span className="font-mono font-bold text-emerald-600">{formatCurrency(data.y)}</span>
                                                                    </div>
                                                                    <div className="flex justify-between gap-6 border-b border-slate-50 pb-1">
                                                                        <span className="text-slate-500">Tempo Total:</span> 
                                                                        <span className="font-mono font-bold text-blue-600">{data.x} min</span>
                                                                    </div>
                                                                    <div className="flex justify-between gap-6 pt-1">
                                                                        <span className="text-slate-500 font-bold">Rendimento/Minuto:</span> 
                                                                        <span className="font-mono font-bold text-indigo-600">{formatCurrency(profitPerMinute)}/min</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}/>
                                                <ReferenceLine x={avgTime} stroke="#94a3b8" strokeDasharray="3 3" />
                                                <ReferenceLine y={avgProf} stroke="#94a3b8" strokeDasharray="3 3" />
                                                <Scatter name="Pratos" data={efficiencyData} fill="#8884d8">
                                                    {efficiencyData.map((entry, index) => {
                                                        let fill = '#cbd5e1'; 
                                                        // Quad 1: Low Time (< Avg), High Profit (> Avg) -> GOLD MINE
                                                        if (entry.x <= avgTime && entry.y >= avgProf) fill = '#10b981'; 
                                                        // Quad 2: High Time (> Avg), Low Profit (< Avg) -> DRAIN
                                                        else if (entry.x > avgTime && entry.y < avgProf) fill = '#ef4444'; 
                                                        // Quad 3: High Time (> Avg), High Profit (> Avg) -> PREMIUM
                                                        else if (entry.x > avgTime && entry.y >= avgProf) fill = '#3b82f6'; 
                                                        // Quad 4: Low Time (< Avg), Low Profit (< Avg) -> COMMODITY
                                                        else if (entry.x <= avgTime && entry.y < avgProf) fill = '#94a3b8'; 
                                                        return <Cell key={`cell-${index}`} fill={fill} stroke="rgba(0,0,0,0.1)" strokeWidth={1} />;
                                                    })}
                                                </Scatter>
                                            </ScatterChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>

                                {/* --- ROW 2 COL 2: TOP MONEY MAKERS --- */}
                                <Card className="p-6 shadow-md border-0 h-[500px] flex flex-col bg-slate-900 text-white">
                                    <h3 className="font-bold text-lg mb-1 flex items-center gap-2 text-emerald-400"><TrendingUp/> Top Lucratividade</h3>
                                    <p className="text-xs text-slate-400 mb-6">Pratos com maior contribuição financeira.</p>
                                    <div className="flex-1 overflow-y-auto pr-2 space-y-4 no-scrollbar">
                                        {recipeStats.sort((a,b) => b.profit - a.profit).slice(0, 7).map((r, i) => (
                                            <div key={r.id} className="flex items-center gap-3 p-3 bg-slate-800 rounded-xl border border-slate-700/50 hover:border-emerald-500/50 transition-colors group">
                                                <div className="font-bold text-2xl text-slate-600 w-6 group-hover:text-emerald-500 transition-colors">#{i+1}</div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-sm truncate text-slate-200">{r.name}</div>
                                                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">{r.category}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold text-emerald-400">{formatCurrency(r.profit)}</div>
                                                    <div className="text-[10px] text-slate-500">Margem {r.margin.toFixed(0)}%</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>

                                {/* --- ROW 3: COST DRIVERS --- */}
                                <Card className="md:col-span-4 p-6 shadow-md border-0 h-[400px] flex flex-col">
                                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><Package className="text-orange-500"/> Curva ABC de Custos (Top Insumos)</h3>
                                    <div className="flex-1 w-full min-h-0">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={abcData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                                <XAxis type="number" hide />
                                                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11, fill: '#64748b'}} />
                                                <ReTooltip cursor={{fill: '#f8fafc'}} formatter={(val: number) => formatCurrency(val)} contentStyle={{borderRadius:'8px', border:'none', boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}} />
                                                <Bar dataKey="value" fill="#f97316" radius={[0, 4, 4, 0]} barSize={20} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>
                             </div>
                         )
                     })()}
                </div>
            )}
            
            {view === 'ingredients' && (
                <div className="p-6 md:p-10 w-full max-w-7xl mx-auto">
                    <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                        <div><h1 className="text-3xl font-bold text-slate-900 tracking-tight">Insumos</h1><p className="text-slate-500 mt-1">Gerencie os custos de matéria-prima.</p></div>
                        <div className="flex gap-3">
                             <button onClick={() => { setShowImportModal(true); setIsImportReviewStep(false); setImportText(""); }} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg font-medium shadow-sm flex items-center gap-2 transition-colors"><Download size={18}/> Importar</button>
                             <button onClick={() => { setIngForm({ unit: 'kg', package_qty: 1, yield_factor: 100 }); window.scrollTo(0,0); document.getElementById('ing-form')?.focus(); }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-colors"><Plus size={18}/> Novo</button>
                        </div>
                    </header>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <Card className="p-6 h-fit lg:sticky lg:top-6">
                            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 pb-4 border-b border-slate-100">{ingForm.id ? <Edit2 size={18} className="text-blue-500"/> : <Plus size={18} className="text-emerald-500"/>} {ingForm.id ? 'Editar Insumo' : 'Novo Insumo'}</h3>
                            <div className="space-y-4" id="ing-form">
                                <InputGroup label="Nome do Item"><StyledInput placeholder="Ex: Filé Mignon" value={ingForm.name || ''} onChange={e => setIngForm({...ingForm, name: e.target.value})} autoFocus/></InputGroup>
                                <div className="grid grid-cols-2 gap-4"><InputGroup label="Preço Pago (R$)"><StyledInput type="number" placeholder="0.00" value={ingForm.price || ''} onChange={e => setIngForm({...ingForm, price: Number(e.target.value)})} /></InputGroup><InputGroup label="Unidade Compra"><StyledSelect value={ingForm.unit} onChange={e => setIngForm({...ingForm, unit: e.target.value})}>{UNITS.map(u => <option key={u} value={u}>{u}</option>)}</StyledSelect></InputGroup></div>
                                <div className="grid grid-cols-2 gap-4"><InputGroup label="Qtd Embalagem"><StyledInput type="number" placeholder="1" value={ingForm.package_qty} onChange={e => setIngForm({...ingForm, package_qty: Number(e.target.value)})} /></InputGroup><InputGroup label="Rendimento %"><StyledInput type="number" placeholder="100" value={ingForm.yield_factor} onChange={e => setIngForm({...ingForm, yield_factor: Number(e.target.value)})} /></InputGroup></div>
                            </div>
                            <div className="mt-8 bg-slate-50 p-4 rounded-lg border border-slate-200"><div className="text-xs font-bold text-slate-500 uppercase mb-1">Custo Real Calculado</div><div className="text-2xl font-bold text-emerald-600">{formatCurrency(calculateRealCost(Number(ingForm.price), Number(ingForm.package_qty), Number(ingForm.yield_factor)))} <span className="text-sm text-slate-400 font-medium">/ {ingForm.unit}</span></div></div>
                            <div className="mt-6 flex gap-3">{ingForm.id && <button onClick={() => setIngForm({unit: 'kg', package_qty: 1, yield_factor: 100})} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium">Cancelar</button>}<button onClick={handleSaveIngredient} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow-md shadow-emerald-600/20">Salvar Item</button></div>
                        </Card>
                        <Card className="col-span-1 lg:col-span-2 overflow-hidden flex flex-col">
                            {/* Professional Filter Toolbar */}
                            <div className="bg-white p-4 border-b border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm z-10">
                                <div className="relative flex-1 w-full">
                                    <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                                    <input 
                                        placeholder="Buscar por nome do insumo..." 
                                        className="pl-10 pr-4 py-2 w-full bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-400" 
                                        value={ingredientSearch}
                                        onChange={e => setIngredientSearch(e.target.value)} 
                                    />
                                </div>
                                <div className="flex gap-2 w-full md:w-auto">
                                    <div className="relative flex-1 md:w-48">
                                        <ArrowUpDown className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                                        <select 
                                            className="pl-9 pr-4 py-2 w-full bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none appearance-none cursor-pointer text-slate-600 font-medium"
                                            value={ingredientSort}
                                            onChange={e => setIngredientSort(e.target.value)}
                                        >
                                            <option value="name">Nome (A-Z)</option>
                                            <option value="price_high">Maior Preço</option>
                                            <option value="price_low">Menor Preço</option>
                                            <option value="yield_low">Menor Rendimento</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {selectedIds.size > 0 && (<div className="bg-red-50 p-3 flex justify-between items-center border-b border-red-100 animate-in slide-in-from-top-2"><div className="text-red-700 font-bold text-sm flex items-center gap-2"><CheckSquare size={18}/> {selectedIds.size} itens selecionados</div><button onClick={() => confirmDelete('ingredients', Array.from(selectedIds), true)} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2"><Trash2 size={14}/> Excluir Selecionados</button></div>)}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-xs border-b border-slate-200"><tr><th className="p-4 w-10"><button onClick={() => toggleAll(ingredients.map(i => i.id))} className="text-slate-400 hover:text-slate-600">{selectedIds.size === ingredients.length && ingredients.length > 0 ? <CheckSquare size={20} className="text-emerald-500"/> : <Square size={20}/>}</button></th><th className="p-4 pl-0">Nome</th><th className="p-4">Compra</th><th className="p-4 text-center">Rendimento</th><th className="p-4 text-right">Custo Real</th><th className="p-4 text-center pr-6">Ações</th></tr></thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {ingredients
                                            .filter(i => i.name.toLowerCase().includes(ingredientSearch.toLowerCase()))
                                            .sort((a,b) => {
                                                if(ingredientSort === 'name') return a.name.localeCompare(b.name);
                                                if(ingredientSort === 'price_high') return b.price - a.price;
                                                if(ingredientSort === 'price_low') return a.price - b.price;
                                                if(ingredientSort === 'yield_low') return a.yield_factor - b.yield_factor;
                                                return 0;
                                            })
                                            .map(ing => (
                                            <tr key={ing.id} className={`hover:bg-slate-50 transition-colors cursor-pointer group ${selectedIds.has(ing.id) ? 'bg-blue-50/50' : ''}`} onClick={() => { setIngForm({...ing, yield_factor: ing.yield_factor * 100}); window.scrollTo({top:0, behavior:'smooth'}); }}>
                                                <td className="p-4 w-10" onClick={(e) => { e.stopPropagation(); toggleSelection(ing.id); }}>{selectedIds.has(ing.id) ? <CheckSquare size={20} className="text-emerald-500"/> : <Square size={20} className="text-slate-300 group-hover:text-slate-400"/>}</td><td className="p-4 pl-0 font-medium text-slate-800">{ing.name}</td><td className="p-4 text-slate-500">{formatCurrency(ing.price)} <span className="text-xs">/ {ing.package_qty}{ing.unit}</span></td><td className="p-4 text-center"><Badge color={ing.yield_factor < 1 ? "orange" : "blue"}>{Math.round(ing.yield_factor * 100)}%</Badge></td><td className="p-4 text-right font-bold text-slate-700">{formatCurrency(ing.cost_per_unit)}</td><td className="p-4 text-center pr-6"><button onClick={(e) => { e.stopPropagation(); confirmDelete('ingredients', [ing.id]); }} className="text-slate-300 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50 z-10 relative"><Trash2 size={16}/></button></td>
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
            
            {['recipes', 'drinks', 'sub_recipes'].includes(view) && (
                <div className="p-6 md:p-10 w-full max-w-7xl mx-auto">
                    <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                        <div><h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3 tracking-tight">{view === 'drinks' ? <Wine className="text-purple-600" size={32}/> : view === 'sub_recipes' ? <Layers className="text-orange-600" size={32}/> : <FileText className="text-emerald-600" size={32}/>} {view === 'drinks' ? 'Bebidas & Drinks' : view === 'sub_recipes' ? 'Bases & Sub-receitas' : 'Fichas Técnicas'}</h1><p className="text-slate-500 mt-1 ml-11">Gerencie seu cardápio e composições.</p></div>
                        <div className="flex gap-2 items-center">
                            {selectedIds.size > 0 && (<button onClick={() => confirmDelete('recipes', Array.from(selectedIds), true)} className="bg-red-600 text-white px-4 py-2.5 rounded-lg font-bold shadow-lg flex items-center gap-2 animate-in fade-in"><Trash2 size={18}/> Excluir ({selectedIds.size})</button>)}
                            <button onClick={() => startNewRecipe(view === 'drinks' ? 'drink' : view === 'sub_recipes' ? 'sub_recipe' : 'food')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-bold shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all transform active:scale-95"><Plus size={20} /> Criar Nova</button>
                        </div>
                    </header>

                    {/* Professional Filter Toolbar for Recipes */}
                    <div className="bg-white p-4 mb-8 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-4 items-center">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                            <input 
                                placeholder="Buscar receita por nome..." 
                                className="pl-10 pr-4 py-2 w-full bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-400" 
                                value={recipeSearch}
                                onChange={e => setRecipeSearch(e.target.value)} 
                            />
                        </div>
                        <div className="flex gap-3 w-full lg:w-auto">
                            <div className="relative flex-1 lg:w-48">
                                <Filter className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                                <select 
                                    className="pl-9 pr-4 py-2 w-full bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none appearance-none cursor-pointer text-slate-600 font-medium"
                                    value={recipeCategoryFilter}
                                    onChange={e => setRecipeCategoryFilter(e.target.value)}
                                >
                                    <option value="all">Todas as Categorias</option>
                                    {recipeCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="relative flex-1 lg:w-48">
                                <ArrowUpDown className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                                <select 
                                    className="pl-9 pr-4 py-2 w-full bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none appearance-none cursor-pointer text-slate-600 font-medium"
                                    value={recipeSort}
                                    onChange={e => setRecipeSort(e.target.value)}
                                >
                                    <option value="name">Nome (A-Z)</option>
                                    <option value="profit_high">Maior Lucro</option>
                                    <option value="margin_high">Maior Margem</option>
                                    <option value="cost_high">Maior Custo</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {recipes
                            .filter(r => (view === 'sub_recipes' ? r.type === 'sub_recipe' : view === 'drinks' ? r.type === 'drink' : r.type === 'food'))
                            .filter(r => r.name.toLowerCase().includes(recipeSearch.toLowerCase()))
                            .filter(r => recipeCategoryFilter === 'all' || r.category === recipeCategoryFilter)
                            .map(r => ({...r, costs: getRecipeCosts(r)})) // Pre-calc costs for sorting
                            .sort((a, b) => {
                                if (recipeSort === 'name') return a.name.localeCompare(b.name);
                                if (recipeSort === 'profit_high') return b.costs.profit - a.costs.profit;
                                if (recipeSort === 'margin_high') return b.costs.margin - a.costs.margin;
                                if (recipeSort === 'cost_high') return b.costs.totalCost - a.costs.totalCost;
                                return 0;
                            })
                            .map(r => {
                            const costs = r.costs;
                            const isSub = r.type === 'sub_recipe';
                            const isSelected = selectedIds.has(r.id!);
                            return (
                                <Card key={r.id} onClick={() => { setCurrentRecipe(r); setView('recipe-details'); }} className={`group cursor-pointer hover:shadow-lg transition-all duration-300 relative overflow-hidden ${isSelected ? 'ring-2 ring-emerald-500 bg-emerald-50/10' : 'hover:border-emerald-500/30'}`}>
                                     <div className="absolute top-3 left-3 z-20" onClick={(e) => { e.stopPropagation(); toggleSelection(r.id!); }}>{isSelected ? <CheckSquare className="text-emerald-500 bg-white rounded" size={24}/> : <Square className="text-slate-300 hover:text-emerald-400 bg-white/50 rounded" size={24}/>}</div>
                                     <div className="absolute top-3 right-3 z-20"><button onClick={(e) => { e.stopPropagation(); confirmDelete('recipes', [r.id!]); }} className="p-2 bg-white/80 hover:bg-white text-slate-400 hover:text-red-500 rounded-full shadow-sm transition-colors border border-transparent hover:border-red-100"><Trash2 size={18}/></button></div>
                                     <div className="p-5 h-full flex flex-col pt-10">
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
                            <div className="bg-slate-100 p-4 rounded-full mb-3 group-hover:bg-white group-hover:shadow-md transition-all"><Plus size={32} /></div><span className="font-bold">Criar Nova Receita</span>
                        </button>
                    </div>
                </div>
            )}

            {/* RECIPE DETAILS DASHBOARD */}
            {view === 'recipe-details' && currentRecipe && (
                <div className="absolute inset-0 z-50 bg-slate-50 flex flex-col h-full w-full overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
                    {/* Header */}
                    <div className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm shrink-0">
                        <div className="flex items-center gap-6">
                            <button onClick={() => setView(currentRecipe.type === 'drink' ? 'drinks' : currentRecipe.type === 'sub_recipe' ? 'sub_recipes' : 'recipes')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ChevronLeft size={24}/></button>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{currentRecipe.name}</h1>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${currentRecipe.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>{currentRecipe.status === 'active' ? 'Ativo' : 'Inativo'}</span>
                                    <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1"><History size={10}/> v{currentRecipe.version}</span>
                                </div>
                                <p className="text-sm text-slate-500 font-medium mt-0.5">{currentRecipe.category} • Rendimento: {currentRecipe.portions} {currentRecipe.unit}</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setView('recipe-editor')} className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-slate-900/20 flex items-center gap-2 transition-all transform active:scale-95">
                                <Edit2 size={18}/> Editar Ficha
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 max-w-[1600px] mx-auto w-full">
                        {(() => {
                            const costs = getRecipeCosts(currentRecipe);
                            const isSub = currentRecipe.type === 'sub_recipe';
                            
                            // Delivery Intelligent Pricing Logic for PREVIEW
                            let suggestedDeliveryPrice = 0;
                            const selectedPlatform = deliveryPlatforms.find(p => p.id === currentRecipe.delivery_platform_id);
                            
                            if (selectedPlatform) {
                                // 1. Calculate Profit ($) at Counter (No platform fee)
                                const taxRate = Number(currentRecipe.taxes_pct) / 100;
                                const cardRate = Number(currentRecipe.card_fee_pct) / 100;
                                
                                // Recalculate costs assuming NO platform to get pure counter profit
                                const grossCounterRevenue = costs.price * (1 - taxRate - cardRate);
                                const counterProfit = grossCounterRevenue - costs.totalCost; // Profit without platform fee

                                // 2. Calculate Delivery Price needed to maintain same Profit ($)
                                const platRate = selectedPlatform.percentage / 100;
                                const extraDelCost = Number(currentRecipe.extra_delivery_fee) || 0;
                                
                                const divisor = 1 - taxRate - cardRate - platRate;
                                
                                if (divisor > 0) {
                                    suggestedDeliveryPrice = (costs.totalCost + extraDelCost + counterProfit) / divisor;
                                }
                            }

                            const pieData = [
                                { name: 'Insumos', value: costs.itemsCost, color: '#3b82f6' },
                                { name: 'Extras/Fixo', value: costs.extra, color: '#f59e0b' },
                                { name: 'Taxas/Impostos', value: costs.tax + costs.card, color: '#ef4444' },
                                { name: 'Delivery', value: costs.platformFee + costs.extraDelivery, color: '#8b5cf6' },
                                { name: 'Lucro Líquido', value: costs.profit, color: '#10b981' }
                            ].filter(d => d.value > 0);

                            return (
                                <div className="space-y-8">
                                    {/* KPI CARDS */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <Card className="p-6 border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Preço de Venda</div>
                                                <DollarSign size={16} className="text-emerald-500"/>
                                            </div>
                                            <div className="text-3xl font-bold text-slate-900">{formatCurrency(costs.price)}</div>
                                            <div className="mt-2 text-xs text-slate-400 font-medium">Sugerido pelo sistema</div>
                                        </Card>
                                        <Card className="p-6 border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Custo Total (CMV)</div>
                                                <TrendingDown size={16} className="text-blue-500"/>
                                            </div>
                                            <div className="text-3xl font-bold text-slate-900">{formatCurrency(costs.costPerPortion)}</div>
                                            <div className="mt-2 flex items-center gap-2">
                                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${costs.cmvPct > 35 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{costs.cmvPct.toFixed(1)}%</span>
                                                <span className="text-xs text-slate-400">do preço de venda</span>
                                            </div>
                                        </Card>
                                        <Card className="p-6 border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Margem de Lucro</div>
                                                <Activity size={16} className="text-purple-500"/>
                                            </div>
                                            <div className={`text-3xl font-bold ${costs.margin < 15 ? 'text-red-500' : 'text-slate-900'}`}>{costs.margin.toFixed(1)}%</div>
                                            <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                <div className={`h-full ${costs.margin > 20 ? 'bg-purple-500' : 'bg-red-500'}`} style={{width: `${Math.min(Math.max(costs.margin, 0), 100)}%`}}></div>
                                            </div>
                                        </Card>
                                        <Card className="p-6 border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-white to-green-50/50">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="text-xs font-bold text-green-700 uppercase tracking-wider">Lucro Líquido</div>
                                                <Target size={16} className="text-green-600"/>
                                            </div>
                                            <div className="text-3xl font-bold text-green-700">{formatCurrency(costs.profit)}</div>
                                            <div className="mt-2 text-xs text-green-600 font-medium">Por unidade vendida</div>
                                        </Card>
                                    </div>

                                    {/* CHARTS & DETAILS GRID */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                        {/* COST BREAKDOWN CHART */}
                                        <Card className="p-6 flex flex-col h-[400px]">
                                            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><PieChart size={18} className="text-slate-400"/> Composição de Custos</h3>
                                            <div className="flex-1 min-h-0 relative">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <RePieChart>
                                                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                                            {pieData.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                                            ))}
                                                        </Pie>
                                                        <ReTooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{borderRadius:'12px', border:'none', boxShadow:'0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} />
                                                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                                    </RePieChart>
                                                </ResponsiveContainer>
                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                    <div className="text-center">
                                                        <span className="text-xs text-slate-400 uppercase font-bold block">Total</span>
                                                        <span className="text-lg font-bold text-slate-700">{formatCurrency(costs.price)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>

                                        {/* DELIVERY SIMULATION DETAILS */}
                                        <Card className="p-6 bg-gradient-to-br from-white to-purple-50/50 border-purple-100">
                                            <h3 className="font-bold text-purple-900 mb-6 flex items-center gap-2"><Bike size={18} className="text-purple-500"/> Simulação Delivery</h3>
                                            <div className="space-y-6">
                                                <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-sm">
                                                    <div className="text-xs font-bold text-slate-400 uppercase mb-1">Plataforma Selecionada</div>
                                                    <div className="font-bold text-lg text-purple-900">
                                                        {currentRecipe.delivery_platform_id 
                                                            ? deliveryPlatforms.find(p => p.id === currentRecipe.delivery_platform_id)?.name || 'Desconhecida' 
                                                            : 'Nenhuma (Venda Balcão)'}
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center p-2 border-b border-purple-100">
                                                        <span className="text-sm text-slate-600">Comissão da Plataforma</span>
                                                        <span className="font-mono font-bold text-red-500">-{formatCurrency(costs.platformFee)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center p-2 border-b border-purple-100">
                                                        <span className="text-sm text-slate-600">Taxa Extra / Incentivo</span>
                                                        <span className="font-mono font-bold text-red-500">-{formatCurrency(costs.extraDelivery)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center p-2 bg-purple-100 rounded-lg">
                                                        <span className="text-sm font-bold text-purple-800">Lucro no Delivery</span>
                                                        <span className="font-mono font-bold text-purple-900">{formatCurrency(costs.profit)}</span>
                                                    </div>
                                                    
                                                    {selectedPlatform && (
                                                        <div className="mt-4 pt-4 border-t border-purple-200">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-[10px] font-bold text-purple-600 uppercase">Preço Sugerido para o App</span>
                                                                <div className="text-right">
                                                                    <div className="font-bold text-xl text-purple-800 leading-none">{formatCurrency(suggestedDeliveryPrice)}</div>
                                                                    <span className="text-[9px] text-purple-500">para manter lucro do balcão</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-purple-400 text-center">Os valores acima já estão deduzidos do lucro líquido apresentado nos KPIs.</p>
                                            </div>
                                        </Card>

                                        {/* PRODUCTION LOG TIMELINE */}
                                        <Card className="p-6 overflow-hidden flex flex-col h-[400px]">
                                            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><ClipboardCheck size={18} className="text-blue-500"/> Histórico de Produção</h3>
                                            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                                                {productionRuns.filter(p => p.recipe_id === currentRecipe.id).length === 0 ? (
                                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center">
                                                        <History size={32} className="mb-2 opacity-20"/>
                                                        <p className="text-sm">Nenhuma produção registrada.</p>
                                                    </div>
                                                ) : (
                                                    productionRuns
                                                    .filter(p => p.recipe_id === currentRecipe.id)
                                                    .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                                    .map((run) => {
                                                        const variance = Number(run.planned_cost) > 0 ? ((Number(run.actual_cost) - Number(run.planned_cost)) / Number(run.planned_cost)) * 100 : 0;
                                                        return (
                                                            <div key={run.id} className="relative pl-6 border-l-2 border-slate-100 last:border-0 pb-4">
                                                                <div className={`absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full ${variance > 5 ? 'bg-red-400' : 'bg-emerald-400'}`}></div>
                                                                <div className="flex justify-between items-start mb-1">
                                                                    <span className="text-xs font-bold text-slate-700">{formatDate(run.created_at)}</span>
                                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${variance > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>{variance > 0 ? '+' : ''}{variance.toFixed(1)}% Var</span>
                                                                </div>
                                                                <div className="text-sm text-slate-600 mb-1">
                                                                    Produzido: <span className="font-bold text-slate-800">{run.actual_yield} un</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                                                    <User size={10}/>
                                                                    <span>Responsável (ID: {run.user_id.substring(0,6)}...)</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </Card>
                                    </div>
                                    
                                    {/* INGREDIENTS TABLE (READ ONLY) */}
                                    <Card className="overflow-hidden">
                                        <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-700 text-sm">Composição da Receita</div>
                                        <table className="w-full text-sm">
                                            <thead className="bg-white text-slate-500 font-semibold text-xs border-b border-slate-100">
                                                <tr>
                                                    <th className="p-3 text-left pl-6">Item</th>
                                                    <th className="p-3 text-center">Qtd</th>
                                                    <th className="p-3 text-center">Un</th>
                                                    <th className="p-3 text-right pr-6">Custo</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {currentRecipe.items.map((item, idx) => {
                                                    let name = '', cost = 0;
                                                    if(item.item_type === 'ingredient') {
                                                        const ing = ingredients.find(i => i.id === item.ref_id);
                                                        name = ing?.name || 'Item Removido';
                                                        cost = (Number(item.qty) || 0) * (Number(ing?.cost_per_unit) || 0);
                                                    } else {
                                                        const sub = recipes.find(r => r.id === item.ref_id);
                                                        name = sub?.name || 'Base Removida';
                                                        if (sub) {
                                                            const subCost = getRecipeCosts(sub).costPerPortion;
                                                            cost = (Number(item.qty) || 0) * subCost;
                                                        }
                                                    }
                                                    return (
                                                        <tr key={idx} className="hover:bg-slate-50">
                                                            <td className="p-3 pl-6 font-medium text-slate-700">{name}</td>
                                                            <td className="p-3 text-center text-slate-600">{item.qty}</td>
                                                            <td className="p-3 text-center text-slate-400 text-xs uppercase">{item.unit}</td>
                                                            <td className="p-3 text-right pr-6 font-mono text-slate-700">{formatCurrency(cost)}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </Card>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}

            {view === 'fixed-expenses' && (
                <div className="p-6 md:p-10 w-full max-w-[1600px] mx-auto flex gap-8 h-full overflow-hidden">
                    <div className="w-1/3 flex flex-col gap-4">
                        <div className="flex justify-between items-center mb-2"><h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><TrendingUp className="text-amber-500"/> Despesas Fixas</h1><button onClick={() => handleEditExpense()} className="bg-slate-900 text-white p-2 rounded-lg hover:bg-slate-700"><Plus/></button></div>
                        <div className="relative mb-2">
                            <Calendar className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                            <select className="pl-9 pr-4 py-2 w-full bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none appearance-none cursor-pointer text-slate-600 font-medium" onChange={(e) => {}}>
                                <option value="all">Todos os Anos</option>
                                {[...new Set(expenses.map(e => e.year))].sort((a,b) => b-a).map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                            {expenses.map(exp => (
                                <Card key={exp.id} onClick={() => handleEditExpense(exp)} className={`p-4 cursor-pointer hover:border-amber-400 transition-all ${activeExpenseId === exp.id ? 'border-amber-500 ring-1 ring-amber-500 bg-amber-50' : ''}`} >
                                    <div className="flex justify-between items-start mb-2"><div><span className="font-bold text-lg text-slate-800">{formatMonth(exp.month)} / {exp.year}</span><div className="text-xs text-slate-500">{exp.total_dishes_sold} pratos vendidos</div></div><div className="text-right"><div className="font-bold text-amber-600">{formatCurrency(exp.total_expenses)}</div><div className="text-[10px] font-bold uppercase text-slate-400">Total</div></div></div>
                                    <div className="flex justify-between items-center pt-2 border-t border-slate-100"><span className="text-xs text-slate-500">Custo Fixo Unitário</span><span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{formatCurrency(exp.cost_per_dish)}</span></div>
                                    <div className="flex justify-end mt-2"><button onClick={(e) => { e.stopPropagation(); confirmDelete('expenses', [exp.id]); }} className="text-slate-300 hover:text-red-500 p-1 z-10"><Trash2 size={14}/></button></div>
                                </Card>
                            ))}
                            {expenses.length === 0 && <div className="text-center text-slate-400 py-10">Nenhum registro encontrado.</div>}
                        </div>
                    </div>
                    <div className="flex-1 flex flex-col h-full overflow-hidden">
                        {activeExpenseId ? (
                            <Card className="flex-1 flex flex-col overflow-hidden h-full border-amber-200">
                                <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center"><h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">{activeExpenseId === 'new' ? 'Novo Registro' : 'Editar Registro'}</h3><div className="flex gap-2"><button onClick={() => setActiveExpenseId(null)} className="px-4 py-2 text-slate-500 hover:bg-slate-200 rounded-lg">Cancelar</button><button onClick={handleSaveExpense} className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-amber-500/20 flex items-center gap-2"><Save size={18}/> Salvar</button></div></div>
                                <div className="p-6 overflow-y-auto flex-1">
                                    <div className="grid grid-cols-3 gap-6 mb-8"><InputGroup label="Mês"><StyledSelect value={expenseForm.month} onChange={e => setExpenseForm({...expenseForm, month: e.target.value})}>{Array.from({length:12}, (_,i) => <option key={i+1} value={i+1}>{formatMonth(i+1)}</option>)}</StyledSelect></InputGroup><InputGroup label="Ano"><StyledInput type="number" value={expenseForm.year} onChange={e => setExpenseForm({...expenseForm, year: e.target.value})} /></InputGroup><InputGroup label="Pratos Vendidos"><StyledInput type="number" value={expenseForm.dishes} onChange={e => setExpenseForm({...expenseForm, dishes: e.target.value})} /></InputGroup></div>
                                    <h4 className="font-bold text-sm text-slate-500 uppercase tracking-wider mb-4 border-b pb-2 flex justify-between items-center">Detalhamento Financeiro</h4>
                                    <div className="space-y-3">
                                        {expenseForm.items.map((item, idx) => {
                                            const category = categories.find(c => c.id === item.category_id);
                                            return (
                                                <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-amber-200 transition-colors gap-4">
                                                    <div className="flex-1">
                                                        <StyledSelect value={item.category_id} onChange={(e) => { const newItems = [...expenseForm.items]; newItems[idx].category_id = e.target.value; setExpenseForm({...expenseForm, items: newItems}); }}>
                                                            <option value="" disabled>Selecione a Categoria</option>
                                                            {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                        </StyledSelect>
                                                    </div>
                                                    <div className="w-40 relative">
                                                        <span className="absolute left-3 top-2.5 text-slate-400 text-xs">R$</span>
                                                        <input type="number" className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-right font-mono font-medium focus:ring-2 focus:ring-amber-500 outline-none" placeholder="0.00" value={item.amount} onChange={(e) => { const newItems = [...expenseForm.items]; newItems[idx].amount = e.target.value; setExpenseForm({...expenseForm, items: newItems}); }}/>
                                                    </div>
                                                    <button onClick={() => { const newItems = expenseForm.items.filter((_, i) => i !== idx); setExpenseForm({...expenseForm, items: newItems}); }} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><X size={18}/></button>
                                                </div>
                                            )
                                        })}
                                        <button onClick={() => setExpenseForm(prev => ({...prev, items: [...prev.items, { category_id: '', amount: '' }]}))} className="w-full py-2 border border-dashed border-slate-300 text-slate-500 rounded-lg hover:bg-slate-50 hover:text-slate-700 text-sm font-medium flex justify-center items-center gap-2 mb-4"><Plus size={16}/> Adicionar Linha de Despesa</button>
                                        
                                        <div className="mt-6 pt-4 border-t border-slate-100 bg-blue-50/50 p-4 rounded-xl">
                                            <label className="text-xs font-bold text-blue-600 uppercase mb-2 block flex items-center gap-2"><Zap size={14}/> Cadastro Rápido de Categoria</label>
                                            <div className="flex gap-2">
                                                <input className="flex-1 bg-white border border-blue-200 text-slate-900 text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none placeholder:text-blue-300" placeholder="Digite o nome da nova categoria..." value={quickCatName} onChange={(e) => setQuickCatName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddQuickCategory()} />
                                                <button onClick={handleAddQuickCategory} disabled={!quickCatName.trim()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed">Criar & Adicionar</button>
                                            </div>
                                            <p className="text-[10px] text-blue-400 mt-2 ml-1">Dica: Isso criará a categoria no sistema e já adicionará uma linha acima.</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-slate-900 text-white p-4 flex justify-between items-center"><div className="text-sm opacity-80">Total Despesas</div><div className="text-2xl font-bold">{formatCurrency(expenseForm.items.reduce((acc, i) => acc + (Number(i.amount)||0), 0))}</div></div>
                            </Card>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 bg-slate-50/50 rounded-xl border border-dashed border-slate-200"><Calculator size={48} className="mb-4 opacity-50"/><p>Selecione um mês ou crie um novo registro</p></div>
                        )}
                    </div>
                </div>
            )}

            {view === 'categories' && (
                <div className="p-10 max-w-4xl mx-auto">
                    <h1 className="text-3xl font-bold text-slate-900 mb-8 flex items-center gap-3"><Settings className="text-slate-600"/> Configurações</h1>
                    
                    <div className="flex gap-4 mb-6 border-b border-slate-200 overflow-x-auto no-scrollbar">
                        <button onClick={() => setCatTab('recipe')} className={`pb-3 px-4 font-bold text-sm transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${catTab === 'recipe' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><ChefHat size={16}/> Categorias de Receitas</button>
                        <button onClick={() => setCatTab('expense')} className={`pb-3 px-4 font-bold text-sm transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${catTab === 'expense' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><TrendingUp size={16}/> Plano de Contas</button>
                        <button onClick={() => setCatTab('platform')} className={`pb-3 px-4 font-bold text-sm transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${catTab === 'platform' ? 'border-purple-500 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><ShoppingBag size={16}/> Plataformas de Delivery</button>
                    </div>

                    {catTab === 'platform' ? (
                        <>
                            <Card className="p-6 mb-6 border-l-4 border-l-purple-500">
                                <h3 className="font-bold text-slate-800 mb-4 text-sm flex items-center gap-2"><Plus size={16} className="text-purple-500"/> Adicionar Nova Plataforma</h3>
                                <div className="flex gap-4 items-end">
                                    <div className="flex-1"><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nome da Plataforma</label><StyledInput placeholder="Ex: iFood, Rappi..." value={platformForm.name} onChange={e => setPlatformForm({...platformForm, name: e.target.value})} /></div>
                                    <div className="w-40"><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Taxa (%)</label><div className="relative"><StyledInput type="number" placeholder="0" className="pr-8" value={platformForm.percentage} onChange={e => setPlatformForm({...platformForm, percentage: e.target.value})} /><span className="absolute right-3 top-2.5 text-slate-400 text-sm font-bold">%</span></div></div>
                                    <button onClick={handleSavePlatform} disabled={!platformForm.name} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-lg font-bold shadow-lg shadow-purple-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed h-[42px]">Salvar</button>
                                </div>
                            </Card>
                            <div className="space-y-3">{deliveryPlatforms.map(plat => (<Card key={plat.id} className="p-4 flex justify-between items-center group hover:border-purple-200 transition-all"><div className="flex items-center gap-4"><div className="bg-purple-50 p-2 rounded-lg text-purple-600"><Bike size={20}/></div><div><span className="font-bold text-slate-800 block">{plat.name}</span><span className="text-xs text-slate-500">Taxa de serviço configurada</span></div></div><div className="flex items-center gap-6"><div className="text-right"><span className="text-2xl font-bold text-purple-700">{plat.percentage}%</span><span className="text-[10px] uppercase font-bold text-slate-400 block">Comissão</span></div><button onClick={() => confirmDelete('delivery_platforms', [plat.id])} className="text-slate-300 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"><Trash2 size={18}/></button></div></Card>))}</div>
                        </>
                    ) : (
                        <>
                            <Card className="p-6 mb-6">
                                <div className="flex gap-4"><StyledInput placeholder={catTab === 'recipe' ? "Nova Categoria (ex: Entradas Frias)" : "Nova Conta (ex: Marketing)"} value={newCatInput} onChange={e => setNewCatInput(e.target.value)} /><button onClick={async () => { if(newCatInput) { await supabase.from('categories').insert({user_id: session.user.id, name: newCatInput, type: catTab}); setNewCatInput(''); fetchData(); } }} className={`text-white px-6 rounded-lg font-bold ${catTab === 'recipe' ? 'bg-emerald-600' : 'bg-amber-600'}`}>Adicionar</button></div>
                            </Card>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{categories.filter(c => c.type === catTab).map(cat => (<Card key={cat.id} className="p-4 flex justify-between items-center group hover:shadow-md transition-all"><span className="font-medium text-slate-700">{cat.name}</span><button onClick={() => confirmDelete('categories', [cat.id])} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button></Card>))}</div>
                        </>
                    )}
                </div>
            )}
            
            {view === 'production' && (
                <div className="p-6 md:p-10 w-full max-w-7xl mx-auto">
                    <header className="flex justify-between items-center mb-8">
                        <div><h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3"><ClipboardCheck className="text-emerald-600" size={32}/> Controle de Produção</h1><p className="text-slate-500 mt-1 ml-11">Realize a baixa de produção e compare custos Teóricos vs. Reais.</p></div>
                        <button onClick={startProduction} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-bold shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all transform active:scale-95"><Plus size={20} /> Nova Produção</button>
                    </header>
                    <div className="bg-white p-4 mb-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                        <div className="relative flex-1 w-full"><Search className="absolute left-3 top-2.5 text-slate-400" size={18}/><input placeholder="Buscar produção por nome da receita..." className="pl-10 pr-4 py-2 w-full bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-400" value={productionSearch} onChange={e => setProductionSearch(e.target.value)} /></div>
                        <div className="flex gap-3 w-full md:w-auto"><div className="relative flex-1 md:w-48"><Calendar className="absolute left-3 top-2.5 text-slate-400" size={16}/><select className="pl-9 pr-4 py-2 w-full bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none appearance-none cursor-pointer text-slate-600 font-medium" value={productionDateFilter} onChange={e => setProductionDateFilter(e.target.value)}><option value="all">Todo o Período</option><option value="7days">Últimos 7 dias</option><option value="30days">Últimos 30 dias</option></select></div></div>
                    </div>
                    <Card className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-xs border-b border-slate-200"><tr><th className="p-4">Data</th><th className="p-4">Receita Produzida</th><th className="p-4 text-center">Tempo (Real)</th><th className="p-4 text-center">Rendimento (Real)</th><th className="p-4 text-right">Custo Total</th><th className="p-4 text-center">Variação</th><th className="p-4"></th></tr></thead>
                                <tbody className="divide-y divide-slate-100">{productionRuns.filter(run => run.recipe_name.toLowerCase().includes(productionSearch.toLowerCase())).filter(run => { if (productionDateFilter === 'all') return true; const diffDays = Math.ceil(Math.abs(new Date().getTime() - new Date(run.created_at).getTime()) / (1000 * 60 * 60 * 24)); return productionDateFilter === '7days' ? diffDays <= 7 : diffDays <= 30; }).map(run => { const variance = Number(run.planned_cost) > 0 ? ((Number(run.actual_cost) - Number(run.planned_cost)) / Number(run.planned_cost)) * 100 : 0; return (<tr key={run.id} className="hover:bg-slate-50 transition-colors"><td className="p-4 text-slate-600">{formatDate(run.created_at)}</td><td className="p-4 font-bold text-slate-800">{run.recipe_name}</td><td className="p-4 text-center text-slate-600">{run.actual_time_minutes} min</td><td className="p-4 text-center text-slate-600">{run.actual_yield} un</td><td className="p-4 text-right font-mono font-medium text-slate-700">{formatCurrency(run.actual_cost)}</td><td className="p-4 text-center"><span className={`px-2 py-1 rounded text-xs font-bold ${Math.abs(variance) < 2 ? 'bg-slate-100 text-slate-500' : variance > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{variance > 0 ? '+' : ''}{variance.toFixed(1)}%</span></td><td className="p-4 text-right flex gap-2 justify-end"><button onClick={() => { setViewingProduction(run); setView('production-wizard'); setProdWizardStep(3); }} className="text-slate-300 hover:text-blue-500"><Eye size={16}/></button><button onClick={() => confirmDelete('production', [run.id])} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button></td></tr>) })} {productionRuns.length === 0 && <tr><td colSpan={7} className="p-12 text-center text-slate-400">Nenhum registro de produção encontrado.</td></tr>}</tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}
            
            {view === 'recipe-editor' && currentRecipe && (
                <div className="absolute inset-0 z-50 bg-slate-50 flex flex-col h-full w-full">
                    <div className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center shadow-sm shrink-0">
                         <div className="flex items-center gap-4 flex-1"><button onClick={() => { if(hasUnsavedChanges) setShowUnsavedModal(true); else setView(currentRecipe.type === 'drink' ? 'drinks' : currentRecipe.type === 'sub_recipe' ? 'sub_recipes' : 'recipes'); }} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"><ChevronLeft/></button><div className="h-8 w-px bg-slate-200"></div><input className="text-xl font-bold bg-transparent outline-none placeholder-slate-300 w-full text-slate-800" placeholder="Nome da Ficha Técnica" value={currentRecipe.name} onChange={e => {setCurrentRecipe({...currentRecipe, name: e.target.value}); setHasUnsavedChanges(true); }} autoFocus/></div>
                         <div className="flex gap-3 items-center"><button onClick={() => { setCurrentRecipe({...currentRecipe, status: currentRecipe.status === 'active' ? 'inactive' : 'active'}); setHasUnsavedChanges(true); }} className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border transition-all ${currentRecipe.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{currentRecipe.status === 'active' ? <ToggleRight size={18}/> : <ToggleLeft size={18}/>} {currentRecipe.status === 'active' ? 'Ativo' : 'Inativo'}</button><div className="h-6 w-px bg-slate-200 mx-2"></div><button onClick={() => setView('print-preview')} className="flex items-center gap-2 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-100 font-medium transition-colors"><Printer size={18}/> Imprimir</button><button onClick={saveRecipe} className="bg-slate-900 text-white px-6 py-2 rounded-lg shadow-lg hover:bg-slate-800 flex items-center gap-2 font-bold transition-all transform active:scale-95"><Save size={18}/> Salvar</button></div>
                    </div>
                    <div className="flex-1 overflow-hidden flex flex-row">
                        <div ref={editorScrollRef} className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/50 scroll-smooth">
                             <div className="grid grid-cols-12 gap-6">
                                <Card className="col-span-8 p-6 grid grid-cols-2 gap-6">
                                    <InputGroup label="Categoria"><StyledSelect value={currentRecipe.category} onChange={e => {setCurrentRecipe({...currentRecipe, category: e.target.value}); setHasUnsavedChanges(true);}}>{recipeCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</StyledSelect></InputGroup>
                                    <InputGroup label="Rendimento Final"><div className="flex gap-2"><StyledInput type="number" value={currentRecipe.portions} onChange={e => {setCurrentRecipe({...currentRecipe, portions: Number(e.target.value)}); setHasUnsavedChanges(true);}} /> <span className="flex items-center justify-center bg-slate-100 border border-slate-200 px-4 rounded-lg text-sm text-slate-600 font-medium min-w-[80px]">{currentRecipe.unit}</span></div></InputGroup>
                                </Card>
                                {currentRecipe.type !== 'sub_recipe' && (<Card className="col-span-4 p-6"><InputGroup label="Tempo Operacional (min)"><div className="flex gap-2"><div className="flex-1 text-center"><StyledInput placeholder="Prep" className="text-center" type="number" value={currentRecipe.operational_prep} onChange={e => {setCurrentRecipe({...currentRecipe, operational_prep: Number(e.target.value)}); setHasUnsavedChanges(true);}}/><span className="text-[10px] text-slate-400 mt-1 block">PREP</span></div><div className="flex-1 text-center"><StyledInput placeholder="Cook" className="text-center" type="number" value={currentRecipe.operational_cook} onChange={e => {setCurrentRecipe({...currentRecipe, operational_cook: Number(e.target.value)}); setHasUnsavedChanges(true);}}/><span className="text-[10px] text-slate-400 mt-1 block">FOGO</span></div><div className="flex-1 text-center"><StyledInput placeholder="Plate" className="text-center" type="number" value={currentRecipe.operational_plating} onChange={e => {setCurrentRecipe({...currentRecipe, operational_plating: Number(e.target.value)}); setHasUnsavedChanges(true);}}/><span className="text-[10px] text-slate-400 mt-1 block">MONTAGEM</span></div></div></InputGroup></Card>)}
                             </div>
                             <Card className="col-span-12 shadow-sm border border-slate-200">
                                 <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0 sticky top-0 z-30"><h3 className="font-bold text-slate-700 flex items-center gap-2"><Layers size={18} className="text-slate-400"/> Composição</h3><div className="flex gap-2"><button onClick={() => { setCurrentRecipe({...currentRecipe, items: [...currentRecipe.items, { item_type: 'ingredient', ref_id: '', qty: 0, unit: 'kg' }]}); setHasUnsavedChanges(true); scrollToBottom(); }} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 px-3 py-2 rounded-lg flex items-center gap-1 font-bold transition-colors"><Plus size={14}/> Adicionar Insumo</button><button onClick={() => { setCurrentRecipe({...currentRecipe, items: [...currentRecipe.items, { item_type: 'sub_recipe', ref_id: '', qty: 0, unit: 'kg' }]}); setHasUnsavedChanges(true); scrollToBottom(); }} className="text-xs bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 px-3 py-2 rounded-lg flex items-center gap-1 font-bold transition-colors"><Plus size={14}/> Adicionar Base</button></div></div>
                                 <div className="flex-1 relative"><table className="w-full text-sm"><thead className="bg-slate-50 border-b border-slate-200 text-slate-500 sticky top-[61px] z-20 shadow-sm"><tr><th className="p-3 pl-6 text-left w-20 bg-slate-50">Tipo</th><th className="p-3 text-left w-[40%] bg-slate-50">Item</th><th className="p-3 w-24 bg-slate-50">Qtd</th><th className="p-3 w-20 text-center bg-slate-50">Un</th><th className="p-3 text-right bg-slate-50">Custo</th><th className="w-16 bg-slate-50"></th></tr></thead><tbody className="divide-y divide-slate-50">{currentRecipe.items.map((item, idx) => { let cost = 0, options: any[] = []; if(item.item_type === 'ingredient') { options = ingredients; const ing = ingredients.find(i => i.id === item.ref_id); if(ing) { const q = Number(item.qty) || 0; const c = Number(ing.cost_per_unit) || 0; cost = q * c; } } else { options = recipes.filter(r => r.type === 'sub_recipe' && r.id !== currentRecipe.id); const sub = options.find((o:any) => o.id === item.ref_id) as Recipe; if(sub) { const subCost = getRecipeCosts(sub).costPerPortion; const q = Number(item.qty) || 0; const c = Number(subCost) || 0; cost = q * c; } } const updateItem = (field: keyof RecipeItemDB, val: any) => { const newItems = [...currentRecipe.items]; newItems[idx] = { ...newItems[idx], [field]: val }; if(field === 'ref_id') { const found = options.find((o:any) => o.id === val); if(found) newItems[idx].unit = (found as any).unit; } setCurrentRecipe({...currentRecipe, items: newItems}); setHasUnsavedChanges(true); }; return (<tr key={idx} className="group hover:bg-slate-50/50"><td className="p-2 pl-6"><Badge color={item.item_type === 'ingredient' ? 'blue' : 'orange'}>{item.item_type === 'ingredient' ? 'INS' : 'BASE'}</Badge></td><td className="p-2"><StyledSelect value={item.ref_id} onChange={e => updateItem('ref_id', e.target.value)}><option value="">Selecione...</option>{options.map((o:any) => <option key={o.id} value={o.id}>{o.name}</option>)}</StyledSelect></td><td className="p-2"><StyledInput type="number" className="text-center font-medium" value={item.qty} onChange={e => updateItem('qty', Number(e.target.value))} /></td><td className="p-2 text-center text-slate-500 text-xs font-bold uppercase">{item.unit}</td><td className="p-2 text-right font-mono text-slate-700 font-medium">{formatCurrency(cost)}</td><td className="p-2 text-center"><button onClick={() => { const newItems = currentRecipe.items.filter((_, i) => i !== idx); setCurrentRecipe({...currentRecipe, items: newItems}); setHasUnsavedChanges(true); }} className="text-slate-300 hover:text-red-500 p-1.5 rounded-full hover:bg-red-50 transition-colors"><X size={16}/></button></td></tr>) })} {currentRecipe.items.length === 0 && <tr><td colSpan={6} className="p-12 text-center text-slate-400 italic">Nenhum item adicionado à receita.</td></tr>}</tbody></table></div>
                             </Card>
                             <div className="grid grid-cols-12 gap-6"><Card className="col-span-12 lg:col-span-7 p-6"><h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2"><TrendingUp size={18}/> Custos Indiretos & Extras</h3><div className="grid grid-cols-2 gap-4 mb-4"><InputGroup label="Embalagem"><StyledInput type="number" value={currentRecipe.extra_packaging} onChange={e => {setCurrentRecipe({...currentRecipe, extra_packaging: Number(e.target.value)}); setHasUnsavedChanges(true);}} /></InputGroup><InputGroup label={currentRecipe.type === 'drink' ? 'Gelo/Guarnição' : 'Energia/Gás'}><StyledInput type="number" value={currentRecipe.type === 'drink' ? currentRecipe.extra_ice_garnish : currentRecipe.extra_utilities} onChange={e => {setCurrentRecipe({...currentRecipe, [currentRecipe.type === 'drink' ? 'extra_ice_garnish' : 'extra_utilities']: Number(e.target.value)}); setHasUnsavedChanges(true);}} /></InputGroup></div><div className="grid grid-cols-2 gap-4"><InputGroup label="Outros"><StyledInput type="number" value={currentRecipe.extra_other_direct} onChange={e => {setCurrentRecipe({...currentRecipe, extra_other_direct: Number(e.target.value)}); setHasUnsavedChanges(true);}} /></InputGroup><InputGroup label="Rateio Custo Fixo"><div className="space-y-2"><StyledInput className="border-amber-200 bg-amber-50 focus:ring-amber-500 font-bold text-amber-900 placeholder-amber-300" type="number" placeholder="0.00" value={currentRecipe.extra_fixed_cost} onChange={e => {setCurrentRecipe({...currentRecipe, extra_fixed_cost: Number(e.target.value)}); setHasUnsavedChanges(true);}} /><div className="relative group"><select className="w-full bg-white border border-slate-200 text-[11px] font-medium text-slate-500 rounded-lg py-1.5 pl-2 pr-6 appearance-none focus:ring-1 focus:ring-amber-500 outline-none cursor-pointer hover:border-amber-300 hover:text-amber-700 transition-colors" onChange={(e) => { const val = Number(e.target.value); if(val > 0) { setCurrentRecipe({...currentRecipe, extra_fixed_cost: val}); setHasUnsavedChanges(true); showToast('success', 'Rateio atualizado com base no histórico.'); } }} value=""><option value="" disabled>Carregar do Histórico...</option>{expenses.map(exp => (<option key={exp.id} value={exp.cost_per_dish}>{formatMonth(exp.month)}/{exp.year} ({formatCurrency(exp.cost_per_dish)}/un)</option>))}{expenses.length === 0 && <option disabled>Sem histórico disponível</option>}</select><div className="absolute right-2 top-2 pointer-events-none text-slate-300 group-hover:text-amber-500 transition-colors"><History size={12} /></div></div></div></InputGroup></div></Card><Card className="col-span-12 lg:col-span-5 flex flex-col overflow-hidden"><div className="bg-slate-50 p-3 border-b border-slate-200 font-bold text-sm text-slate-700">Modo de Preparo</div><textarea className="w-full h-full p-4 resize-none outline-none text-sm text-slate-700 leading-relaxed bg-white" placeholder="Descreva o passo a passo..." value={currentRecipe.instructions} onChange={e => {setCurrentRecipe({...currentRecipe, instructions: e.target.value}); setHasUnsavedChanges(true);}} /></Card></div>
                             <Card className="p-6 mt-6 border-l-4 border-l-blue-500"><h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><ClipboardList className="text-blue-500" size={20}/> Histórico de Produção</h3><div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200"><tr><th className="p-3">Data</th><th className="p-3 text-center">Tempo Real</th><th className="p-3 text-center">Rendimento Real</th><th className="p-3 text-right">Custo Real</th><th className="p-3 text-center">Variação</th></tr></thead><tbody className="divide-y divide-slate-100">{productionRuns.filter(p => p.recipe_id === currentRecipe.id).map(run => { const variance = Number(run.planned_cost) > 0 ? ((Number(run.actual_cost) - Number(run.planned_cost)) / Number(run.planned_cost)) * 100 : 0; return (<tr key={run.id} className="hover:bg-slate-50"><td className="p-3 text-slate-600">{formatDate(run.created_at)}</td><td className="p-3 text-center">{run.actual_time_minutes} min</td><td className="p-3 text-center">{run.actual_yield}</td><td className="p-3 text-right font-mono">{formatCurrency(run.actual_cost)}</td><td className="p-3 text-center"><span className={`px-2 py-0.5 rounded text-xs font-bold ${variance > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{variance > 0 ? '+' : ''}{variance.toFixed(1)}%</span></td></tr>) })} {productionRuns.filter(p => p.recipe_id === currentRecipe.id).length === 0 && <tr><td colSpan={5} className="p-6 text-center text-slate-400 text-xs italic">Nenhum registro de produção encontrado para esta receita.</td></tr>}</tbody></table></div></Card>
                        </div>
                        <div className="w-[400px] bg-white border-l border-slate-200 flex flex-col z-10 shadow-xl shadow-slate-200/50">
                             <div className="p-6 border-b border-slate-100 bg-slate-50/50"><h3 className="font-bold text-lg flex items-center gap-2 mb-1 text-slate-800"><DollarSign className="text-emerald-500"/> Precificação</h3><p className="text-xs text-slate-500">Análise financeira em tempo real.</p></div>
                             <div className="flex-1 overflow-y-auto p-6 space-y-8">
                                 {(() => {
                                     const costs = getRecipeCosts(currentRecipe);
                                     let suggested = 0; const targetDec = Number(currentRecipe.pricing_target)/100;
                                     if(currentRecipe.pricing_method === 'margin') { 
                                         const tax = Number(currentRecipe.taxes_pct) || 0; const fee = Number(currentRecipe.card_fee_pct) || 0; const div = 1 - (tax/100) - (fee/100) - targetDec; 
                                         suggested = div > 0 ? costs.costPerPortion / div : 0; 
                                     } else { suggested = costs.costPerPortion * (1 + targetDec); }

                                     // Delivery Intelligent Pricing Logic
                                     let suggestedDeliveryPrice = 0;
                                     let deliveryMargin = 0;
                                     const selectedPlatform = deliveryPlatforms.find(p => p.id === currentRecipe.delivery_platform_id);
                                     
                                     if (selectedPlatform) {
                                         // 1. Calculate Profit ($) at Counter (Simulated as if no platform is selected to get baseline)
                                         // To do this accurately without modifying state, we calc manually:
                                         const taxRate = Number(currentRecipe.taxes_pct) / 100;
                                         const cardRate = Number(currentRecipe.card_fee_pct) / 100;
                                         
                                         // Revenue at Counter = Price * (1 - Tax - Card)
                                         const grossCounterRevenue = costs.price * (1 - taxRate - cardRate);
                                         const counterProfit = grossCounterRevenue - costs.totalCost; // Profit without platform fee
                                         
                                         // 2. Calculate Delivery Price needed to maintain same Profit ($)
                                         // Formula: Price_Del * (1 - Tax - Card - Platform%) - TotalCost - ExtraDelCost = CounterProfit
                                         // Price_Del * (1 - Tax - Card - Platform%) = CounterProfit + TotalCost + ExtraDelCost
                                         const platRate = selectedPlatform.percentage / 100;
                                         const extraDelCost = Number(currentRecipe.extra_delivery_fee) || 0;
                                         
                                         const divisor = 1 - taxRate - cardRate - platRate;
                                         
                                         if (divisor > 0) {
                                             suggestedDeliveryPrice = (costs.totalCost + extraDelCost + counterProfit) / divisor;
                                         }

                                         // 3. Calculate Margin if selling at CURRENT price on delivery
                                         const currentPrice = costs.price;
                                         const totalDeductions = currentPrice * (taxRate + cardRate + platRate) + extraDelCost;
                                         const currentDeliveryProfit = currentPrice - costs.totalCost - totalDeductions;
                                         deliveryMargin = currentPrice > 0 ? (currentDeliveryProfit / currentPrice) * 100 : 0;
                                     }

                                     return (
                                         <>{/* Pricing Panel Content */}
                                            <div className="space-y-3 pb-6 border-b border-slate-100"><div className="flex justify-between items-center"><span className="text-sm text-slate-500 font-medium">Custo Produção Total</span> <span className="font-mono text-slate-700">{formatCurrency(costs.totalCost)}</span></div><div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100"><span className="text-xs font-bold uppercase text-slate-500">Custo / {currentRecipe.type === 'sub_recipe' ? currentRecipe.unit : 'Porção'}</span> <span className="font-bold text-lg text-slate-800">{formatCurrency(costs.costPerPortion)}</span></div></div>
                                            {currentRecipe.type !== 'sub_recipe' && (<div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500"><div><label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Método de Precificação</label><div className="flex bg-slate-100 p-1 rounded-lg"><button onClick={() => {setCurrentRecipe({...currentRecipe, pricing_method: 'margin'}); setHasUnsavedChanges(true);}} className={`flex-1 text-xs py-2 rounded-md font-bold transition-all ${currentRecipe.pricing_method === 'margin' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Margem</button><button onClick={() => {setCurrentRecipe({...currentRecipe, pricing_method: 'markup'}); setHasUnsavedChanges(true);}} className={`flex-1 text-xs py-2 rounded-md font-bold transition-all ${currentRecipe.pricing_method === 'markup' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Markup</button></div></div><div className="flex gap-4"><div className="flex-1"><InputGroup label="Meta %"><StyledInput type="number" className="text-right font-bold" value={currentRecipe.pricing_target} onChange={e => {setCurrentRecipe({...currentRecipe, pricing_target: Number(e.target.value)}); setHasUnsavedChanges(true);}} /></InputGroup></div><div className="flex-1"><InputGroup label="Sugerido"><div className="w-full bg-slate-100 border border-slate-200 text-slate-500 text-sm rounded-lg px-3 py-2.5 text-right font-mono font-bold cursor-not-allowed">{formatCurrency(suggested)}</div></InputGroup></div></div><div className="pt-6 border-t border-slate-100"><label className="text-xs font-bold text-slate-900 uppercase flex items-center gap-2 mb-2">Preço de Venda <span className="text-[10px] font-normal text-slate-400 bg-slate-100 px-1.5 rounded">FINAL</span></label><div className="flex items-center gap-3 relative"><span className="absolute left-0 top-1 text-emerald-600 font-bold text-2xl">R$</span><input type="number" className="bg-transparent text-4xl font-black text-slate-900 w-full outline-none border-b-2 border-slate-200 focus:border-emerald-500 pl-8 transition-colors pb-1" placeholder="0.00" value={currentRecipe.final_price} onChange={e => {setCurrentRecipe({...currentRecipe, final_price: Number(e.target.value)}); setHasUnsavedChanges(true);}} /></div></div><div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2"><div className="flex justify-between text-xs text-slate-500 items-center"><span>Impostos ({currentRecipe.taxes_pct}%)</span><input type="number" className="w-12 bg-white border rounded px-1 text-right text-xs" value={currentRecipe.taxes_pct} onChange={e => setCurrentRecipe({...currentRecipe, taxes_pct: Number(e.target.value)})}/></div><div className="flex justify-between text-xs text-slate-500 items-center"><span>Taxas Cartão ({currentRecipe.card_fee_pct}%)</span><input type="number" className="w-12 bg-white border rounded px-1 text-right text-xs" value={currentRecipe.card_fee_pct} onChange={e => setCurrentRecipe({...currentRecipe, card_fee_pct: Number(e.target.value)})}/></div><div className="pt-2 border-t border-slate-200 flex justify-between text-xs font-bold text-slate-700"><span>Receita Líquida</span><span>{formatCurrency(costs.price - costs.tax - (costs.price * (Number(currentRecipe.card_fee_pct)/100)))}</span></div></div>
                                            
                                            {/* INTELLIGENT DELIVERY PRICING BOX */}
                                            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 space-y-3 relative overflow-hidden">
                                                <div className="absolute top-0 right-0 p-2 opacity-5"><Bike size={64}/></div>
                                                <div className="flex items-center justify-between relative z-10"><span className="text-xs font-bold text-purple-800 uppercase flex items-center gap-1"><Bike size={14}/> Simulação Delivery</span></div>
                                                <div className="space-y-2 relative z-10">
                                                    <div><label className="text-[10px] font-bold text-purple-600 mb-1 block">Plataforma</label><StyledSelect className="bg-white border-purple-200 text-xs py-1.5 focus:ring-purple-500" value={currentRecipe.delivery_platform_id || ''} onChange={e => {setCurrentRecipe({...currentRecipe, delivery_platform_id: e.target.value || null}); setHasUnsavedChanges(true);}}><option value="">Nenhuma (Venda Balcão)</option>{deliveryPlatforms.map(p => <option key={p.id} value={p.id}>{p.name} ({p.percentage}%)</option>)}</StyledSelect></div>
                                                    
                                                    {selectedPlatform && (
                                                        <div className="mt-3 pt-3 border-t border-purple-200 space-y-3 animate-in fade-in">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-[10px] font-bold text-purple-600 uppercase">Preço Sugerido</span>
                                                                <div className="text-right">
                                                                    <div className="font-bold text-lg text-purple-900 leading-none">{formatCurrency(suggestedDeliveryPrice)}</div>
                                                                    <span className="text-[9px] text-purple-500">para manter lucro do balcão</span>
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="bg-white/60 rounded p-2 border border-purple-100">
                                                                <div className="flex justify-between text-[10px] mb-1">
                                                                    <span className="text-slate-500">Margem Balcão</span>
                                                                    <span className="font-bold text-emerald-600">{costs.margin.toFixed(1)}%</span>
                                                                </div>
                                                                <div className="flex justify-between text-[10px]">
                                                                    <span className="text-slate-500">Margem se vender no App</span>
                                                                    <span className={`font-bold ${deliveryMargin < 10 ? 'text-red-500' : 'text-purple-600'}`}>{deliveryMargin.toFixed(1)}%</span>
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-2"><div><label className="text-[9px] font-bold text-purple-400 mb-1 block">Taxa Extra (R$)</label><input className="w-full bg-white border border-purple-200 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-purple-500" type="number" placeholder="0.00" value={currentRecipe.extra_delivery_fee || 0} onChange={e => {setCurrentRecipe({...currentRecipe, extra_delivery_fee: Number(e.target.value)}); setHasUnsavedChanges(true);}} /></div><div><label className="text-[9px] font-bold text-purple-400 mb-1 block text-right">Comissão ({selectedPlatform.percentage}%)</label><div className="text-right font-mono font-medium text-purple-700 text-xs pt-1">{formatCurrency(costs.platformFee)}</div></div></div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2"><div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-500 uppercase">CMV Teórico (Valor)</span><span className="text-sm font-bold text-slate-700">{formatCurrency(costs.costPerPortion)}</span></div><div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-500 uppercase">CMV Teórico (%)</span><span className={`text-sm font-bold ${costs.cmvPct > 35 ? 'text-red-500' : 'text-emerald-600'}`}>{costs.cmvPct.toFixed(1)}%</span></div><div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1"><div className={`h-full ${costs.cmvPct > 35 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{width: `${Math.min(costs.cmvPct, 100)}%`}}></div></div></div>
                                            <div className="space-y-4"><div className="flex justify-between items-end"><label className="text-xs font-bold text-slate-400 uppercase">Lucro Líquido</label><span className={`text-2xl font-bold ${costs.profit > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatCurrency(costs.profit)}</span></div><div><div className="flex justify-between items-end mb-2"><label className="text-xs font-bold text-slate-400 uppercase">Margem Real</label><span className={`text-xl font-bold ${costs.margin >= 20 ? 'text-emerald-600' : costs.margin > 0 ? 'text-orange-500' : 'text-red-500'}`}>{costs.margin.toFixed(1)}%</span></div><div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner"><div className={`h-full transition-all duration-500 ${costs.margin >= 20 ? 'bg-emerald-500' : costs.margin > 0 ? 'bg-orange-400' : 'bg-red-500'}`} style={{width: `${Math.min(Math.max(costs.margin, 0), 100)}%`}}></div></div><p className="text-[10px] text-slate-400 mt-1 text-center">Ideal: &gt; 25%</p></div></div></div>)}</>
                                     )
                                 })()}
                             </div>
                        </div>
                    </div>
                </div>
            )}

            {showUpdateConfirm && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999]">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 animate-in zoom-in-95 duration-200">
                        <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"><RefreshCw className="text-blue-600" size={32}/></div>
                        <h3 className="font-bold text-xl text-slate-900 mb-2 text-center">Finalizar e Atualizar?</h3>
                        <p className="text-sm text-slate-500 mb-6 text-center">Você deseja atualizar a Ficha Técnica original com os indicadores reais desta produção?</p>
                        <div className="bg-slate-50 rounded-lg p-4 mb-6 text-sm"><div className="flex justify-between mb-2"><span>Rendimento:</span> <span className="font-bold text-slate-800">{currentProduction.planned_yield} <ArrowRight size={12} className="inline text-slate-400"/> {currentProduction.actual_yield}</span></div><div className="flex justify-between"><span>Tempo Total:</span> <span className="font-bold text-slate-800">{currentProduction.planned_time_minutes} min <ArrowRight size={12} className="inline text-slate-400"/> {(Number(currentProduction.actual_prep)||0)+(Number(currentProduction.actual_cook)||0)+(Number(currentProduction.actual_plating)||0)} min</span></div></div>
                        <div className="flex flex-col gap-3"><button onClick={() => saveProductionRun(true)} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all">Sim, Atualizar Ficha Técnica</button><button onClick={() => saveProductionRun(false)} className="w-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 py-3 rounded-xl font-medium transition-all">Não, Apenas Salvar Histórico</button><button onClick={() => setShowUpdateConfirm(false)} className="text-xs text-slate-400 hover:text-slate-600 mt-2">Cancelar</button></div>
                    </div>
                </div>
            )}
            {showAddProdItemModal && (<div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999]"><div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-100"><div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg text-slate-800">Adicionar Insumo Extra</h3><button onClick={() => setShowAddProdItemModal(false)}><X size={20} className="text-slate-400 hover:text-slate-600"/></button></div><div className="mb-4"><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Selecione o Insumo</label><StyledSelect value={selectedExtraIngredientId} onChange={e => setSelectedExtraIngredientId(e.target.value)}><option value="">Selecione...</option>{ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name}</option>)}</StyledSelect></div><button onClick={addExtraProdItem} disabled={!selectedExtraIngredientId} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-bold disabled:opacity-50 transition-all">Adicionar à Produção</button></div></div>)}
            {view === 'production-wizard' && (<div className="absolute inset-0 bg-slate-50 z-50 flex flex-col"><div className="bg-white border-b border-slate-200 p-6 flex justify-between items-center shadow-sm"><h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">{viewingProduction ? <Eye className="text-blue-500"/> : <ClipboardCheck className="text-emerald-500"/>} {viewingProduction ? 'Detalhes da Produção' : 'Nova Produção'}</h3><div className="flex gap-2">{!viewingProduction && prodWizardStep > 1 && <button onClick={() => setProdWizardStep(prodWizardStep-1)} className="text-slate-500 hover:bg-slate-100 px-4 py-2 rounded-lg">Voltar</button>}<button onClick={() => { setView('production'); setViewingProduction(null); }} className="text-slate-500 hover:text-red-500 px-4 py-2 hover:bg-slate-100 rounded-lg">Cancelar</button></div></div><div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full">{prodWizardStep === 1 && !viewingProduction && (<div className="space-y-6"><h2 className="text-2xl font-bold text-slate-800 text-center mb-8">O que vamos produzir hoje?</h2><div className="max-w-xl mx-auto relative"><Search className="absolute left-4 top-3.5 text-slate-400" size={20}/><input className="w-full pl-12 pr-4 py-3 bg-white border border-slate-300 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none text-lg" placeholder="Buscar receita ou base..." autoFocus onChange={(e) => setProductionSearch(e.target.value)}/></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">{recipes.filter(r => r.name.toLowerCase().includes(productionSearch.toLowerCase()) && r.status === 'active').map(r => (<button key={r.id} onClick={() => initProductionFromRecipe(r.id!)} className="bg-white p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all text-left group"><div className="font-bold text-lg text-slate-800 group-hover:text-emerald-700">{r.name}</div><div className="text-sm text-slate-500">{r.category} • Rendimento: {r.portions} {r.type === 'sub_recipe' ? r.unit : 'un'}</div></button>))}</div></div>)}{(prodWizardStep === 2 || viewingProduction) && (<div className="space-y-8 animate-in slide-in-from-right-8 duration-300"><div className="grid grid-cols-3 gap-6"><Card className="p-5 border-l-4 border-l-emerald-500"><div className="text-xs font-bold text-slate-500 uppercase mb-1">Receita Base</div><div className="text-xl font-bold text-slate-800">{viewingProduction ? viewingProduction.recipe_name : currentProduction.recipe_name}</div></Card><Card className="p-5"><div className="text-xs font-bold text-slate-500 uppercase mb-1">Rendimento Planejado</div><div className="text-xl font-bold text-slate-800">{viewingProduction ? viewingProduction.planned_yield : currentProduction.planned_yield} un</div></Card><Card className="p-5"><div className="text-xs font-bold text-slate-500 uppercase mb-1">Custo Planejado</div><div className="text-xl font-bold text-slate-800">{formatCurrency(viewingProduction ? viewingProduction.planned_cost : currentProduction.planned_cost)}</div></Card></div><div className="grid grid-cols-1 lg:grid-cols-3 gap-8"><div className="lg:col-span-1 space-y-6"><Card className="p-6"><h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Timer className="text-emerald-500"/> Tempos Reais (min)</h3><div className="space-y-4"><div><label className="text-xs font-bold text-slate-500 uppercase">Prep (Mise en place)</label><StyledInput type="number" disabled={!!viewingProduction} value={viewingProduction ? 0 : currentProduction.actual_prep} onChange={e => !viewingProduction && setCurrentProduction({...currentProduction, actual_prep: Number(e.target.value)})} /></div><div><label className="text-xs font-bold text-slate-500 uppercase">Fogo/Cocção</label><StyledInput type="number" disabled={!!viewingProduction} value={viewingProduction ? 0 : currentProduction.actual_cook} onChange={e => !viewingProduction && setCurrentProduction({...currentProduction, actual_cook: Number(e.target.value)})} /></div><div><label className="text-xs font-bold text-slate-500 uppercase">Montagem/Finalização</label><StyledInput type="number" disabled={!!viewingProduction} value={viewingProduction ? 0 : currentProduction.actual_plating} onChange={e => !viewingProduction && setCurrentProduction({...currentProduction, actual_plating: Number(e.target.value)})} /></div><div className="pt-4 border-t border-slate-100 flex justify-between items-center"><span className="font-bold text-slate-700">Tempo Total</span> <span className="text-xl font-bold text-emerald-600">{viewingProduction ? viewingProduction.actual_time_minutes : ((Number(currentProduction.actual_prep) || 0) + (Number(currentProduction.actual_cook) || 0) + (Number(currentProduction.actual_plating) || 0))} min</span></div></div></Card><Card className="p-6 bg-emerald-50 border-emerald-100"><h3 className="font-bold text-emerald-800 mb-4 flex items-center gap-2"><Scale className="text-emerald-600"/> Rendimento Final</h3><div className="flex items-center gap-2"><input type="number" disabled={!!viewingProduction} className="w-full text-3xl font-bold bg-white border border-emerald-200 rounded-lg p-3 text-center text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500" placeholder="0" value={viewingProduction ? viewingProduction.actual_yield : currentProduction.actual_yield} onChange={e => !viewingProduction && setCurrentProduction({...currentProduction, actual_yield: Number(e.target.value)})} /><span className="text-sm font-bold text-emerald-600 uppercase">Unidades</span></div></Card></div><div className="lg:col-span-2 space-y-6"><Card className="p-6"><div className="flex justify-between items-center mb-4"><h3 className="font-bold text-slate-800 flex items-center gap-2"><List className="text-blue-500"/> Baixa de Insumos</h3>{!viewingProduction && <button onClick={() => setShowAddProdItemModal(true)} className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded text-slate-600 font-bold flex items-center gap-1 transition-colors"><Plus size={14}/> Add Extra</button>}</div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase"><tr><th className="p-3 text-left">Item</th><th className="p-3 text-center">Plan</th><th className="p-3 text-center w-32">Real Utilizado</th><th className="p-3 text-right">Custo</th></tr></thead><tbody className="divide-y divide-slate-100">{(viewingProduction ? viewingProduction.items : currentProduction.items || []).map((item, idx) => (<tr key={idx}><td className="p-3 font-medium text-slate-700">{item.item_name}</td><td className="p-3 text-center text-slate-500">{item.planned_qty} {item.unit}</td><td className="p-3"><div className="relative"><input type="number" disabled={!!viewingProduction} className={`w-full text-center border rounded py-1 px-2 font-bold outline-none focus:ring-2 ${item.actual_qty > item.planned_qty ? 'border-red-300 text-red-600 bg-red-50' : 'border-slate-200 text-slate-700'}`} value={item.actual_qty} onChange={e => { if(viewingProduction) return; const newItems = [...currentProduction.items!]; newItems[idx].actual_qty = Number(e.target.value); setCurrentProduction({...currentProduction, items: newItems}); }} /><span className="absolute right-2 top-1.5 text-xs text-slate-400 pointer-events-none">{item.unit}</span></div></td><td className="p-3 text-right font-mono text-slate-700">{formatCurrency(Number(item.actual_qty) * Number(item.unit_cost))}</td></tr>))}</tbody></table></div></Card>{!viewingProduction && (<Card className="p-6 border-l-4 border-l-purple-500"><div className="flex justify-between items-center mb-4"><h3 className="font-bold text-slate-800 flex items-center gap-2"><List className="text-purple-500"/> Sequência Operacional</h3><button onClick={addOpStep} className="text-xs bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-colors"><Plus size={14}/> Nova Ação</button></div><div className="space-y-3">{currentProduction.steps.length === 0 && (<div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50"><Clock size={24} className="mx-auto mb-2 opacity-20"/><p>Nenhuma etapa registrada.</p><p className="text-xs mt-1">Detalhe o tempo gasto em cada processo.</p></div>)}</div>{currentProduction.steps.length > 0 && (<div className="mt-4 pt-4 border-t border-slate-100 flex justify-end gap-4 text-xs font-bold text-slate-500"><span>Prep: {currentProduction.steps.filter(s => s.category === 'prep').reduce((acc, step) => acc + (Number(step.time_minutes) || 0), 0)}m</span><span>Fogo: {currentProduction.steps.filter(s => s.category === 'cook').reduce((acc, step) => acc + (Number(step.time_minutes) || 0), 0)}m</span><span>Montagem: {currentProduction.steps.filter(s => s.category === 'plating').reduce((acc, step) => acc + (Number(step.time_minutes) || 0), 0)}m</span></div>)}<div className="space-y-3 mt-4">{currentProduction.steps.map((step, idx) => (<div key={step.id} className="flex gap-3 items-center p-3 bg-slate-50 rounded-lg border border-slate-100 group hover:border-purple-200 transition-colors"><div className="w-32 shrink-0"><StyledSelect className="py-2 text-xs font-bold bg-white" value={step.category} onChange={(e) => updateOpStep(step.id, 'category', e.target.value)}><option value="prep">Mise en place</option><option value="cook">Cocção / Fogo</option><option value="plating">Montagem</option></StyledSelect></div><div className="flex-1"><input className="w-full bg-transparent border-b border-transparent focus:border-purple-300 outline-none text-sm text-slate-700 placeholder:text-slate-400 py-1" placeholder="Descreva a ação realizada..." value={step.description} onChange={(e) => updateOpStep(step.id, 'description', e.target.value)} autoFocus={!step.description} /></div><div className="w-20 relative shrink-0"><input type="number" className="w-full bg-white border border-slate-200 rounded-lg py-1.5 pl-2 pr-6 text-sm outline-none focus:ring-2 focus:ring-purple-500 text-center font-bold text-slate-700" placeholder="0" value={step.time_minutes || ''} onChange={(e) => updateOpStep(step.id, 'time_minutes', Number(e.target.value))} /><span className="absolute right-2 top-1.5 text-[10px] text-slate-400 pointer-events-none font-bold">min</span></div><button onClick={() => { const newSteps = currentProduction.steps.filter(s => s.id !== step.id); const newPrep = newSteps.filter(s => s.category === 'prep').reduce((acc, step) => acc + (Number(step.time_minutes) || 0), 0); const newCook = newSteps.filter(s => s.category === 'cook').reduce((acc, step) => acc + (Number(step.time_minutes) || 0), 0); const newPlate = newSteps.filter(s => s.category === 'plating').reduce((acc, step) => acc + (Number(step.time_minutes) || 0), 0); setCurrentProduction(prev => ({ ...prev, steps: newSteps, actual_prep: newPrep, actual_cook: newCook, actual_plating: newPlate, actual_time_minutes: newPrep + newCook + newPlate })); }} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button></div>))}</div></Card>)}<Card className="p-6"><h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><FileText className="text-slate-400"/> Observações / Ocorrências</h3><textarea className="w-full h-32 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none" placeholder="Descreva problemas na produção, quebras, ou detalhes do processo..." disabled={!!viewingProduction} value={viewingProduction ? viewingProduction.notes : currentProduction.notes} onChange={e => !viewingProduction && setCurrentProduction({...currentProduction, notes: e.target.value})} /></Card>{!viewingProduction && (<div className="flex justify-end pt-4"><button onClick={initiateProductionSave} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-600/20 flex items-center gap-2 transform active:scale-95 transition-all text-lg"><Save size={20}/> Finalizar Produção</button></div>)}</div></div></div></div>)}
            {showImportModal && ( <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100]"><div className={`bg-white p-8 rounded-2xl shadow-2xl w-full border border-slate-100 transform transition-all scale-100 ${isImportReviewStep ? 'max-w-4xl' : 'max-w-lg'}`}><div className="flex justify-between mb-6 items-center"><h3 className="font-bold text-xl text-slate-800 flex items-center gap-2"><Download className="text-blue-500"/> {isImportReviewStep ? 'Revisar Dados' : 'Importar Dados'}</h3><button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600"><X/></button></div>{!isImportReviewStep ? (<><div className="mb-4 text-sm text-slate-500 bg-blue-50 p-4 rounded-lg border border-blue-100">Cole seus dados do Excel/CSV abaixo. O sistema identificará automaticamente:<br/><span className="font-mono text-xs text-blue-700 mt-1 block">Nome | Preço | Embalagem | Rendimento</span><span className="text-xs text-slate-400 mt-1 block">Ex: Acafrao | R$ 30,00 | 1 kg | 100%</span></div><textarea className="w-full h-40 border border-slate-300 rounded-lg p-3 text-xs font-mono mb-6 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Cole seus dados aqui..." value={importText} onChange={e => setImportText(e.target.value)}></textarea><button onClick={handlePreviewImport} disabled={!importText.trim()} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold shadow-lg shadow-blue-600/20 transition-all flex justify-center items-center gap-2">Processar Texto</button></>) : (<><div className="max-h-[500px] overflow-y-auto mb-6 border rounded-lg"><table className="w-full text-sm text-left"><thead className="bg-slate-50 text-slate-500 font-semibold text-xs sticky top-0"><tr><th className="p-3">Nome</th><th className="p-3">Preço</th><th className="p-3">Emb.</th><th className="p-3">Rend.</th><th className="p-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{importPreviewData.map((item, idx) => (<tr key={idx} className={item.isValid ? 'bg-white' : 'bg-red-50'}><td className="p-3 font-medium">{item.name}</td><td className="p-3">{formatCurrency(item.price)}</td><td className="p-3">{item.package_qty} {item.unit}</td><td className="p-3">{item.yield_factor}%</td><td className="p-3">{item.isValid ? <span className="text-emerald-600 text-xs font-bold flex items-center gap-1"><CheckCircle size={14}/> Válido</span> : <span className="text-red-600 text-xs font-bold flex items-center gap-1"><AlertCircle size={14}/> {item.errorMsg}</span>}</td></tr>))}</tbody></table></div><div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg"><div className="text-sm text-slate-600"><span className="font-bold text-slate-800">{importPreviewData.filter(i => i.isValid).length}</span> itens válidos prontos para importar.</div><div className="flex gap-3"><button onClick={() => setIsImportReviewStep(false)} className="text-slate-600 px-4 py-2 hover:bg-slate-200 rounded-lg">Voltar</button><button onClick={executeImport} disabled={isProcessingImport || importPreviewData.filter(i => i.isValid).length === 0} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-bold shadow-lg flex items-center gap-2">{isProcessingImport && <Loader2 className="animate-spin" size={18}/>} Confirmar Importação</button></div></div></>)}</div></div> )}
            {deleteModal.open && (<div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[150]"><div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm text-center border border-slate-100 animate-in zoom-in-95 duration-200"><div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"><Trash2 className="text-red-600" size={32}/></div><h3 className="font-bold text-xl text-slate-900 mb-2">{deleteModal.title}</h3><p className="text-sm text-slate-500 mb-8 leading-relaxed">{deleteModal.message}</p><div className="flex flex-col gap-3"><button onClick={executeDelete} disabled={isDeleting} className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-red-600/20 transition-all flex justify-center items-center gap-2">{isDeleting ? <Loader2 className="animate-spin" size={20}/> : 'Sim, Excluir'}</button><button onClick={() => setDeleteModal(prev => ({ ...prev, open: false }))} disabled={isDeleting} className="w-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 py-3 rounded-xl font-medium transition-all">Cancelar</button></div></div></div>)}
            {showUnsavedModal && (<div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100]"><div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm text-center border border-slate-100"><div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"><AlertTriangle className="text-amber-500" size={32}/></div><h3 className="font-bold text-xl text-slate-800 mb-2">Alterações não salvas</h3><p className="text-sm text-slate-500 mb-8">Você tem alterações pendentes. Se sair agora, perderá o progresso não salvo.</p><div className="flex flex-col gap-3"><button onClick={saveRecipe} className="bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-600/20 transition-all">Salvar e Sair</button><button onClick={() => { setHasUnsavedChanges(false); setShowUnsavedModal(false); if(pendingView) { setView(pendingView); setPendingView(null); } else setView('recipes'); }} className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 py-3 rounded-xl font-medium transition-all">Descartar Alterações</button></div></div></div>)}
            </div>
        </main>
    </div>
  );
}

// --- APP WRAPPER FOR CONTEXT PROVIDER ---
export default function App() {
  return (
    <ToastProvider>
      <HubChefApp />
    </ToastProvider>
  );
}