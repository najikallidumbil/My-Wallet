export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type TransactionType = 'income' | 'expense';
export type CreditDebtType = 'credit' | 'debt';
export type RecordStatus = 'pending' | 'partial' | 'settled' | 'overdue';
export type PaymentMethod = 'upi' | 'cash' | 'card' | 'bank_transfer' | 'other';
export type AccountType = 'cash' | 'bank' | 'upi' | 'custom';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          currency: string;
          theme_preference: string;
          recovery_email: string | null;
          recovery_email_verified: boolean;
          recovery_email_verified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          currency?: string;
          theme_preference?: string;
          recovery_email?: string | null;
          recovery_email_verified?: boolean;
          recovery_email_verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          currency?: string;
          theme_preference?: string;
          recovery_email?: string | null;
          recovery_email_verified?: boolean;
          recovery_email_verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          opening_balance: number;
          default_currency: string;
          app_mode: string;
          reminder_prefs: Json;
          last_synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          opening_balance?: number;
          default_currency?: string;
          app_mode?: string;
          reminder_prefs?: Json;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          opening_balance?: number;
          default_currency?: string;
          app_mode?: string;
          reminder_prefs?: Json;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      accounts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: AccountType;
          opening_balance: number;
          current_balance: number;
          account_number: string | null;
          color: string | null;
          icon: string | null;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type?: AccountType;
          opening_balance?: number;
          current_balance?: number;
          account_number?: string | null;
          color?: string | null;
          icon?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          type?: AccountType;
          opening_balance?: number;
          current_balance?: number;
          account_number?: string | null;
          color?: string | null;
          icon?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      account_transfers: {
        Row: {
          id: string;
          user_id: string;
          from_account_id: string | null;
          to_account_id: string | null;
          amount: number;
          transfer_date: string;
          transfer_time: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          from_account_id?: string | null;
          to_account_id?: string | null;
          amount: number;
          transfer_date?: string;
          transfer_time?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          from_account_id?: string | null;
          to_account_id?: string | null;
          amount?: number;
          transfer_date?: string;
          transfer_time?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          type: TransactionType;
          icon: string;
          color: string;
          is_default: boolean;
          budget: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          type: TransactionType;
          icon?: string;
          color?: string;
          is_default?: boolean;
          budget?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          type?: TransactionType;
          icon?: string;
          color?: string;
          is_default?: boolean;
          budget?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      subcategories: {
        Row: {
          id: string;
          user_id: string;
          category_id: string;
          name: string;
          budget: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id: string;
          name: string;
          budget?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category_id?: string;
          name?: string;
          budget?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      budgets: {
        Row: {
          id: string;
          user_id: string;
          month: string;
          total_budget: number;
          category_budgets: Json;
          subcategory_budgets: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          month: string;
          total_budget?: number;
          category_budgets?: Json;
          subcategory_budgets?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          month?: string;
          total_budget?: number;
          category_budgets?: Json;
          subcategory_budgets?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      khata_people: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          phone: string | null;
          email: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          phone?: string | null;
          email?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          phone?: string | null;
          email?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      khata_transactions: {
        Row: {
          id: string;
          user_id: string;
          person_id: string | null;
          type: CreditDebtType;
          counterpart_name: string;
          counterpart_phone: string | null;
          counterpart_email: string | null;
          original_amount: number;
          settled_amount: number;
          status: RecordStatus;
          transaction_date: string;
          transaction_time: string | null;
          due_date: string | null;
          notes: string | null;
          repayments: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          person_id?: string | null;
          type: CreditDebtType;
          counterpart_name: string;
          counterpart_phone?: string | null;
          counterpart_email?: string | null;
          original_amount: number;
          settled_amount?: number;
          status?: RecordStatus;
          transaction_date?: string;
          transaction_time?: string | null;
          due_date?: string | null;
          notes?: string | null;
          repayments?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          person_id?: string | null;
          type?: CreditDebtType;
          counterpart_name?: string;
          counterpart_phone?: string | null;
          counterpart_email?: string | null;
          original_amount?: number;
          settled_amount?: number;
          status?: RecordStatus;
          transaction_date?: string;
          transaction_time?: string | null;
          due_date?: string | null;
          notes?: string | null;
          repayments?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          category_id: string | null;
          subcategory_id: string | null;
          subcategory_name: string | null;
          account_id: string | null;
          amount: number;
          type: TransactionType;
          payment_method: PaymentMethod;
          title: string;
          description: string | null;
          transaction_date: string;
          transaction_time: string | null;
          is_recurring: boolean;
          recurring_id: string | null;
          attachments: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id?: string | null;
          subcategory_id?: string | null;
          subcategory_name?: string | null;
          account_id?: string | null;
          amount: number;
          type: TransactionType;
          payment_method?: PaymentMethod;
          title: string;
          description?: string | null;
          transaction_date?: string;
          transaction_time?: string | null;
          is_recurring?: boolean;
          recurring_id?: string | null;
          attachments?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category_id?: string | null;
          subcategory_id?: string | null;
          subcategory_name?: string | null;
          account_id?: string | null;
          amount?: number;
          type?: TransactionType;
          payment_method?: PaymentMethod;
          title?: string;
          description?: string | null;
          transaction_date?: string;
          transaction_time?: string | null;
          is_recurring?: boolean;
          recurring_id?: string | null;
          attachments?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      attachments: {
        Row: {
          id: string;
          user_id: string;
          transaction_id: string | null;
          khata_transaction_id: string | null;
          file_name: string;
          file_type: string;
          file_size: number;
          storage_path: string;
          data_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          transaction_id?: string | null;
          khata_transaction_id?: string | null;
          file_name: string;
          file_type: string;
          file_size: number;
          storage_path: string;
          data_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          transaction_id?: string | null;
          khata_transaction_id?: string | null;
          file_name?: string;
          file_type?: string;
          file_size?: number;
          storage_path?: string;
          data_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      recovery_verification_requests: {
        Row: {
          id: string;
          user_id: string;
          recovery_email: string;
          otp_hash: string;
          attempts: number;
          expires_at: string;
          verified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          recovery_email: string;
          otp_hash: string;
          attempts?: number;
          expires_at: string;
          verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          recovery_email?: string;
          otp_hash?: string;
          attempts?: number;
          expires_at?: string;
          verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Functions: {
      request_recovery_email_otp: {
        Args: {
          target_email: string;
          hashed_otp: string;
          valid_seconds?: number;
        };
        Returns: Json;
      };
      verify_recovery_email_otp: {
        Args: {
          target_email: string;
          candidate_otp_hash: string;
        };
        Returns: Json;
      };
    };
  };
}
