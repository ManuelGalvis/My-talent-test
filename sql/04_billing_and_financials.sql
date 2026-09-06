CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distributor_id UUID NOT NULL REFERENCES public.distributors(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    doc_type invoice_doc_type NOT NULL DEFAULT 'CUENTA_DE_COBRO',
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    students_count INT NOT NULL CHECK (students_count > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    subtotal NUMERIC(12, 2) NOT NULL,
    tax_amount NUMERIC(12, 2) DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL,
    total_paid NUMERIC(12, 2) DEFAULT 0.00,
    balance NUMERIC(12, 2) GENERATED ALWAYS AS (total_amount - total_paid) STORED,
    status invoice_status DEFAULT 'issued',
    pdf_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_invoice_per_distributor UNIQUE (distributor_id, invoice_number)
);

CREATE TABLE public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distributor_id UUID NOT NULL REFERENCES public.distributors(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    receipt_number TEXT NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_method payment_method_type NOT NULL,
    bank_reference TEXT,
    voucher_url TEXT,
    notes TEXT,
    registered_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_receipt_per_distributor UNIQUE (distributor_id, receipt_number)
);

CREATE OR REPLACE FUNCTION public.fn_sync_invoice_and_school_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_id IS NOT NULL THEN
    UPDATE public.invoices
    SET total_paid = (
      SELECT COALESCE(SUM(amount), 0)
      FROM public.payment_transactions
      WHERE invoice_id = NEW.invoice_id
    ),
    status = CASE
      WHEN (
        total_amount - (
          SELECT COALESCE(SUM(amount), 0)
          FROM public.payment_transactions
          WHERE invoice_id = NEW.invoice_id
        )
      ) <= 0 THEN 'paid'::invoice_status
      ELSE 'partially_paid'::invoice_status
    END,
    updated_at = NOW()
    WHERE id = NEW.invoice_id;
  END IF;

  UPDATE public.schools
  SET balance_due = (
      SELECT COALESCE(SUM(balance), 0)
      FROM public.invoices
      WHERE school_id = NEW.school_id
        AND status != 'cancelled'
    ),
    payment_status = CASE
      WHEN (
        SELECT COALESCE(SUM(balance), 0)
        FROM public.invoices
        WHERE school_id = NEW.school_id
          AND status != 'cancelled'
      ) <= 0 THEN 'paid'::payment_status
      ELSE 'partial'::payment_status
    END,
    updated_at = NOW()
  WHERE id = NEW.school_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_after_payment_insert
AFTER INSERT OR UPDATE ON public.payment_transactions
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_invoice_and_school_balance();
