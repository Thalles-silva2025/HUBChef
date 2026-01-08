
export type UnitType = 'kg' | 'g' | 'L' | 'ml' | 'un';

export interface Ingredient {
  id: string;
  user_id: string;
  name: string;
  unit: string;
  price: number;
  package_qty: number;
  yield_factor: number; // 0 to 1
  cost_per_unit: number;
  last_update?: string;
}

export type CategoryType = 'recipe' | 'expense';

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: CategoryType;
}

export interface FixedExpenseItem {
  id?: string;
  fixed_expense_id?: string;
  category_id: string;
  amount: number;
}

export interface FixedExpense {
  id: string;
  user_id: string;
  month: number;
  year: number;
  total_expenses: number;
  total_dishes_sold: number;
  cost_per_dish: number;
  // Virtual field for frontend
  items?: FixedExpenseItem[];
}

export type RecipeType = 'food' | 'drink' | 'sub_recipe';
export type RecipeStatus = 'active' | 'inactive';
export type PricingMethod = 'margin' | 'markup';

// Represents the join table row
export interface RecipeItemDB {
  id?: string;
  recipe_id?: string;
  user_id?: string;
  item_type: 'ingredient' | 'sub_recipe';
  ref_id: string;
  qty: number;
  unit: string;
  sort_order?: number;
}

export interface Recipe {
  id: string | null; // null for new
  user_id?: string;
  type: RecipeType;
  name: string;
  category: string;
  portions: number;
  unit: string; // for sub_recipe
  // Operational
  operational_prep: number;
  operational_cook: number;
  operational_plating: number;
  // Extras
  extra_packaging: number;
  extra_labor: number;
  extra_utilities: number;
  extra_fixed_cost: number;
  extra_other_direct: number;
  extra_ice_garnish: number;
  // Pricing
  taxes_pct: number;
  card_fee_pct: number;
  pricing_method: PricingMethod;
  pricing_target: number;
  final_price: number;
  instructions: string;
  version: number;
  status: RecipeStatus;
  last_update?: string;
  
  // Virtual field for frontend handling (fetched via join)
  items: RecipeItemDB[];
}

// --- PRODUCTION MODULE TYPES ---

export interface ProductionItem {
  id?: string;
  item_name: string;
  unit: string;
  unit_cost: number;
  planned_qty: number;
  actual_qty: number;
}

export interface ProductionRun {
  id: string;
  recipe_id: string;
  recipe_name: string;
  created_at: string;
  
  planned_yield: number;
  planned_time_minutes: number;
  planned_cost: number;

  actual_yield: number;
  actual_time_minutes: number;
  actual_cost: number;

  notes?: string;
  items?: ProductionItem[]; // Virtual for frontend
}
