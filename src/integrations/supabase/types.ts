export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          city: string
          complement: string | null
          created_at: string
          district: string | null
          id: string
          is_default: boolean
          number: string
          state: string
          street: string
          user_id: string
          zip_code: string
        }
        Insert: {
          city: string
          complement?: string | null
          created_at?: string
          district?: string | null
          id?: string
          is_default?: boolean
          number: string
          state: string
          street: string
          user_id: string
          zip_code: string
        }
        Update: {
          city?: string
          complement?: string | null
          created_at?: string
          district?: string | null
          id?: string
          is_default?: boolean
          number?: string
          state?: string
          street?: string
          user_id?: string
          zip_code?: string
        }
        Relationships: []
      }
      admin_invites: {
        Row: {
          created_at: string
          email: string
          id: string
          invited_by: string | null
          is_admin: boolean
          name: string | null
          note: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          is_admin?: boolean
          name?: string | null
          note?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          is_admin?: boolean
          name?: string | null
          note?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      banners: {
        Row: {
          active: boolean
          created_at: string
          id: string
          image_url: string
          link: string | null
          position: number
          subtitle: string | null
          title: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          image_url: string
          link?: string | null
          position?: number
          subtitle?: string | null
          title: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          image_url?: string
          link?: string | null
          position?: number
          subtitle?: string | null
          title?: string
        }
        Relationships: []
      }
      bills: {
        Row: {
          amount: number
          attachment_url: string | null
          barcode: string | null
          category: string | null
          created_at: string
          created_by: string | null
          description: string
          due_date: string
          id: string
          notes: string | null
          paid_amount: number | null
          paid_at: string | null
          status: Database["public"]["Enums"]["bill_status"]
          supplier: string
          updated_at: string
        }
        Insert: {
          amount: number
          attachment_url?: string | null
          barcode?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          due_date: string
          id?: string
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          status?: Database["public"]["Enums"]["bill_status"]
          supplier?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          attachment_url?: string | null
          barcode?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          due_date?: string
          id?: string
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          status?: Database["public"]["Enums"]["bill_status"]
          supplier?: string
          updated_at?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          active: boolean
          created_at: string
          id: string
          image_url: string | null
          name: string
          position: number
          slug: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          position?: number
          slug: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          position?: number
          slug?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          city: string
          city_code: string | null
          cnpj: string
          complement: string | null
          created_at: string
          crt: string
          district: string
          email: string | null
          id: string
          ie: string
          im: string | null
          legal_name: string
          logo_url: string | null
          nfe_series: string
          number: string
          phone: string | null
          singleton: boolean
          state: string
          street: string
          trade_name: string
          updated_at: string
          zip_code: string
        }
        Insert: {
          city?: string
          city_code?: string | null
          cnpj?: string
          complement?: string | null
          created_at?: string
          crt?: string
          district?: string
          email?: string | null
          id?: string
          ie?: string
          im?: string | null
          legal_name?: string
          logo_url?: string | null
          nfe_series?: string
          number?: string
          phone?: string | null
          singleton?: boolean
          state?: string
          street?: string
          trade_name?: string
          updated_at?: string
          zip_code?: string
        }
        Update: {
          city?: string
          city_code?: string | null
          cnpj?: string
          complement?: string | null
          created_at?: string
          crt?: string
          district?: string
          email?: string | null
          id?: string
          ie?: string
          im?: string | null
          legal_name?: string
          logo_url?: string | null
          nfe_series?: string
          number?: string
          phone?: string | null
          singleton?: boolean
          state?: string
          street?: string
          trade_name?: string
          updated_at?: string
          zip_code?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          discount_percent: number
          expires_at: string | null
          id: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          discount_percent: number
          expires_at?: string | null
          id?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          discount_percent?: number
          expires_at?: string | null
          id?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          cest: string | null
          cfop: string | null
          code: string | null
          cofins_rate: number
          cofins_value: number
          created_at: string
          cst: string | null
          description: string
          discount: number
          icms_base: number
          icms_rate: number
          icms_value: number
          id: string
          invoice_id: string
          ipi_rate: number
          ipi_value: number
          ncm: string | null
          origin: string | null
          pis_rate: number
          pis_value: number
          position: number
          product_id: string | null
          quantity: number
          total: number
          unit: string
          unit_price: number
        }
        Insert: {
          cest?: string | null
          cfop?: string | null
          code?: string | null
          cofins_rate?: number
          cofins_value?: number
          created_at?: string
          cst?: string | null
          description: string
          discount?: number
          icms_base?: number
          icms_rate?: number
          icms_value?: number
          id?: string
          invoice_id: string
          ipi_rate?: number
          ipi_value?: number
          ncm?: string | null
          origin?: string | null
          pis_rate?: number
          pis_value?: number
          position?: number
          product_id?: string | null
          quantity?: number
          total?: number
          unit?: string
          unit_price?: number
        }
        Update: {
          cest?: string | null
          cfop?: string | null
          code?: string | null
          cofins_rate?: number
          cofins_value?: number
          created_at?: string
          cst?: string | null
          description?: string
          discount?: number
          icms_base?: number
          icms_rate?: number
          icms_value?: number
          id?: string
          invoice_id?: string
          ipi_rate?: number
          ipi_value?: number
          ncm?: string | null
          origin?: string | null
          pis_rate?: number
          pis_value?: number
          position?: number
          product_id?: string | null
          quantity?: number
          total?: number
          unit?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          created_by: string | null
          customer_doc: string | null
          customer_email: string | null
          customer_name: string
          discount: number
          id: string
          issued_at: string
          notes: string | null
          number: number
          order_id: string | null
          other_expenses: number
          payload: Json
          payment_method: string | null
          products_total: number
          series: string
          shipping: number
          status: Database["public"]["Enums"]["invoice_status"]
          tax_total: number
          total: number
          type: Database["public"]["Enums"]["invoice_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_doc?: string | null
          customer_email?: string | null
          customer_name: string
          discount?: number
          id?: string
          issued_at?: string
          notes?: string | null
          number: number
          order_id?: string | null
          other_expenses?: number
          payload?: Json
          payment_method?: string | null
          products_total?: number
          series?: string
          shipping?: number
          status?: Database["public"]["Enums"]["invoice_status"]
          tax_total?: number
          total?: number
          type: Database["public"]["Enums"]["invoice_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_doc?: string | null
          customer_email?: string | null
          customer_name?: string
          discount?: number
          id?: string
          issued_at?: string
          notes?: string | null
          number?: number
          order_id?: string | null
          other_expenses?: number
          payload?: Json
          payment_method?: string | null
          products_total?: number
          series?: string
          shipping?: number
          status?: Database["public"]["Enums"]["invoice_status"]
          tax_total?: number
          total?: number
          type?: Database["public"]["Enums"]["invoice_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          price: number
          product_id: string | null
          product_image: string | null
          product_name: string
          quantity: number
          size_name: string | null
        }
        Insert: {
          id?: string
          order_id: string
          price: number
          product_id?: string | null
          product_image?: string | null
          product_name: string
          quantity: number
          size_name?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          price?: number
          product_id?: string | null
          product_image?: string | null
          product_name?: string
          quantity?: number
          size_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_json: Json | null
          created_at: string
          discount: number
          id: string
          payment_method: string | null
          shipping: number
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          address_json?: Json | null
          created_at?: string
          discount?: number
          id?: string
          payment_method?: string | null
          shipping?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          updated_at?: string
          user_id: string
        }
        Update: {
          address_json?: Json | null
          created_at?: string
          discount?: number
          id?: string
          payment_method?: string | null
          shipping?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_accounts: {
        Row: {
          account_number: string | null
          account_type: string
          active: boolean
          agency: string | null
          bank_code: string | null
          bank_name: string
          created_at: string
          holder_doc: string | null
          holder_name: string
          id: string
          is_default: boolean
          label: string
          notes: string | null
          pix_key: string | null
          pix_key_type: string | null
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          account_type?: string
          active?: boolean
          agency?: string | null
          bank_code?: string | null
          bank_name: string
          created_at?: string
          holder_doc?: string | null
          holder_name: string
          id?: string
          is_default?: boolean
          label: string
          notes?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          account_type?: string
          active?: boolean
          agency?: string | null
          bank_code?: string | null
          bank_name?: string
          created_at?: string
          holder_doc?: string | null
          holder_name?: string
          id?: string
          is_default?: boolean
          label?: string
          notes?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          id: string
          image_url: string
          position: number
          product_id: string
        }
        Insert: {
          id?: string
          image_url: string
          position?: number
          product_id: string
        }
        Update: {
          id?: string
          image_url?: string
          position?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_sizes: {
        Row: {
          id: string
          product_id: string
          size_id: string
          stock: number
        }
        Insert: {
          id?: string
          product_id: string
          size_id: string
          stock?: number
        }
        Update: {
          id?: string
          product_id?: string
          size_id?: string
          stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_sizes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_sizes_size_id_fkey"
            columns: ["size_id"]
            isOneToOne: false
            referencedRelation: "sizes"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          brand_id: string | null
          category_id: string | null
          cest: string | null
          cfop: string | null
          cofins_rate: number
          color: string | null
          created_at: string
          cst: string | null
          description: string | null
          featured: boolean
          icms_rate: number
          id: string
          ipi_rate: number
          material: string | null
          name: string
          ncm: string | null
          origin: string | null
          pis_rate: number
          price: number
          sale_price: number | null
          sales_count: number
          sku: string | null
          slug: string
          stock: number
          technical_description: string | null
          unit: string
          updated_at: string
          weight: string | null
        }
        Insert: {
          active?: boolean
          brand_id?: string | null
          category_id?: string | null
          cest?: string | null
          cfop?: string | null
          cofins_rate?: number
          color?: string | null
          created_at?: string
          cst?: string | null
          description?: string | null
          featured?: boolean
          icms_rate?: number
          id?: string
          ipi_rate?: number
          material?: string | null
          name: string
          ncm?: string | null
          origin?: string | null
          pis_rate?: number
          price: number
          sale_price?: number | null
          sales_count?: number
          sku?: string | null
          slug: string
          stock?: number
          technical_description?: string | null
          unit?: string
          updated_at?: string
          weight?: string | null
        }
        Update: {
          active?: boolean
          brand_id?: string | null
          category_id?: string | null
          cest?: string | null
          cfop?: string | null
          cofins_rate?: number
          color?: string | null
          created_at?: string
          cst?: string | null
          description?: string | null
          featured?: boolean
          icms_rate?: number
          id?: string
          ipi_rate?: number
          material?: string | null
          name?: string
          ncm?: string | null
          origin?: string | null
          pis_rate?: number
          price?: number
          sale_price?: number | null
          sales_count?: number
          sku?: string | null
          slug?: string
          stock?: number
          technical_description?: string | null
          unit?: string
          updated_at?: string
          weight?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          name: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          product_id: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          product_id: string
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          product_id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      role_audit: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          target_user_id?: string
        }
        Relationships: []
      }
      sizes: {
        Row: {
          id: string
          name: string
          position: number
        }
        Insert: {
          id?: string
          name: string
          position?: number
        }
        Update: {
          id?: string
          name?: string
          position?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_list_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          is_admin: boolean
          name: string
          user_id: string
        }[]
      }
      admin_set_admin: {
        Args: { _make_admin: boolean; _user_id: string }
        Returns: undefined
      }
      admin_upsert_invite: {
        Args: {
          _email: string
          _make_admin: boolean
          _name: string
          _note: string
        }
        Returns: string
      }
      create_order: {
        Args: {
          _address: Json
          _coupon?: string
          _items: Json
          _payment_method: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      next_invoice_number: {
        Args: {
          _series: string
          _type: Database["public"]["Enums"]["invoice_type"]
        }
        Returns: number
      }
      validate_coupon: {
        Args: { _code: string }
        Returns: {
          code: string
          discount_percent: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "customer"
      bill_status: "pending" | "paid" | "cancelled"
      invoice_status: "issued" | "paid" | "cancelled"
      invoice_type: "receipt" | "nfe"
      order_status: "pending" | "paid" | "shipped" | "delivered" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "customer"],
      bill_status: ["pending", "paid", "cancelled"],
      invoice_status: ["issued", "paid", "cancelled"],
      invoice_type: ["receipt", "nfe"],
      order_status: ["pending", "paid", "shipped", "delivered", "cancelled"],
    },
  },
} as const
