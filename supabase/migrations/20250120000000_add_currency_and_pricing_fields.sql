-- ============================================
-- إضافة جدول أسعار العملات وحقول التسعير الجديدة
-- ============================================

-- 1. إنشاء جدول أسعار العملات
CREATE TABLE IF NOT EXISTS public.currency_exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_code TEXT NOT NULL UNIQUE, -- مثل: 'AED', 'USD', 'EUR'
  currency_name TEXT NOT NULL, -- مثل: 'درهم إماراتي', 'دولار أمريكي'
  rate_to_egp NUMERIC(10, 4) NOT NULL, -- سعر الصرف مقابل الجنيه المصري
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_currency_exchange_rates_code ON public.currency_exchange_rates(currency_code);
CREATE INDEX IF NOT EXISTS idx_currency_exchange_rates_active ON public.currency_exchange_rates(is_active) WHERE is_active = true;

-- إدراج العملات الأساسية (يمكن تحديثها لاحقاً)
INSERT INTO public.currency_exchange_rates (currency_code, currency_name, rate_to_egp, is_active)
VALUES 
  ('AED', 'درهم إماراتي', 8.5, true),
  ('USD', 'دولار أمريكي', 31.0, true),
  ('EUR', 'يورو', 33.5, true)
ON CONFLICT (currency_code) DO NOTHING;

-- 2. إضافة حقول التسعير الجديدة لجدول products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS purchase_price_aed NUMERIC(10, 2) NULL, -- سعر الشراء بالدرهم الإماراتي
ADD COLUMN IF NOT EXISTS cost_multiplier NUMERIC(5, 2) DEFAULT 1.0, -- معامل التكلفة (يضرب في السعر الأصلي)
ADD COLUMN IF NOT EXISTS selling_price_egp NUMERIC(10, 2) NULL, -- سعر البيع بالجنيه المصري (يتم حسابه تلقائياً)
ADD COLUMN IF NOT EXISTS strikethrough_price NUMERIC(10, 2) NULL, -- الرقم المشطوب عليه (يدوي بالجنيه المصري)
ADD COLUMN IF NOT EXISTS limited_time_discount_percentage INTEGER NULL CHECK (limited_time_discount_percentage >= 0 AND limited_time_discount_percentage <= 100), -- خصم لفترة محدودة
ADD COLUMN IF NOT EXISTS limited_time_discount_start_date TIMESTAMP WITH TIME ZONE NULL, -- تاريخ بداية الخصم المحدود
ADD COLUMN IF NOT EXISTS limited_time_discount_end_date TIMESTAMP WITH TIME ZONE NULL; -- تاريخ انتهاء الخصم المحدود

-- فهارس للحقول الجديدة
CREATE INDEX IF NOT EXISTS idx_products_limited_time_discount ON public.products(limited_time_discount_end_date) 
  WHERE limited_time_discount_percentage IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_purchase_price_aed ON public.products(purchase_price_aed) 
  WHERE purchase_price_aed IS NOT NULL;

-- 3. Function لحساب سعر البيع بالجنيه المصري
CREATE OR REPLACE FUNCTION calculate_selling_price_egp()
RETURNS TRIGGER AS $$
DECLARE
  aed_to_egp_rate NUMERIC;
BEGIN
  -- إذا كان هناك سعر شراء بالدرهم ومعامل تكلفة، احسب سعر البيع
  IF NEW.purchase_price_aed IS NOT NULL AND NEW.cost_multiplier IS NOT NULL THEN
    -- الحصول على سعر صرف الدرهم مقابل الجنيه المصري
    SELECT rate_to_egp INTO aed_to_egp_rate
    FROM public.currency_exchange_rates
    WHERE currency_code = 'AED' AND is_active = true
    LIMIT 1;
    
    -- إذا لم يتم العثور على سعر الصرف، استخدم القيمة الافتراضية 8.5
    IF aed_to_egp_rate IS NULL THEN
      aed_to_egp_rate := 8.5;
    END IF;
    
    -- حساب سعر البيع: (سعر الشراء بالدرهم × معامل التكلفة × سعر الصرف)
    NEW.selling_price_egp := ROUND((NEW.purchase_price_aed * NEW.cost_multiplier * aed_to_egp_rate)::NUMERIC, 2);
    
    -- إذا كان سعر البيع محسوباً، استخدمه كـ price الأساسي
    IF NEW.selling_price_egp IS NOT NULL THEN
      NEW.price := NEW.selling_price_egp;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger لحساب سعر البيع تلقائياً
