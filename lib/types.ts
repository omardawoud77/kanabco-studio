export type Category = {
  id: string;
  name: string;
  sort_order: number;
  is_default: boolean;
};

export type CustomProduct = {
  id: string;
  team_id: string;
  category_id: string;
  name: string;
  description: string;
  shape: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Fabric = {
  id: string;
  name: string;
  tex: string;
};

export type Color = {
  id: string;
  name: string;
  desc: string;
};

export type Shot = {
  id: 'brand_conversion' | 'catalog' | 'detail' | 'lifestyle' | 'angle';
  name: string;
  icon: string;
  desc: string;
};

export type StudioState = {
  product: string | null;          // a custom_product UUID, or 'one_off'
  productOneOffShape?: string;     // free-text shape when product = 'one_off'
  productOneOffName?: string;
  category: string | null;
  fabric: string;
  color: string;
  shot: Shot['id'];
  angle: string;
  setting: string;
  detail: string;
  preservationLock: boolean;
};

export type LibraryEntry = {
  id: string;
  team_id: string;
  user_id: string | null;
  title: string;
  subtitle: string | null;
  prompt: string;
  state: StudioState | null;
  image_url: string | null;
  source_name: string | null;
  created_at: string;
};

export type Team = {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
};

export type TeamMember = {
  id: string;
  team_id: string;
  user_id: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  created_at: string;
};
