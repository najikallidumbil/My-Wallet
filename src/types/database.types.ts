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
          pin_hash: string | null;
          biometric_enabled: boolean;
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
          pin_hash?: string | null;
          biometric_enabled?: boolean;
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
          pin_hash?: string | null;
          biometric_enabled?: boolean;
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
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          type: TransactionType;
          icon?: string;
          color?: string;
          is_default?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          type?: TransactionType;
          icon?: string;
          color?: string;
          is_default?: boolean;
          created_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          category_id: string | null;
          amount: number;
          type: TransactionType;
          payment_method: PaymentMethod;
          title: string;
          description: string | null;
          transaction_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id?: string | null;
          amount: number;
          type: TransactionType;
          payment_method?: PaymentMethod;
          title: string;
          description?: string | null;
          transaction_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category_id?: string | null;
          amount?: number;
          type?: TransactionType;
          payment_method?: PaymentMethod;
          title?: string;
          description?: string | null;
          transaction_date?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      credit_debt_records: {
        Row: {
          id: string;
          user_id: string;
          type: CreditDebtType;
          counterpart_name: string;
          counterpart_phone: string | null;
          counterpart_email: string | null;
          original_amount: number;
          settled_amount: number;
          status: RecordStatus;
          due_date: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: CreditDebtType;
          counterpart_name: string;
          counterpart_phone?: string | null;
          counterpart_email?: string | null;
          original_amount: number;
          settled_amount?: number;
          status?: RecordStatus;
          due_date?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: CreditDebtType;
          counterpart_name?: string;
          counterpart_phone?: string | null;
          counterpart_email?: string | null;
          original_amount?: number;
          settled_amount?: number;
          status?: RecordStatus;
          due_date?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      attachments: {
        Row: {
          id: string;
          user_id: string;
          transaction_id: string | null;
          credit_debt_id: string | null;
          file_name: string;
          file_type: string;
          file_size: number;
          storage_path: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          transaction_id?: string | null;
          credit_debt_id?: string | null;
          file_name: string;
          file_type: string;
          file_size: number;
          storage_path: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          transaction_id?: string | null;
          credit_debt_id?: string | null;
          file_name?: string;
          file_type?: string;
          file_size?: number;
          storage_path?: string;
          created_at?: string;
        };
      };
    };
  };
}
