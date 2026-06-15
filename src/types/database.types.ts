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
      audit_logs: {
        Row: {
          action: string
          company_id: string | null
          created_at: string | null
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          company_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      charge_types: {
        Row: {
          company_id: string
          created_at: string | null
          default_amount: number | null
          description: string | null
          id: string
          is_recurring: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          default_amount?: number | null
          description?: string | null
          id?: string
          is_recurring?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          default_amount?: number | null
          description?: string | null
          id?: string
          is_recurring?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "charge_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      charges: {
        Row: {
          amount: number
          balance: number
          charge_type_id: string
          company_id: string
          created_at: string | null
          description: string
          due_date: string
          id: string
          member_id: string
          period_month: number | null
          period_year: number | null
          status: Database["public"]["Enums"]["charge_status"] | null
          updated_at: string | null
          vehicle_id: string | null
        }
        Insert: {
          amount: number
          balance: number
          charge_type_id: string
          company_id: string
          created_at?: string | null
          description: string
          due_date: string
          id?: string
          member_id: string
          period_month?: number | null
          period_year?: number | null
          status?: Database["public"]["Enums"]["charge_status"] | null
          updated_at?: string | null
          vehicle_id?: string | null
        }
        Update: {
          amount?: number
          balance?: number
          charge_type_id?: string
          company_id?: string
          created_at?: string | null
          description?: string
          due_date?: string
          id?: string
          member_id?: string
          period_month?: number | null
          period_year?: number | null
          status?: Database["public"]["Enums"]["charge_status"] | null
          updated_at?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "charges_charge_type_id_fkey"
            columns: ["charge_type_id"]
            isOneToOne: false
            referencedRelation: "charge_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          created_at: string | null
          email: string | null
          id: string
          institutional_info: string | null
          legal_name: string
          logo_url: string | null
          manager_name: string | null
          phone: string | null
          plan_id: string | null
          president_name: string | null
          ruc: string
          secretary_name: string | null
          status: string | null
          trade_name: string | null
          treasurer_name: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          institutional_info?: string | null
          legal_name: string
          logo_url?: string | null
          manager_name?: string | null
          phone?: string | null
          plan_id?: string | null
          president_name?: string | null
          ruc: string
          secretary_name?: string | null
          status?: string | null
          trade_name?: string | null
          treasurer_name?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          institutional_info?: string | null
          legal_name?: string
          logo_url?: string | null
          manager_name?: string | null
          phone?: string | null
          plan_id?: string | null
          president_name?: string | null
          ruc?: string
          secretary_name?: string | null
          status?: string | null
          trade_name?: string | null
          treasurer_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          alert_days_before_expiry: number | null
          allow_member_login: boolean | null
          company_id: string
          created_at: string | null
          currency: string | null
          receipt_footer_text: string | null
          receipt_header_text: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          alert_days_before_expiry?: number | null
          allow_member_login?: boolean | null
          company_id: string
          created_at?: string | null
          currency?: string | null
          receipt_footer_text?: string | null
          receipt_header_text?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          alert_days_before_expiry?: number | null
          allow_member_login?: boolean | null
          company_id?: string
          created_at?: string | null
          currency?: string | null
          receipt_footer_text?: string | null
          receipt_header_text?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      document_types: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          requires_expiry: boolean | null
          target_entity: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          requires_expiry?: boolean | null
          target_entity: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          requires_expiry?: boolean | null
          target_entity?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          company_id: string
          created_at: string | null
          document_number: string | null
          document_type_id: string
          driver_id: string | null
          expiry_date: string | null
          file_url: string | null
          id: string
          issue_date: string | null
          member_id: string | null
          notes: string | null
          status: Database["public"]["Enums"]["document_status"] | null
          updated_at: string | null
          vehicle_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          document_number?: string | null
          document_type_id: string
          driver_id?: string | null
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          issue_date?: string | null
          member_id?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          updated_at?: string | null
          vehicle_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          document_number?: string | null
          document_type_id?: string
          driver_id?: string | null
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          issue_date?: string | null
          member_id?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          updated_at?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_document_type_id_fkey"
            columns: ["document_type_id"]
            isOneToOne: false
            referencedRelation: "document_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          address: string | null
          company_id: string
          created_at: string | null
          document_id: string
          first_name: string
          id: string
          last_name: string
          member_id: string | null
          notes: string | null
          phone: string | null
          status: Database["public"]["Enums"]["driver_status"] | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          company_id: string
          created_at?: string | null
          document_id: string
          first_name: string
          id?: string
          last_name: string
          member_id?: string | null
          notes?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["driver_status"] | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          company_id?: string
          created_at?: string | null
          document_id?: string
          first_name?: string
          id?: string
          last_name?: string
          member_id?: string | null
          notes?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["driver_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      licenses: {
        Row: {
          company_id: string
          created_at: string | null
          driver_id: string | null
          expiry_date: string
          file_url: string | null
          id: string
          issue_date: string | null
          license_number: string
          license_type: string
          member_id: string | null
          status: Database["public"]["Enums"]["document_status"] | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          driver_id?: string | null
          expiry_date: string
          file_url?: string | null
          id?: string
          issue_date?: string | null
          license_number: string
          license_type?: string
          member_id?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          driver_id?: string | null
          expiry_date?: string
          file_url?: string | null
          id?: string
          issue_date?: string | null
          license_number?: string
          license_type?: string
          member_id?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "licenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licenses_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licenses_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_attendances: {
        Row: {
          check_in_time: string | null
          created_at: string | null
          id: string
          meeting_id: string
          member_id: string
          notes: string | null
          status: Database["public"]["Enums"]["attendance_status"] | null
          updated_at: string | null
        }
        Insert: {
          check_in_time?: string | null
          created_at?: string | null
          id?: string
          meeting_id: string
          member_id: string
          notes?: string | null
          status?: Database["public"]["Enums"]["attendance_status"] | null
          updated_at?: string | null
        }
        Update: {
          check_in_time?: string | null
          created_at?: string | null
          id?: string
          meeting_id?: string
          member_id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["attendance_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_attendances_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_attendances_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_invites: {
        Row: {
          company_id: string
          created_at: string | null
          email_sent_at: string | null
          email_status:
            | Database["public"]["Enums"]["communication_status"]
            | null
          id: string
          invitation_status: string | null
          meeting_id: string
          member_id: string
          updated_at: string | null
          whatsapp_sent_at: string | null
          whatsapp_status:
            | Database["public"]["Enums"]["communication_status"]
            | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          email_sent_at?: string | null
          email_status?:
            | Database["public"]["Enums"]["communication_status"]
            | null
          id?: string
          invitation_status?: string | null
          meeting_id: string
          member_id: string
          updated_at?: string | null
          whatsapp_sent_at?: string | null
          whatsapp_status?:
            | Database["public"]["Enums"]["communication_status"]
            | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          email_sent_at?: string | null
          email_status?:
            | Database["public"]["Enums"]["communication_status"]
            | null
          id?: string
          invitation_status?: string | null
          meeting_id?: string
          member_id?: string
          updated_at?: string | null
          whatsapp_sent_at?: string | null
          whatsapp_status?:
            | Database["public"]["Enums"]["communication_status"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_invites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_invites_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_invites_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          acta_url: string | null
          communications_sent_at: string | null
          company_id: string
          created_at: string | null
          date: string
          description: string | null
          fine_amount: number | null
          id: string
          is_mandatory: boolean | null
          location: string | null
          meeting_type: string
          status: Database["public"]["Enums"]["meeting_status"] | null
          time: string
          title: string
          updated_at: string | null
        }
        Insert: {
          acta_url?: string | null
          communications_sent_at?: string | null
          company_id: string
          created_at?: string | null
          date: string
          description?: string | null
          fine_amount?: number | null
          id?: string
          is_mandatory?: boolean | null
          location?: string | null
          meeting_type?: string
          status?: Database["public"]["Enums"]["meeting_status"] | null
          time: string
          title: string
          updated_at?: string | null
        }
        Update: {
          acta_url?: string | null
          communications_sent_at?: string | null
          company_id?: string
          created_at?: string | null
          date?: string
          description?: string | null
          fine_amount?: number | null
          id?: string
          is_mandatory?: boolean | null
          location?: string | null
          meeting_type?: string
          status?: Database["public"]["Enums"]["meeting_status"] | null
          time?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meetings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          address: string | null
          admission_date: string
          blood_type: string | null
          company_id: string
          created_at: string | null
          document_id: string
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          first_name: string
          id: string
          last_name: string
          notes: string | null
          phone: string | null
          profile_id: string | null
          status: Database["public"]["Enums"]["member_status"] | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          admission_date: string
          blood_type?: string | null
          company_id: string
          created_at?: string | null
          document_id: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name: string
          id?: string
          last_name: string
          notes?: string | null
          phone?: string | null
          profile_id?: string | null
          status?: Database["public"]["Enums"]["member_status"] | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          admission_date?: string
          blood_type?: string | null
          company_id?: string
          created_at?: string | null
          document_id?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string | null
          profile_id?: string | null
          status?: Database["public"]["Enums"]["member_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          is_read: boolean | null
          link_url: string | null
          message: string
          title: string
          type: Database["public"]["Enums"]["notification_type"] | null
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link_url?: string | null
          message: string
          title: string
          type?: Database["public"]["Enums"]["notification_type"] | null
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link_url?: string | null
          message?: string
          title?: string
          type?: Database["public"]["Enums"]["notification_type"] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_allocations: {
        Row: {
          amount_allocated: number
          charge_id: string
          created_at: string | null
          id: string
          payment_id: string
        }
        Insert: {
          amount_allocated: number
          charge_id: string
          created_at?: string | null
          id?: string
          payment_id: string
        }
        Update: {
          amount_allocated?: number
          charge_id?: string
          created_at?: string | null
          id?: string
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocations_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          company_id: string
          created_at: string | null
          created_by: string | null
          id: string
          member_id: string
          notes: string | null
          payment_date: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          receipt_url: string | null
          reference_number: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          member_id: string
          notes?: string | null
          payment_date?: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          receipt_url?: string | null
          reference_number?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          member_id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          receipt_url?: string | null
          reference_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string | null
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          max_members: number
          max_vehicles: number
          name: Database["public"]["Enums"]["plan_name"]
          price_monthly: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_members: number
          max_vehicles: number
          name: Database["public"]["Enums"]["plan_name"]
          price_monthly: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_members?: number
          max_vehicles?: number
          name?: Database["public"]["Enums"]["plan_name"]
          price_monthly?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string | null
          first_name: string
          id: string
          is_active: boolean | null
          last_name: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          first_name: string
          id: string
          is_active?: boolean | null
          last_name: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          first_name?: string
          id?: string
          is_active?: boolean | null
          last_name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sanction_types: {
        Row: {
          company_id: string
          created_at: string | null
          default_fine_amount: number | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          default_fine_amount?: number | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          default_fine_amount?: number | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sanction_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sanctions: {
        Row: {
          charge_id: string | null
          company_id: string
          created_at: string | null
          date: string
          id: string
          meeting_attendance_id: string | null
          meeting_id: string | null
          member_id: string
          reason: string
          resolution_notes: string | null
          sanction_type_id: string
          severity: string | null
          status: Database["public"]["Enums"]["sanction_status"] | null
          updated_at: string | null
          vehicle_id: string | null
        }
        Insert: {
          charge_id?: string | null
          company_id: string
          created_at?: string | null
          date: string
          id?: string
          meeting_attendance_id?: string | null
          meeting_id?: string | null
          member_id: string
          reason: string
          resolution_notes?: string | null
          sanction_type_id: string
          severity?: string | null
          status?: Database["public"]["Enums"]["sanction_status"] | null
          updated_at?: string | null
          vehicle_id?: string | null
        }
        Update: {
          charge_id?: string | null
          company_id?: string
          created_at?: string | null
          date?: string
          id?: string
          meeting_attendance_id?: string | null
          meeting_id?: string | null
          member_id?: string
          reason?: string
          resolution_notes?: string | null
          sanction_type_id?: string
          severity?: string | null
          status?: Database["public"]["Enums"]["sanction_status"] | null
          updated_at?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sanctions_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: true
            referencedRelation: "charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sanctions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sanctions_meeting_attendance_id_fkey"
            columns: ["meeting_attendance_id"]
            isOneToOne: false
            referencedRelation: "meeting_attendances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sanctions_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sanctions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sanctions_sanction_type_id_fkey"
            columns: ["sanction_type_id"]
            isOneToOne: false
            referencedRelation: "sanction_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sanctions_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number
          company_id: string
          created_at: string | null
          current_period_end: string
          current_period_start: string
          id: string
          plan_id: string
          status: Database["public"]["Enums"]["subscription_status"] | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string | null
          current_period_end: string
          current_period_start: string
          id?: string
          plan_id: string
          status?: Database["public"]["Enums"]["subscription_status"] | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string | null
          current_period_end?: string
          current_period_start?: string
          id?: string
          plan_id?: string
          status?: Database["public"]["Enums"]["subscription_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_driver_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          change_reason: string | null
          company_id: string
          created_at: string | null
          driver_id: string | null
          id: string
          notes: string | null
          unassigned_at: string | null
          unassigned_by: string | null
          updated_at: string | null
          vehicle_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          change_reason?: string | null
          company_id: string
          created_at?: string | null
          driver_id?: string | null
          id?: string
          notes?: string | null
          unassigned_at?: string | null
          unassigned_by?: string | null
          updated_at?: string | null
          vehicle_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          change_reason?: string | null
          company_id?: string
          created_at?: string | null
          driver_id?: string | null
          id?: string
          notes?: string | null
          unassigned_at?: string | null
          unassigned_by?: string | null
          updated_at?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_driver_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_driver_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_driver_assignments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_driver_assignments_unassigned_by_fkey"
            columns: ["unassigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_driver_assignments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          brand: string | null
          chassis_number: string | null
          color: string | null
          company_id: string
          created_at: string | null
          disk_number: string
          driver_id: string | null
          id: string
          member_id: string
          model: string | null
          motor_number: string | null
          observations: string | null
          plate: string
          status: Database["public"]["Enums"]["vehicle_status"] | null
          updated_at: string | null
          year: number | null
        }
        Insert: {
          brand?: string | null
          chassis_number?: string | null
          color?: string | null
          company_id: string
          created_at?: string | null
          disk_number: string
          driver_id?: string | null
          id?: string
          member_id: string
          model?: string | null
          motor_number?: string | null
          observations?: string | null
          plate: string
          status?: Database["public"]["Enums"]["vehicle_status"] | null
          updated_at?: string | null
          year?: number | null
        }
        Update: {
          brand?: string | null
          chassis_number?: string | null
          color?: string | null
          company_id?: string
          created_at?: string | null
          disk_number?: string
          driver_id?: string | null
          id?: string
          member_id?: string
          model?: string | null
          motor_number?: string | null
          observations?: string | null
          plate?: string
          status?: Database["public"]["Enums"]["vehicle_status"] | null
          updated_at?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_user_role: {
        Args: {
          target_company_id: string
          target_role: Database["public"]["Enums"]["user_role"]
          target_user_id: string
        }
        Returns: undefined
      }
      bootstrap_first_super_admin: {
        Args: { target_user: string }
        Returns: undefined
      }
      get_my_company_id: { Args: never; Returns: string }
      is_super_admin: { Args: never; Returns: boolean }
      get_super_admin_dashboard_stats: { Args: never; Returns: Json }
      get_companies_with_stats: { Args: never; Returns: Json }
      seed_default_charge_type_for_company: {
        Args: { p_company_id: string }
        Returns: undefined
      }
    }
    Enums: {
      attendance_status: "asistio" | "ausente" | "justificado" | "tarde"
      charge_status: "pendiente" | "parcial" | "pagada" | "anulada"
      communication_status: "pendiente" | "preparado" | "enviado" | "fallido"
      document_status: "vigente" | "por_vencer" | "vencido"
      driver_status: "activo" | "inactivo"
      meeting_status: "programada" | "en_curso" | "finalizada" | "cancelada"
      member_status: "activo" | "inactivo" | "suspendido"
      notification_type: "alerta" | "recordatorio" | "sistema" | "convocatoria"
      payment_method:
        | "efectivo"
        | "transferencia"
        | "deposito"
        | "cheque"
        | "otro"
      plan_name: "basico" | "profesional" | "empresarial"
      sanction_status: "pendiente" | "apelacion" | "resuelta" | "anulada"
      subscription_status: "activa" | "vencida" | "cancelada"
      user_role:
        | "super_admin"
        | "admin"
        | "operador"
        | "socio"
        | "gerente"
        | "presidente"
        | "secretaria"
        | "tesorero"
      vehicle_status: "activa" | "inactiva" | "mantenimiento"
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
      attendance_status: ["asistio", "ausente", "justificado", "tarde"],
      charge_status: ["pendiente", "parcial", "pagada", "anulada"],
      communication_status: ["pendiente", "preparado", "enviado", "fallido"],
      document_status: ["vigente", "por_vencer", "vencido"],
      driver_status: ["activo", "inactivo"],
      meeting_status: ["programada", "en_curso", "finalizada", "cancelada"],
      member_status: ["activo", "inactivo", "suspendido"],
      notification_type: ["alerta", "recordatorio", "sistema", "convocatoria"],
      payment_method: [
        "efectivo",
        "transferencia",
        "deposito",
        "cheque",
        "otro",
      ],
      plan_name: ["basico", "profesional", "empresarial"],
      sanction_status: ["pendiente", "apelacion", "resuelta", "anulada"],
      subscription_status: ["activa", "vencida", "cancelada"],
      user_role: [
        "super_admin",
        "admin",
        "operador",
        "socio",
        "gerente",
        "presidente",
        "secretaria",
        "tesorero",
      ],
      vehicle_status: ["activa", "inactiva", "mantenimiento"],
    },
  },
} as const
