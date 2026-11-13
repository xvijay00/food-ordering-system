export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type OrderType = "dine_in" | "delivery";

export type OrderStatus =
  | "placed"
  | "confirmed"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "completed"
  | "cancelled"
  | (string & {});

export type PaymentMethod = "cod" | "counter" | (string & {});

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | (string & {});

export type StaffRole = "admin" | "kitchen" | "delivery";

export type OrderItemAddon = {
  id?: string;
  name: string;
  price: number;
};

export type PushSubscriptionKeys = {
  p256dh: string;
  auth: string;
  [key: string]: Json | undefined;
};

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          name: string;
          sort_order: number;
          is_active: boolean;
          is_birthday?: boolean;
          image_url?: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          sort_order?: number;
          is_active?: boolean;
          is_birthday?: boolean;
          image_url?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          sort_order?: number;
          is_active?: boolean;
          is_birthday?: boolean;
          image_url?: string | null;
        };
        Relationships: [];
      };
      menu_items: {
        Row: {
          id: string;
          category_id: string;
          name: string;
          description: string | null;
          price: number;
          discount_price: number | null;
          stock_quantity: number | null;
          image_url: string | null;
          image_urls: string[];
          is_veg: boolean;
          is_available: boolean;
          is_bestseller: boolean;
          is_featured: boolean;
          flavours: string[];
          egg_options: string[];
          allow_custom_message: boolean;
          allow_custom_image: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          name: string;
          description?: string | null;
          price: number;
          discount_price?: number | null;
          stock_quantity?: number | null;
          image_url?: string | null;
          image_urls?: string[];
          is_veg?: boolean;
          is_available?: boolean;
          is_bestseller?: boolean;
          is_featured?: boolean;
          flavours?: string[];
          egg_options?: string[];
          allow_custom_message?: boolean;
          allow_custom_image?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          discount_price?: number | null;
          stock_quantity?: number | null;
          image_url?: string | null;
          image_urls?: string[];
          is_veg?: boolean;
          is_available?: boolean;
          is_bestseller?: boolean;
          is_featured?: boolean;
          flavours?: string[];
          egg_options?: string[];
          allow_custom_message?: boolean;
          allow_custom_image?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      item_variants: {
        Row: {
          id: string;
          item_id: string;
          label: string;
          price: number;
        };
        Insert: {
          id?: string;
          item_id: string;
          label: string;
          price: number;
        };
        Update: {
          id?: string;
          item_id?: string;
          label?: string;
          price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "item_variants_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "menu_items";
            referencedColumns: ["id"];
          },
        ];
      };
      item_addons: {
        Row: {
          id: string;
          item_id: string;
          name: string;
          price: number;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          item_id: string;
          name: string;
          price?: number;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          item_id?: string;
          name?: string;
          price?: number;
          is_active?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "item_addons_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "menu_items";
            referencedColumns: ["id"];
          },
        ];
      };
      restaurant_tables: {
        Row: {
          id: string;
          table_number: number;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          table_number: number;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          table_number?: number;
          is_active?: boolean;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          order_token: string;
          order_no: number;
          order_type: OrderType;
          table_id: string | null;
          customer_name: string;
          customer_phone: string;
          delivery_address: string | null;
          status: OrderStatus;
          payment_method: PaymentMethod;
          payment_status: PaymentStatus;
          subtotal: number;
          delivery_fee: number;
          total: number;
          notes: string | null;
          preorder_at: string | null;
          cancel_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_token?: string;
          order_type: OrderType;
          table_id?: string | null;
          customer_name: string;
          customer_phone: string;
          delivery_address?: string | null;
          status?: OrderStatus;
          payment_method?: PaymentMethod;
          payment_status?: PaymentStatus;
          subtotal: number;
          delivery_fee?: number;
          total: number;
          notes?: string | null;
          preorder_at?: string | null;
          cancel_reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_token?: string;
          order_type?: OrderType;
          table_id?: string | null;
          customer_name?: string;
          customer_phone?: string;
          delivery_address?: string | null;
          status?: OrderStatus;
          payment_method?: PaymentMethod;
          payment_status?: PaymentStatus;
          subtotal?: number;
          delivery_fee?: number;
          total?: number;
          notes?: string | null;
          preorder_at?: string | null;
          cancel_reason?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_table_id_fkey";
            columns: ["table_id"];
            isOneToOne: false;
            referencedRelation: "restaurant_tables";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          menu_item_id: string | null;
          item_name: string;
          variant_label: string | null;
          addons: OrderItemAddon[] | Json;
          selected_flavour: string | null;
          egg_preference: string | null;
          cake_message: string | null;
          custom_image_url: string | null;
          unit_price: number;
          quantity: number;
          line_total: number;
        };
        Insert: {
          id?: string;
          order_id: string;
          menu_item_id?: string | null;
          item_name: string;
          variant_label?: string | null;
          addons?: OrderItemAddon[] | Json;
          selected_flavour?: string | null;
          egg_preference?: string | null;
          cake_message?: string | null;
          custom_image_url?: string | null;
          unit_price: number;
          quantity: number;
          line_total: number;
        };
        Update: {
          id?: string;
          order_id?: string;
          menu_item_id?: string | null;
          item_name?: string;
          variant_label?: string | null;
          addons?: OrderItemAddon[] | Json;
          selected_flavour?: string | null;
          egg_preference?: string | null;
          cake_message?: string | null;
          custom_image_url?: string | null;
          unit_price?: number;
          quantity?: number;
          line_total?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_menu_item_id_fkey";
            columns: ["menu_item_id"];
            isOneToOne: false;
            referencedRelation: "menu_items";
            referencedColumns: ["id"];
          },
        ];
      };
      order_status_history: {
        Row: {
          id: string;
          order_id: string;
          status: OrderStatus;
          changed_by: string | null;
          changed_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          status: OrderStatus;
          changed_by?: string | null;
          changed_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          status?: OrderStatus;
          changed_by?: string | null;
          changed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_profiles: {
        Row: {
          id: string;
          name: string;
          role: StaffRole;
        };
        Insert: {
          id: string;
          name: string;
          role: StaffRole;
        };
        Update: {
          id?: string;
          name?: string;
          role?: StaffRole;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          staff_id: string;
          endpoint: string;
          keys: PushSubscriptionKeys | Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          staff_id: string;
          endpoint: string;
          keys: PushSubscriptionKeys | Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          staff_id?: string;
          endpoint?: string;
          keys?: PushSubscriptionKeys | Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      settings: {
        Row: {
          key: string;
          value: Json;
        };
        Insert: {
          key: string;
          value: Json;
        };
        Update: {
          key?: string;
          value?: Json;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_staff: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      staff_role: {
        Args: Record<PropertyKey, never>;
        Returns: StaffRole | null;
      };
      get_sales_summary: {
        Args: {
          p_start: string;
          p_end: string;
        };
        Returns: {
          total_sales: number;
          order_count: number;
          avg_order_value: number;
          cancelled_count: number;
          dine_in_count: number;
          delivery_count: number;
          dine_in_sales: number;
          delivery_sales: number;
        }[];
      };
      get_daily_sales: {
        Args: {
          p_start: string;
          p_end: string;
          p_tz?: string;
        };
        Returns: {
          day: string;
          sales: number;
          orders: number;
        }[];
      };
      get_top_selling_items: {
        Args: {
          p_start: string;
          p_end: string;
          p_limit?: number;
        };
        Returns: {
          item_name: string;
          quantity_sold: number;
          revenue: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Convenience row / insert / update helper types
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

// Domain entity aliases
export type Category = Tables<"categories">;
export type MenuItem = Tables<"menu_items">;
export type ItemVariant = Tables<"item_variants">;
export type ItemAddon = Tables<"item_addons">;
export type RestaurantTable = Tables<"restaurant_tables">;
export type Order = Tables<"orders">;
export type OrderItem = Tables<"order_items">;
export type OrderStatusHistory = Tables<"order_status_history">;
export type StaffProfile = Tables<"staff_profiles">;
export type PushSubscriptionRecord = Tables<"push_subscriptions">;
export type Setting = Tables<"settings">;

export type MenuItemWithRelations = MenuItem & {
  category?: Category | null;
  item_variants?: ItemVariant[];
  item_addons?: ItemAddon[];
};

export type OrderWithItems = Order & {
  order_items?: OrderItem[];
  order_status_history?: OrderStatusHistory[];
  restaurant_tables?: RestaurantTable | null;
};

export type AppSettings = {
  delivery_fee: number;
  min_order: number;
  shop_open: boolean;
};

export type RestaurantAdminSettings = AppSettings & {
  restaurant_name: string;
  restaurant_phone: string;
};

