-- ============================================
-- Migration: إنشاء جدول الطرود (Packages)
-- ============================================
-- 
-- هذا الجدول لإدارة الطرود التي يتم إنشاؤها من الشحنات عند وصولها للإمارات
-- يتم وضع طلب واحد أو أكثر في كل طرد، ثم شحنها إلى مصر

-- جدول الطرود
CREATE TABLE IF NOT EXISTS public.packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_number TEXT UNIQUE NOT NULL, -- رقم يدوي للطرد
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE, -- الشحنة الأصلية
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN (
    'created', -- تم إنشاء الطرد في الإمارات
    'shipped_to_egypt', -- شُحن إلى مصر
    'received_in_egypt', -- وصل مصر
    'unpacked' -- تم تفكيكه وتحويله لشحنة داخلية
  )),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  shipped_to_egypt_at TIMESTAMP WITH TIME ZONE,
  received_in_egypt_at TIMESTAMP WITH TIME ZONE,
  unpacked_at TIMESTAMP WITH TIME ZONE,
  notes TEXT, -- ملاحظات إضافية
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL, -- من أنشأ الطرد
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول ربط الطرود بالطلبات (many-to-many)
CREATE TABLE IF NOT EXISTS public.package_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(package_id, order_id)
);

-- جدول الشحنات الداخلية (للشحن داخل مصر بعد تفكيك الطرود)
CREATE TABLE IF NOT EXISTS public.internal_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_number TEXT UNIQUE NOT NULL, -- رقم الشحنة الداخلية
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', -- قيد الانتظار
    'out_for_delivery', -- قيد التوصيل
    'delivered', -- تم التسليم
    'cancelled' -- ملغاة
  )),
  shipping_company TEXT, -- اسم شركة الشحن
  tracking_number TEXT, -- رقم التتبع
  cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  shipped_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول ربط الشحنات الداخلية بالطلبات
CREATE TABLE IF NOT EXISTS public.internal_shipment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_shipment_id UUID NOT NULL REFERENCES public.internal_shipments(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(internal_shipment_id, order_id)
);

-- جدول ربط الطرود بالشحنات الداخلية (عند تفكيك الطرد)
CREATE TABLE IF NOT EXISTS public.package_internal_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  internal_shipment_id UUID NOT NULL REFERENCES public.internal_shipments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(package_id, internal_shipment_id)
);

-- إنشاء الفهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_packages_shipment_id ON public.packages(shipment_id);
CREATE INDEX IF NOT EXISTS idx_packages_status ON public.packages(status);
CREATE INDEX IF NOT EXISTS idx_packages_created_by ON public.packages(created_by);
CREATE INDEX IF NOT EXISTS idx_package_orders_package_id ON public.package_orders(package_id);
CREATE INDEX IF NOT EXISTS idx_package_orders_order_id ON public.package_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_internal_shipments_status ON public.internal_shipments(status);
CREATE INDEX IF NOT EXISTS idx_internal_shipment_orders_shipment_id ON public.internal_shipment_orders(internal_shipment_id);
CREATE INDEX IF NOT EXISTS idx_internal_shipment_orders_order_id ON public.internal_shipment_orders(order_id);

-- تفعيل RLS
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_shipment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_internal_shipments ENABLE ROW LEVEL SECURITY;

-- RLS Policies للطرود
-- يمكن للجميع قراءة الطرود
CREATE POLICY "Anyone can view packages" ON public.packages
  FOR SELECT USING (true);

-- فقط الموظفين والمديرين يمكنهم إنشاء/تحديث الطرود
CREATE POLICY "Employees and managers can manage packages" ON public.packages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager', 'employee')
    )
  );

-- RLS Policies لربط الطرود بالطلبات
CREATE POLICY "Anyone can view package_orders" ON public.package_orders
  FOR SELECT USING (true);

CREATE POLICY "Employees and managers can manage package_orders" ON public.package_orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager', 'employee')
    )
  );

-- RLS Policies للشحنات الداخلية
CREATE POLICY "Anyone can view internal_shipments" ON public.internal_shipments
  FOR SELECT USING (true);

CREATE POLICY "Employees and managers can manage internal_shipments" ON public.internal_shipments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager', 'employee')
    )
  );

-- RLS Policies لربط الشحنات الداخلية بالطلبات
CREATE POLICY "Anyone can view internal_shipment_orders" ON public.internal_shipment_orders
  FOR SELECT USING (true);

CREATE POLICY "Employees and managers can manage internal_shipment_orders" ON public.internal_shipment_orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager', 'employee')
    )
  );

-- RLS Policies لربط الطرود بالشحنات الداخلية
CREATE POLICY "Anyone can view package_internal_shipments" ON public.package_internal_shipments
  FOR SELECT USING (true);

CREATE POLICY "Employees and managers can manage package_internal_shipments" ON public.package_internal_shipments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager', 'employee')
    )
  );

