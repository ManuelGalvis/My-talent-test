CREATE TYPE user_role AS ENUM (
  'admin_general',
  'distributor',
  'rector',
  'teacher',
  'student'
);

CREATE TYPE doc_type AS ENUM ('CC', 'TI', 'CE', 'PASAPORTE', 'PEP');
CREATE TYPE status_type AS ENUM ('active', 'inactive', 'suspended', 'expired');
CREATE TYPE payment_status AS ENUM ('pending', 'partial', 'paid');
CREATE TYPE invoice_doc_type AS ENUM ('CUENTA_DE_COBRO', 'FACTURA_VENTA', 'RECIBO_PROVISIONAL');
CREATE TYPE invoice_status AS ENUM ('draft', 'issued', 'partially_paid', 'paid', 'cancelled');
CREATE TYPE payment_method_type AS ENUM ('transferencia_bancaria', 'consignacion', 'efectivo', 'cheque', 'otro');
CREATE TYPE test_status AS ENUM ('assigned', 'in_progress', 'completed', 'cancelled');
CREATE TYPE instrument_type AS ENUM ('CHASIDE', 'CEREBRO_TRIADICO');
CREATE TYPE program_level AS ENUM ('TECNICO', 'TECNOLOGICO', 'PROFESIONAL', 'DIPLOMADO', 'CURSO');
