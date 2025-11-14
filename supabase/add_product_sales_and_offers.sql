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

-- 6. دالة لتحديث عدد القطع المباعة عند إضافة عنصر طلب
CREATE OR REPLACE FUNCTION update_product_sold_count_from_order_item()
RETURNS TRIGGER AS $$
DECLARE
  order_status TEXT;
BEGIN
  -- الحصول على حالة الطلب
  SELECT status INTO order_status
  FROM public.orders
  WHERE id = NEW.order_id;
  
  -- تحديث عدد القطع المباعة فقط إذا كان الطلب مؤكد أو مكتمل
  IF order_status = 'completed' OR order_status = 'confirmed' THEN
    UPDATE public.products
    SET sold_count = sold_count + NEW.quantity
    WHERE id = NEW.product_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. دالة لتحديث عدد القطع المباعة عند تغيير حالة الطلب
CREATE OR REPLACE FUNCTION update_product_sold_count_on_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- إذا تم تغيير الحالة إلى 'completed' أو 'confirmed'
  IF (NEW.status = 'completed' OR NEW.status = 'confirmed') 
     AND (OLD.status IS NULL OR (OLD.status != 'completed' AND OLD.status != 'confirmed')) THEN
    -- زيادة عدد القطع المباعة لكل منتج في الطلب
    UPDATE public.products
    SET sold_count = sold_count + (
      SELECT COALESCE(SUM(oi.quantity), 0)
      FROM public.order_items oi
      WHERE oi.order_id = NEW.id AND oi.product_id = products.id
    )
    WHERE id IN (
      SELECT DISTINCT product_id
      FROM public.order_items
      WHERE order_id = NEW.id
    );
  -- إذا تم تغيير الحالة من 'completed' أو 'confirmed' إلى حالة أخرى
  ELSIF (OLD.status = 'completed' OR OLD.status = 'confirmed')
        AND (NEW.status != 'completed' AND NEW.status != 'confirmed') THEN
    -- تقليل عدد القطع المباعة (في حالة الإلغاء)
    UPDATE public.products
    SET sold_count = GREATEST(0, sold_count - (
      SELECT COALESCE(SUM(oi.quantity), 0)
      FROM public.order_items oi
      WHERE oi.order_id = NEW.id AND oi.product_id = products.id
    ))
    WHERE id IN (
      SELECT DISTINCT product_id
      FROM public.order_items
      WHERE order_id = NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Trigger لتحديث عدد القطع المباعة عند إضافة عنصر طلب
DROP TRIGGER IF EXISTS trigger_update_product_sold_count_from_order_item ON public.order_items;
CREATE TRIGGER trigger_update_product_sold_count_from_order_item
  AFTER INSERT ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_product_sold_count_from_order_item();

-- 9. Trigger لتحديث عدد القطع المباعة عند تغيير حالة الطلب
DROP TRIGGER IF EXISTS trigger_update_product_sold_count_on_order_status_change ON public.orders;
CREATE TRIGGER trigger_update_product_sold_count_on_order_status_change
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION update_product_sold_count_on_order_status_change();

-- 10. فهرس لتحسين البحث عن العروض النشطة
CREATE INDEX IF NOT EXISTS idx_products_limited_offer ON public.products(is_limited_time_offer, offer_end_date) 
WHERE is_limited_time_offer = true;

-- 9. فهرس لتحسين البحث عن المنتجات الأكثر مبيعاً
CREATE INDEX IF NOT EXISTS idx_products_sold_count ON public.products(sold_count DESC);

-- 10. ملاحظات:
-- - يمكن تشغيل remove_expired_offers() بشكل دوري (cron job) لإزالة العروض المنتهية
-- - عدد القطع المباعة يتم تحديثه تلقائياً عند إنشاء طلب جديد بحالة 'completed' أو 'confirmed'
-- - يمكن إضافة cron job في Supabase Edge Functions لتشغيل remove_expired_offers() كل ساعة

