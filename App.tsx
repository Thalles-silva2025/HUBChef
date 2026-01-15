import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { 
  Plus, Trash2, Save, FileText, DollarSign, 
  ChefHat, ArrowRight, Printer, History,
  Scale, Edit2, TrendingUp,
  Activity, X, Loader2, Cloud, Download, Wine, Layers, ChevronLeft, Settings, ToggleLeft, Target, Search, MoreHorizontal, Calendar, CheckSquare, Square, AlertCircle, CheckCircle, Info, ClipboardCheck, Play, Book, RefreshCw, Eye, ArrowUpRight, CheckCircle2,
  Hammer, Package
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, ReferenceLine, Cell
} from 'recharts';

import { supabase } from './services/supabaseClient';
import { Login } from './components/Login';
import type { FixedExpense, Ingredient, Recipe, RecipeItemDB, Category, ProductionRun, ProductionItem, DeliveryPlatform } from './types';

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
  const [recipeSearch, setRecipeSearch] = useState("");
  const [productionSearch, setProductionSearch] = useState("");

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
      const totalActualTime = (currentProduction.actual_prep || 0) + (currentProduction.actual_cook || 0) + (currentProduction.actual_plating || 0);
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

  // --- HANDLERS FOR NAVIGATION ---
  const handleBackFromEditor = () => {
    const targetView = currentRecipe?.type === 'drink' ? 'drinks' : currentRecipe?.type === 'sub_recipe' ? 'sub_recipes' : 'recipes';
    if(hasUnsavedChanges) {
        setPendingView(targetView);
        setShowUnsavedModal(true);
    } else {
        setView(targetView);
    }
  };

  const handleDiscardChanges = () => {
    setHasUnsavedChanges(false);
    setShowUnsavedModal(false);
    if(pendingView) {
        setView(pendingView);
        setPendingView(null);
    } else {
        const target = currentRecipe?.type === 'drink' ? 'drinks' : currentRecipe?.type === 'sub_recipe' ? 'sub_recipes' : 'recipes';
        setView(target);
    }
  };


  // --- MAIN RENDER ---
  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-slate-900"><Loader2 className="animate-spin text-emerald-500" size={48}/></div>;
  if (!session) return <Login />;
  if (view === 'print-preview' && currentRecipe) return <PrintPreviewComponent recipe={currentRecipe} ingredients={ingredients} recipes={recipes} onClose={() => setView('recipe-details')} />;

  const recipeCategories = categories.filter(c => c.type === 'recipe');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans text-slate-900">
        {/* SIDEBAR NAVIGATION */}
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
            {/* VIEW: DASHBOARD */}
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
                                        <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><TrendingUp size={20}/></div>
                                    </div>
                                    <div className="mt-4 flex items-center gap-2 text-xs font-medium text-blue-600 bg-blue-50 w-fit px-2 py-1 rounded">
                                        Meta: 30%
                                    </div>
                                </Card>
                                
                                <Card className="p-6 border-l-4 border-l-purple-500 bg-white shadow-md hover:shadow-lg transition-all">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Eficiência Produtiva</p>
                                            <h3 className="text-3xl font-bold text-slate-800">{efficiencyScore.toFixed(0)}%</h3>
                                        </div>
                                        <div className="bg-purple-100 p-2 rounded-lg text-purple-600"><Settings size={20}/></div>
                                    </div>
                                    <div className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-50 w-fit px-2 py-1 rounded">
                                        Baseado em {recentRuns.length} produções
                                    </div>
                                </Card>

                                <Card className="p-6 border-l-4 border-l-orange-500 bg-white shadow-md hover:shadow-lg transition-all">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Itens Ativos</p>
                                            <h3 className="text-3xl font-bold text-slate-800">{totalActiveItems}</h3>
                                        </div>
                                        <div className="bg-orange-100 p-2 rounded-lg text-orange-600"><FileText size={20}/></div>
                                    </div>
                                    <div className="mt-4 text-xs font-medium text-slate-400">Pratos e Drinks no Cardápio</div>
                                </Card>

                                {/* --- ROW 2: CHARTS --- */}
                                <Card className="md:col-span-2 p-6">
                                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><Target className="text-red-500"/> Matriz de Engenharia (Lucro vs Esforço)</h3>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis type="number" dataKey="x" name="Tempo (min)" unit="min" />
                                                <YAxis type="number" dataKey="y" name="Lucro (R$)" unit="R$" />
                                                <ReTooltip cursor={{ strokeDasharray: '3 3' }} />
                                                <Scatter name="Receitas" data={efficiencyData} fill="#8884d8">
                                                    {efficiencyData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.y > avgProfit ? '#10b981' : '#ef4444'} />
                                                    ))}
                                                </Scatter>
                                                <ReferenceLine x={30} stroke="red" strokeDasharray="3 3" />
                                                <ReferenceLine y={avgProfit} stroke="green" strokeDasharray="3 3" />
                                            </ScatterChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <p className="text-xs text-slate-400 text-center mt-2">Cada ponto é um prato. Verde: Lucro acima da média. Vermelho: Lucro abaixo.</p>
                                </Card>

                                <Card className="md:col-span-2 p-6">
                                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><ArrowUpRight className="text-blue-500"/> Top 10 Insumos (Curva ABC)</h3>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={abcData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis type="number" />
                                                <YAxis dataKey="name" type="category" width={100} style={{fontSize: '10px'}} />
                                                <ReTooltip formatter={(value) => formatCurrency(value as number)} />
                                                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>
                             </div>
                         );
                     })()}
                     <div className="p-12 text-center text-slate-400 bg-slate-100 rounded-xl border border-dashed border-slate-300 hidden">
                        <Activity className="mx-auto mb-4 opacity-50" size={48}/>
                        <p>Os gráficos do dashboard serão carregados aqui.</p>
                     </div>
                </div>
            )}
            
            {/* VIEW: INGREDIENTS */}
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
                            <div className="bg-white p-4 border-b border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm z-10">
                                <div className="relative flex-1 w-full"><Search className="absolute left-3 top-2.5 text-slate-400" size={18}/><input placeholder="Buscar por nome do insumo..." className="pl-10 pr-4 py-2 w-full bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-400" value={ingredientSearch} onChange={e => setIngredientSearch(e.target.value)} /></div>
                            </div>
                            {selectedIds.size > 0 && (<div className="bg-red-50 p-3 flex justify-between items-center border-b border-red-100 animate-in slide-in-from-top-2"><div className="text-red-700 font-bold text-sm flex items-center gap-2"><CheckSquare size={18}/> {selectedIds.size} itens selecionados</div><button onClick={() => confirmDelete('ingredients', Array.from(selectedIds), true)} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2"><Trash2 size={14}/> Excluir Selecionados</button></div>)}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-xs border-b border-slate-200"><tr><th className="p-4 w-10"><button onClick={() => toggleAll(ingredients.map(i => i.id))} className="text-slate-400 hover:text-slate-600">{selectedIds.size === ingredients.length && ingredients.length > 0 ? <CheckSquare size={20} className="text-emerald-500"/> : <Square size={20}/>}</button></th><th className="p-4 pl-0">Nome</th><th className="p-4">Compra</th><th className="p-4 text-center">Rendimento</th><th className="p-4 text-right">Custo Real</th><th className="p-4 text-center pr-6">Ações</th></tr></thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {ingredients.filter(i => i.name.toLowerCase().includes(ingredientSearch.toLowerCase())).map(ing => (
                                            <tr key={ing.id} className={`hover:bg-slate-50 transition-colors cursor-pointer group ${selectedIds.has(ing.id) ? 'bg-blue-50/50' : ''}`} onClick={() => { setIngForm({...ing, yield_factor: ing.yield_factor * 100}); window.scrollTo({top:0, behavior:'smooth'}); }}>
                                                <td className="p-4 w-10" onClick={(e) => { e.stopPropagation(); toggleSelection(ing.id); }}>{selectedIds.has(ing.id) ? <CheckSquare size={20} className="text-emerald-500"/> : <Square size={20} className="text-slate-300 group-hover:text-slate-400"/>}</td><td className="p-4 pl-0 font-medium text-slate-800">{ing.name}</td><td className="p-4 text-slate-500">{formatCurrency(ing.price)} <span className="text-xs">/ {ing.package_qty}{ing.unit}</span></td><td className="p-4 text-center"><Badge color={ing.yield_factor < 1 ? "orange" : "blue"}>{Math.round(ing.yield_factor * 100)}%</Badge></td><td className="p-4 text-right font-bold text-slate-700">{formatCurrency(ing.cost_per_unit)}</td><td className="p-4 text-center pr-6"><button onClick={(e) => { e.stopPropagation(); confirmDelete('ingredients', [ing.id]); }} className="text-slate-300 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50 z-10 relative"><Trash2 size={16}/></button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                </div>
            )}
            
            {/* VIEW: RECIPES LIST */}
            {['recipes', 'drinks', 'sub_recipes'].includes(view) && (
                <div className="p-6 md:p-10 w-full max-w-7xl mx-auto">
                    <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                        <div><h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3 tracking-tight">{view === 'drinks' ? <Wine className="text-purple-600" size={32}/> : view === 'sub_recipes' ? <Layers className="text-orange-600" size={32}/> : <FileText className="text-emerald-600" size={32}/>} {view === 'drinks' ? 'Bebidas & Drinks' : view === 'sub_recipes' ? 'Bases & Sub-receitas' : 'Fichas Técnicas'}</h1><p className="text-slate-500 mt-1 ml-11">Gerencie seu cardápio e composições.</p></div>
                        <div className="flex gap-2 items-center">
                            {selectedIds.size > 0 && (<button onClick={() => confirmDelete('recipes', Array.from(selectedIds), true)} className="bg-red-600 text-white px-4 py-2.5 rounded-lg font-bold shadow-lg flex items-center gap-2 animate-in fade-in"><Trash2 size={18}/> Excluir ({selectedIds.size})</button>)}
                            <button onClick={() => startNewRecipe(view === 'drinks' ? 'drink' : view === 'sub_recipes' ? 'sub_recipe' : 'food')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-bold shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all transform active:scale-95"><Plus size={20} /> Criar Nova</button>
                        </div>
                    </header>
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
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {recipes
                            .filter(r => (view === 'sub_recipes' ? r.type === 'sub_recipe' : view === 'drinks' ? r.type === 'drink' : r.type === 'food'))
                            .filter(r => r.name.toLowerCase().includes(recipeSearch.toLowerCase()))
                            .map(r => ({...r, costs: getRecipeCosts(r)}))
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

            {/* VIEW: RECIPE DETAILS (PREVIEW) */}
            {view === 'recipe-details' && currentRecipe && (
                <div className="absolute inset-0 z-50 bg-slate-50 flex flex-col h-full w-full overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm shrink-0">
                        <div className="flex items-center gap-6">
                            <button onClick={() => setView(currentRecipe.type === 'drink' ? 'drinks' : currentRecipe.type === 'sub_recipe' ? 'sub_recipes' : 'recipes')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ChevronLeft size={24}/></button>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{currentRecipe.name}</h1>
                                <p className="text-sm text-slate-500 font-medium mt-0.5">{currentRecipe.category} • v{currentRecipe.version}</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                             <button onClick={() => setView('print-preview')} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all"><Printer size={18}/> Imprimir</button>
                             <button onClick={() => setView('recipe-editor')} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all"><Edit2 size={18}/> Editar Ficha</button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 max-w-6xl mx-auto w-full">
                        {(() => {
                            const costs = getRecipeCosts(currentRecipe);
                            return (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
                                    <div className="lg:col-span-2 space-y-8">
                                        <Card className="p-8">
                                            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Package className="text-orange-500"/> Composição</h3>
                                                <span className="text-xs font-bold text-slate-500 uppercase bg-slate-100 px-3 py-1 rounded-full">Rendimento: {currentRecipe.portions} {currentRecipe.type === 'sub_recipe' ? currentRecipe.unit : 'porções'}</span>
                                            </div>
                                            <div className="space-y-4">
                                                {currentRecipe.items.map((item, idx) => {
                                                    const name = item.item_type === 'ingredient' ? ingredients.find(i => i.id === item.ref_id)?.name : recipes.find(r => r.id === item.ref_id)?.name;
                                                    return (
                                                        <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 px-2 rounded transition-colors">
                                                            <div className="font-medium text-slate-700">{name || 'Item desconhecido'}</div>
                                                            <div className="font-mono font-bold text-slate-500">{item.qty} <span className="text-xs text-slate-400">{item.unit}</span></div>
                                                        </div>
                                                    );
                                                })}
                                                {currentRecipe.items.length === 0 && <div className="text-center text-slate-400 py-8 italic">Nenhum ingrediente cadastrado.</div>}
                                            </div>
                                        </Card>

                                        <Card className="p-8">
                                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6 pb-4 border-b border-slate-100"><Book className="text-blue-500"/> Modo de Preparo</h3>
                                            <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed whitespace-pre-wrap">
                                                {currentRecipe.instructions || "Sem instruções de preparo definidas."}
                                            </div>
                                        </Card>
                                    </div>

                                    <div className="space-y-6">
                                        <Card className="p-6 bg-slate-900 text-white border-slate-700 shadow-xl">
                                            <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-emerald-400"><DollarSign/> Análise Financeira</h3>
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-end">
                                                    <span className="text-slate-400 text-sm">Custo Total (CMV)</span>
                                                    <span className="text-xl font-bold">{formatCurrency(costs.costPerPortion)}</span>
                                                </div>
                                                <div className="flex justify-between items-end">
                                                    <span className="text-slate-400 text-sm">Preço de Venda</span>
                                                    <span className="text-xl font-bold text-emerald-400">{formatCurrency(currentRecipe.final_price)}</span>
                                                </div>
                                                <div className="w-full h-px bg-slate-700 my-2"></div>
                                                <div className="flex justify-between items-end">
                                                    <span className="text-slate-400 text-sm">Lucro Líquido</span>
                                                    <span className={`text-2xl font-bold ${costs.profit > 0 ? 'text-emerald-500' : 'text-red-500'}`}>{formatCurrency(costs.profit)}</span>
                                                </div>
                                                <div className="flex justify-between items-end">
                                                    <span className="text-slate-400 text-sm">Margem Real</span>
                                                    <span className={`text-sm font-bold px-2 py-1 rounded ${costs.margin > 20 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{costs.margin.toFixed(1)}%</span>
                                                </div>
                                            </div>
                                        </Card>

                                        <Card className="p-6">
                                            <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wide">Custos Operacionais</h3>
                                            <div className="space-y-3 text-sm">
                                                <div className="flex justify-between text-slate-600"><span>Mão de Obra</span><span className="font-medium">{formatCurrency(currentRecipe.extra_labor)}</span></div>
                                                <div className="flex justify-between text-slate-600"><span>Embalagens</span><span className="font-medium">{formatCurrency(currentRecipe.extra_packaging)}</span></div>
                                                <div className="flex justify-between text-slate-600"><span>Gás/Energia</span><span className="font-medium">{formatCurrency(currentRecipe.extra_utilities)}</span></div>
                                                <div className="flex justify-between text-slate-600"><span>Impostos ({currentRecipe.taxes_pct}%)</span><span className="font-medium text-red-500">-{formatCurrency(costs.tax)}</span></div>
                                            </div>
                                        </Card>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* VIEW: RECIPE EDITOR */}
            {view === 'recipe-editor' && currentRecipe && (
                 <div className="absolute inset-0 z-50 bg-slate-50 flex flex-col h-full w-full overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm shrink-0">
                        <div className="flex items-center gap-6">
                            <button onClick={handleBackFromEditor} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ChevronLeft size={24}/></button>
                            <div><h1 className="text-2xl font-bold text-slate-900 tracking-tight">{currentRecipe.name || 'Nova Receita'}</h1><p className="text-sm text-slate-500 font-medium mt-0.5">{currentRecipe.category || 'Sem categoria'} • {currentRecipe.type === 'sub_recipe' ? 'Sub-receita' : 'Produto Final'}</p></div>
                        </div>
                        <div className="flex gap-3">
                             <button onClick={handleBackFromEditor} className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">Cancelar</button>
                             <button onClick={saveRecipe} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all transform active:scale-95"><Save size={18}/> Salvar Ficha</button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full" ref={editorScrollRef}>
                        <div className="space-y-8 pb-20">
                            <Card className="p-6">
                                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><FileText size={20} className="text-blue-500"/> Dados Básicos</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <InputGroup label="Nome da Receita"><StyledInput value={currentRecipe.name} onChange={e => { setCurrentRecipe({...currentRecipe, name: e.target.value}); setHasUnsavedChanges(true); }} placeholder="Ex: Risoto de Funghi" autoFocus/></InputGroup>
                                    <InputGroup label="Categoria">
                                        <div className="flex gap-2">
                                            <StyledSelect value={currentRecipe.category} onChange={e => { setCurrentRecipe({...currentRecipe, category: e.target.value}); setHasUnsavedChanges(true); }}>{recipeCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</StyledSelect>
                                            <button onClick={() => { setQuickCatName(""); setCatTab('recipe'); setView('categories'); }} className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600"><Settings size={18}/></button>
                                        </div>
                                    </InputGroup>
                                    <InputGroup label="Rendimento (Porções)"><StyledInput type="number" value={currentRecipe.portions} onChange={e => { setCurrentRecipe({...currentRecipe, portions: Number(e.target.value)}); setHasUnsavedChanges(true); }}/></InputGroup>
                                    {currentRecipe.type === 'sub_recipe' && <InputGroup label="Unidade de Medida"><StyledSelect value={currentRecipe.unit} onChange={e => { setCurrentRecipe({...currentRecipe, unit: e.target.value}); setHasUnsavedChanges(true); }}>{UNITS.map(u => <option key={u} value={u}>{u}</option>)}</StyledSelect></InputGroup>}
                                    <InputGroup label="Status"><div className="flex gap-2"><button onClick={() => { setCurrentRecipe({...currentRecipe, status: 'active'}); setHasUnsavedChanges(true); }} className={`flex-1 py-2.5 rounded-lg text-sm font-bold border transition-all ${currentRecipe.status === 'active' ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-400'}`}>Ativo</button><button onClick={() => { setCurrentRecipe({...currentRecipe, status: 'inactive'}); setHasUnsavedChanges(true); }} className={`flex-1 py-2.5 rounded-lg text-sm font-bold border transition-all ${currentRecipe.status === 'inactive' ? 'bg-slate-100 border-slate-300 text-slate-600' : 'bg-white border-slate-200 text-slate-400'}`}>Inativo</button></div></InputGroup>
                                </div>
                            </Card>

                            <Card className="p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Package size={20} className="text-orange-500"/> Composição (Ingredientes)</h3>
                                    <div className="flex gap-2">
                                        <button onClick={() => {
                                            if (ingredients.length === 0) { showToast('error', 'Cadastre insumos primeiro.'); return; }
                                            const newItem: RecipeItemDB = { item_type: 'ingredient', ref_id: ingredients[0].id, qty: 1, unit: ingredients[0].unit, sort_order: currentRecipe.items.length };
                                            setCurrentRecipe({...currentRecipe, items: [...currentRecipe.items, newItem]}); setHasUnsavedChanges(true); scrollToBottom();
                                        }} className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg font-bold text-slate-700 flex items-center gap-1"><Plus size={14}/> Add Insumo</button>
                                        <button onClick={() => {
                                            const subs = recipes.filter(r => r.type === 'sub_recipe' && r.id !== currentRecipe.id);
                                            if (subs.length === 0) { showToast('error', 'Sem bases disponíveis.'); return; }
                                            const newItem: RecipeItemDB = { item_type: 'sub_recipe', ref_id: subs[0].id!, qty: 1, unit: subs[0].unit, sort_order: currentRecipe.items.length };
                                            setCurrentRecipe({...currentRecipe, items: [...currentRecipe.items, newItem]}); setHasUnsavedChanges(true); scrollToBottom();
                                        }} className="text-xs bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg font-bold text-orange-700 flex items-center gap-1"><Layers size={14}/> Add Base</button>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {currentRecipe.items.map((item, idx) => (
                                        <div key={idx} className="flex gap-3 items-end bg-slate-50 p-3 rounded-lg border border-slate-100 group hover:border-blue-200 transition-colors">
                                            <div className="flex-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">{item.item_type === 'ingredient' ? 'Insumo' : 'Base'}</label>
                                                <StyledSelect 
                                                    value={item.ref_id} 
                                                    onChange={e => {
                                                        const newItems = [...currentRecipe.items];
                                                        newItems[idx].ref_id = e.target.value;
                                                        if (item.item_type === 'ingredient') {
                                                            const ing = ingredients.find(i => i.id === e.target.value);
                                                            if(ing) newItems[idx].unit = ing.unit;
                                                        } else {
                                                            const sub = recipes.find(r => r.id === e.target.value);
                                                            if(sub) newItems[idx].unit = sub.unit;
                                                        }
                                                        setCurrentRecipe({...currentRecipe, items: newItems}); setHasUnsavedChanges(true);
                                                    }}
                                                    className="bg-white py-1.5 text-sm"
                                                >
                                                    {item.item_type === 'ingredient' 
                                                        ? ingredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)
                                                        : recipes.filter(r => r.type === 'sub_recipe' && r.id !== currentRecipe.id).map(r => <option key={r.id} value={r.id!}>{r.name}</option>)
                                                    }
                                                </StyledSelect>
                                            </div>
                                            <div className="w-24">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Qtd</label>
                                                <StyledInput type="number" className="bg-white py-1.5 text-sm" value={item.qty} onChange={e => { const newItems = [...currentRecipe.items]; newItems[idx].qty = Number(e.target.value); setCurrentRecipe({...currentRecipe, items: newItems}); setHasUnsavedChanges(true); }}/>
                                            </div>
                                            <div className="w-20">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Un</label>
                                                <div className="py-2 px-3 bg-slate-200 text-slate-600 rounded-lg text-sm text-center font-medium">{item.unit}</div>
                                            </div>
                                            <button onClick={() => { setCurrentRecipe({...currentRecipe, items: currentRecipe.items.filter((_, i) => i !== idx)}); setHasUnsavedChanges(true); }} className="p-2 mb-0.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18}/></button>
                                        </div>
                                    ))}
                                    {currentRecipe.items.length === 0 && <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">Nenhum ingrediente adicionado.</div>}
                                </div>
                            </Card>
                            
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <Card className="p-6">
                                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Hammer size={20} className="text-purple-500"/> Custos Operacionais (Estimados)</h3>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-3 gap-4 pb-4 border-b border-slate-100">
                                            <div className="col-span-3 text-xs font-bold text-slate-500 uppercase">Tempo de Preparo (Minutos)</div>
                                            <InputGroup label="Mise en Place"><StyledInput type="number" placeholder="0" value={currentRecipe.operational_prep} onChange={e => { setCurrentRecipe({...currentRecipe, operational_prep: Number(e.target.value)}); setHasUnsavedChanges(true); }}/></InputGroup>
                                            <InputGroup label="Cocção"><StyledInput type="number" placeholder="0" value={currentRecipe.operational_cook} onChange={e => { setCurrentRecipe({...currentRecipe, operational_cook: Number(e.target.value)}); setHasUnsavedChanges(true); }}/></InputGroup>
                                            <InputGroup label="Montagem"><StyledInput type="number" placeholder="0" value={currentRecipe.operational_plating} onChange={e => { setCurrentRecipe({...currentRecipe, operational_plating: Number(e.target.value)}); setHasUnsavedChanges(true); }}/></InputGroup>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="text-xs font-bold text-slate-500 uppercase mt-2">Custos Extras (R$ / Total da Receita)</div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <InputGroup label="Embalagens"><StyledInput type="number" placeholder="0.00" value={currentRecipe.extra_packaging} onChange={e => { setCurrentRecipe({...currentRecipe, extra_packaging: Number(e.target.value)}); setHasUnsavedChanges(true); }}/></InputGroup>
                                                <InputGroup label="Mão de Obra Extra"><StyledInput type="number" placeholder="0.00" value={currentRecipe.extra_labor} onChange={e => { setCurrentRecipe({...currentRecipe, extra_labor: Number(e.target.value)}); setHasUnsavedChanges(true); }}/></InputGroup>
                                                <InputGroup label="Gás/Energia"><StyledInput type="number" placeholder="0.00" value={currentRecipe.extra_utilities} onChange={e => { setCurrentRecipe({...currentRecipe, extra_utilities: Number(e.target.value)}); setHasUnsavedChanges(true); }}/></InputGroup>
                                                <InputGroup label="Gelo/Guarnições"><StyledInput type="number" placeholder="0.00" value={currentRecipe.extra_ice_garnish} onChange={e => { setCurrentRecipe({...currentRecipe, extra_ice_garnish: Number(e.target.value)}); setHasUnsavedChanges(true); }}/></InputGroup>
                                            </div>
                                        </div>
                                    </div>
                                </Card>

                                <Card className="p-6 bg-slate-900 text-white border-slate-700">
                                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-emerald-400"><DollarSign size={20}/> Precificação</h3>
                                    <div className="space-y-4">
                                         <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Impostos (%)</label><input className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-emerald-500" type="number" value={currentRecipe.taxes_pct} onChange={e => { setCurrentRecipe({...currentRecipe, taxes_pct: Number(e.target.value)}); setHasUnsavedChanges(true); }}/></div>
                                            <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Taxa Cartão (%)</label><input className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-emerald-500" type="number" value={currentRecipe.card_fee_pct} onChange={e => { setCurrentRecipe({...currentRecipe, card_fee_pct: Number(e.target.value)}); setHasUnsavedChanges(true); }}/></div>
                                         </div>
                                         <div className="pt-4 border-t border-slate-700">
                                             <div className="space-y-1 mb-4">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase">Plataforma de Delivery (Simulação)</label>
                                                <select className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-emerald-500" value={currentRecipe.delivery_platform_id || ''} onChange={e => { setCurrentRecipe({...currentRecipe, delivery_platform_id: e.target.value || null}); setHasUnsavedChanges(true); }}>
                                                    <option value="">Venda Balcão (Nenhuma)</option>
                                                    {deliveryPlatforms.map(p => <option key={p.id} value={p.id}>{p.name} ({p.percentage}%)</option>)}
                                                </select>
                                             </div>
                                             <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase">Preço Final de Venda (R$)</label>
                                                <div className="relative">
                                                    <DollarSign className="absolute left-3 top-2.5 text-emerald-500" size={18}/>
                                                    <input className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-xl font-bold text-emerald-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" type="number" value={currentRecipe.final_price} onChange={e => { setCurrentRecipe({...currentRecipe, final_price: Number(e.target.value)}); setHasUnsavedChanges(true); }}/>
                                                </div>
                                             </div>
                                         </div>
                                    </div>
                                </Card>
                            </div>

                            <Card className="p-6">
                                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Book size={20} className="text-slate-500"/> Modo de Preparo</h3>
                                <textarea className="w-full h-64 p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 resize-y text-slate-700 leading-relaxed" placeholder="Descreva o passo a passo da receita..." value={currentRecipe.instructions} onChange={e => { setCurrentRecipe({...currentRecipe, instructions: e.target.value}); setHasUnsavedChanges(true); }}></textarea>
                            </Card>
                        </div>
                    </div>
                 </div>
            )}
            
            {/* VIEW: PRODUCTION */}
            {view === 'production' && (
                <div className="p-6 md:p-10 w-full max-w-7xl mx-auto">
                    <div className="flex justify-between items-center mb-8">
                        <div><h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3"><ClipboardCheck className="text-blue-600" size={32}/> Produção</h1><p className="text-slate-500 mt-1 ml-11">Controle de produção e histórico de rendimento.</p></div>
                        <button onClick={startProduction} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all"><Play size={20} fill="currentColor"/> Iniciar Produção</button>
                    </div>

                    <div className="bg-white p-4 mb-8 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-4 items-center">
                        <div className="relative flex-1 w-full"><Search className="absolute left-3 top-2.5 text-slate-400" size={18}/><input placeholder="Buscar histórico..." className="pl-10 pr-4 py-2 w-full bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={productionSearch} onChange={e => setProductionSearch(e.target.value)} /></div>
                    </div>
                    
                    <Card className="overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-xs border-b border-slate-200"><tr><th className="p-4 pl-6">Data</th><th className="p-4">Receita / Item</th><th className="p-4 text-center">Rendimento</th><th className="p-4 text-center">Eficiência</th><th className="p-4 text-right pr-6">Ações</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">
                                {productionRuns.filter(p => p.recipe_name.toLowerCase().includes(productionSearch.toLowerCase())).map(run => {
                                    const yieldDiff = run.actual_yield - run.planned_yield;
                                    const isEfficient = yieldDiff >= 0;
                                    return (
                                        <tr key={run.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4 pl-6 font-medium text-slate-700">{formatDate(run.created_at)}</td>
                                            <td className="p-4 font-bold text-slate-800">{run.recipe_name}</td>
                                            <td className="p-4 text-center"><span className="font-mono font-bold text-slate-700">{run.actual_yield} un</span> <span className="text-xs text-slate-400">/ {run.planned_yield} plan</span></td>
                                            <td className="p-4 text-center"><span className={`text-xs font-bold px-2 py-1 rounded ${isEfficient ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{isEfficient ? 'Eficiente' : 'Quebra'} ({yieldDiff > 0 ? '+' : ''}{yieldDiff})</span></td>
                                            <td className="p-4 text-right pr-6 flex justify-end gap-2">
                                                <button onClick={() => { setViewingProduction(run); setView('production-wizard'); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Eye size={18}/></button>
                                                <button onClick={() => confirmDelete('production', [run.id])} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18}/></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {productionRuns.length === 0 && <tr><td colSpan={5} className="p-12 text-center text-slate-400">Nenhum produção registrada.</td></tr>}
                            </tbody>
                        </table>
                    </Card>
                </div>
            )}
            
            {/* VIEW: PRODUCTION WIZARD */}
            {view === 'production-wizard' && (
                <div className="absolute inset-0 bg-slate-50 z-50 flex flex-col">
                    <div className="bg-white border-b border-slate-200 p-6 flex justify-between items-center shadow-sm">
                        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">{viewingProduction ? <Eye className="text-blue-500"/> : <ClipboardCheck className="text-emerald-500"/>} {viewingProduction ? 'Detalhes da Produção' : 'Nova Produção'}</h3>
                        <div className="flex gap-2">
                            {!viewingProduction && prodWizardStep > 1 && <button onClick={() => setProdWizardStep(prodWizardStep-1)} className="text-slate-500 hover:bg-slate-100 px-4 py-2 rounded-lg">Voltar</button>}
                            <button onClick={() => { setView('production'); setViewingProduction(null); }} className="text-slate-500 hover:text-red-500 px-4 py-2 hover:bg-slate-100 rounded-lg">Cancelar</button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full">
                        {prodWizardStep === 1 && !viewingProduction && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-bold text-slate-800 text-center mb-8">O que vamos produzir hoje?</h2>
                                <div className="max-w-xl mx-auto relative"><Search className="absolute left-4 top-3.5 text-slate-400" size={20}/><input className="w-full pl-12 pr-4 py-3 bg-white border border-slate-300 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none text-lg" placeholder="Buscar receita ou base..." autoFocus onChange={(e) => setProductionSearch(e.target.value)}/></div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                                    {recipes.filter(r => r.name.toLowerCase().includes(productionSearch.toLowerCase()) && r.status === 'active').map(r => (
                                        <button key={r.id} onClick={() => initProductionFromRecipe(r.id!)} className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:border-emerald-500 hover:shadow-md transition-all text-left group">
                                            <div className="bg-slate-100 p-3 rounded-lg group-hover:bg-emerald-100 text-slate-500 group-hover:text-emerald-600 transition-colors"><ChefHat size={24}/></div>
                                            <div><div className="font-bold text-slate-800 group-hover:text-emerald-700">{r.name}</div><div className="text-xs text-slate-500">{r.type === 'sub_recipe' ? 'Base / Sub-receita' : 'Produto Final'}</div></div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {(prodWizardStep === 2 || viewingProduction) && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 space-y-6">
                                    <Card className="p-6">
                                        <h3 className="font-bold text-slate-800 mb-6 border-b pb-2">Itens Utilizados (Baixa de Estoque)</h3>
                                        <div className="space-y-4">
                                            {(viewingProduction ? viewingProduction.items : currentProduction.items).map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                    <div><div className="font-bold text-slate-700 text-sm">{item.item_name}</div><div className="text-xs text-slate-400">Previsto: {item.planned_qty} {item.unit}</div></div>
                                                    <div className="w-32"><label className="text-[10px] font-bold text-slate-400 uppercase">Qtd Real</label>
                                                        {viewingProduction ? <div className="font-bold">{item.actual_qty}</div> : 
                                                            <StyledInput type="number" value={item.actual_qty} onChange={e => {
                                                                const newItems = [...currentProduction.items!];
                                                                newItems[idx].actual_qty = Number(e.target.value);
                                                                setCurrentProduction({...currentProduction, items: newItems});
                                                            }} className="py-1 text-sm bg-white"/>
                                                        }
                                                    </div>
                                                </div>
                                            ))}
                                            {!viewingProduction && <button onClick={() => setShowAddProdItemModal(true)} className="w-full py-2 border border-dashed border-slate-300 text-slate-500 rounded-lg hover:border-emerald-500 hover:text-emerald-600 transition-colors flex justify-center items-center gap-2"><Plus size={16}/> Adicionar Insumo Extra</button>}
                                        </div>
                                    </Card>
                                    <Card className="p-6">
                                        <h3 className="font-bold text-slate-800 mb-6 border-b pb-2">Tempos e Processos</h3>
                                        {!viewingProduction && (
                                            <div className="flex gap-2 mb-4">
                                                <button onClick={addOpStep} className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded font-bold text-slate-700">+ Add Passo</button>
                                            </div>
                                        )}
                                        {currentProduction.steps && currentProduction.steps.length > 0 ? (
                                            <div className="space-y-3">
                                                {currentProduction.steps.map((step, idx) => (
                                                    <div key={step.id} className="flex gap-2 items-center">
                                                        <span className="text-xs font-bold text-slate-400 w-6">#{idx+1}</span>
                                                        <input className="flex-1 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm" placeholder="Descrição da etapa..." value={step.description} onChange={e => updateOpStep(step.id, 'description', e.target.value)} disabled={!!viewingProduction} />
                                                        <select className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm w-28" value={step.category} onChange={e => updateOpStep(step.id, 'category', e.target.value)} disabled={!!viewingProduction}><option value="prep">Mise en Place</option><option value="cook">Cocção</option><option value="plating">Montagem</option></select>
                                                        <div className="relative w-24"><input type="number" className="w-full bg-slate-50 border border-slate-200 rounded pl-2 pr-8 py-1 text-sm" placeholder="0" value={step.time_minutes} onChange={e => updateOpStep(step.id, 'time_minutes', Number(e.target.value))} disabled={!!viewingProduction} /><span className="absolute right-2 top-1.5 text-xs text-slate-400">min</span></div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-3 gap-4">
                                                <InputGroup label="Mise en Place (min)"><StyledInput type="number" value={viewingProduction ? ((Number(viewingProduction.actual_time_minutes)/3).toFixed(0)) : currentProduction.actual_prep} onChange={e => setCurrentProduction({...currentProduction, actual_prep: Number(e.target.value)})} disabled={!!viewingProduction}/></InputGroup>
                                                <InputGroup label="Cocção (min)"><StyledInput type="number" value={viewingProduction ? ((Number(viewingProduction.actual_time_minutes)/3).toFixed(0)) : currentProduction.actual_cook} onChange={e => setCurrentProduction({...currentProduction, actual_cook: Number(e.target.value)})} disabled={!!viewingProduction}/></InputGroup>
                                                <InputGroup label="Montagem (min)"><StyledInput type="number" value={viewingProduction ? ((Number(viewingProduction.actual_time_minutes)/3).toFixed(0)) : currentProduction.actual_plating} onChange={e => setCurrentProduction({...currentProduction, actual_plating: Number(e.target.value)})} disabled={!!viewingProduction}/></InputGroup>
                                            </div>
                                        )}
                                    </Card>
                                </div>
                                <div className="space-y-6">
                                    <Card className="p-6 bg-slate-900 text-white border-slate-700 sticky top-6">
                                        <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-emerald-400"><Target/> Resultado Final</h3>
                                        <div className="space-y-4">
                                            <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Rendimento Obtido</label>
                                                <div className="flex gap-2 items-baseline">
                                                    {viewingProduction ? <span className="text-3xl font-bold">{viewingProduction.actual_yield}</span> : 
                                                    <input type="number" value={currentProduction.actual_yield} onChange={e => setCurrentProduction({...currentProduction, actual_yield: Number(e.target.value)})} className="bg-transparent text-3xl font-bold w-full outline-none border-b border-slate-600 focus:border-emerald-500 text-emerald-400" placeholder="0"/>}
                                                    <span className="text-sm text-slate-500">un/porções</span>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div><div className="text-slate-400">Custo Total</div><div className="font-bold text-white">{formatCurrency(viewingProduction ? viewingProduction.actual_cost : currentProduction.items!.reduce((acc, i) => acc + (i.actual_qty * i.unit_cost), 0))}</div></div>
                                                <div><div className="text-slate-400">Tempo Total</div><div className="font-bold text-white">{viewingProduction ? viewingProduction.actual_time_minutes : (Number(currentProduction.actual_prep||0)+Number(currentProduction.actual_cook||0)+Number(currentProduction.actual_plating||0))} min</div></div>
                                            </div>
                                            {!viewingProduction && <button onClick={initiateProductionSave} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-600/20 mt-4">Finalizar Produção</button>}
                                        </div>
                                    </Card>
                                    <Card className="p-6">
                                        <h3 className="font-bold text-slate-800 mb-4">Notas / Ocorrências</h3>
                                        <textarea className="w-full h-32 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm resize-none" placeholder="Houve alguma quebra? Algum imprevisto?" value={viewingProduction ? viewingProduction.notes : currentProduction.notes} onChange={e => setCurrentProduction({...currentProduction, notes: e.target.value})} disabled={!!viewingProduction}></textarea>
                                    </Card>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {/* VIEW: FIXED EXPENSES */}
            {view === 'fixed-expenses' && (
                <div className="p-6 md:p-10 w-full max-w-7xl mx-auto">
                    <div className="flex justify-between items-center mb-8">
                        <div><h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3"><TrendingUp className="text-red-600" size={32}/> Despesas Fixas</h1><p className="text-slate-500 mt-1 ml-11">Acompanhamento mensal de custos operacionais.</p></div>
                        <button onClick={() => handleEditExpense()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-bold shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all"><Plus size={20} /> Nova Despesa Mensal</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {expenses.length === 0 ? (
                            <div className="col-span-full text-center py-20 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200"><p className="text-slate-400 font-medium">Nenhum registro de despesa encontrado.</p></div>
                        ) : (
                            expenses.map(expense => (
                                <Card key={expense.id} className="p-6 hover:shadow-lg transition-all cursor-pointer group" onClick={() => handleEditExpense(expense)}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div><h3 className="text-xl font-bold text-slate-800">{formatMonth(expense.month)} / {expense.year}</h3><p className="text-xs text-slate-500 uppercase font-bold mt-1">Total de Pratos: {expense.total_dishes_sold}</p></div>
                                        <div className="p-2 bg-red-50 text-red-600 rounded-lg group-hover:bg-red-100 transition-colors"><TrendingUp size={20}/></div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-end border-b border-slate-100 pb-2"><span className="text-sm text-slate-600">Total Despesas</span><span className="font-bold text-lg text-slate-800">{formatCurrency(expense.total_expenses)}</span></div>
                                        <div className="flex justify-between items-end"><span className="text-sm text-slate-600 font-bold">Custo Fixo / Prato</span><span className="font-bold text-lg text-red-600 bg-red-50 px-2 rounded">{formatCurrency(expense.cost_per_dish)}</span></div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                                        <button onClick={(e) => { e.stopPropagation(); confirmDelete('expenses', [expense.id]); }} className="text-slate-400 hover:text-red-500 text-xs font-bold flex items-center gap-1 transition-colors"><Trash2 size={14}/> Excluir Registro</button>
                                    </div>
                                </Card>
                            ))
                        )}
                    </div>
                    {/* Fixed Expenses Drawer/Form */}
                    {activeExpenseId && (
                        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end">
                            <div className="w-full max-w-2xl bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
                                <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Edit2 size={20} className="text-emerald-500"/> {activeExpenseId === 'new' ? 'Nova Competência' : 'Editar Despesas'}</h3>
                                    <button onClick={() => setActiveExpenseId(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={24} className="text-slate-500"/></button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                                    <div className="grid grid-cols-3 gap-4">
                                        <InputGroup label="Mês"><StyledSelect value={expenseForm.month} onChange={e => setExpenseForm({...expenseForm, month: e.target.value})}>{Array.from({length:12},(_,i)=>i+1).map(m=><option key={m} value={m}>{formatMonth(m)}</option>)}</StyledSelect></InputGroup>
                                        <InputGroup label="Ano"><StyledInput type="number" value={expenseForm.year} onChange={e => setExpenseForm({...expenseForm, year: e.target.value})}/></InputGroup>
                                        <InputGroup label="Pratos Vendidos (Qtd)"><StyledInput type="number" value={expenseForm.dishes} onChange={e => setExpenseForm({...expenseForm, dishes: e.target.value})}/></InputGroup>
                                    </div>
                                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                        <div className="flex justify-between items-center mb-2"><h4 className="font-bold text-blue-900">Detalhamento de Contas</h4><div className="text-right"><span className="text-xs text-blue-600 font-bold uppercase block">Total Mensal</span><span className="text-2xl font-bold text-blue-800">{formatCurrency(expenseForm.items.reduce((acc, i) => acc + (Number(i.amount)||0), 0))}</span></div></div>
                                        <div className="space-y-3 mt-4">
                                            {expenseForm.items.map((item, idx) => (
                                                <div key={idx} className="flex gap-3 items-center">
                                                    <div className="flex-1 text-sm font-medium text-slate-700 bg-white px-3 py-2 rounded border border-blue-200/50">{categories.find(c => c.id === item.category_id)?.name}</div>
                                                    <div className="w-32"><StyledInput type="number" placeholder="0.00" value={item.amount} onChange={e => { const newItems = [...expenseForm.items]; newItems[idx].amount = e.target.value; setExpenseForm({...expenseForm, items: newItems}); }} className="text-right font-mono"/></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Adicionar Nova Categoria de Despesa</label>
                                        <div className="flex gap-2">
                                            <StyledInput placeholder="Nome da categoria..." value={quickCatName} onChange={e => setQuickCatName(e.target.value)}/>
                                            <button onClick={handleAddQuickCategory} className="bg-slate-800 text-white px-4 rounded-lg font-bold hover:bg-slate-700">Add</button>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                                    <button onClick={() => setActiveExpenseId(null)} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors">Cancelar</button>
                                    <button onClick={handleSaveExpense} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-600/20 flex items-center gap-2"><Save size={18}/> Salvar Competência</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            {/* VIEW: CATEGORIES */}
            {view === 'categories' && (
                <div className="p-6 md:p-10 w-full max-w-5xl mx-auto">
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3 mb-8"><Settings className="text-slate-600" size={32}/> Configurações</h1>
                    <div className="flex gap-6 border-b border-slate-200 mb-8">
                        <button onClick={() => setCatTab('recipe')} className={`pb-4 px-2 font-bold text-sm transition-colors relative ${catTab === 'recipe' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>Categorias de Receita {catTab === 'recipe' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-600"></div>}</button>
                        <button onClick={() => setCatTab('expense')} className={`pb-4 px-2 font-bold text-sm transition-colors relative ${catTab === 'expense' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>Categorias de Despesa {catTab === 'expense' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-600"></div>}</button>
                        <button onClick={() => setCatTab('platform')} className={`pb-4 px-2 font-bold text-sm transition-colors relative ${catTab === 'platform' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>Plataformas de Delivery {catTab === 'platform' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-600"></div>}</button>
                    </div>
                    
                    {catTab !== 'platform' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <Card className="p-6 h-fit">
                                <h3 className="font-bold text-slate-800 mb-4">Adicionar Nova</h3>
                                <div className="flex gap-2">
                                    <StyledInput placeholder="Nome da categoria..." value={newCatInput} onChange={e => setNewCatInput(e.target.value)} />
                                    <button onClick={async () => {
                                        if(!newCatInput.trim()) return;
                                        const { data, error } = await supabase.from('categories').insert({ user_id: session.user.id, name: newCatInput, type: catTab }).select().single();
                                        if(data) { setCategories([...categories, data].sort((a,b)=>a.name.localeCompare(b.name))); setNewCatInput(""); showToast('success', 'Categoria adicionada!'); }
                                    }} className="bg-emerald-600 text-white px-4 rounded-lg font-bold hover:bg-emerald-700">Add</button>
                                </div>
                            </Card>
                            <Card className="p-6">
                                <h3 className="font-bold text-slate-800 mb-4">Categorias Existentes</h3>
                                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                                    {categories.filter(c => c.type === catTab).map(cat => (
                                        <div key={cat.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                            <span className="font-medium text-slate-700">{cat.name}</span>
                                            <button onClick={() => confirmDelete('categories', [cat.id])} className="text-slate-400 hover:text-red-500 p-1"><Trash2 size={16}/></button>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <Card className="p-6 h-fit">
                                <h3 className="font-bold text-slate-800 mb-4">Nova Plataforma</h3>
                                <div className="space-y-4">
                                    <InputGroup label="Nome da Plataforma"><StyledInput placeholder="Ex: iFood, Rappi..." value={platformForm.name} onChange={e => setPlatformForm({...platformForm, name: e.target.value})}/></InputGroup>
                                    <InputGroup label="Taxa (%)"><StyledInput type="number" placeholder="Ex: 12, 23, 27..." value={platformForm.percentage} onChange={e => setPlatformForm({...platformForm, percentage: e.target.value})}/></InputGroup>
                                    <button onClick={handleSavePlatform} disabled={!platformForm.name} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-lg font-bold shadow-lg shadow-purple-600/20 transition-all">Salvar Plataforma</button>
                                </div>
                            </Card>
                            <Card className="p-6">
                                <h3 className="font-bold text-slate-800 mb-4">Plataformas Cadastradas</h3>
                                <div className="space-y-3">
                                    {deliveryPlatforms.map(plat => (
                                        <div key={plat.id} className="flex justify-between items-center p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                                            <div><div className="font-bold text-slate-800">{plat.name}</div><div className="text-xs text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded w-fit mt-1">Taxa: {plat.percentage}%</div></div>
                                            <button onClick={() => confirmDelete('delivery_platforms', [plat.id])} className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-full transition-colors"><Trash2 size={18}/></button>
                                        </div>
                                    ))}
                                    {deliveryPlatforms.length === 0 && <div className="text-center py-8 text-slate-400">Nenhuma plataforma cadastrada.</div>}
                                </div>
                            </Card>
                        </div>
                    )}
                </div>
            )}
            
            </div>
        </main>
        
        {/* --- MODALS --- */}
        
        {/* ADD PRODUCTION ITEM MODAL */}
        {showAddProdItemModal && (
            <div className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md animate-in zoom-in-95 duration-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Adicionar Item Extra</h3>
                    <div className="space-y-4">
                        <InputGroup label="Selecione o Insumo">
                            <StyledSelect value={selectedExtraIngredientId} onChange={e => setSelectedExtraIngredientId(e.target.value)}>
                                <option value="">Selecione...</option>
                                {ingredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                            </StyledSelect>
                        </InputGroup>
                        <div className="flex gap-3 justify-end mt-6">
                            <button onClick={() => setShowAddProdItemModal(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg">Cancelar</button>
                            <button onClick={addExtraProdItem} disabled={!selectedExtraIngredientId} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold disabled:opacity-50">Adicionar</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* UPDATE CONFIRM MODAL (PRODUCTION) */}
        {showUpdateConfirm && (
            <div className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md animate-in zoom-in-95 duration-200">
                    <div className="flex flex-col items-center text-center mb-6">
                        <div className="bg-blue-100 p-3 rounded-full mb-4 text-blue-600"><RefreshCw size={32}/></div>
                        <h3 className="text-xl font-bold text-slate-800">Atualizar Ficha Técnica?</h3>
                        <p className="text-slate-500 text-sm mt-2">Deseja atualizar os tempos operacionais e rendimento padrão da receita original com base nestes dados reais?</p>
                    </div>
                    <div className="space-y-3">
                        <button onClick={() => saveProductionRun(true)} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-600/20">Sim, Atualizar Ficha e Salvar</button>
                        <button onClick={() => saveProductionRun(false)} className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 py-3 rounded-xl font-bold">Não, Apenas Salvar Histórico</button>
                    </div>
                    <button onClick={() => setShowUpdateConfirm(false)} className="w-full mt-4 text-slate-400 text-xs hover:underline">Cancelar</button>
                </div>
            </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {deleteModal.open && (
            <div className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 duration-200 border-l-4 border-red-500">
                    <h3 className="text-lg font-bold text-slate-800 mb-2">{deleteModal.title}</h3>
                    <p className="text-slate-500 text-sm mb-6">{deleteModal.message}</p>
                    <div className="flex gap-3 justify-end">
                        <button onClick={() => setDeleteModal({...deleteModal, open: false})} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
                        <button onClick={executeDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">{isDeleting && <Loader2 className="animate-spin" size={16}/>} Confirmar Exclusão</button>
                    </div>
                </div>
            </div>
        )}

        {/* IMPORT MODAL */}
        {showImportModal && (
            <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col animate-in slide-in-from-bottom-4 duration-300">
                    <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Cloud className="text-blue-500"/> Importação em Massa</h3>
                        <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6">
                        {!isImportReviewStep ? (
                            <div className="h-full flex flex-col">
                                <p className="text-sm text-slate-500 mb-4">Cole seus dados abaixo. O sistema tentará identificar as colunas automaticamente. Formato sugerido: <strong>Nome | Preço | Qtd | Rendimento</strong></p>
                                <textarea className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-none resize-none leading-relaxed" placeholder={`Filé Mignon Limpo | 89.90 | 1kg | 100\nCebola Roxa | 5.49 | 1kg | 85\nLeite Condensado | 6.50 | 395g | 100`} value={importText} onChange={e => setImportText(e.target.value)}></textarea>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-bold text-slate-700">Revisão dos Dados ({importPreviewData.filter(i => i.isValid).length} válidos)</h4>
                                    <button onClick={() => setIsImportReviewStep(false)} className="text-xs text-blue-600 hover:underline">Editar Texto</button>
                                </div>
                                <div className="border rounded-lg overflow-hidden">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-100 text-slate-500 font-bold uppercase"><tr><th className="p-3">Nome</th><th className="p-3">Preço</th><th className="p-3">Emb.</th><th className="p-3">Rend.</th><th className="p-3">Status</th></tr></thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {importPreviewData.map((item, i) => (
                                                <tr key={i} className={item.isValid ? 'bg-white' : 'bg-red-50'}>
                                                    <td className="p-3 font-medium">{item.name || '-'}</td>
                                                    <td className="p-3">{formatCurrency(item.price)}</td>
                                                    <td className="p-3">{item.package_qty}{item.unit}</td>
                                                    <td className="p-3">{item.yield_factor}%</td>
                                                    <td className="p-3 font-bold">{item.isValid ? <span className="text-emerald-600">OK</span> : <span className="text-red-500">{item.errorMsg}</span>}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                        {!isImportReviewStep ? (
                            <button onClick={handlePreviewImport} disabled={!importText.trim()} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold disabled:opacity-50">Processar Texto</button>
                        ) : (
                            <button onClick={executeImport} disabled={isProcessingImport || !importPreviewData.some(i => i.isValid)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2">{isProcessingImport && <Loader2 className="animate-spin" size={16}/>} Confirmar Importação</button>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* UNSAVED CHANGES MODAL */}
        {showUnsavedModal && (
            <div className="fixed inset-0 z-[70] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 duration-200">
                     <h3 className="text-lg font-bold text-slate-800 mb-2">Descartar Alterações?</h3>
                     <p className="text-slate-500 text-sm mb-6">Você tem edições não salvas. Se sair agora, perderá o progresso.</p>
                     <div className="flex flex-col gap-2">
                         <button onClick={() => setShowUnsavedModal(false)} className="w-full bg-emerald-600 text-white py-2.5 rounded-lg font-bold hover:bg-emerald-700">Continuar Editando</button>
                         <button onClick={handleDiscardChanges} className="w-full bg-white border border-slate-200 text-slate-600 py-2.5 rounded-lg font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-200">Descartar e Sair</button>
                     </div>
                </div>
            </div>
        )}

    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <HubChefApp />
    </ToastProvider>
  );
}