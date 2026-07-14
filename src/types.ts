export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  isVeg: boolean;
  spiceLevel: string;
  isAvailable: boolean;
  image?: string;
  customizationGroups?: CustomizationGroup[];
}

export interface CustomizationGroup {
  name: string; // e.g. "Size", "Spice Level", "Add-ons"
  required: boolean;
  multiselect: boolean;
  options: CustomizationOption[];
}

export interface CustomizationOption {
  name: string;
  price: number; // additional cost (can be 0)
}

export interface OrderItem {
  id: string; // unique order item instance ID (to avoid overwriting items with different customization)
  menuItemId: string;
  name: string;
  basePrice: number;
  quantity: number;
  isVeg: boolean;
  selectedCustomizations: {
    groupName: string;
    optionName: string;
    price: number;
  }[];
  notes?: string;
}

export interface Order {
  id: string;
  tableId: string;
  status: "New" | "Preparing" | "Ready" | "Served";
  timestamp: number; // Milliseconds since epoch
  items: OrderItem[];
  totalPrice: number;
  specialInstructions?: string;
}

export interface RestaurantSettings {
  name: string;
  logo?: string;
  currency: string;
  tablesCount: number;
}
