-- ============================================
-- إضافة حقول المبيعات والعروض المحدودة للمنتجات
-- ============================================

-- 1. إضافة حقل عدد القطع المباعة
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS sold_count INTEGER DEFAULT 0;

COMMENT ON COLUMN public.products.sold_count IS 'عدد القطع المباعة (يتم تحديثه تلقائياً عند الطلب)';

-- 2. إضافة حقول العروض المحدودة
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS is_limited_time_offer BOOLEAN DEFAULT false;

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS offer_start_date TIMESTAMP WITH TIME ZONE NULL;

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS offer_duration_days INTEGER NULL; -- عدد الأيام للعرض

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS offer_end_date TIMESTAMP WITH TIME ZONE NULL; -- يتم حسابه تلقائياً

COMMENT ON COLUMN public.products.is_limited_time_offer IS 'هل المنتج في عرض محدود الوقت';
COMMENT ON COLUMN public.products.offer_start_date IS 'تاريخ بداية العرض';
COMMENT ON COLUMN public.products.offer_duration_days IS 'مدة العرض بالأيام';
COMMENT ON COLUMN public.products.offer_end_date IS 'تاريخ انتهاء العرض (يتم حسابه تلقائياً)';

-- 3. دالة لحساب تاريخ انتهاء العرض
CREATE OR REPLACE FUNCTION calculate_offer_end_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_limited_time_offer = true AND NEW.offer_start_date IS NOT NULL AND NEW.offer_duration_days IS NOT NULL THEN
    NEW.offer_end_date := NEW.offer_start_date + (NEW.offer_duration_days || ' days')::INTERVAL;
  ELSE
    NEW.offer_end_date := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger لحساب تاريخ انتهاء العرض تلقائياً
DROP TRIGGER IF EXISTS trigger_calculate_offer_end_date ON public.products;
CREATE TRIGGER trigger_calculate_offer_end_date
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION calculate_offer_end_date();

-- 5. دالة لإزالة الخصم تلقائياً عند انتهاء العرض
CREATE OR REPLACE FUNCTION remove_expired_offers()
RETURNS void AS $$
BEGIN
  UPDATE public.products
  SET 
    is_limited_time_offer = false,
    discount_percentage = NULL,
    original_price = NULL,
    offer_start_date = NULL,
    offer_duration_days = NULL,
    offer_end_date = NULL,
    updated_at = NOW()
  WHERE 
    is_limited_time_offer = true
    AND offer_end_date IS NOT NULL
    AND offer_end_date < NOW();
END;
$$ LANGUAGE plpgsql;

-- 6. دالة لتحديث عدد القطع المباعة عند الطلب
CREATE OR REPLACE FUNCTION update_product_sold_count()
RETURNS TRIGGER AS $$
BEGIN
  -- تحديث عدد القطع المباعة لكل منتج في الطلب
  IF TG_OP = 'INSERT' THEN
    -- عند إنشاء طلب جديد، نزيد عدد القطع المباعة
    UPDATE public.products
    SET sold_count = sold_count + (
      SELECT COALESCE(SUM(quantity), 0)
      FROM jsonb_array_elements(NEW.items::jsonb) AS item
      WHERE (item->>'product_id')::uuid = products.id
    )
    WHERE id IN (
      SELECT DISTINCT (item->>'product_id')::uuid
      FROM jsonb_array_elements(NEW.items::jsonb) AS item
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger لتحديث عدد القطع المباعة
DROP TRIGGER IF EXISTS trigger_update_product_sold_count ON public.orders;
CREATE TRIGGER trigger_update_product_sold_count
  AFTER INSERT ON public.orders
  FOR EACH ROW
  WHEN (NEW.status = 'completed' OR NEW.status = 'confirmed')
  EXECUTE FUNCTION update_product_sold_count();

-- 8. فهرس لتحسين البحث عن العروض النشطة
CREATE INDEX IF NOT EXISTS idx_products_limited_offer ON public.products(is_limited_time_offer, offer_end_date) 
WHERE is_limited_time_offer = true;

-- 9. فهرس لتحسين البحث عن المنتجات الأكثر مبيعاً
CREATE INDEX IF NOT EXISTS idx_products_sold_count ON public.products(sold_count DESC);

-- 10. ملاحظات:
-- - يمكن تشغيل remove_expired_offers() بشكل دوري (cron job) لإزالة العروض المنتهية
-- - عدد القطع المباعة يتم تحديثه تلقائياً عند إنشاء طلب جديد بحالة 'completed' أو 'confirmed'
-- - يمكن إضافة cron job في Supabase Edge Functions لتشغيل remove_expired_offers() كل ساعة