DROP TRIGGER IF EXISTS trigger_calculate_selling_price ON public.products;
CREATE TRIGGER trigger_calculate_selling_price
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW
WHEN (NEW.purchase_price_aed IS NOT NULL OR NEW.cost_multiplier IS NOT NULL)
EXECUTE FUNCTION calculate_selling_price_egp();

-- 5. Function للتحقق من انتهاء الخصم المحدود وتطبيق الخصم العادي
CREATE OR REPLACE FUNCTION check_limited_time_discount()
RETURNS TRIGGER AS $$
BEGIN
  -- إذا انتهى الخصم المحدود، استخدم الخصم العادي
  IF NEW.limited_time_discount_end_date IS NOT NULL 
     AND NEW.limited_time_discount_end_date < NOW() 
     AND NEW.limited_time_discount_percentage IS NOT NULL THEN
    -- نقل الخصم المحدود إلى الخصم العادي
    IF NEW.discount_percentage IS NULL OR NEW.discount_percentage = 0 THEN
      NEW.discount_percentage := NEW.limited_time_discount_percentage;
    END IF;
    -- مسح الخصم المحدود
    NEW.limited_time_discount_percentage := NULL;
    NEW.limited_time_discount_start_date := NULL;
    NEW.limited_time_discount_end_date := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger للتحقق من انتهاء الخصم المحدود
DROP TRIGGER IF EXISTS trigger_check_limited_discount ON public.products;
CREATE TRIGGER trigger_check_limited_discount
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW
WHEN (NEW.limited_time_discount_end_date IS NOT NULL)
EXECUTE FUNCTION check_limited_time_discount();

-- 7. Function لتحديث أسعار العملات (يمكن استدعاؤها من Edge Function)
CREATE OR REPLACE FUNCTION update_currency_rate(
  p_currency_code TEXT,
  p_rate_to_egp NUMERIC
)
RETURNS void AS $$
BEGIN
  UPDATE public.currency_exchange_rates
  SET 
    rate_to_egp = p_rate_to_egp,
    last_updated = NOW(),
    updated_at = NOW()
  WHERE currency_code = p_currency_code;
  
  -- إذا لم يتم العثور على العملة، أضفها
  IF NOT FOUND THEN
    INSERT INTO public.currency_exchange_rates (currency_code, currency_name, rate_to_egp)
    VALUES (p_currency_code, p_currency_code, p_rate_to_egp);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 8. RLS Policies لجدول أسعار العملات
ALTER TABLE public.currency_exchange_rates ENABLE ROW LEVEL SECURITY;

-- أي شخص يمكنه رؤية أسعار العملات
CREATE POLICY "Anyone can view currency rates" ON public.currency_exchange_rates
  FOR SELECT USING (true);

-- فقط الأدمن والمدير يمكنهم تحديث أسعار العملات
CREATE POLICY "Only admins can manage currency rates" ON public.currency_exchange_rates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- 9. Trigger لتحديث updated_at في جدول أسعار العملات
CREATE OR REPLACE FUNCTION update_currency_rates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_currency_rates_updated_at
  BEFORE UPDATE ON public.currency_exchange_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_currency_rates_updated_at();

-- 10. Function للحصول على سعر الصرف الحالي
CREATE OR REPLACE FUNCTION get_current_exchange_rate(p_currency_code TEXT DEFAULT 'AED')
RETURNS NUMERIC AS $$
DECLARE
  current_rate NUMERIC;
BEGIN
  SELECT rate_to_egp INTO current_rate
  FROM public.currency_exchange_rates
  WHERE currency_code = p_currency_code AND is_active = true
  LIMIT 1;
  
  RETURN COALESCE(current_rate, 8.5); -- القيمة الافتراضية إذا لم يتم العثور على السعر
END;
$$ LANGUAGE plpgsql;

-- ملاحظات:
-- 1. جدول currency_exchange_rates يحتفظ بأسعار الصرف ويتم تحديثها يومياً
-- 2. purchase_price_aed: سعر الشراء بالدرهم الإماراتي
-- 3. cost_multiplier: معامل التكلفة (يضرب في السعر الأصلي)
-- 4. selling_price_egp: سعر البيع بالجنيه المصري (يتم حسابه تلقائياً)
-- 5. عند إدخال purchase_price_aed و cost_multiplier، يتم حساب selling_price_egp تلقائياً
-- 6. الخصم المحدود: إذا انتهى، يتم نقله تلقائياً إلى الخصم العادي
-- 7. يمكن تحديث أسعار العملات عبر Edge Function يومياً

