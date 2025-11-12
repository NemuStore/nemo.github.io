export type UserRole = 'customer' | 'admin' | 'employee' | 'manager';

export interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null; // Original price before discount
  discount_percentage: number | null; // Discount percentage (0-100)
  image_url: string;
  category: string | null; // Keep for backward compatibility
  category_id: string | null; // Reference to categories table
  stock_quantity: number;
  created_at: string;
  updated_at: string;
  category_data?: Category; // Joined category data
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipped_from_china' | 'received_in_uae' | 'shipped_from_uae' | 'received_in_egypt' | 'in_warehouse' | 'out_for_delivery' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  user_id: string;
  order_number: string;
  status: OrderStatus;
  total_amount: number;
  shipping_address: string;
  latitude: number | null;
  longitude: number | null;
  estimated_delivery_days: number | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
  product?: Product;
}

export type ShipmentStatus = 'pending' | 'shipped_from_china' | 'received_in_uae' | 'shipped_from_uae' | 'received_in_egypt' | 'in_warehouse' | 'completed';

export interface Shipment {
  id: string;
  shipment_number: string;
  status: ShipmentStatus;
  cost: number;
  shipped_from_china_at: string | null;
  received_in_uae_at: string | null;
  shipped_from_uae_at: string | null;
  received_in_egypt_at: string | null;
  entered_warehouse_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShipmentOrder {
  id: string;
  shipment_id: string;
  order_id: string;
  order?: Order;
}

export interface Inventory {
  id: string;
  product_id: string;
  quantity: number;
  cost_per_unit: number;
  shipment_id: string | null;
  created_at: string;
  updated_at: string;
  product?: Product;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'order' | 'shipment' | 'delivery' | 'system';
  read: boolean;
  created_at: string;
}

