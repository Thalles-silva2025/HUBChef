
export type UnitType = 'kg' | 'g' | 'L' | 'ml' | 'un';

export type UserRole = 'admin' | 'kitchen_manager';

export interface TeamMember {
  id: string;
  owner_user_id: string;
  member_user_id: string | null; // null if pending invite
  member_email: string;
  role: UserRole;
  created_at?: string;
}

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

export interface Category {
  id: string;
  user_id: string;
  name: string;
}

export interface FixedExpense {
  id: string;
  user_id: string;
  month: number;
  year: number;
  total_expenses: number;
  total_dishes_sold: number;
  cost_per_dish: number;
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
