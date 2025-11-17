import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Image,
  Dimensions,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { Order, Shipment, Inventory, Product, User, UserRole, Category, Section, ProductVariant, CategoryColor, CategorySize } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { uploadImageToImgBB } from '@/lib/imgbb';
import SweetAlert from '@/components/SweetAlert';
import { useSweetAlert } from '@/hooks/useSweetAlert';

export default function AdminScreen() {
  // Helper function to safely format numbers
  const formatPrice = (value: number | null | undefined): string => {
    const num = typeof value === 'number' && !isNaN(value) ? value : 0;
    return num.toFixed(2);
  };

  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'shipments' | 'inventory' | 'products' | 'users' | 'categories' | 'sections'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const sweetAlert = useSweetAlert();
  
  // State for adding categories when creating section
  const [showAddCategoryToSection, setShowAddCategoryToSection] = useState(false);
  const [sectionCategories, setSectionCategories] = useState<Array<{
    name: string;
    description: string;
    icon: string;
    display_order: string;
    is_active: boolean;
  }>>([]);

  // Form states
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    original_price: '', // Original price before discount
    discount_percentage: '', // Discount percentage (0-100)
    section_id: '', // Section ID - للفلترة
    category: '',
    category_id: '', // Category ID from categories table
    stock_quantity: '',
    source_type: 'warehouse' as 'warehouse' | 'external', // مصدر المنتج
    sku: '', // كود المنتج الفريد
    // image_url removed - all images are stored in product_images table using imgbb links
    sold_count: '0', // عدد القطع المباعة (يتم تحديثه تلقائياً)
    is_limited_time_offer: false, // عرض محدود الوقت
    offer_duration_days: '', // مدة العرض بالأيام
  });
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    icon: '',
    display_order: '0',
    is_active: true,
    section_id: '', // Section ID
  });
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newSection, setNewSection] = useState({
    name: '',
    description: '',
    icon: '',
    display_order: '0',
    is_active: true,
  });
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editingInventoryId, setEditingInventoryId] = useState<string | null>(null);
  const [quickEditSection, setQuickEditSection] = useState<{ [key: string]: Partial<Section> }>({});
  const [quickEditCategory, setQuickEditCategory] = useState<{ [key: string]: Partial<Category> }>({});
  const [quickEditProduct, setQuickEditProduct] = useState<{ [key: string]: Partial<Product> }>({});
  const [quickEditOrder, setQuickEditOrder] = useState<{ [key: string]: Partial<Order> }>({});
  const [quickEditInventory, setQuickEditInventory] = useState<{ [key: string]: Partial<Inventory> }>({});
  const [showSectionDropdown, setShowSectionDropdown] = useState(false);
  const [newCategoryForSection, setNewCategoryForSection] = useState({
    name: '',
    description: '',
    icon: '',
    display_order: '0',
    is_active: true,
  });
  const [productImages, setProductImages] = useState<Array<{ uri: string; url?: string; variantId?: string }>>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editProductImages, setEditProductImages] = useState<Array<{ uri: string; url?: string; variantId?: string }>>([]);
  // Product variants management
  const [productVariants, setProductVariants] = useState<ProductVariant[]>([]);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [newVariant, setNewVariant] = useState({
    color: '',
    size: '',
    size_unit: '',
    price: '',
    stock_quantity: '',
    sku: '',
    image_url: '',
  });
  // Category variant options (colors and sizes)
  const [categoryColors, setCategoryColors] = useState<CategoryColor[]>([]);
  const [categorySizes, setCategorySizes] = useState<CategorySize[]>([]);
  const [showColorInput, setShowColorInput] = useState(false);
  const [showSizeInput, setShowSizeInput] = useState(false);
  // Category variant management
  const [selectedCategoryForVariants, setSelectedCategoryForVariants] = useState<string | null>(null);
  const [categoryColorsList, setCategoryColorsList] = useState<CategoryColor[]>([]);
  const [categorySizesList, setCategorySizesList] = useState<CategorySize[]>([]);
  const [newCategoryColor, setNewCategoryColor] = useState({ color_name: '', color_hex: '', display_order: '0' });
  const [newCategorySize, setNewCategorySize] = useState({ size_value: '', size_unit: '', display_order: '0' });
  const [newShipment, setNewShipment] = useState({
    cost: '',
    order_ids: [] as string[],
  });
  
  // Products filtering and sorting
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [productFilterSection, setProductFilterSection] = useState<string | null>(null);
  const [productFilterCategory, setProductFilterCategory] = useState<string | null>(null);
  const [productFilterSource, setProductFilterSource] = useState<'all' | 'warehouse' | 'external'>('all');
  const [productSortBy, setProductSortBy] = useState<'date' | 'name' | 'price' | 'stock'>('date');
  const [productSortOrder, setProductSortOrder] = useState<'asc' | 'desc'>('desc');
  const [productCurrentPage, setProductCurrentPage] = useState(1);
  const [productsPerPage] = useState(12);
  const [productVariantsCount, setProductVariantsCount] = useState<{ [key: string]: number }>({});
  
  // Cache for access token to avoid repeated calls
  const [cachedAccessToken, setCachedAccessToken] = useState<string | null>(null);
  const [tokenExpiresAt, setTokenExpiresAt] = useState<number | null>(null);

  useEffect(() => {
    checkUserRole();
  }, []);

  useEffect(() => {
    if (user && ['admin', 'manager'].includes(user.role)) {
      loadData();
    }
  }, [user, activeTab]);

  // Reset page when filters change
  useEffect(() => {
    setProductCurrentPage(1);
  }, [productSearchQuery, productFilterSection, productFilterCategory, productFilterSource, productSortBy, productSortOrder]);

  // Load category colors and sizes when category is selected
  useEffect(() => {
    if (newProduct.category_id) {
      loadCategoryVariantOptions(newProduct.category_id);
    } else {
      setCategoryColors([]);
      setCategorySizes([]);
    }
  }, [newProduct.category_id]);

  // Memoize filtered and sorted products
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = [...products];
    
    // Search filter
    if (productSearchQuery.trim()) {
      const query = productSearchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.sku?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      );
    }
    
    // Section filter
    if (productFilterSection) {
      filtered = filtered.filter(p => {
        const sectionId = p.category_data?.section_id || p.category_data?.section_data?.id;
        return sectionId === productFilterSection;
      });
    }
    
    // Category filter
    if (productFilterCategory) {
      filtered = filtered.filter(p => p.category_id === productFilterCategory);
    }
    
    // Source filter
    if (productFilterSource !== 'all') {
      filtered = filtered.filter(p => p.source_type === productFilterSource);
    }
    
    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (productSortBy) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '', 'ar');
          break;
        case 'price':
          comparison = (a.price || 0) - (b.price || 0);
          break;
        case 'stock':
          comparison = (a.stock_quantity || 0) - (b.stock_quantity || 0);
          break;
        case 'date':
        default:
          comparison = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
          break;
      }
      
      return productSortOrder === 'asc' ? comparison : -comparison;
    });
    
    return filtered;
  }, [products, productSearchQuery, productFilterSection, productFilterCategory, productFilterSource, productSortBy, productSortOrder]);

  // Memoize paginated products
  const paginatedProductsData = useMemo(() => {
    const startIndex = (productCurrentPage - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    return {
      products: filteredAndSortedProducts.slice(startIndex, endIndex),
      totalPages: Math.ceil(filteredAndSortedProducts.length / productsPerPage),
      totalProducts: filteredAndSortedProducts.length,
    };
  }, [filteredAndSortedProducts, productCurrentPage, productsPerPage]);

  const loadUsers = async () => {
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      // Get access_token (with auto-refresh if expired)
      const accessToken = await getAccessToken();
      
      const response = await fetch(`${supabaseUrl}/rest/v1/users?select=*&order=created_at.desc`, {
        headers: {
          'apikey': supabaseKey || '',
          'Authorization': `Bearer ${accessToken}`, // Use access_token for RLS
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data || []);
      } else {
        console.error('❌ Error loading users:', await response.text());
      }
    } catch (error) {
      console.error('❌ Error loading users:', error);
    }
  };

  const loadSections = async () => {
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      // Get access_token (with auto-refresh if expired)
      const accessToken = await getAccessToken();
      
      const response = await fetch(`${supabaseUrl}/rest/v1/sections?select=*&order=display_order.asc,name.asc`, {
        headers: {
          'apikey': supabaseKey || '',
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSections(data || []);
        console.log('✅ Admin: Sections loaded:', data?.length || 0);
      } else {
        console.error('❌ Admin: Error loading sections:', await response.text());
      }
    } catch (error) {
      console.error('❌ Admin: Error loading sections:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      // Get access_token (with auto-refresh if expired)
      const accessToken = await getAccessToken();
      
      const response = await fetch(`${supabaseUrl}/rest/v1/categories?select=*,sections(*)&order=display_order.asc,name.asc`, {
        headers: {
          'apikey': supabaseKey || '',
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Admin: Raw categories data:', JSON.stringify(data, null, 2));
        // تحويل sections array إلى section_data object
        const categoriesWithSectionData = (data || []).map((category: any) => {
          console.log('🔍 Admin: Category:', category.name, 'sections:', category.sections);
          return {
            ...category,
            section_data: category.sections?.[0] || category.sections || null,
          };
        });
        console.log('🔍 Admin: Processed categories:', JSON.stringify(categoriesWithSectionData, null, 2));
        setCategories(categoriesWithSectionData);
        console.log('✅ Admin: Categories loaded:', categoriesWithSectionData?.length || 0);
      } else {
        console.error('❌ Admin: Error loading categories:', await response.text());
      }
    } catch (error) {
      console.error('❌ Admin: Error loading categories:', error);
    }
  };

  const addCategory = async () => {
    if (!newCategory.name) {
      sweetAlert.showError('خطأ', 'يرجى إدخال اسم الفئة');
      return;
    }

    setLoading(true);
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      const accessToken = await getAccessToken();

      const response = await fetch(`${supabaseUrl}/rest/v1/categories`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey || '',
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          name: newCategory.name,
          description: newCategory.description || null,
          icon: newCategory.icon || null,
          display_order: parseInt(newCategory.display_order) || 0,
          is_active: newCategory.is_active,
          section_id: newCategory.section_id || null,
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      sweetAlert.showSuccess('نجح', 'تم إضافة الفئة بنجاح', () => {
        setNewCategory({
          name: '',
          description: '',
          icon: '',
          display_order: '0',
          is_active: true,
          section_id: '',
        });
        setEditingCategory(null);
        setShowSectionDropdown(false);
        loadCategories();
      });
    } catch (error: any) {
      console.error('❌ Error adding category:', error);
      sweetAlert.showError('خطأ', error.message || 'فشل إضافة الفئة');
    } finally {
      setLoading(false);
    }
  };

  const updateCategory = async () => {
    if (!editingCategory || !newCategory.name) {
      sweetAlert.showError('خطأ', 'يرجى إدخال اسم الفئة');
      return;
    }

    setLoading(true);
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      const accessToken = await getAccessToken();

      const response = await fetch(`${supabaseUrl}/rest/v1/categories?id=eq.${editingCategory.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey || '',
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          name: newCategory.name,
          description: newCategory.description || null,
          icon: newCategory.icon || null,
          display_order: parseInt(newCategory.display_order) || 0,
          is_active: newCategory.is_active,
          section_id: newCategory.section_id || null,
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      sweetAlert.showSuccess('نجح', 'تم تحديث الفئة بنجاح', () => {
        setNewCategory({
          name: '',
          description: '',
          icon: '',
          display_order: '0',
          is_active: true,
          section_id: '',
        });
        setEditingCategory(null);
        setShowSectionDropdown(false);
        loadCategories();
      });
    } catch (error: any) {
      console.error('❌ Error updating category:', error);
      sweetAlert.showError('خطأ', error.message || 'فشل تحديث الفئة');
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (categoryId: string) => {
    sweetAlert.showConfirm(
      'تأكيد الحذف',
      'هل أنت متأكد من حذف هذه الفئة؟ سيتم إزالة الفئة من جميع المنتجات المرتبطة بها.',
      async () => {
        setLoading(true);
        try {
          const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
          const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
          const accessToken = await getAccessToken();

          const response = await fetch(`${supabaseUrl}/rest/v1/categories?id=eq.${categoryId}`, {
            method: 'DELETE',
            headers: {
              'apikey': supabaseKey || '',
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            }
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText);
          }

          sweetAlert.showSuccess('نجح', 'تم حذف الفئة بنجاح', () => {
            loadCategories();
          });
        } catch (error: any) {
          console.error('❌ Error deleting category:', error);
          sweetAlert.showError('خطأ', error.message || 'فشل حذف الفئة');
        } finally {
          setLoading(false);
        }
      },
      undefined,
      'حذف',
      'إلغاء'
    );
    return;
    
    // Old code (kept for reference, will be removed)
    if (false && typeof window !== 'undefined' && Platform.OS === 'web') {
      if (!window.confirm('هل أنت متأكد من حذف هذه الفئة؟ سيتم إزالة الفئة من جميع المنتجات المرتبطة بها.')) {
        return;
      }
    } else {
      Alert.alert('تأكيد', 'هل أنت متأكد من حذف هذه الفئة؟', [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'حذف', style: 'destructive', onPress: () => performDeleteCategory(categoryId) },
      ]);
      return;
    }
    
    performDeleteCategory(categoryId);
  };

  const performDeleteCategory = async (categoryId: string) => {
    setLoading(true);
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      const accessToken = await getAccessToken();

      const response = await fetch(`${supabaseUrl}/rest/v1/categories?id=eq.${categoryId}`, {
        method: 'DELETE',
        headers: {
          'apikey': supabaseKey || '',
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      if (typeof window !== 'undefined' && Platform.OS === 'web') {
        window.alert('تم حذف الفئة بنجاح');
      } else {
        Alert.alert('نجح', 'تم حذف الفئة بنجاح');
      }
      
      await loadCategories();
    } catch (error: any) {
      console.error('❌ Error deleting category:', error);
      if (typeof window !== 'undefined' && Platform.OS === 'web') {
        window.alert(error.message || 'فشل حذف الفئة');
      } else {
        Alert.alert('خطأ', error.message || 'فشل حذف الفئة');
      }
    } finally {
      setLoading(false);
    }
  };

  const startEditCategory = (category: Category) => {
    setEditingCategory(category);
    setNewCategory({
      name: category.name,
      description: category.description || '',
      icon: category.icon || '',
      display_order: category.display_order.toString(),
      is_active: category.is_active,
      section_id: category.section_id || '',
    });
  };

  const cancelEditCategory = () => {
    setEditingCategory(null);
    setNewCategory({
      name: '',
      description: '',
      icon: '',
      display_order: '0',
      is_active: true,
      section_id: '',
    });
    setShowSectionDropdown(false);
  };

  // Sections management functions
  const addSection = async () => {
    if (!newSection.name) {
      sweetAlert.showError('خطأ', 'يرجى إدخال اسم القسم');
      return;
    }

    setLoading(true);
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      const accessToken = await getAccessToken();

      const response = await fetch(`${supabaseUrl}/rest/v1/sections`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey || '',
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          name: newSection.name,
          description: newSection.description || null,
          icon: newSection.icon || null,
          display_order: parseInt(newSection.display_order) || 0,
          is_active: newSection.is_active,
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      const sectionData = await response.json();
      const createdSection = Array.isArray(sectionData) ? sectionData[0] : sectionData;
      const sectionId = createdSection.id;

      // Add categories if any were added
      if (sectionCategories.length > 0) {
        for (const cat of sectionCategories) {
          try {
            await fetch(`${supabaseUrl}/rest/v1/categories`, {
              method: 'POST',
              headers: {
                'apikey': supabaseKey || '',
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: cat.name,
                description: cat.description || null,
                icon: cat.icon || null,
                display_order: parseInt(cat.display_order) || 0,
                is_active: cat.is_active,
                section_id: sectionId,
              })
            });
          } catch (catError) {
            console.error('Error adding category:', catError);
          }
        }
      }

      sweetAlert.showSuccess('نجح', 'تم إضافة القسم بنجاح', () => {
        setNewSection({
          name: '',
          description: '',
          icon: '',
          display_order: '0',
          is_active: true,
        });
        setSectionCategories([]);
        setShowAddCategoryToSection(false);
        setEditingSection(null);
        loadSections();
        loadCategories();
      });
    } catch (error: any) {
      console.error('❌ Error adding section:', error);
      sweetAlert.showError('خطأ', error.message || 'فشل إضافة القسم');
    } finally {
      setLoading(false);
    }
  };

  const updateSection = async () => {
    if (!editingSection || !newSection.name) {
      sweetAlert.showError('خطأ', 'يرجى إدخال اسم القسم');
      return;
    }

    setLoading(true);
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      const accessToken = await getAccessToken();

      const response = await fetch(`${supabaseUrl}/rest/v1/sections?id=eq.${editingSection.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey || '',
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          name: newSection.name,
          description: newSection.description || null,
          icon: newSection.icon || null,
          display_order: parseInt(newSection.display_order) || 0,
          is_active: newSection.is_active,
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      sweetAlert.showSuccess('نجح', 'تم تحديث القسم بنجاح', () => {
        setNewSection({
          name: '',
          description: '',
          icon: '',
          display_order: '0',
          is_active: true,
        });
        setEditingSection(null);
        loadSections();
      });
    } catch (error: any) {
      console.error('❌ Error updating section:', error);
      sweetAlert.showError('خطأ', error.message || 'فشل تحديث القسم');
    } finally {
      setLoading(false);
    }
  };

  const deleteSection = async (sectionId: string) => {
    sweetAlert.showConfirm(
      'تأكيد الحذف',
      'هل أنت متأكد من حذف هذا القسم؟ سيتم إزالة القسم من جميع الفئات المرتبطة به.',
      async () => {
        setLoading(true);
        try {
          const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
          const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
          const accessToken = await getAccessToken();

          const response = await fetch(`${supabaseUrl}/rest/v1/sections?id=eq.${sectionId}`, {
            method: 'DELETE',
            headers: {
              'apikey': supabaseKey || '',
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            }
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText);
          }

          sweetAlert.showSuccess('نجح', 'تم حذف القسم بنجاح', () => {
            loadSections();
          });
        } catch (error: any) {
          console.error('❌ Error deleting section:', error);
          sweetAlert.showError('خطأ', error.message || 'فشل حذف القسم');
        } finally {
          setLoading(false);
        }
      },
      undefined,
      'حذف',
      'إلغاء'
    );
  };

  const startEditSection = (section: Section) => {
    setEditingSection(section);
    setNewSection({
      name: section.name,
      description: section.description || '',
      icon: section.icon || '',
      display_order: section.display_order.toString(),
      is_active: section.is_active,
    });
  };

  const cancelEditSection = () => {
    setEditingSection(null);
    setNewSection({
      name: '',
      description: '',
      icon: '',
      display_order: '0',
      is_active: true,
    });
  };

  const refreshTokenIfNeeded = async (): Promise<string | null> => {
    try {
      // Try to refresh session
      const { data: { session }, error } = await supabase.auth.refreshSession();
      if (session && !error) {
        // Save new tokens to localStorage
        if (typeof window !== 'undefined') {
          const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
          const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || 'default';
          const storageKey = `sb-${projectRef}-auth-token`;
          
          const sessionData = {
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_at: session.expires_at,
            expires_in: session.expires_in,
            token_type: session.token_type,
            user: session.user,
          };
          
          localStorage.setItem(storageKey, JSON.stringify(sessionData));
          console.log('✅ Admin: Token refreshed and saved');
          return session.access_token;
        }
      }
      return null;
    } catch (error) {
      console.log('⚠️ Admin: Could not refresh token');
      return null;
    }
  };

  // Helper function to decode JWT token and extract user info
  const decodeJWT = (token: string): any => {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        return {
          id: payload.sub,
          email: payload.email,
          user_metadata: payload.user_metadata || {},
          app_metadata: payload.app_metadata || {},
        };
      }
    } catch (e) {
      console.error('❌ Error decoding JWT:', e);
    }
    return null;
  };

  // Helper function to get full session from localStorage
  const getSessionFromStorage = async (): Promise<any> => {
    if (typeof window === 'undefined') return null;
    
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
      const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || 'default';
      const storageKey = `sb-${projectRef}-auth-token`;
      const tokenData = localStorage.getItem(storageKey);
      
      if (tokenData) {
        const parsed = JSON.parse(tokenData);
        
        // If user is missing, try to decode it from access_token
        if (!parsed.user && parsed.access_token) {
          console.log('🔑 User missing from session data, decoding from JWT...');
          const decodedUser = decodeJWT(parsed.access_token);
          if (decodedUser) {
            parsed.user = decodedUser;
            console.log('✅ User decoded from JWT:', decodedUser.id);
          }
        }
        
        return parsed;
      }
    } catch (e) {
      console.log('⚠️ Admin: Error reading session from localStorage');
    }
    
    return null;
  };

  // Fast access token getter - uses cache and localStorage directly (no getSession timeout)
  const getAccessToken = async (): Promise<string> => {
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
    
    // Check cache first (fastest)
    if (cachedAccessToken && tokenExpiresAt) {
      const now = Date.now() / 1000;
      // If token expires in more than 5 minutes, use cached token
      if (tokenExpiresAt - now > 300) {
        return cachedAccessToken;
      }
    }
    
    // Get from localStorage directly (fast, no timeout)
    if (typeof window !== 'undefined') {
      try {
        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
        const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || 'default';
        const storageKey = `sb-${projectRef}-auth-token`;
        const tokenData = localStorage.getItem(storageKey);
        
        if (tokenData) {
          const parsed = JSON.parse(tokenData);
          const accessToken = parsed?.access_token || '';
          const expiresAt = parsed?.expires_at;
          
          if (accessToken) {
            // Update cache
            setCachedAccessToken(accessToken);
            setTokenExpiresAt(expiresAt || null);
            
            // Check if token is expired (with 5 minute buffer)
            if (expiresAt && Date.now() / 1000 >= expiresAt - 300) {
              console.log('⚠️ Admin: Token expired, refreshing...');
              const newToken = await refreshTokenIfNeeded();
              if (newToken) {
                setCachedAccessToken(newToken);
                return newToken;
              }
            }
            
            return accessToken;
          }
        }
      } catch (e) {
        console.log('⚠️ Admin: Error reading token from localStorage');
      }
    }
    
    // Last resort: try getSession (with timeout) - only if localStorage failed
    try {
      const sessionPromise = supabase.auth.getSession();
      const sessionTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Session timeout')), 1000) // Reduced timeout to 1 second
      );
      
      const sessionResult = await Promise.race([sessionPromise, sessionTimeout]) as any;
      const session = sessionResult?.data?.session;
      
      if (session && session.access_token) {
        setCachedAccessToken(session.access_token);
        setTokenExpiresAt(session.expires_at || null);
        return session.access_token;
      }
    } catch (sessionError) {
      // Ignore - will use anon key
    }
    
    // Last resort: return anon key (but this will fail RLS policies)
    console.warn('⚠️ Admin: No access_token found, using anon key (RLS policies may fail)');
    return supabaseKey;
  };

  const checkUserRole = async () => {
    try {
      console.log('🔐 Admin: Checking user role...');
      setLoading(true);
      
      // Get user ID from localStorage (more reliable on web)
      let userId: string | null = null;
      
      if (typeof window !== 'undefined') {
        try {
          const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
          const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || 'default';
          const storageKey = `sb-${projectRef}-auth-token`;
          
          const tokenData = localStorage.getItem(storageKey);
          if (tokenData) {
            const parsed = JSON.parse(tokenData);
            userId = parsed?.user?.id || parsed?.currentSession?.user?.id;
            if (userId) {
              console.log('✅ Admin: Got user ID from localStorage:', userId);
            }
          }
          
          // Fallback: search all localStorage keys
          if (!userId) {
            const allKeys = Object.keys(localStorage);
            for (const key of allKeys) {
              if (key.includes('supabase') || key.includes('auth')) {
                try {
                  const data = localStorage.getItem(key);
                  if (data) {
                    const parsed = JSON.parse(data);
                    userId = parsed?.user?.id || parsed?.currentSession?.user?.id || parsed?.session?.user?.id;
                    if (userId) {
                      console.log('✅ Admin: Got user ID from localStorage key:', key);
                      break;
                    }
                  }
                } catch (e) {
                  // Continue searching
                }
              }
            }
          }
        } catch (e) {
          console.log('⚠️ Admin: Error reading localStorage:', e);
        }
      }
      
      // Fallback: Try getSession with timeout
      if (!userId) {
        try {
          const sessionPromise = supabase.auth.getSession();
          const sessionTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Session timeout')), 2000)
          );
          
          const sessionResult = await Promise.race([sessionPromise, sessionTimeout]) as any;
          userId = sessionResult?.data?.session?.user?.id;
          if (userId) {
            console.log('✅ Admin: Got user ID from getSession:', userId);
          }
        } catch (sessionError) {
          console.log('⚠️ Admin: getSession timeout');
        }
      }
      
      if (!userId) {
        console.log('❌ Admin: No user ID found, redirecting to auth');
        setLoading(false);
        router.replace('/auth');
        return;
      }

      // Use fetch for web compatibility
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      // Get access_token (with auto-refresh if expired)
      const accessToken = await getAccessToken();
      if (accessToken && accessToken !== supabaseKey) {
        console.log('✅ Admin: Got access_token from localStorage');
      }
      
      console.log('📡 Admin: Fetching user data...');
      const userResponse = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${userId}&select=*`, {
        headers: {
          'apikey': supabaseKey || '',
          'Authorization': `Bearer ${accessToken}`, // Use access_token for RLS
          'Content-Type': 'application/json',
        }
      });

      console.log('📡 Admin: User response status:', userResponse.status);
      if (userResponse.ok) {
        const userDataArray = await userResponse.json();
        const userData = userDataArray[0];
        console.log('📡 Admin: User data:', userData ? `Role: ${userData.role}` : 'No user data');

        if (!userData || !['admin', 'manager'].includes(userData.role)) {
          console.log('❌ Admin: User does not have admin/manager role. Current role:', userData?.role || 'none');
          setLoading(false);
          Alert.alert(
            'غير مصرح', 
            `ليس لديك صلاحية للوصول لهذه الصفحة. دورك الحالي: ${userData?.role === 'customer' ? 'مستخدم' : userData?.role || 'غير معروف'}. يرجى التواصل مع المدير لتغيير دورك.`,
            [
              {
                text: 'موافق',
                onPress: () => router.replace('/(tabs)')
              }
            ]
          );
          return;
        }

        console.log('✅ Admin: User authorized, setting user data');
        setUser(userData);
        setLoading(false);
      } else {
        const errorText = await userResponse.text();
        console.error('❌ Admin: Error fetching user data:', errorText);
        setLoading(false);
        router.replace('/auth');
      }
    } catch (error) {
      console.error('❌ Admin: Error checking user role:', error);
      setLoading(false);
      router.replace('/auth');
    }
  };

  const loadData = async () => {
    console.log('📡 Admin: Loading data for tab:', activeTab);
    setLoading(true);
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      // Get access_token once and reuse it for all requests (much faster)
      const accessToken = await getAccessToken();
      
      if (activeTab === 'orders') {
        const response = await fetch(`${supabaseUrl}/rest/v1/orders?select=*&order=created_at.desc`, {
          headers: {
            'apikey': supabaseKey || '',
            'Authorization': `Bearer ${accessToken}`, // Use access_token for RLS
            'Content-Type': 'application/json',
          }
        });
        if (response.ok) {
          const data = await response.json();
          setOrders(data || []);
          console.log('✅ Admin: Orders loaded:', data?.length || 0);
        } else {
          console.error('❌ Admin: Error loading orders:', await response.text());
        }
      } else if (activeTab === 'shipments') {
        const response = await fetch(`${supabaseUrl}/rest/v1/shipments?select=*&order=created_at.desc`, {
          headers: {
            'apikey': supabaseKey || '',
            'Authorization': `Bearer ${accessToken}`, // Use access_token for RLS
            'Content-Type': 'application/json',
          }
        });
        if (response.ok) {
          const data = await response.json();
          setShipments(data || []);
          console.log('✅ Admin: Shipments loaded:', data?.length || 0);
        } else {
          console.error('❌ Admin: Error loading shipments:', await response.text());
        }
      } else if (activeTab === 'inventory') {
        const response = await fetch(`${supabaseUrl}/rest/v1/inventory?select=*,products(*)&order=created_at.desc`, {
          headers: {
            'apikey': supabaseKey || '',
            'Authorization': `Bearer ${accessToken}`, // Use access_token for RLS
            'Content-Type': 'application/json',
          }
        });
        if (response.ok) {
          const data = await response.json();
          setInventory(data || []);
          console.log('✅ Admin: Inventory loaded:', data?.length || 0);
        } else {
          console.error('❌ Admin: Error loading inventory:', await response.text());
        }
      } else if (activeTab === 'products') {
        // Get access token once for all product-related requests
        const productsAccessToken = accessToken;
        
        // Load sections and categories first (needed for product form) - in parallel
        const [sectionsResult, categoriesResult] = await Promise.all([
          loadSections(),
          loadCategories()
        ]);
        
        // Load products with category and section data in one query using nested select
        // Also load primary image and variants count in parallel
        const productsResponse = await fetch(
          `${supabaseUrl}/rest/v1/products?select=*,category_data:categories(*,section_data:sections(*))&order=created_at.desc`,
          {
            headers: {
              'apikey': supabaseKey || '',
              'Authorization': `Bearer ${productsAccessToken}`,
              'Content-Type': 'application/json',
            }
          }
        );
        
        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          
          // Get all product IDs for parallel loading
          const productIds = productsData.map((p: any) => p.id);
          
          // Initialize maps
          const variantsCountMap: { [key: string]: number } = {};
          const primaryImagesMap: { [key: string]: string } = {};
          
          // Only load variants and images if we have products
          if (productIds.length > 0) {
            // Load variants count and primary images in parallel
            const [variantsCountData, primaryImagesData] = await Promise.all([
              // Load variants count
              fetch(
                `${supabaseUrl}/rest/v1/product_variants?select=product_id&product_id=in.(${productIds.map((id: string) => `"${id}"`).join(',')})`,
                {
                  headers: {
                    'apikey': supabaseKey || '',
                    'Authorization': `Bearer ${productsAccessToken}`,
                    'Content-Type': 'application/json',
                  }
                }
              ).then(res => res.ok ? res.json() : []).catch(() => []),
              // Load primary images (one per product)
              fetch(
                `${supabaseUrl}/rest/v1/product_images?select=product_id,image_url&is_primary=eq.true&variant_id=is.null&product_id=in.(${productIds.map((id: string) => `"${id}"`).join(',')})`,
                {
                  headers: {
                    'apikey': supabaseKey || '',
                    'Authorization': `Bearer ${productsAccessToken}`,
                    'Content-Type': 'application/json',
                  }
                }
              ).then(res => res.ok ? res.json() : []).catch(() => [])
            ]);
            
            // Create maps for fast lookup
            variantsCountData.forEach((variant: any) => {
              variantsCountMap[variant.product_id] = (variantsCountMap[variant.product_id] || 0) + 1;
            });
            
            primaryImagesData.forEach((img: any) => {
              if (!primaryImagesMap[img.product_id]) {
                primaryImagesMap[img.product_id] = img.image_url;
              }
            });
          }
          
          // Initialize all products with 0 variants if they have no variants
          productIds.forEach(id => {
            if (!variantsCountMap[id]) {
              variantsCountMap[id] = 0;
            }
          });
          
          // Process products with variants count and primary image
          const processedData = productsData.map((product: any) => ({
            ...product,
            variants_count: variantsCountMap[product.id] || 0,
            primary_image_url: primaryImagesMap[product.id] || null,
          }));
          
          setProducts(processedData);
          setProductVariantsCount(variantsCountMap);
          console.log('✅ Admin: Products loaded:', processedData?.length || 0);
        } else {
          console.error('❌ Admin: Error loading products:', await productsResponse.text());
        }
      } else if (activeTab === 'users') {
        await loadUsers();
      } else if (activeTab === 'categories') {
        await loadCategories();
        await loadSections(); // Load sections for category dropdown
      } else if (activeTab === 'sections') {
        await loadSections();
      }
    } catch (error) {
      console.error('❌ Admin: Error loading data:', error);
    } finally {
      setLoading(false);
      console.log('✅ Admin: Loading finished');
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true, // Allow multiple images
      quality: 0.8,
      // Note: allowsEditing is not supported with allowsMultipleSelection
    });

    if (!result.canceled && result.assets.length > 0) {
      try {
        setLoading(true);
        const uploadedImages = [];
        
        for (const asset of result.assets) {
          try {
            const imageUrl = await uploadImageToImgBB(asset.uri);
            uploadedImages.push({ uri: asset.uri, url: imageUrl });
          } catch (error) {
            console.error('Error uploading image:', error);
          }
        }
        
        if (uploadedImages.length > 0) {
          setProductImages([...productImages, ...uploadedImages]);
          // Images are stored in product_images table using imgbb links, no need to set image_url
          
          if (typeof window !== 'undefined' && Platform.OS === 'web') {
            window.alert(`تم رفع ${uploadedImages.length} صورة بنجاح`);
          } else {
            Alert.alert('نجح', `تم رفع ${uploadedImages.length} صورة بنجاح`);
          }
        }
      } catch (error) {
        console.error('Error uploading images:', error);
        if (typeof window !== 'undefined' && Platform.OS === 'web') {
          window.alert('فشل رفع الصور');
        } else {
          Alert.alert('خطأ', 'فشل رفع الصور');
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const removeImage = (index: number) => {
    const newImages = productImages.filter((_, i) => i !== index);
    setProductImages(newImages);
    // Images are stored in product_images table, no need to update image_url
  };

  const setPrimaryImage = (index: number) => {
    if (productImages[index]?.url) {
      // Reorder images to put primary first
      // Primary image is determined by is_primary flag in product_images table
      const reordered = [
        productImages[index],
        ...productImages.filter((_, i) => i !== index)
      ];
      setProductImages(reordered);
    }
  };

  // Variant management functions
  const pickVariantImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      try {
        setLoading(true);
        const imageUrl = await uploadImageToImgBB(result.assets[0].uri);
        setNewVariant({ ...newVariant, image_url: imageUrl });
        sweetAlert.showSuccess('نجح', 'تم رفع الصورة بنجاح');
      } catch (error) {
        console.error('Error uploading variant image:', error);
        sweetAlert.showError('خطأ', 'فشل رفع الصورة');
      } finally {
        setLoading(false);
      }
    }
  };

  const addVariant = () => {
    console.log('🔄 Adding variant:', newVariant);
    console.log('🖼️ Variant image_url:', newVariant.image_url);
    
    if (!newVariant.color && !newVariant.size) {
      sweetAlert.showError('خطأ', 'يرجى إدخال لون أو مقاس على الأقل');
      return;
    }

    // Use functional update to ensure we get the latest state
    setProductVariants((prevVariants) => {
      const variant: ProductVariant = {
        id: `temp-${Date.now()}-${Math.random()}`,
        product_id: editingProduct?.id || '',
        variant_name: `${newVariant.color || ''}${newVariant.color && newVariant.size ? ' - ' : ''}${newVariant.size || ''}`.trim(),
        color: newVariant.color || null,
        size: newVariant.size || null,
        size_unit: newVariant.size_unit || null,
        material: null,
        price: newVariant.price ? parseFloat(newVariant.price) : null,
        stock_quantity: newVariant.stock_quantity ? parseInt(newVariant.stock_quantity) : 0,
        sku: newVariant.sku || null,
        image_url: newVariant.image_url || null,
        is_active: true,
        is_default: prevVariants.length === 0,
        display_order: prevVariants.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log('✅ Variant created:', variant);
      console.log('🖼️ Variant image_url in created variant:', variant.image_url);
      console.log('📦 Current variants count:', prevVariants.length);
      
      const updatedVariants = [...prevVariants, variant];
      console.log('✅ Variants updated, new count:', updatedVariants.length);
      console.log('🖼️ All variants images:', updatedVariants.map((v: any) => ({ color: v.color, size: v.size, image_url: v.image_url })));
      
      return updatedVariants;
    });
    
    setNewVariant({
      color: '',
      size: '',
      size_unit: '',
      price: '',
      stock_quantity: '',
      sku: '',
      image_url: '',
    });
    
    sweetAlert.showSuccess('نجح', 'تم إضافة المتغير بنجاح');
  };

  const startEditVariant = (variant: ProductVariant) => {
    setEditingVariant(variant);
    setNewVariant({
      color: variant.color || '',
      size: variant.size || '',
      size_unit: variant.size_unit || '',
      price: variant.price?.toString() || '',
      stock_quantity: variant.stock_quantity?.toString() || '',
      sku: variant.sku || '',
      image_url: variant.image_url || '',
    });
  };

  const cancelEditVariant = () => {
    setEditingVariant(null);
    setNewVariant({
      color: '',
      size: '',
      size_unit: '',
      price: '',
      stock_quantity: '',
      sku: '',
      image_url: '',
    });
    setShowColorInput(false);
    setShowSizeInput(false);
  };

  const updateVariant = () => {
    if (!editingVariant) return;

    if (!newVariant.color && !newVariant.size) {
      sweetAlert.showError('خطأ', 'يرجى إدخال لون أو مقاس على الأقل');
      return;
    }

    setProductVariants((prevVariants) => {
      return prevVariants.map((variant) => {
        if (variant.id === editingVariant.id) {
          return {
            ...variant,
            variant_name: `${newVariant.color || ''}${newVariant.color && newVariant.size ? ' - ' : ''}${newVariant.size || ''}`.trim(),
            color: newVariant.color || null,
            size: newVariant.size || null,
            size_unit: newVariant.size_unit || null,
            price: newVariant.price ? parseFloat(newVariant.price) : null,
            stock_quantity: newVariant.stock_quantity ? parseInt(newVariant.stock_quantity) : 0,
            sku: newVariant.sku || null,
            image_url: newVariant.image_url || null,
            updated_at: new Date().toISOString(),
          };
        }
        return variant;
      });
    });

    cancelEditVariant();
    sweetAlert.showSuccess('نجح', 'تم تحديث المتغير بنجاح');
  };

  const deleteVariant = (variantId: string) => {
    sweetAlert.showConfirm(
      'حذف المتغير',
      'هل أنت متأكد من حذف هذا المتغير؟',
      () => {
        setProductVariants((prevVariants) => {
          const filtered = prevVariants.filter(v => v.id !== variantId);
          console.log('🗑️ Deleted variant:', variantId, 'Remaining:', filtered.length);
          return filtered;
        });
        sweetAlert.showSuccess('نجح', 'تم حذف المتغير بنجاح');
      },
      undefined,
      'حذف',
      'إلغاء'
    );
  };

  // Load category colors and sizes when category is selected
  const loadCategoryVariantOptions = async (categoryId: string) => {
    if (!categoryId) {
      setCategoryColors([]);
      setCategorySizes([]);
      return;
    }

    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      const accessToken = await getAccessToken();

      // Load colors
      const colorsResponse = await fetch(`${supabaseUrl}/rest/v1/category_colors?category_id=eq.${categoryId}&is_active=eq.true&order=display_order.asc`, {
        headers: {
          'apikey': supabaseKey || '',
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      });

      if (colorsResponse.ok) {
        const colorsData = await colorsResponse.json();
        setCategoryColors(colorsData || []);
      }

      // Load sizes
      const sizesResponse = await fetch(`${supabaseUrl}/rest/v1/category_sizes?category_id=eq.${categoryId}&is_active=eq.true&order=display_order.asc`, {
        headers: {
          'apikey': supabaseKey || '',
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      });

      if (sizesResponse.ok) {
        const sizesData = await sizesResponse.json();
        setCategorySizes(sizesData || []);
      }
    } catch (error) {
      console.error('Error loading category variant options:', error);
    }
  };

  // Load category colors and sizes for management
  const loadCategoryVariantsForManagement = async (categoryId: string) => {
    if (!categoryId) {
      setCategoryColorsList([]);
      setCategorySizesList([]);
      return;
    }

    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      const accessToken = await getAccessToken();

      // Load all colors (including inactive)
      const colorsResponse = await fetch(`${supabaseUrl}/rest/v1/category_colors?category_id=eq.${categoryId}&order=display_order.asc`, {
        headers: {
          'apikey': supabaseKey || '',
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      });

      if (colorsResponse.ok) {
        const colorsData = await colorsResponse.json();
        setCategoryColorsList(colorsData || []);
      }

      // Load all sizes (including inactive)
      const sizesResponse = await fetch(`${supabaseUrl}/rest/v1/category_sizes?category_id=eq.${categoryId}&order=display_order.asc`, {
        headers: {
          'apikey': supabaseKey || '',
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      });

      if (sizesResponse.ok) {
        const sizesData = await sizesResponse.json();
        setCategorySizesList(sizesData || []);
      }
    } catch (error) {
      console.error('Error loading category variants for management:', error);
      sweetAlert.showError('خطأ', 'فشل تحميل الألوان والمقاسات');
    }
  };

  // Add category color
  const addCategoryColor = async () => {
    if (!selectedCategoryForVariants || !newCategoryColor.color_name) {
      sweetAlert.showError('خطأ', 'يرجى إدخال اسم اللون');
      return;
    }

    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      const accessToken = await getAccessToken();

      const response = await fetch(`${supabaseUrl}/rest/v1/category_colors`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey || '',
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          category_id: selectedCategoryForVariants,
          color_name: newCategoryColor.color_name,
          color_hex: newCategoryColor.color_hex || null,
          display_order: parseInt(newCategoryColor.display_order) || 0,
          is_active: true,
        }),
      });

      if (response.ok) {
        const newColor = await response.json();
        setCategoryColorsList([...categoryColorsList, newColor[0] || newColor]);
        setNewCategoryColor({ color_name: '', color_hex: '', display_order: '0' });
        sweetAlert.showSuccess('نجح', 'تم إضافة اللون بنجاح');
      } else {
        const error = await response.text();
        console.error('Error adding category color:', error);
        sweetAlert.showError('خطأ', 'فشل إضافة اللون');
      }
    } catch (error) {
      console.error('Error adding category color:', error);
      sweetAlert.showError('خطأ', 'فشل إضافة اللون');
    }
  };

  // Delete category color
  const deleteCategoryColor = async (colorId: string) => {
    sweetAlert.showConfirm(
      'حذف اللون',
      'هل أنت متأكد من حذف هذا اللون؟',
      async () => {
        try {
          const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
          const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
          const accessToken = await getAccessToken();

          const response = await fetch(`${supabaseUrl}/rest/v1/category_colors?id=eq.${colorId}`, {
            method: 'DELETE',
            headers: {
              'apikey': supabaseKey || '',
              'Authorization': `Bearer ${accessToken}`,
            },
          });

          if (response.ok) {
            setCategoryColorsList(categoryColorsList.filter(c => c.id !== colorId));
            sweetAlert.showSuccess('نجح', 'تم حذف اللون بنجاح');
          } else {
            sweetAlert.showError('خطأ', 'فشل حذف اللون');
          }
        } catch (error) {
          console.error('Error deleting category color:', error);
          sweetAlert.showError('خطأ', 'فشل حذف اللون');
        }
      },
      undefined,
      'حذف',
      'إلغاء'
    );
  };

  // Add category size
  const addCategorySize = async () => {
    if (!selectedCategoryForVariants || !newCategorySize.size_value) {
      sweetAlert.showError('خطأ', 'يرجى إدخال قيمة المقاس');
      return;
    }

    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      const accessToken = await getAccessToken();

      const response = await fetch(`${supabaseUrl}/rest/v1/category_sizes`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey || '',
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          category_id: selectedCategoryForVariants,
          size_value: newCategorySize.size_value,
          size_unit: newCategorySize.size_unit || null,
          display_order: parseInt(newCategorySize.display_order) || 0,
          is_active: true,
        }),
      });

      if (response.ok) {
        const newSize = await response.json();
        setCategorySizesList([...categorySizesList, newSize[0] || newSize]);
        setNewCategorySize({ size_value: '', size_unit: '', display_order: '0' });
        sweetAlert.showSuccess('نجح', 'تم إضافة المقاس بنجاح');
      } else {
        const error = await response.text();
        console.error('Error adding category size:', error);
        sweetAlert.showError('خطأ', 'فشل إضافة المقاس');
      }
    } catch (error) {
      console.error('Error adding category size:', error);
      sweetAlert.showError('خطأ', 'فشل إضافة المقاس');
    }
  };

  // Delete category size
  const deleteCategorySize = async (sizeId: string) => {
    sweetAlert.showConfirm(
      'حذف المقاس',
      'هل أنت متأكد من حذف هذا المقاس؟',
      async () => {
        try {
          const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
          const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
          const accessToken = await getAccessToken();

          const response = await fetch(`${supabaseUrl}/rest/v1/category_sizes?id=eq.${sizeId}`, {
            method: 'DELETE',
            headers: {
              'apikey': supabaseKey || '',
              'Authorization': `Bearer ${accessToken}`,
            },
          });

          if (response.ok) {
            setCategorySizesList(categorySizesList.filter(s => s.id !== sizeId));
            sweetAlert.showSuccess('نجح', 'تم حذف المقاس بنجاح');
          } else {
            sweetAlert.showError('خطأ', 'فشل حذف المقاس');
          }
        } catch (error) {
          console.error('Error deleting category size:', error);
          sweetAlert.showError('خطأ', 'فشل حذف المقاس');
        }
      },
      undefined,
      'حذف',
      'إلغاء'
    );
  };

  const checkSKUUnique = async (sku: string, excludeProductId?: string): Promise<boolean> => {
    if (!sku) return true; // SKU فارغ = لا حاجة للتحقق
    
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      const accessToken = await getAccessToken();

      let query = `${supabaseUrl}/rest/v1/products?sku=eq.${encodeURIComponent(sku)}&select=id`;
      
      if (excludeProductId) {
        query += `&id=neq.${excludeProductId}`;
      }

      const response = await fetch(query, {
        headers: {
          'apikey': supabaseKey || '',
          'Authorization': `Bearer ${accessToken}`,
        }
      });

      if (!response.ok) {
        return true; // في حالة الخطأ، نسمح بالاستمرار
      }

      const data = await response.json();
      return data.length === 0; // true إذا كان فريداً
    } catch (error) {
      console.error('Error checking SKU:', error);
      return true; // في حالة الخطأ، نسمح بالاستمرار
    }
  };

  const addProduct = async () => {
    // Prevent multiple clicks
    if (loading) {
      console.warn('⚠️ Add product already in progress, ignoring click');
      return;
    }

    if (!newProduct.name || !newProduct.price || !newProduct.sku) {
      sweetAlert.showError('خطأ', 'يرجى ملء جميع الحقول المطلوبة (الاسم، السعر، كود المنتج)');
      return;
    }

    // التحقق من SKU
    const isSKUUnique = await checkSKUUnique(newProduct.sku);
    if (!isSKUUnique) {
      sweetAlert.showError('خطأ', 'كود المنتج مستخدم بالفعل. يرجى استخدام كود آخر.');
      return;
    }

    if (productImages.length === 0) {
      if (typeof window !== 'undefined' && Platform.OS === 'web') {
        window.alert('يرجى إضافة صورة واحدة على الأقل');
      } else {
        Alert.alert('خطأ', 'يرجى إضافة صورة واحدة على الأقل');
      }
      return;
    }

    // Log productVariants before saving
    console.log('🔍 Before saving - productVariants count:', productVariants.length);
    console.log('🔍 Before saving - productVariants:', productVariants);

    setLoading(true);
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      // Get access_token (with auto-refresh if expired)
      const accessToken = await getAccessToken();

      // Create product
      const productResponse = await fetch(`${supabaseUrl}/rest/v1/products`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey || '',
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          name: newProduct.name,
          description: newProduct.description || null,
          price: parseFloat(newProduct.price),
          original_price: newProduct.original_price ? parseFloat(newProduct.original_price) : null,
          discount_percentage: newProduct.discount_percentage ? parseInt(newProduct.discount_percentage) : null,
          category: newProduct.category || null, // Keep for backward compatibility
          category_id: newProduct.category_id || null,
          stock_quantity: newProduct.source_type === 'warehouse' ? (parseInt(newProduct.stock_quantity) || 0) : 0,
          source_type: newProduct.source_type,
          sku: newProduct.sku,
          // image_url removed - all images are stored in product_images table using imgbb links
          sold_count: parseInt(newProduct.sold_count) || 0,
          is_limited_time_offer: newProduct.is_limited_time_offer,
          offer_start_date: newProduct.is_limited_time_offer ? new Date().toISOString() : null,
          offer_duration_days: newProduct.is_limited_time_offer && newProduct.offer_duration_days ? parseInt(newProduct.offer_duration_days) : null,
        })
      });

      if (!productResponse.ok) {
        const errorText = await productResponse.text();
        throw new Error(errorText);
      }

      const productData = await productResponse.json();
      const productId = productData[0]?.id;

      if (!productId) {
        throw new Error('فشل إنشاء المنتج');
      }

      // Add product images
      console.log('🖼️ Checking productImages before saving:', productImages.length);
      console.log('🖼️ productImages state:', JSON.stringify(productImages, null, 2));
      
      if (productImages.length > 0) {
        console.log('📸 Preparing to save product images:', productImages.length);
        console.log('📸 Product images data:', productImages.map(img => ({ uri: img.uri, url: img.url })));
        
        // Filter out images without URLs (failed uploads)
        const validImages = productImages.filter(img => img.url && img.url.trim() !== '');
        console.log('📸 Valid images (with URLs):', validImages.length, 'out of', productImages.length);
        
        if (validImages.length === 0) {
          console.error('❌ CRITICAL: No valid images found! All images are missing URLs.');
          console.error('❌ This means images were not uploaded to imgbb successfully.');
          console.error('❌ Check imgbb API key and network connection.');
        }
        
        if (validImages.length === 0) {
          console.warn('⚠️ No valid images to save (all images missing URLs)');
        } else {
          console.log('📤 Starting to insert', validImages.length, 'images one by one...');
          
          // Verify Supabase session before inserting (with timeout to prevent hanging)
          console.log('🔐 Step 1: Checking Supabase session...');
          try {
            console.log('🔐 Step 2: Calling supabase.auth.getSession() with timeout...');
            const sessionPromise = supabase.auth.getSession();
            const sessionTimeout = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Session timeout after 3 seconds')), 3000)
            );
            
            console.log('🔐 Step 3: Racing session promise with timeout...');
            const sessionResult = await Promise.race([sessionPromise, sessionTimeout]) as any;
            console.log('🔐 Step 4: Got session result:', { hasResult: !!sessionResult, hasData: !!sessionResult?.data, hasSession: !!sessionResult?.data?.session });
            
            const sessionData = sessionResult?.data;
            const sessionError = sessionResult?.error;
            
            if (sessionError || !sessionData?.session) {
              console.error('❌ No valid Supabase session found:', sessionError);
              console.error('❌ Session data:', sessionData);
              // Try to continue anyway - the insert might still work with RLS
              console.warn('⚠️ Continuing without verified session - will attempt insert anyway');
            } else {
              console.log('✅ Supabase session verified');
            }
            console.log('🔐 Step 5: Proceeding with image insertion...');
          } catch (sessionCheckError: any) {
            console.error('❌ Error checking Supabase session:', sessionCheckError);
            console.error('❌ Error message:', sessionCheckError?.message);
            // Don't return - try to continue anyway, the insert might work
            console.warn('⚠️ Session check failed, but continuing with image insertion anyway');
          }
          
          // Get full session from storage (needed for auth.setSession())
          const sessionData = await getSessionFromStorage();
          console.log('🔑 Got session data from storage:', !!sessionData);
          
          // Create a Supabase client and set the session properly
          // This ensures auth.uid() works correctly in RLS policies
          const supabaseWithAuth = createClient(
            process.env.EXPO_PUBLIC_SUPABASE_URL || '',
            process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''
          );
          
          // Set the session in the client to ensure auth.uid() works
          if (sessionData && sessionData.access_token) {
            try {
              console.log('🔑 Session data from storage:', {
                hasAccessToken: !!sessionData.access_token,
                hasRefreshToken: !!sessionData.refresh_token,
                hasUser: !!sessionData.user,
                userId: sessionData.user?.id,
                expiresAt: sessionData.expires_at,
              });
              
              // Create a session object compatible with Supabase
              const session = {
                access_token: sessionData.access_token,
                refresh_token: sessionData.refresh_token || '',
                expires_in: sessionData.expires_in || 3600,
                expires_at: sessionData.expires_at || Math.floor(Date.now() / 1000) + 3600,
                token_type: 'bearer',
                user: sessionData.user || null,
              };
              
              console.log('🔑 Setting session with user ID:', session.user?.id);
              
              const { data: sessionResult, error: sessionError } = await supabaseWithAuth.auth.setSession(session);
              if (sessionError) {
                console.error('❌ Error setting session:', sessionError);
                // Fallback: try with just access token
                await supabaseWithAuth.auth.setAccessToken(sessionData.access_token);
              } else {
                console.log('✅ Session set successfully in Supabase client');
                console.log('🔑 Session result:', {
                  hasSession: !!sessionResult.session,
                  userId: sessionResult.session?.user?.id,
                });
                
                // Try to refresh the session to ensure it's fully active
                try {
                  const { data: refreshResult, error: refreshError } = await supabaseWithAuth.auth.refreshSession();
                  if (refreshError) {
                    console.warn('⚠️ Error refreshing session (non-critical):', refreshError);
                  } else {
                    console.log('✅ Session refreshed successfully');
                  }
                } catch (refreshException) {
                  console.warn('⚠️ Exception refreshing session (non-critical):', refreshException);
                }
                
                // Verify that auth.uid() will work by checking the current user
                const { data: { user: currentUser }, error: userError } = await supabaseWithAuth.auth.getUser();
                if (userError) {
                  console.error('❌ Error getting user after setSession:', userError);
                } else {
                  console.log('✅ Current user after setSession:', {
                    userId: currentUser?.id,
                    email: currentUser?.email,
                  });
                  
                  if (!currentUser) {
                    console.error('❌ CRITICAL: No user found after setSession! RLS policies will fail.');
                  }
                }
              }
            } catch (sessionSetError: any) {
              console.error('❌ Exception setting session:', sessionSetError);
              // Fallback: try with just access token
              if (sessionData.access_token) {
                try {
                  await supabaseWithAuth.auth.setAccessToken(sessionData.access_token);
                  console.log('✅ Access token set as fallback');
                } catch (tokenError) {
                  console.error('❌ Failed to set access token:', tokenError);
                }
              }
            }
          } else {
            console.warn('⚠️ No session data found, RLS policies may fail');
          }
          
          // Get access token for fetch requests
          const accessToken = sessionData?.access_token || await getAccessToken();
          console.log('🔑 Using access token for fetch, length:', accessToken?.length || 0);
          
          const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
          const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
          
          // Verify token is valid by checking user info
          try {
            console.log('🔍 Verifying access token before insert...');
            const userCheckResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${accessToken}`,
              },
            });
            
            if (userCheckResponse.ok) {
              const userData = await userCheckResponse.json();
              console.log('✅ Token verified, user ID:', userData.id);
              console.log('✅ User email:', userData.email);
              
              // Check user role in users table
              const userRoleResponse = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${userData.id}&select=id,role`, {
                headers: {
                  'apikey': supabaseKey,
                  'Authorization': `Bearer ${accessToken}`,
                },
              });
              
              if (userRoleResponse.ok) {
                const userRoleData = await userRoleResponse.json();
                console.log('✅ User role data:', userRoleData);
                if (userRoleData && userRoleData.length > 0) {
                  console.log('✅ User role:', userRoleData[0].role);
                  if (userRoleData[0].role !== 'admin' && userRoleData[0].role !== 'manager') {
                    console.error('❌ User does not have admin or manager role!');
                    sweetAlert.showError('خطأ', 'ليس لديك صلاحية لإضافة الصور. يجب أن تكون admin أو manager.');
                    return;
                  }
                } else {
                  console.error('❌ User not found in users table!');
                  sweetAlert.showError('خطأ', 'المستخدم غير موجود في جدول users.');
                  return;
                }
              } else {
                console.error('❌ Failed to check user role:', userRoleResponse.status);
              }
            } else {
              const errorText = await userCheckResponse.text();
              console.error('❌ Token verification failed:', userCheckResponse.status, errorText);
              sweetAlert.showError('خطأ', 'فشل التحقق من المصادقة. يرجى تسجيل الدخول مرة أخرى.');
              return;
            }
          } catch (verifyError: any) {
            console.error('❌ Error verifying token:', verifyError);
            sweetAlert.showError('خطأ', 'فشل التحقق من المصادقة.');
            return;
          }
          
          // Insert images one by one using fetch directly with Authorization header
          // This ensures RLS policies work correctly because Supabase REST API recognizes the Authorization header
          const insertedImages: any[] = [];
          const failedImages: Array<{ index: number; error: string }> = [];
          
          for (let index = 0; index < validImages.length; index++) {
            const img = validImages[index];
            try {
              console.log(`📤 Inserting image ${index + 1}/${validImages.length}:`, img.url);
              console.log(`📤 Product ID:`, productId);
              console.log(`📤 Image data:`, {
                product_id: productId,
                image_url: img.url!,
                variant_id: null,
                display_order: index,
                is_primary: index === 0,
              });
              
              // Use fetch directly with Authorization header (ensures RLS works correctly)
              const response = await fetch(`${supabaseUrl}/rest/v1/product_images?select=*`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': supabaseKey,
                  'Authorization': `Bearer ${accessToken}`,
                  'Prefer': 'return=representation',
                },
                body: JSON.stringify({
                  product_id: productId,
                  image_url: img.url!,
                  variant_id: null, // General images, not variant-specific
                  display_order: index,
                  is_primary: index === 0, // First image is primary
                }),
              });
              
              if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                console.error(`❌ Failed to insert image ${index + 1}:`, errorData);
                console.error(`❌ Response status:`, response.status);
                console.error(`❌ Response headers:`, Object.fromEntries(response.headers.entries()));
                failedImages.push({ index, error: errorData.message || `HTTP ${response.status}` });
              } else {
                const insertedImage = await response.json();
                // Supabase returns array when using select=*, so get first element
                const imageData = Array.isArray(insertedImage) ? insertedImage[0] : insertedImage;
                console.log(`✅ Successfully inserted image ${index + 1}:`, imageData);
                insertedImages.push(imageData);
              }
            } catch (error: any) {
              console.error(`❌ Exception inserting image ${index + 1}:`, error);
              console.error(`❌ Exception details:`, JSON.stringify(error, null, 2));
              failedImages.push({ index, error: error?.message || 'خطأ غير معروف' });
            }
          }
          
          // Report results
          if (failedImages.length > 0) {
            console.error(`❌ Failed to insert ${failedImages.length} out of ${validImages.length} images`);
            const errorMessages = failedImages.map(f => `صورة ${f.index + 1}: ${f.error}`).join('\n');
            sweetAlert.showError('تحذير', `تم حفظ ${insertedImages.length} من أصل ${validImages.length} صورة.\n\nالأخطاء:\n${errorMessages}`);
          } else {
            console.log(`✅ Successfully inserted all ${insertedImages.length} images!`);
          }
          
          // Verify images were saved in database
          try {
            const { data: savedImages, error: verifyError } = await supabase
              .from('product_images')
              .select('id, image_url, display_order')
              .eq('product_id', productId)
              .is('variant_id', null);
            
            if (verifyError) {
              console.error('❌ Failed to verify images:', verifyError);
            } else {
              console.log(`🔍 Verification: Found ${savedImages?.length || 0} images in database for product ${productId}`);
              console.log('🔍 Saved images:', savedImages?.map((img: any) => ({ id: img.id, url: img.image_url, order: img.display_order })));
              
              if (savedImages && savedImages.length !== validImages.length) {
                console.warn(`⚠️ Mismatch: Expected ${validImages.length} images, but found ${savedImages.length} in database`);
              } else if (savedImages && savedImages.length === validImages.length) {
                console.log(`✅ Verification passed: All ${validImages.length} images are in database`);
              }
            }
          } catch (verifyError) {
            console.error('❌ Error verifying images:', verifyError);
          }
        }
      }

      // Add product variants
      console.log('📦 Checking productVariants:', productVariants.length);
      console.log('📦 productVariants data:', productVariants);
      
      if (productVariants.length > 0) {
        const variantsToInsert = productVariants.map((variant, index) => {
          const variantData: any = {
            product_id: productId,
            variant_name: variant.variant_name || `${variant.color || ''}${variant.color && variant.size ? ' - ' : ''}${variant.size || ''}`.trim() || 'متغير',
            color: variant.color || null,
            size: variant.size || null,
            size_unit: variant.size_unit || null,
            material: variant.material || null,
            price: variant.price || null,
            stock_quantity: variant.stock_quantity || 0,
            sku: variant.sku || null,
            image_url: variant.image_url || null,
            is_active: variant.is_active !== undefined ? variant.is_active : true,
            is_default: variant.is_default !== undefined ? variant.is_default : (index === 0),
            display_order: index,
          };
          console.log(`📝 Variant ${index} data:`, variantData);
          return variantData;
        });

        console.log('📤 Sending variants to insert:', variantsToInsert.length);
        console.log('📤 Variants JSON:', JSON.stringify(variantsToInsert, null, 2));

        // Verify that we have a real access_token, not just anon key
        if (accessToken === supabaseKey) {
          console.error('❌ CRITICAL: No valid access_token found for variants! Using anon key will fail RLS policies.');
          console.error('❌ Please ensure you are logged in and have admin/manager role.');
          sweetAlert.showError('خطأ', 'فشل المصادقة. يرجى تسجيل الدخول مرة أخرى.');
          return;
        }

        console.log('✅ Access token verified (not anon key) for variants');
        const variantsResponse = await fetch(`${supabaseUrl}/rest/v1/product_variants`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey || '',
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(variantsToInsert)
        });
        
        console.log('📡 Variants response status:', variantsResponse.status);

        if (variantsResponse.ok) {
          const variantsData = await variantsResponse.json();
          console.log('✅ Variants inserted successfully:', variantsData.length);
          console.log('📦 Variants data with images:', variantsData.map((v: any) => ({ id: v.id, color: v.color, size: v.size, image_url: v.image_url })));
          
          // Link variant images to product_images
          console.log('🔗 Starting to link variant images to product_images...');
          console.log('🔗 Variants with images:', variantsData.filter(v => v.image_url).length, 'out of', variantsData.length);
          
          // Get access token for variant images (reuse if already got, otherwise get new one)
          const variantAccessToken = accessToken || await getAccessToken();
          console.log('🔑 Using access token for variant images, length:', variantAccessToken?.length || 0);
          
          for (const variant of variantsData) {
            if (variant.image_url) {
              console.log('🖼️ Linking variant image:', variant.id, variant.color, variant.size, variant.image_url);
              
              try {
                // Use fetch directly with Authorization header (ensures RLS works correctly)
                const response = await fetch(`${supabaseUrl}/rest/v1/product_images?select=*`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${variantAccessToken}`,
                    'Prefer': 'return=representation',
                  },
                  body: JSON.stringify({
                    product_id: productId,
                    image_url: variant.image_url,
                    variant_id: variant.id,
                    display_order: 0,
                    is_primary: false,
                  }),
                });
                
                if (!response.ok) {
                  const errorData = await response.json().catch(() => ({ message: response.statusText }));
                  console.error('❌ Failed to link variant image:', variant.id, errorData);
                  console.error('❌ Response status:', response.status);
                } else {
                  const imageData = await response.json();
                  const imageResult = Array.isArray(imageData) ? imageData[0] : imageData;
                  console.log('✅ Variant image linked successfully:', variant.id, variant.image_url, imageResult);
                }
              } catch (error: any) {
                console.error('❌ Exception during variant image insert:', variant.id, error);
                console.error('❌ Error message:', error?.message);
                console.error('❌ Error stack:', error?.stack);
              }
            } else {
              console.warn('⚠️ Variant has no image_url:', variant.id, variant.color, variant.size);
            }
          }
          
          console.log('🔗 Finished linking variant images');
        } else {
          const errorText = await variantsResponse.text();
          console.error('❌ Failed to add product variants:', variantsResponse.status, errorText);
          console.error('❌ Request body was:', JSON.stringify(variantsToInsert, null, 2));
          console.error('❌ Response headers:', Object.fromEntries(variantsResponse.headers.entries()));
          sweetAlert.showError('خطأ', `فشل حفظ المتغيرات: ${errorText}`);
          throw new Error(`Failed to save variants: ${variantsResponse.status} ${errorText}`);
        }
      } else {
        console.log('ℹ️ No variants to add for this product');
      }

      sweetAlert.showSuccess('نجح', 'تم إضافة المنتج بنجاح', () => {
        // Reset form
        setNewProduct({
          name: '',
          description: '',
          price: '',
          original_price: '',
          discount_percentage: '',
          section_id: '',
          category: '',
          category_id: '',
          stock_quantity: '',
          source_type: 'warehouse',
          sku: '',
          // image_url removed - all images are stored in product_images table using imgbb links
          sold_count: '0',
          is_limited_time_offer: false,
          offer_duration_days: '',
        });
        setProductImages([]);
        setProductVariants([]);
        setNewVariant({
          color: '',
          size: '',
          size_unit: '',
          price: '',
          stock_quantity: '',
          sku: '',
          image_url: '',
        });
        setEditingProduct(null);
        loadData();
      });
    } catch (error: any) {
      console.error('❌ Error adding product:', error);
      if (typeof window !== 'undefined' && Platform.OS === 'web') {
        window.alert(error.message || 'فشل إضافة المنتج');
      } else {
        Alert.alert('خطأ', error.message || 'فشل إضافة المنتج');
      }
    } finally {
      setLoading(false);
    }
  };

  const startEditProduct = async (product: Product) => {
    console.log('🔄 Starting edit product:', product);
    console.log('📦 Product data:', JSON.stringify(product, null, 2));
    
    setEditingProduct(product);
    // الحصول على section_id من الفئة المرتبطة بالمنتج
    const productCategory = categories.find(c => c.id === product.category_id);
    const sectionId = productCategory?.section_id || product.section_data?.id || '';
    
    const newProductData = {
      name: product.name || '',
      description: product.description || '',
      price: (product.price || 0).toString(),
      original_price: (product.original_price || '').toString(),
      discount_percentage: (product.discount_percentage || '').toString(),
      section_id: sectionId,
      category: product.category || '',
      category_id: product.category_id || '',
      stock_quantity: (product.stock_quantity || 0).toString(),
      source_type: product.source_type || 'warehouse',
      sku: product.sku || '',
      // image_url removed - all images are stored in product_images table using imgbb links
      sold_count: (product.sold_count || 0).toString(),
      is_limited_time_offer: product.is_limited_time_offer || false,
      offer_duration_days: (product.offer_duration_days || '').toString(),
    };
    
    console.log('📝 Setting newProduct data:', JSON.stringify(newProductData, null, 2));
    // Ensure all values are strings and not null/undefined
    const safeNewProductData = {
      name: String(newProductData.name || ''),
      description: String(newProductData.description || ''),
      price: String(newProductData.price || '0'),
      original_price: String(newProductData.original_price || ''),
      discount_percentage: String(newProductData.discount_percentage || ''),
      section_id: String(newProductData.section_id || ''),
      category: String(newProductData.category || ''),
      category_id: String(newProductData.category_id || ''),
      stock_quantity: String(newProductData.stock_quantity || '0'),
      source_type: newProductData.source_type || 'warehouse',
      sku: String(newProductData.sku || ''),
      // image_url removed - all images are stored in product_images table using imgbb links
      sold_count: String(newProductData.sold_count || '0'),
      is_limited_time_offer: Boolean(newProductData.is_limited_time_offer),
      offer_duration_days: String(newProductData.offer_duration_days || ''),
    };
    console.log('🔒 Safe newProduct data:', JSON.stringify(safeNewProductData, null, 2));
    setNewProduct(safeNewProductData);
    setProductImages([]);
    setEditProductImages([]);
    
    // Small delay to ensure state is updated before continuing
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Load product images
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      const accessToken = await getAccessToken();
      
      // First, try to load images from product_images table (general images only, variant_id is null)
      let loadedImages: Array<{ uri: string; url: string }> = [];
      
      // Try loading from product_images table
      const imagesResponse = await fetch(`${supabaseUrl}/rest/v1/product_images?product_id=eq.${product.id}&variant_id=is.null&order=display_order.asc`, {
        headers: {
          'apikey': supabaseKey || '',
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (imagesResponse.ok) {
        const imagesData = await imagesResponse.json();
        if (imagesData && imagesData.length > 0) {
          loadedImages = imagesData.map((img: any) => ({
            uri: img.image_url,
            url: img.image_url,
          }));
          console.log('✅ Loaded product images from product_images:', loadedImages.length);
        }
      }
      
      // If no images found in product_images, try loading ALL images (including variant images)
      if (loadedImages.length === 0) {
        const allImagesResponse = await fetch(`${supabaseUrl}/rest/v1/product_images?product_id=eq.${product.id}&order=display_order.asc`, {
          headers: {
            'apikey': supabaseKey || '',
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          }
        });
        
        if (allImagesResponse.ok) {
          const allImagesData = await allImagesResponse.json();
          if (allImagesData && allImagesData.length > 0) {
            // Filter to get only general images (variant_id is null) or use all if none found
            const generalImages = allImagesData.filter((img: any) => !img.variant_id);
            if (generalImages.length > 0) {
              loadedImages = generalImages.map((img: any) => ({
                uri: img.image_url,
                url: img.image_url,
              }));
            } else {
              // If no general images, use first image
              loadedImages = [{
                uri: allImagesData[0].image_url,
                url: allImagesData[0].image_url,
              }];
            }
            console.log('✅ Loaded product images from all images:', loadedImages.length);
          }
        }
      }
      
      // No longer using product.image_url as fallback - all images should be in product_images
      if (loadedImages.length === 0) {
        console.warn('⚠️ No images found in product_images for product:', product.id);
      }
      
      setProductImages(loadedImages);
      console.log('🖼️ Final images data:', loadedImages);
    } catch (error) {
      console.error('Error loading product images:', error);
      // No longer using product.image_url as fallback
      setProductImages([]);
    }
    
    // Load product variants
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      const accessToken = await getAccessToken();
      
      const variantsResponse = await fetch(`${supabaseUrl}/rest/v1/product_variants?product_id=eq.${product.id}&order=display_order.asc`, {
        headers: {
          'apikey': supabaseKey || '',
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      });
      
      console.log('📡 Variants response status:', variantsResponse.status);
      if (variantsResponse.ok) {
        const variantsData = await variantsResponse.json();
        console.log('📦 Raw variants data from API:', variantsData);
        console.log('📦 Variants count:', variantsData?.length || 0);
        
        // Load variant images for each variant
        const variantsWithImages = await Promise.all((variantsData || []).map(async (variant: ProductVariant) => {
          try {
            let variantImageUrl = variant.image_url || null;
            
            // Try to get image from product_images table first
            try {
              const variantImagesResponse = await fetch(`${supabaseUrl}/rest/v1/product_images?product_id=eq.${product.id}&variant_id=eq.${variant.id}&order=display_order.asc&limit=1`, {
                headers: {
                  'apikey': supabaseKey || '',
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                }
              });
              
              if (variantImagesResponse.ok) {
                const variantImages = await variantImagesResponse.json();
                if (variantImages && variantImages.length > 0 && variantImages[0].image_url) {
                  variantImageUrl = variantImages[0].image_url;
                  console.log(`✅ Loaded variant image from product_images for variant ${variant.id}:`, variantImageUrl);
                }
              }
            } catch (imgError) {
              console.warn('⚠️ Error loading variant image from product_images:', imgError);
            }
            
            // If no image found in product_images, check if variant has image_url directly
            if (!variantImageUrl && variant.image_url) {
              variantImageUrl = variant.image_url;
              console.log(`✅ Using variant.image_url directly for variant ${variant.id}:`, variantImageUrl);
            }
            
            return {
              ...variant,
              image_url: variantImageUrl,
            };
          } catch (error) {
            console.error('Error loading variant image:', error);
            // Return variant with original image_url if exists
            return variant;
          }
        }));
        
        setProductVariants(variantsWithImages);
        console.log('✅ Loaded product variants:', variantsWithImages.length);
        console.log('📦 Variants data:', variantsWithImages);
        console.log('🖼️ Variants with images:', variantsWithImages.map((v: any) => ({ 
          id: v.id, 
          color: v.color, 
          size: v.size, 
          hasImage: !!v.image_url,
          image_url: v.image_url 
        })));
        
        if (variantsWithImages.length === 0) {
          console.log('ℹ️ No variants found for this product. User can add variants using the UI.');
        }
      } else {
        const errorText = await variantsResponse.text();
        console.error('❌ Failed to load variants:', variantsResponse.status, errorText);
        console.error('❌ Response headers:', Object.fromEntries(variantsResponse.headers.entries()));
        setProductVariants([]);
        
        // Show user-friendly message if it's an auth error
        if (variantsResponse.status === 403 || variantsResponse.status === 401) {
          console.error('❌ Authentication error when loading variants. User may need to log in again.');
        }
      }
    } catch (error) {
      console.error('❌ Error loading product variants:', error);
      setProductVariants([]);
    }
    
    // Load category colors and sizes if category is selected
    if (product.category_id) {
      await loadCategoryVariantOptions(product.category_id);
    }
  };

  const cancelEdit = () => {
    setEditingProduct(null);
    setEditingVariant(null);
    setNewProduct({
      name: '',
      description: '',
      price: '',
      original_price: '',
      discount_percentage: '',
      section_id: '',
      category: '',
      category_id: '',
      stock_quantity: '',
      source_type: 'warehouse',
      sku: '',
      image_url: '',
      sold_count: '0',
      is_limited_time_offer: false,
      offer_duration_days: '',
    });
    setProductImages([]);
    setEditProductImages([]);
    setProductVariants([]);
    setCategoryColors([]);
    setCategorySizes([]);
    setNewVariant({
      color: '',
      size: '',
      size_unit: '',
      price: '',
      stock_quantity: '',
      sku: '',
      image_url: '',
    });
    setShowColorInput(false);
    setShowSizeInput(false);
  };

  const updateProduct = async () => {
    // Prevent multiple clicks
    if (loading) {
      console.warn('⚠️ Update product already in progress, ignoring click');
      return;
    }

    if (!editingProduct || !newProduct.name || !newProduct.price || !newProduct.sku) {
      sweetAlert.showError('خطأ', 'يرجى ملء جميع الحقول المطلوبة (الاسم، السعر، كود المنتج)');
      return;
    }

    // التحقق من SKU (استثناء المنتج الحالي)
    const isSKUUnique = await checkSKUUnique(newProduct.sku, editingProduct.id);
    if (!isSKUUnique) {
      sweetAlert.showError('خطأ', 'كود المنتج مستخدم بالفعل. يرجى استخدام كود آخر.');
      return;
    }

    setLoading(true);
    console.log('🔄 Starting product update...');
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      // Get access_token (with auto-refresh if expired)
      const accessToken = await getAccessToken();

      // Update product
      const productResponse = await fetch(`${supabaseUrl}/rest/v1/products?id=eq.${editingProduct.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey || '',
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          name: newProduct.name,
          description: newProduct.description || null,
          price: parseFloat(newProduct.price),
          original_price: newProduct.original_price ? parseFloat(newProduct.original_price) : null,
          discount_percentage: newProduct.discount_percentage ? parseInt(newProduct.discount_percentage) : null,
          category: newProduct.category || null, // Keep for backward compatibility
          category_id: newProduct.category_id || null,
          stock_quantity: newProduct.source_type === 'warehouse' ? (parseInt(newProduct.stock_quantity) || 0) : 0,
          source_type: newProduct.source_type,
          sku: newProduct.sku,
          // image_url removed - all images are stored in product_images table using imgbb links
          sold_count: parseInt(newProduct.sold_count) || editingProduct.sold_count || 0,
          is_limited_time_offer: newProduct.is_limited_time_offer,
          offer_start_date: newProduct.is_limited_time_offer ? (editingProduct?.offer_start_date || new Date().toISOString()) : null,
          offer_duration_days: newProduct.is_limited_time_offer && newProduct.offer_duration_days ? parseInt(newProduct.offer_duration_days) : null,
        })
      });

      if (!productResponse.ok) {
        const errorText = await productResponse.text();
        throw new Error(errorText);
      }

      // Update product images if new images were added
      // Only update general images (variant_id is null), not variant-specific images
      if (productImages.length > 0) {
        console.log('📸 Preparing to update product images:', productImages.length);
        console.log('📸 Product images data:', productImages.map(img => ({ uri: img.uri, url: img.url })));
        
        // Filter out images without URLs (failed uploads)
        const validImages = productImages.filter(img => img.url && img.url.trim() !== '');
        console.log('📸 Valid images (with URLs):', validImages.length, 'out of', productImages.length);
        console.log('📸 About to check if validImages.length === 0...');
        
        if (validImages.length === 0) {
          console.warn('⚠️ No valid images to update (all images missing URLs)');
        } else {
          console.log('✅ Entering else block - validImages.length > 0');
          console.log('🗑️ About to delete old general images...');
          console.log('🗑️ Product ID:', editingProduct.id);
          console.log('🗑️ Supabase client available:', !!supabase);
          
          try {
            console.log('🗑️ About to execute delete query...');
            console.log('🗑️ Using direct fetch instead of Supabase client (more reliable on web)...');
            
            // Use direct fetch instead of Supabase client for better reliability on web
            const deleteUrl = `${supabaseUrl}/rest/v1/product_images?product_id=eq.${editingProduct.id}&variant_id=is.null`;
            console.log('🗑️ Delete URL:', deleteUrl);
            
            const deleteResponse = await fetch(deleteUrl, {
              method: 'DELETE',
              headers: {
                'apikey': supabaseKey || '',
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
              }
            });
            
            console.log('🗑️ Delete operation completed, checking response...');
            console.log('🗑️ Delete response status:', deleteResponse.status);
            
            if (!deleteResponse.ok) {
              const errorText = await deleteResponse.text();
              console.warn('⚠️ Failed to delete old images:', deleteResponse.status, errorText);
              throw new Error(`Failed to delete old images: ${deleteResponse.status} ${errorText}`);
            } else {
              console.log('✅ Old general images deleted successfully');
            }
          } catch (deleteException: any) {
            console.error('❌ Exception while deleting old images:', deleteException);
            console.error('❌ Exception message:', deleteException.message);
            console.error('❌ Exception stack:', deleteException.stack);
          }


          // Insert new general images (variant_id is null) using fetch directly
          console.log('📤 Starting to insert', validImages.length, 'images one by one...');
          
          // Get access token for fetch requests
          const updateAccessToken = accessToken || await getAccessToken();
          console.log('🔑 Using access token for update, length:', updateAccessToken?.length || 0);
          
          // Verify token is valid by checking user info
          try {
            console.log('🔍 Verifying access token before insert...');
            const userCheckResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${updateAccessToken}`,
              },
            });
            
            if (userCheckResponse.ok) {
              const userData = await userCheckResponse.json();
              console.log('✅ Token verified, user ID:', userData.id);
              console.log('✅ User email:', userData.email);
              
              // Check user role in users table
              const userRoleResponse = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${userData.id}&select=id,role`, {
                headers: {
                  'apikey': supabaseKey,
                  'Authorization': `Bearer ${updateAccessToken}`,
                },
              });
              
              if (userRoleResponse.ok) {
                const userRoleData = await userRoleResponse.json();
                console.log('✅ User role data:', userRoleData);
                if (userRoleData && userRoleData.length > 0) {
                  console.log('✅ User role:', userRoleData[0].role);
                  if (userRoleData[0].role !== 'admin' && userRoleData[0].role !== 'manager') {
                    console.error('❌ User does not have admin or manager role!');
                    sweetAlert.showError('خطأ', 'ليس لديك صلاحية لإضافة الصور. يجب أن تكون admin أو manager.');
                    return;
                  }
                } else {
                  console.error('❌ User not found in users table!');
                  sweetAlert.showError('خطأ', 'المستخدم غير موجود في جدول users.');
                  return;
                }
              } else {
                console.error('❌ Failed to check user role:', userRoleResponse.status);
              }
            } else {
              const errorText = await userCheckResponse.text();
              console.error('❌ Token verification failed:', userCheckResponse.status, errorText);
              sweetAlert.showError('خطأ', 'فشل التحقق من المصادقة. يرجى تسجيل الدخول مرة أخرى.');
              return;
            }
          } catch (verifyError: any) {
            console.error('❌ Error verifying token:', verifyError);
            sweetAlert.showError('خطأ', 'فشل التحقق من المصادقة.');
            return;
          }
          
          // Insert images one by one using fetch directly with Authorization header
          // This ensures RLS policies work correctly because Supabase REST API recognizes the Authorization header
          const insertedImages: any[] = [];
          const failedImages: Array<{ index: number; error: string }> = [];
          
          for (let index = 0; index < validImages.length; index++) {
            const img = validImages[index];
            try {
              console.log(`📤 Inserting image ${index + 1}/${validImages.length}:`, img.url);
              
              // Use fetch directly with Authorization header (ensures RLS works correctly)
              const response = await fetch(`${supabaseUrl}/rest/v1/product_images?select=*`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': supabaseKey,
                  'Authorization': `Bearer ${updateAccessToken}`,
                  'Prefer': 'return=representation',
                },
                body: JSON.stringify({
                  product_id: editingProduct.id,
                  image_url: img.url!,
                  variant_id: null, // General images, not variant-specific
                  display_order: index,
                  is_primary: index === 0,
                }),
              });
              
              if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                console.error(`❌ Failed to insert image ${index + 1}:`, errorData);
                console.error(`❌ Response status:`, response.status);
                console.error(`❌ Response headers:`, Object.fromEntries(response.headers.entries()));
                failedImages.push({ index, error: errorData.message || `HTTP ${response.status}` });
              } else {
                const insertedImage = await response.json();
                // Supabase returns array when using select=*, so get first element
                const imageData = Array.isArray(insertedImage) ? insertedImage[0] : insertedImage;
                console.log(`✅ Successfully inserted image ${index + 1}:`, imageData);
                insertedImages.push(imageData);
              }
            } catch (error: any) {
              console.error(`❌ Exception inserting image ${index + 1}:`, error);
              console.error(`❌ Exception details:`, JSON.stringify(error, null, 2));
              failedImages.push({ index, error: error?.message || 'خطأ غير معروف' });
            }
          }
          
          // Report results
          if (failedImages.length > 0) {
            console.error(`❌ Failed to insert ${failedImages.length} out of ${validImages.length} images`);
            const errorMessages = failedImages.map(f => `صورة ${f.index + 1}: ${f.error}`).join('\n');
            sweetAlert.showError('تحذير', `تم حفظ ${insertedImages.length} من أصل ${validImages.length} صورة.\n\nالأخطاء:\n${errorMessages}`);
          } else {
            console.log(`✅ Successfully inserted all ${insertedImages.length} images!`);
          }
          
          // Verify images were saved in database
          try {
            const { data: savedImages, error: verifyError } = await supabase
              .from('product_images')
              .select('id, image_url, display_order')
              .eq('product_id', editingProduct.id)
              .is('variant_id', null);
            
            if (verifyError) {
              console.error('❌ Failed to verify images:', verifyError);
            } else {
              console.log(`🔍 Verification: Found ${savedImages?.length || 0} images in database for product ${editingProduct.id}`);
              console.log('🔍 Saved images:', savedImages?.map((img: any) => ({ id: img.id, url: img.image_url, order: img.display_order })));
              
              if (savedImages && savedImages.length !== validImages.length) {
                console.warn(`⚠️ Mismatch: Expected ${validImages.length} images, but found ${savedImages.length} in database`);
              } else if (savedImages && savedImages.length === validImages.length) {
                console.log(`✅ Verification passed: All ${validImages.length} images are in database`);
              }
            }
          } catch (verifyError) {
            console.error('❌ Error verifying images:', verifyError);
          }
        }
      }

      // Update product variants
      // Delete old variants
      await fetch(`${supabaseUrl}/rest/v1/product_variants?product_id=eq.${editingProduct.id}`, {
        method: 'DELETE',
        headers: {
          'apikey': supabaseKey || '',
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      });

      // Insert new variants
      console.log('📦 Updating productVariants:', productVariants.length);
      console.log('📦 productVariants data:', productVariants);
      
      if (productVariants.length > 0) {
        const variantsToInsert = productVariants.map((variant, index) => {
          const variantData: any = {
            product_id: editingProduct.id,
            variant_name: variant.variant_name || `${variant.color || ''}${variant.color && variant.size ? ' - ' : ''}${variant.size || ''}`.trim() || 'متغير',
            color: variant.color || null,
            size: variant.size || null,
            size_unit: variant.size_unit || null,
            material: variant.material || null,
            price: variant.price || null,
            stock_quantity: variant.stock_quantity || 0,
            sku: variant.sku || null,
            image_url: variant.image_url || null,
            is_active: variant.is_active !== undefined ? variant.is_active : true,
            is_default: variant.is_default !== undefined ? variant.is_default : (index === 0),
            display_order: index,
          };
          console.log(`📝 Variant ${index} data (update):`, variantData);
          return variantData;
        });

        console.log('📤 Sending variants to update:', variantsToInsert.length);
        console.log('📤 Variants JSON (update):', JSON.stringify(variantsToInsert, null, 2));

        // Verify that we have a real access_token, not just anon key
        if (accessToken === supabaseKey) {
          console.error('❌ CRITICAL: No valid access_token found for variants (update)! Using anon key will fail RLS policies.');
          console.error('❌ Please ensure you are logged in and have admin/manager role.');
          sweetAlert.showError('خطأ', 'فشل المصادقة. يرجى تسجيل الدخول مرة أخرى.');
          return;
        }

        console.log('✅ Access token verified (not anon key) for variants (update)');
        const variantsResponse = await fetch(`${supabaseUrl}/rest/v1/product_variants`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey || '',
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(variantsToInsert)
        });
        
        console.log('📡 Variants response status (update):', variantsResponse.status);

        if (variantsResponse.ok) {
          const variantsData = await variantsResponse.json();
          console.log('✅ Variants updated successfully:', variantsData.length);
          console.log('📦 Updated variants data with images:', variantsData.map((v: any) => ({ id: v.id, color: v.color, size: v.size, image_url: v.image_url })));
          
          // Link variant images to product_images
          console.log('🔗 Starting to link variant images to product_images (update)...');
          console.log('🔗 Variants with images:', variantsData.filter(v => v.image_url).length, 'out of', variantsData.length);
          
          for (const variant of variantsData) {
            if (variant.image_url) {
              console.log('🖼️ Linking variant image for update:', variant.id, variant.color, variant.size, variant.image_url);
              
              try {
                // Verify that we have a real access_token, not just anon key
                if (accessToken === supabaseKey) {
                  console.error('❌ CRITICAL: No valid access_token found for variant image (update)! Using anon key will fail RLS policies.');
                  continue; // Skip this variant image
                }
                
                // Delete old variant images for this specific variant using direct fetch
                console.log('🗑️ Deleting old variant images for variant:', variant.id);
                const deleteUrl = `${supabaseUrl}/rest/v1/product_images?product_id=eq.${editingProduct.id}&variant_id=eq.${variant.id}`;
                const deleteResponse = await fetch(deleteUrl, {
                  method: 'DELETE',
                  headers: {
                    'apikey': supabaseKey || '',
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                  }
                });
                
                if (!deleteResponse.ok) {
                  const errorText = await deleteResponse.text();
                  console.error('❌ Failed to delete old variant images:', variant.id, deleteResponse.status, errorText);
                } else {
                  console.log('✅ Old variant images deleted for variant:', variant.id);
                }
                
                // Add variant image to product_images with variant_id using fetch directly
                console.log('⏳ Starting variant image insert with fetch (update)...');
                
                // Use fetch directly with Authorization header (ensures RLS works correctly)
                const response = await fetch(`${supabaseUrl}/rest/v1/product_images?select=*`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${updateAccessToken}`,
                    'Prefer': 'return=representation',
                  },
                  body: JSON.stringify({
                    product_id: editingProduct.id,
                    image_url: variant.image_url,
                    variant_id: variant.id,
                    display_order: 0,
                    is_primary: false,
                  }),
                });
                
                if (!response.ok) {
                  const errorData = await response.json().catch(() => ({ message: response.statusText }));
                  console.error('❌ Failed to link variant image (update):', variant.id, errorData);
                  console.error('❌ Response status:', response.status);
                } else {
                  const imageData = await response.json();
                  const imageResult = Array.isArray(imageData) ? imageData[0] : imageData;
                  console.log('✅ Variant image linked successfully (update):', variant.id, variant.image_url, imageResult);
                }
              } catch (error: any) {
                console.error('❌ Exception during variant image insert (update):', variant.id, error);
                console.error('❌ Error message:', error?.message);
                console.error('❌ Error stack:', error?.stack);
              }
            } else {
              console.warn('⚠️ Variant has no image_url (update):', variant.id, variant.color, variant.size);
            }
          }
          
          console.log('🔗 Finished linking variant images (update)');
        } else {
          const errorText = await variantsResponse.text();
          console.error('❌ Failed to update product variants:', variantsResponse.status, errorText);
          console.error('❌ Request body was:', JSON.stringify(variantsToInsert, null, 2));
          console.error('❌ Response headers:', Object.fromEntries(variantsResponse.headers.entries()));
          sweetAlert.showError('خطأ', `فشل تحديث المتغيرات: ${errorText}`);
          throw new Error(`Failed to update variants: ${variantsResponse.status} ${errorText}`);
        }
      } else {
        console.log('ℹ️ No variants to update for this product');
      }

      sweetAlert.showSuccess('نجح', 'تم تحديث المنتج بنجاح', () => {
        cancelEdit();
        loadData();
      });
    } catch (error: any) {
      console.error('❌ Error updating product:', error);
      if (typeof window !== 'undefined' && Platform.OS === 'web') {
        window.alert(error.message || 'فشل تحديث المنتج');
      } else {
        Alert.alert('خطأ', error.message || 'فشل تحديث المنتج');
      }
    } finally {
      setLoading(false);
    }
  };

  // Load variants count for products
  const loadProductVariantsCount = async (productIds: string[]) => {
    if (productIds.length === 0) {
      setProductVariantsCount({});
      return;
    }
    
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      const accessToken = await getAccessToken();
      
      // Fetch variants for all products in batches if needed
      const batchSize = 50;
      const countMap: { [key: string]: number } = {};
      
      for (let i = 0; i < productIds.length; i += batchSize) {
        const batch = productIds.slice(i, i + batchSize);
        const idsParam = batch.map(id => `"${id}"`).join(',');
        
        const response = await fetch(`${supabaseUrl}/rest/v1/product_variants?product_id=in.(${idsParam})&select=product_id`, {
          headers: {
            'apikey': supabaseKey || '',
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          }
        });
        
        if (response.ok) {
          const variants = await response.json();
          variants.forEach((variant: any) => {
            countMap[variant.product_id] = (countMap[variant.product_id] || 0) + 1;
          });
        }
      }
      
      // Initialize all products with 0 if they have no variants
      productIds.forEach(id => {
        if (!countMap[id]) {
          countMap[id] = 0;
        }
      });
      
      setProductVariantsCount(countMap);
    } catch (error) {
      console.error('Error loading variants count:', error);
      // Initialize with zeros on error
      const countMap: { [key: string]: number } = {};
      productIds.forEach(id => {
        countMap[id] = 0;
      });
      setProductVariantsCount(countMap);
    }
  };

  // Filter and sort products
  const getFilteredAndSortedProducts = () => {
    let filtered = [...products];
    
    // Search filter
    if (productSearchQuery.trim()) {
      const query = productSearchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.sku?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      );
    }
    
    // Section filter
    if (productFilterSection) {
      filtered = filtered.filter(p => {
        const sectionId = p.category_data?.section_id || p.category_data?.section_data?.id;
        return sectionId === productFilterSection;
      });
    }
    
    // Category filter
    if (productFilterCategory) {
      filtered = filtered.filter(p => p.category_id === productFilterCategory);
    }
    
    // Source filter
    if (productFilterSource !== 'all') {
      filtered = filtered.filter(p => p.source_type === productFilterSource);
    }
    
    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (productSortBy) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '', 'ar');
          break;
        case 'price':
          comparison = (a.price || 0) - (b.price || 0);
          break;
        case 'stock':
          comparison = (a.stock_quantity || 0) - (b.stock_quantity || 0);
          break;
        case 'date':
        default:
          comparison = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
          break;
      }
      
      return productSortOrder === 'asc' ? comparison : -comparison;
    });
    
    return filtered;
  };

  // Get paginated products
  const getPaginatedProducts = () => {
    const filtered = getFilteredAndSortedProducts();
    const startIndex = (productCurrentPage - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    return {
      products: filtered.slice(startIndex, endIndex),
      totalPages: Math.ceil(filtered.length / productsPerPage),
      totalProducts: filtered.length,
    };
  };

  // Duplicate product
  const duplicateProduct = async (product: Product) => {
    try {
      setLoading(true);
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      const accessToken = await getAccessToken();
      
      // Create new product with same data but new SKU
      const newProductData = {
        name: `${product.name} (نسخة)`,
        description: product.description,
        price: product.price,
        original_price: product.original_price,
        discount_percentage: product.discount_percentage,
        category_id: product.category_id,
        stock_quantity: product.stock_quantity,
        source_type: product.source_type,
        sku: `${product.sku}-COPY-${Date.now()}`,
        // image_url removed - all images are stored in product_images table using imgbb links
        sold_count: 0,
        is_limited_time_offer: product.is_limited_time_offer,
        offer_duration_days: product.offer_duration_days,
        is_active: product.is_active !== undefined ? product.is_active : true,
      };
      
      const response = await fetch(`${supabaseUrl}/rest/v1/products`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey || '',
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(newProductData)
      });
      
      if (response.ok) {
        const newProduct = await response.json();
        const newProductId = newProduct[0]?.id;
        
        if (newProductId) {
          // Copy product images from product_images table
          try {
            const imagesResponse = await fetch(`${supabaseUrl}/rest/v1/product_images?product_id=eq.${product.id}&variant_id=is.null&order=display_order.asc`, {
              headers: {
                'apikey': supabaseKey || '',
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              }
            });
            
            if (imagesResponse.ok) {
              const imagesData = await imagesResponse.json();
              if (imagesData && imagesData.length > 0) {
                const imagesToInsert = imagesData.map((img: any, index: number) => ({
                  product_id: newProductId,
                  image_url: img.image_url, // imgbb link
                  variant_id: null,
                  display_order: index,
                  is_primary: index === 0,
                }));
                
                await supabase
                  .from('product_images')
                  .insert(imagesToInsert);
                
                console.log(`✅ Copied ${imagesToInsert.length} images to duplicated product`);
              }
            }
          } catch (imagesError) {
            console.error('Error copying product images:', imagesError);
            // Continue even if image copying fails
          }
        }
        
        sweetAlert.showSuccess('نجح', 'تم نسخ المنتج بنجاح', () => {
          loadData();
        });
      } else {
        const errorText = await response.text();
        sweetAlert.showError('خطأ', 'فشل نسخ المنتج: ' + errorText);
      }
    } catch (error: any) {
      sweetAlert.showError('خطأ', error.message || 'فشل نسخ المنتج');
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (productId: string) => {
    if (typeof window !== 'undefined' && Platform.OS === 'web') {
      if (!window.confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
        return;
      }
    } else {
      Alert.alert('تأكيد', 'هل أنت متأكد من حذف هذا المنتج؟', [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'حذف', style: 'destructive', onPress: () => performDelete(productId) },
      ]);
      return;
    }
    
    performDelete(productId);
  };

  const performDelete = async (productId: string) => {
    setLoading(true);
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      // Get access_token (with auto-refresh if expired)
      const accessToken = await getAccessToken();

      // Delete product (cascade will delete order_items and product_images)
      console.log('🗑️ Admin: Deleting product:', productId);
      const deleteResponse = await fetch(`${supabaseUrl}/rest/v1/products?id=eq.${productId}`, {
        method: 'DELETE',
        headers: {
          'apikey': supabaseKey || '',
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        }
      });

      console.log('📡 Admin: Delete response status:', deleteResponse.status);
      
      if (!deleteResponse.ok) {
        const errorText = await deleteResponse.text();
        console.error('❌ Admin: Delete error response:', errorText);
        throw new Error(errorText);
      }

      const deletedData = await deleteResponse.json();
      console.log('✅ Admin: Product deleted:', deletedData);

      if (typeof window !== 'undefined' && Platform.OS === 'web') {
        window.alert('تم حذف المنتج بنجاح');
      } else {
        Alert.alert('نجح', 'تم حذف المنتج بنجاح');
      }
      
      // Reload data to refresh the list
      await loadData();
    } catch (error: any) {
      console.error('❌ Error deleting product:', error);
      if (typeof window !== 'undefined' && Platform.OS === 'web') {
        window.alert(error.message || 'فشل حذف المنتج');
      } else {
        Alert.alert('خطأ', error.message || 'فشل حذف المنتج');
      }
    } finally {
      setLoading(false);
    }
  };

  const createShipment = async () => {
    if (!newShipment.cost || newShipment.order_ids.length === 0) {
      Alert.alert('خطأ', 'يرجى إدخال التكلفة واختيار الطلبات');
      return;
    }

    setLoading(true);
    try {
      // Generate shipment number
      const { data: shipmentNumberData } = await supabase.rpc('generate_shipment_number');
      const shipment_number = shipmentNumberData || `SHIP-${Date.now()}`;

      // Create shipment
      const { data: shipment, error: shipmentError } = await supabase
        .from('shipments')
        .insert({
          shipment_number,
          cost: parseFloat(newShipment.cost),
          status: 'pending',
        })
        .select()
        .single();

      if (shipmentError) throw shipmentError;

      // Link orders to shipment
      const shipmentOrders = newShipment.order_ids.map((order_id) => ({
        shipment_id: shipment.id,
        order_id,
      }));

      const { error: linkError } = await supabase
        .from('shipment_orders')
        .insert(shipmentOrders);

      if (linkError) throw linkError;

      // Update orders status
      await supabase
        .from('orders')
        .update({ status: 'shipped_from_china' })
        .in('id', newShipment.order_ids);

      Alert.alert('نجح', 'تم إنشاء الشحنة بنجاح');
      setNewShipment({ cost: '', order_ids: [] });
      loadData();
    } catch (error: any) {
      Alert.alert('خطأ', error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateShipmentStatus = async (shipmentId: string, status: string, cost?: number, days?: number) => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('update-shipment-status', {
        body: {
          shipment_id: shipmentId,
          status,
          cost,
          estimated_delivery_days: days,
        },
      });

      if (error) throw error;
      Alert.alert('نجح', 'تم تحديث حالة الشحنة');
      loadData();
    } catch (error: any) {
      Alert.alert('خطأ', error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'قيد الانتظار',
      confirmed: 'تم التأكيد',
      shipped_from_china: 'شُحنت من الصين',
      received_in_uae: 'وصلت الإمارات',
      shipped_from_uae: 'شُحنت من الإمارات',
      received_in_egypt: 'وصلت مصر',
      in_warehouse: 'في المخزن',
      out_for_delivery: 'قيد التوصيل',
      delivered: 'تم التسليم',
      cancelled: 'ملغاة',
      completed: 'مكتملة',
    };
    return statusMap[status] || status;
  };

  const getStatusBadgeColor = (status: string) => {
    const colorMap: Record<string, { backgroundColor: string }> = {
      pending: { backgroundColor: '#F59E0B' },
      confirmed: { backgroundColor: '#3B82F6' },
      shipped_from_china: { backgroundColor: '#8B5CF6' },
      received_in_uae: { backgroundColor: '#6366F1' },
      shipped_from_uae: { backgroundColor: '#EC4899' },
      received_in_egypt: { backgroundColor: '#F43F5E' },
      in_warehouse: { backgroundColor: '#10B981' },
      out_for_delivery: { backgroundColor: '#06B6D4' },
      delivered: { backgroundColor: '#10B981' },
      cancelled: { backgroundColor: '#EF4444' },
      completed: { backgroundColor: '#10B981' },
    };
    return colorMap[status] || { backgroundColor: '#6B7280' };
  };

  const getRoleText = (role: UserRole) => {
    const roleMap: Record<UserRole, string> = {
      customer: 'مستخدم',
      employee: 'موظف',
      manager: 'مدير',
      admin: 'أدمن',
    };
    return roleMap[role] || role;
  };

  const getRoleBadgeStyle = (role: UserRole) => {
    const colorMap: Record<UserRole, { backgroundColor: string }> = {
      customer: { backgroundColor: '#2196F3' },
      employee: { backgroundColor: '#FF9800' },
      manager: { backgroundColor: '#9C27B0' },
      admin: { backgroundColor: '#F44336' },
    };
    return colorMap[role] || { backgroundColor: '#666' };
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    sweetAlert.showConfirm(
      'تغيير الدور',
      `هل أنت متأكد من تغيير دور هذا المستخدم إلى "${getRoleText(newRole)}"؟`,
      () => performUpdateUserRole(userId, newRole),
      undefined,
      'موافق',
      'إلغاء'
    );
  };

  const performUpdateUserRole = async (userId: string, newRole: UserRole) => {
    setLoading(true);
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      const accessToken = await getAccessToken();

      console.log('🔄 Updating user role:', { userId, newRole });
      console.log('🔑 Using access token:', accessToken ? 'Yes' : 'No');

      const response = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${userId}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey || '',
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          role: newRole,
        })
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        throw new Error(errorText);
      }

      const updatedData = await response.json();
      console.log('✅ Updated user data:', updatedData);

      // Verify the update
      if (updatedData && updatedData.length > 0 && updatedData[0].role === newRole) {
        console.log('✅ Role update verified successfully');
        sweetAlert.showSuccess('نجح', 'تم تغيير الدور بنجاح', () => {
          loadUsers();
        });
      } else {
        console.warn('⚠️ Role update may have failed - data mismatch');
        sweetAlert.showWarning('تحذير', 'تم إرسال الطلب ولكن قد يكون هناك مشكلة. يرجى التحقق من الدور.', () => {
          loadUsers();
        });
      }
      
      // Reload users to see the updated data
      await loadUsers();
    } catch (error: any) {
      console.error('❌ Error updating user role:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      sweetAlert.showError('خطأ', error.message || 'فشل تغيير الدور');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text>جاري التحميل...</Text>
      </View>
    );
  }

  const isWeb = Platform.OS === 'web';
  const { width } = Dimensions.get('window');
  const maxContentWidth = isWeb ? 1400 : width;

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={[styles.tabs, isWeb && styles.tabsWeb]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'orders' && styles.activeTab]}
          onPress={() => setActiveTab('orders')}
        >
          <Text style={[styles.tabText, activeTab === 'orders' && styles.activeTabText]}>
            الطلبات
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'shipments' && styles.activeTab]}
          onPress={() => setActiveTab('shipments')}
        >
          <Text style={[styles.tabText, activeTab === 'shipments' && styles.activeTabText]}>
            الشحنات
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'inventory' && styles.activeTab]}
          onPress={() => setActiveTab('inventory')}
        >
          <Text style={[styles.tabText, activeTab === 'inventory' && styles.activeTabText]}>
            المخزون
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'products' && styles.activeTab]}
          onPress={() => setActiveTab('products')}
        >
          <Text style={[styles.tabText, activeTab === 'products' && styles.activeTabText]}>
            المنتجات
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'users' && styles.activeTab]}
          onPress={() => setActiveTab('users')}
        >
          <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>
            المستخدمين
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'categories' && styles.activeTab]}
          onPress={() => setActiveTab('categories')}
        >
          <Text style={[styles.tabText, activeTab === 'categories' && styles.activeTabText]}>
            الفئات
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sections' && styles.activeTab]}
          onPress={() => setActiveTab('sections')}
        >
          <Text style={[styles.tabText, activeTab === 'sections' && styles.activeTabText]}>
            الأقسام
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.contentWrapper, { maxWidth: maxContentWidth, alignSelf: 'center', width: '100%' }]}>
        {activeTab === 'orders' && (
          <View>
            <View style={styles.gridContainer}>
              {orders && orders.length > 0 ? orders.map((order) => {
                const isEditing = editingOrderId === order.id;
                const quickEdit = quickEditOrder[order.id] || {};
                const displayStatus = isEditing ? (quickEdit.status || order.status) : order.status;

                return (
                  <View key={order.id} style={styles.gridCard}>
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.gridCardTitle}>#{order.order_number}</Text>
                        <Text style={styles.gridCardMetaText}>
                          {new Date(order.created_at).toLocaleDateString('ar-EG')}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.cardMenuButton}
                        onPress={() => {
                          if (isEditing) {
                            setEditingOrderId(null);
                            setQuickEditOrder({});
                          } else {
                            setEditingOrderId(order.id);
                            setQuickEditOrder({ [order.id]: {} });
                          }
                        }}
                      >
                        <Ionicons name={isEditing ? "checkmark" : "create-outline"} size={18} color={isEditing ? "#10B981" : "#666"} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.gridProductPrice}>
                      <Text style={styles.gridPrice}>{formatPrice(order.total_amount)} ج.م</Text>
                    </View>

                    <View style={styles.gridCardMeta}>
                      {isEditing ? (
                        <View style={{ flex: 1 }}>
                          <Text style={styles.gridCardMetaText}>الحالة:</Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 120 }}>
                            <View style={styles.statusPicker}>
                              {['pending', 'confirmed', 'shipped_from_china', 'received_in_uae', 'shipped_from_uae', 'received_in_egypt', 'in_warehouse', 'out_for_delivery', 'delivered', 'cancelled'].map((status) => (
                                <TouchableOpacity
                                  key={status}
                                  style={[
                                    styles.statusOption,
                                    displayStatus === status && styles.statusOptionActive
                                  ]}
                                  onPress={() => setQuickEditOrder({ ...quickEditOrder, [order.id]: { ...quickEdit, status: status as any } })}
                                >
                                  <Text style={[styles.statusOptionText, displayStatus === status && styles.statusOptionTextActive]}>
                                    {getStatusText(status)}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </ScrollView>
                        </View>
                      ) : (
                        <View style={[styles.statusBadgeSmall, getStatusBadgeColor(order.status)]}>
                          <Text style={styles.statusBadgeTextSmall}>{getStatusText(order.status)}</Text>
                        </View>
                      )}
                    </View>

                    {isEditing && (
                      <View style={styles.quickEditActions}>
                        <TouchableOpacity
                          style={[styles.quickEditButton, styles.saveButton]}
                          onPress={async () => {
                            const updates = quickEditOrder[order.id];
                            if (updates && Object.keys(updates).length > 0) {
                              setLoading(true);
                              try {
                                const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
                                const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
                                const accessToken = await getAccessToken();

                                await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${order.id}`, {
                                  method: 'PATCH',
                                  headers: {
                                    'apikey': supabaseKey || '',
                                    'Authorization': `Bearer ${accessToken}`,
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify(updates)
                                });

                                sweetAlert.showSuccess('نجح', 'تم التحديث بنجاح', () => {
                                  setEditingOrderId(null);
                                  setQuickEditOrder({});
                                  loadData();
                                });
                              } catch (error: any) {
                                sweetAlert.showError('خطأ', error.message || 'فشل التحديث');
                              } finally {
                                setLoading(false);
                              }
                            } else {
                              setEditingOrderId(null);
                              setQuickEditOrder({});
                            }
                          }}
                        >
                          <Ionicons name="checkmark" size={14} color="#fff" />
                          <Text style={styles.quickEditButtonText}>حفظ</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.quickEditButton, styles.cancelQuickEditButton]}
                          onPress={() => {
                            setEditingOrderId(null);
                            setQuickEditOrder({});
                          }}
                        >
                          <Ionicons name="close" size={14} color="#fff" />
                          <Text style={styles.quickEditButtonText}>إلغاء</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              }) : (
                <View style={{ padding: 20, alignItems: 'center', width: '100%' }}>
                  <Text style={{ color: '#666', fontSize: 16 }}>لا توجد طلبات</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {activeTab === 'shipments' && (
          <View>
            <View style={styles.gridContainer}>
              {shipments.map((shipment) => (
                <View key={shipment.id} style={styles.gridCard}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.gridCardTitle}>#{shipment.shipment_number}</Text>
                      <Text style={styles.gridCardMetaText}>
                        {new Date(shipment.created_at).toLocaleDateString('ar-EG')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.gridProductPrice}>
                    <Text style={styles.gridPrice}>{formatPrice(shipment.cost)} ج.م</Text>
                  </View>

                  <View style={styles.gridCardMeta}>
                    <View style={[styles.statusBadgeSmall, getStatusBadgeColor(shipment.status)]}>
                      <Text style={styles.statusBadgeTextSmall}>{getStatusText(shipment.status)}</Text>
                    </View>
                  </View>

                  <View style={styles.shipmentActions}>
                    {shipment.status === 'pending' && (
                      <TouchableOpacity
                        style={[styles.quickEditButton, styles.saveButton]}
                        onPress={() => updateShipmentStatus(shipment.id, 'shipped_from_china')}
                      >
                        <Ionicons name="send-outline" size={14} color="#fff" />
                        <Text style={styles.quickEditButtonText}>شُحنت من الصين</Text>
                      </TouchableOpacity>
                    )}
                    {shipment.status === 'shipped_from_china' && (
                      <TouchableOpacity
                        style={[styles.quickEditButton, styles.saveButton]}
                        onPress={() => updateShipmentStatus(shipment.id, 'received_in_uae')}
                      >
                        <Ionicons name="checkmark-circle-outline" size={14} color="#fff" />
                        <Text style={styles.quickEditButtonText}>وصلت الإمارات</Text>
                      </TouchableOpacity>
                    )}
                    {shipment.status === 'received_in_uae' && (
                      <TouchableOpacity
                        style={[styles.quickEditButton, styles.saveButton]}
                        onPress={() => {
                          sweetAlert.showConfirm(
                            'تكلفة الشحن',
                            'أدخل تكلفة الشحن من الإمارات لمصر:',
                            () => {
                              // Use a simple prompt for cost
                              if (Platform.OS === 'web') {
                                const cost = window.prompt('أدخل تكلفة الشحن:', '0');
                                if (cost) {
                                  updateShipmentStatus(shipment.id, 'shipped_from_uae', parseFloat(cost));
                                }
                              } else {
                                Alert.prompt(
                                  'تكلفة الشحن',
                                  'أدخل تكلفة الشحن من الإمارات لمصر:',
                                  [
                                    { text: 'إلغاء', style: 'cancel' },
                                    {
                                      text: 'موافق',
                                      onPress: (cost) => {
                                        if (cost) {
                                          updateShipmentStatus(shipment.id, 'shipped_from_uae', parseFloat(cost));
                                        }
                                      },
                                    },
                                  ],
                                  'plain-text',
                                  '',
                                  'numeric'
                                );
                              }
                            },
                            undefined,
                            'موافق',
                            'إلغاء'
                          );
                        }}
                      >
                        <Ionicons name="send-outline" size={14} color="#fff" />
                        <Text style={styles.quickEditButtonText}>شُحنت من الإمارات</Text>
                      </TouchableOpacity>
                    )}
                    {shipment.status === 'shipped_from_uae' && (
                      <TouchableOpacity
                        style={[styles.quickEditButton, styles.saveButton]}
                        onPress={() => updateShipmentStatus(shipment.id, 'received_in_egypt')}
                      >
                        <Ionicons name="checkmark-circle-outline" size={14} color="#fff" />
                        <Text style={styles.quickEditButtonText}>وصلت مصر</Text>
                      </TouchableOpacity>
                    )}
                    {shipment.status === 'received_in_egypt' && (
                      <TouchableOpacity
                        style={[styles.quickEditButton, styles.saveButton]}
                        onPress={() => {
                          if (Platform.OS === 'web') {
                            const days = window.prompt('كم يوم متوقع للوصول؟', '3');
                            if (days) {
                              updateShipmentStatus(shipment.id, 'in_warehouse', undefined, parseInt(days));
                            }
                          } else {
                            Alert.prompt(
                              'أيام التوصيل',
                              'كم يوم متوقع للوصول؟',
                              [
                                { text: 'إلغاء', style: 'cancel' },
                                {
                                  text: 'موافق',
                                  onPress: (days) => {
                                    if (days) {
                                      updateShipmentStatus(shipment.id, 'in_warehouse', undefined, parseInt(days));
                                    }
                                  },
                                },
                              ],
                              'plain-text',
                              '3',
                              'numeric'
                            );
                          }
                        }}
                      >
                        <Ionicons name="cube-outline" size={14} color="#fff" />
                        <Text style={styles.quickEditButtonText}>دخلت المخزن</Text>
                      </TouchableOpacity>
                    )}
                    {shipment.status === 'in_warehouse' && (
                      <TouchableOpacity
                        style={[styles.quickEditButton, styles.saveButton]}
                        onPress={() => updateShipmentStatus(shipment.id, 'completed')}
                      >
                        <Ionicons name="checkmark-done-outline" size={14} color="#fff" />
                        <Text style={styles.quickEditButtonText}>مكتملة</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {activeTab === 'inventory' && (
          <View>
            <View style={styles.gridContainer}>
              {inventory.map((item) => {
                const isEditing = editingInventoryId === item.id;
                const quickEdit = quickEditInventory[item.id] || {};
                const displayQuantity = isEditing ? (quickEdit.quantity !== undefined ? quickEdit.quantity : item.quantity) : item.quantity;
                const displayCost = isEditing ? (quickEdit.cost_per_unit !== undefined ? quickEdit.cost_per_unit : item.cost_per_unit) : item.cost_per_unit;
                const product = item.product as Product;

                return (
                  <View key={item.id} style={styles.gridCard}>
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.gridCardTitle} numberOfLines={2}>
                          {product?.name || 'منتج غير معروف'}
                        </Text>
                        {product?.image_url && (
                          <Image
                            source={{ uri: product.image_url }}
                            style={styles.gridProductImageSmall}
                            resizeMode="cover"
                          />
                        )}
                      </View>
                      <TouchableOpacity
                        style={styles.cardMenuButton}
                        onPress={() => {
                          if (isEditing) {
                            setEditingInventoryId(null);
                            setQuickEditInventory({});
                          } else {
                            setEditingInventoryId(item.id);
                            setQuickEditInventory({ [item.id]: {} });
                          }
                        }}
                      >
                        <Ionicons name={isEditing ? "checkmark" : "create-outline"} size={18} color={isEditing ? "#10B981" : "#666"} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.gridCardMeta}>
                      {isEditing ? (
                        <>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <Text style={styles.gridCardMetaText}>الكمية:</Text>
                            <TextInput
                              style={styles.inlineInputSmall}
                              value={displayQuantity.toString()}
                              onChangeText={(text) => setQuickEditInventory({ ...quickEditInventory, [item.id]: { ...quickEdit, quantity: parseInt(text) || 0 } })}
                              placeholder="الكمية"
                              keyboardType="numeric"
                            />
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={styles.gridCardMetaText}>التكلفة:</Text>
                            <TextInput
                              style={styles.inlineInputSmall}
                              value={displayCost.toString()}
                              onChangeText={(text) => setQuickEditInventory({ ...quickEditInventory, [item.id]: { ...quickEdit, cost_per_unit: parseFloat(text) || 0 } })}
                              placeholder="التكلفة"
                              keyboardType="numeric"
                            />
                          </View>
                        </>
                      ) : (
                        <>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Ionicons name="cube-outline" size={14} color="#6B7280" />
                            <Text style={styles.gridCardMetaText}>{item.quantity} قطعة</Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Ionicons name="cash-outline" size={14} color="#6B7280" />
                            <Text style={styles.gridCardMetaText}>{formatPrice(item.cost_per_unit)} ج.م</Text>
                          </View>
                        </>
                      )}
                    </View>

                    {isEditing && (
                      <View style={styles.quickEditActions}>
                        <TouchableOpacity
                          style={[styles.quickEditButton, styles.saveButton]}
                          onPress={async () => {
                            const updates = quickEditInventory[item.id];
                            if (updates && Object.keys(updates).length > 0) {
                              setLoading(true);
                              try {
                                const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
                                const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
                                const accessToken = await getAccessToken();

                                await fetch(`${supabaseUrl}/rest/v1/inventory?id=eq.${item.id}`, {
                                  method: 'PATCH',
                                  headers: {
                                    'apikey': supabaseKey || '',
                                    'Authorization': `Bearer ${accessToken}`,
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify(updates)
                                });

                                sweetAlert.showSuccess('نجح', 'تم التحديث بنجاح', () => {
                                  setEditingInventoryId(null);
                                  setQuickEditInventory({});
                                  loadData();
                                });
                              } catch (error: any) {
                                sweetAlert.showError('خطأ', error.message || 'فشل التحديث');
                              } finally {
                                setLoading(false);
                              }
                            } else {
                              setEditingInventoryId(null);
                              setQuickEditInventory({});
                            }
                          }}
                        >
                          <Ionicons name="checkmark" size={14} color="#fff" />
                          <Text style={styles.quickEditButtonText}>حفظ</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.quickEditButton, styles.cancelQuickEditButton]}
                          onPress={() => {
                            setEditingInventoryId(null);
                            setQuickEditInventory({});
                          }}
                        >
                          <Ionicons name="close" size={14} color="#fff" />
                          <Text style={styles.quickEditButtonText}>إلغاء</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {activeTab === 'products' && (
          <View>
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>
                {editingProduct ? 'تعديل منتج' : 'إضافة منتج جديد'}
              </Text>
              {editingProduct && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={cancelEdit}
                >
                  <Text style={styles.cancelButtonText}>إلغاء التعديل</Text>
                </TouchableOpacity>
              )}
              <TextInput
                style={styles.input}
                placeholder="اسم المنتج"
                value={newProduct.name}
                onChangeText={(text) => setNewProduct({ ...newProduct, name: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="الوصف"
                value={newProduct.description}
                onChangeText={(text) => setNewProduct({ ...newProduct, description: text })}
                multiline
              />
              <TextInput
                style={styles.input}
                placeholder="السعر (السعر الحالي بعد الخصم)"
                value={newProduct.price}
                onChangeText={(text) => setNewProduct({ ...newProduct, price: text })}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder="السعر الأصلي (قبل الخصم) - اختياري"
                value={newProduct.original_price}
                onChangeText={(text) => setNewProduct({ ...newProduct, original_price: text })}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder="نسبة الخصم (%) - اختياري (0-100)"
                value={newProduct.discount_percentage}
                onChangeText={(text) => setNewProduct({ ...newProduct, discount_percentage: text })}
                keyboardType="numeric"
              />
              <Text style={styles.helpText}>
                💡 ملاحظة: يمكنك إدخال إما السعر الأصلي أو نسبة الخصم، وسيتم حساب الآخر تلقائياً
              </Text>
              
              {/* Source Type Selection */}
              <View style={styles.selectContainer}>
                <Text style={styles.selectLabel}>مصدر المنتج: *</Text>
                <View style={styles.radioGroup}>
                  <TouchableOpacity
                    style={[styles.radioOption, newProduct.source_type === 'warehouse' && styles.radioOptionActive]}
                    onPress={() => setNewProduct({ ...newProduct, source_type: 'warehouse' })}
                  >
                    <Ionicons 
                      name={newProduct.source_type === 'warehouse' ? 'radio-button-on' : 'radio-button-off'} 
                      size={20} 
                      color={newProduct.source_type === 'warehouse' ? '#EE1C47' : '#666'} 
                    />
                    <Text style={[styles.radioOptionText, newProduct.source_type === 'warehouse' && styles.radioOptionTextActive]}>
                      من المخزن الداخلي
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.radioOption, newProduct.source_type === 'external' && styles.radioOptionActive]}
                    onPress={() => setNewProduct({ ...newProduct, source_type: 'external' })}
                  >
                    <Ionicons 
                      name={newProduct.source_type === 'external' ? 'radio-button-on' : 'radio-button-off'} 
                      size={20} 
                      color={newProduct.source_type === 'external' ? '#EE1C47' : '#666'} 
                    />
                    <Text style={[styles.radioOptionText, newProduct.source_type === 'external' && styles.radioOptionTextActive]}>
                      طلب من الخارج
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* SKU */}
              <TextInput
                style={styles.input}
                placeholder="كود المنتج (SKU) *"
                value={newProduct.sku}
                onChangeText={(text) => setNewProduct({ ...newProduct, sku: text })}
              />
              <Text style={styles.helpText}>
                ⚠️ الكود يجب أن يكون فريداً ولا يتكرر
              </Text>

              {/* Section Selection - اختيار القسم أولاً */}
              <View style={styles.selectContainer}>
                <Text style={styles.selectLabel}>القسم:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categorySelect}>
                  <TouchableOpacity
                    style={[styles.categorySelectChip, !newProduct.section_id && styles.categorySelectChipActive]}
                    onPress={() => setNewProduct({ ...newProduct, section_id: '', category_id: '', category: '' })}
                  >
                    <Text style={[styles.categorySelectChipText, !newProduct.section_id && styles.categorySelectChipTextActive]}>
                      جميع الأقسام
                    </Text>
                  </TouchableOpacity>
                  {sections.filter(s => s.is_active).map((section) => (
                    <TouchableOpacity
                      key={section.id}
                      style={[styles.categorySelectChip, newProduct.section_id === section.id && styles.categorySelectChipActive]}
                      onPress={() => {
                        // عند تغيير القسم، نمسح اختيار الفئة
                        setNewProduct({ ...newProduct, section_id: section.id, category_id: '', category: '' });
                      }}
                    >
                      {section.icon && (
                        <Ionicons name={section.icon as any} size={16} color={newProduct.section_id === section.id ? '#fff' : '#666'} style={{ marginRight: 5 }} />
                      )}
                      <Text style={[styles.categorySelectChipText, newProduct.section_id === section.id && styles.categorySelectChipTextActive]}>
                        {section.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Category Selection - عرض الفئات المرتبطة بالقسم المختار فقط */}
              <View style={styles.selectContainer}>
                <Text style={styles.selectLabel}>الفئة:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categorySelect}>
                  <TouchableOpacity
                    style={[styles.categorySelectChip, !newProduct.category_id && styles.categorySelectChipActive]}
                    onPress={() => setNewProduct({ ...newProduct, category_id: '', category: '' })}
                  >
                    <Text style={[styles.categorySelectChipText, !newProduct.category_id && styles.categorySelectChipTextActive]}>
                      بدون فئة
                    </Text>
                  </TouchableOpacity>
                  {categories
                    .filter(c => {
                      // إذا تم اختيار قسم، نعرض فقط الفئات المرتبطة به
                      if (newProduct.section_id) {
                        return c.is_active && c.section_id === newProduct.section_id;
                      }
                      // إذا لم يتم اختيار قسم، نعرض جميع الفئات النشطة
                      return c.is_active;
                    })
                    .map((category) => (
                      <TouchableOpacity
                        key={category.id}
                        style={[styles.categorySelectChip, newProduct.category_id === category.id && styles.categorySelectChipActive]}
                        onPress={() => {
                          setNewProduct({ ...newProduct, category_id: category.id, category: category.name });
                          // Load category colors and sizes
                          loadCategoryVariantOptions(category.id);
                        }}
                      >
                        {category.icon && (
                          <Ionicons name={category.icon as any} size={16} color={newProduct.category_id === category.id ? '#fff' : '#666'} style={{ marginRight: 5 }} />
                        )}
                        <Text style={[styles.categorySelectChipText, newProduct.category_id === category.id && styles.categorySelectChipTextActive]}>
                          {category.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </ScrollView>
                {newProduct.section_id && categories.filter(c => c.is_active && c.section_id === newProduct.section_id).length === 0 && (
                  <Text style={styles.helpText}>
                    ⚠️ لا توجد فئات نشطة في هذا القسم. يمكنك إضافة فئة جديدة من تبويب "الفئات"
                  </Text>
                )}
              </View>
              
              {/* Stock Quantity - يظهر فقط للمنتجات الداخلية */}
              {newProduct.source_type === 'warehouse' && (
                <TextInput
                  style={styles.input}
                  placeholder="الكمية في المخزن"
                  value={newProduct.stock_quantity}
                  onChangeText={(text) => setNewProduct({ ...newProduct, stock_quantity: text })}
                  keyboardType="numeric"
                />
              )}

              {/* Sold Count - عدد القطع المباعة */}
              <TextInput
                style={styles.input}
                placeholder="عدد القطع المباعة (يتم تحديثه تلقائياً عند الطلب)"
                value={newProduct.sold_count}
                onChangeText={(text) => setNewProduct({ ...newProduct, sold_count: text })}
                keyboardType="numeric"
              />
              <Text style={styles.helpText}>
                💡 هذا الرقم يتم تحديثه تلقائياً عند إتمام الطلبات، ولكن يمكنك تعديله يدوياً
              </Text>

              {/* Limited Time Offer - عرض محدود الوقت */}
              <View style={styles.selectContainer}>
                <Text style={styles.selectLabel}>عرض محدود الوقت:</Text>
                <View style={styles.switchContainer}>
                  <Text style={styles.switchLabel}>تفعيل عرض محدود الوقت</Text>
                  <TouchableOpacity
                    style={[styles.switch, newProduct.is_limited_time_offer && styles.switchActive]}
                    onPress={() => setNewProduct({ ...newProduct, is_limited_time_offer: !newProduct.is_limited_time_offer })}
                  >
                    <View style={[styles.switchThumb, newProduct.is_limited_time_offer && styles.switchThumbActive]} />
                  </TouchableOpacity>
                </View>
                {newProduct.is_limited_time_offer && (
                  <View style={{ marginTop: 10 }}>
                    <TextInput
                      style={styles.input}
                      placeholder="مدة العرض بالأيام (مثل: 7 أيام)"
                      value={newProduct.offer_duration_days}
                      onChangeText={(text) => setNewProduct({ ...newProduct, offer_duration_days: text })}
                      keyboardType="numeric"
                    />
                    <Text style={styles.helpText}>
                      💡 سيتم حساب تاريخ انتهاء العرض تلقائياً من تاريخ بداية العرض (عند الحفظ)
                    </Text>
                    <Text style={styles.helpText}>
                      ⚠️ عند انتهاء العرض، سيتم إزالة الخصم تلقائياً
                    </Text>
                  </View>
                )}
              </View>

              <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                <Text style={styles.imageButtonText}>
                  {productImages.length > 0 ? `تم رفع ${productImages.length} صورة` : 'اختر صور (متعددة)'}
                </Text>
              </TouchableOpacity>
              
              {/* Display uploaded images */}
              {productImages.length > 0 && (
                <View style={styles.imagesPreview}>
                  <Text style={styles.imagesPreviewTitle}>الصور المضافة ({productImages.length}):</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesList}>
                    {productImages.map((img, index) => (
                      <View key={index} style={styles.imagePreviewItem}>
                        <Image source={{ uri: img.url || img.uri }} style={styles.imagePreview} />
                        {index === 0 && (
                          <View style={styles.primaryBadge}>
                            <Text style={styles.primaryBadgeText}>أساسية</Text>
                          </View>
                        )}
                        <View style={styles.imageActions}>
                          {index !== 0 && (
                            <TouchableOpacity
                              style={styles.imageActionButton}
                              onPress={() => setPrimaryImage(index)}
                            >
                              <Ionicons name="star" size={16} color="#FFD700" />
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            style={styles.imageActionButton}
                            onPress={() => removeImage(index)}
                          >
                            <Ionicons name="trash" size={16} color="#f44336" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Product Variants Management - إدارة الألوان والمقاسات */}
              <View style={styles.variantsSection}>
                <Text style={styles.sectionTitle}>الألوان والمقاسات (Variants)</Text>
                <Text style={styles.helpText}>
                  💡 يمكنك إضافة ألوان ومقاسات مختلفة للمنتج. كل لون يمكن أن يكون له صور خاصة به.
                </Text>
                
                {/* Variants List */}
                {productVariants.length > 0 ? (
                  <View style={styles.variantsGrid}>
                    {productVariants.map((variant) => (
                      <View key={variant.id} style={styles.variantCard}>
                        {/* Variant Image */}
                        <View style={styles.variantImageContainer}>
                          {variant.image_url ? (
                            <Image 
                              source={{ uri: variant.image_url }} 
                              style={styles.variantCardImage}
                              onError={(e) => {
                                console.error('❌ Error loading variant image:', variant.image_url, e.nativeEvent.error);
                              }}
                              onLoad={() => {
                                console.log('✅ Variant image loaded successfully:', variant.image_url);
                              }}
                            />
                          ) : (
                            <View style={[styles.variantCardImage, styles.variantImagePlaceholder]}>
                              <Ionicons name="image-outline" size={40} color="#ccc" />
                              <Text style={styles.variantImagePlaceholderText}>لا توجد صورة</Text>
                            </View>
                          )}
                        </View>

                        {/* Variant Info */}
                        <View style={styles.variantCardContent}>
                          <View style={styles.variantCardHeader}>
                            {variant.color && (
                              <View style={styles.variantColorBadge}>
                                <Ionicons name="color-palette-outline" size={14} color="#fff" />
                                <Text style={styles.variantColorText}>{String(variant.color || '')}</Text>
                              </View>
                            )}
                            {variant.size && (
                              <View style={styles.variantSizeBadge}>
                                <Ionicons name="resize-outline" size={14} color="#666" />
                                <Text style={styles.variantSizeText}>
                                  {String(variant.size || '')}{variant.size_unit ? ` ${String(variant.size_unit)}` : ''}
                                </Text>
                              </View>
                            )}
                          </View>

                          <View style={styles.variantCardDetails}>
                            {variant.price && (
                              <View style={styles.variantDetailRow}>
                                <Ionicons name="cash-outline" size={14} color="#4CAF50" />
                                <Text style={styles.variantPriceText}>{formatPrice(variant.price)} ج.م</Text>
                              </View>
                            )}
                            <View style={styles.variantDetailRow}>
                              <Ionicons name="cube-outline" size={14} color="#2196F3" />
                              <Text style={styles.variantStockText}>المخزون: {variant.stock_quantity}</Text>
                            </View>
                            {variant.sku && (
                              <View style={styles.variantDetailRow}>
                                <Ionicons name="barcode-outline" size={14} color="#999" />
                                <Text style={styles.variantSkuText}>SKU: {variant.sku}</Text>
                              </View>
                            )}
                          </View>
                        </View>

                        {/* Variant Actions */}
                        <View style={styles.variantCardActions}>
                          <TouchableOpacity
                            style={styles.variantEditButton}
                            onPress={() => startEditVariant(variant)}
                          >
                            <Ionicons name="create-outline" size={18} color="#2196F3" />
                            <Text style={styles.variantActionText}>تعديل</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.variantDeleteButton}
                            onPress={() => deleteVariant(variant.id)}
                          >
                            <Ionicons name="trash-outline" size={18} color="#f44336" />
                            <Text style={[styles.variantActionText, { color: '#f44336' }]}>حذف</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyVariantsContainer}>
                    <Ionicons name="color-palette-outline" size={48} color="#ccc" />
                    <Text style={styles.emptyVariantsText}>
                      لا توجد متغيرات مضافة بعد
                    </Text>
                    <Text style={styles.emptyVariantsSubtext}>
                      أضف متغير جديد أدناه
                    </Text>
                  </View>
                )}

                {/* Add/Edit Variant Form */}
                <View style={styles.addVariantForm}>
                  <Text style={styles.formSubTitle}>
                    {editingVariant ? 'تعديل متغير' : 'إضافة متغير جديد'}
                  </Text>
                  {editingVariant && (
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={cancelEditVariant}
                    >
                      <Text style={styles.cancelButtonText}>إلغاء التعديل</Text>
                    </TouchableOpacity>
                  )}
                  
                  {/* Color Selection - اختيار اللون من الاقتراحات */}
                  <View style={styles.selectContainer}>
                    <Text style={styles.selectLabel}>اللون:</Text>
                    {categoryColors.length > 0 ? (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.variantOptionsList}>
                        {categoryColors.map((color) => (
                          <TouchableOpacity
                            key={color.id}
                            style={[
                              styles.variantOptionChip,
                              newVariant.color === color.color_name && styles.variantOptionChipActive
                            ]}
                            onPress={() => setNewVariant({ ...newVariant, color: color.color_name })}
                          >
                            {color.color_hex && (
                              <View style={[styles.colorCircle, { backgroundColor: color.color_hex }]} />
                            )}
                            <Text style={[
                              styles.variantOptionChipText,
                              newVariant.color === color.color_name && styles.variantOptionChipTextActive
                            ]}>
                              {String(color.color_name || '')}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    ) : (
                      <Text style={styles.helpText}>
                        ⚠️ لا توجد ألوان محددة لهذه الفئة. يمكنك إضافة لون جديد أدناه أو إدارتها من تبويب "الفئات"
                      </Text>
                    )}
                    {showColorInput ? (
                      <TextInput
                        style={styles.input}
                        placeholder="أضف لون جديد"
                        value={newVariant.color}
                        onChangeText={(text) => setNewVariant({ ...newVariant, color: text })}
                      />
                    ) : (
                      <TouchableOpacity
                        style={styles.addNewButton}
                        onPress={() => setShowColorInput(true)}
                      >
                        <Ionicons name="add-circle-outline" size={18} color="#10B981" />
                        <Text style={styles.addNewButtonText}>إضافة لون جديد</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Size Selection - اختيار المقاس من الاقتراحات */}
                  <View style={styles.selectContainer}>
                    <Text style={styles.selectLabel}>المقاس:</Text>
                    {categorySizes.length > 0 ? (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.variantOptionsList}>
                        {categorySizes.map((size) => (
                          <TouchableOpacity
                            key={size.id}
                            style={[
                              styles.variantOptionChip,
                              newVariant.size === size.size_value && newVariant.size_unit === size.size_unit && styles.variantOptionChipActive
                            ]}
                            onPress={() => setNewVariant({ 
                              ...newVariant, 
                              size: size.size_value,
                              size_unit: size.size_unit || ''
                            })}
                          >
                            <Text style={[
                              styles.variantOptionChipText,
                              newVariant.size === size.size_value && newVariant.size_unit === size.size_unit && styles.variantOptionChipTextActive
                            ]}>
                              {size.size_value} {size.size_unit ? `(${size.size_unit})` : ''}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    ) : (
                      <Text style={styles.helpText}>
                        ⚠️ لا توجد مقاسات محددة لهذه الفئة. يمكنك إضافة مقاس جديد أدناه أو إدارتها من تبويب "الفئات"
                      </Text>
                    )}
                    {showSizeInput ? (
                      <View style={styles.sizeInputRow}>
                        <TextInput
                          style={[styles.input, { flex: 2, marginRight: 10 }]}
                          placeholder="المقاس (مثل: L, 42, 100x200)"
                          value={newVariant.size}
                          onChangeText={(text) => setNewVariant({ ...newVariant, size: text })}
                        />
                        <TextInput
                          style={[styles.input, { flex: 1 }]}
                          placeholder="وحدة القياس (مثل: مقاس، رقم، سم)"
                          value={newVariant.size_unit}
                          onChangeText={(text) => setNewVariant({ ...newVariant, size_unit: text })}
                        />
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.addNewButton}
                        onPress={() => setShowSizeInput(true)}
                      >
                        <Ionicons name="add-circle-outline" size={18} color="#10B981" />
                        <Text style={styles.addNewButtonText}>إضافة مقاس جديد</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="السعر (اختياري - إذا كان مختلف عن سعر المنتج)"
                    value={newVariant.price}
                    onChangeText={(text) => setNewVariant({ ...newVariant, price: text })}
                    keyboardType="numeric"
                  />
                  {newProduct.source_type === 'warehouse' && (
                    <TextInput
                      style={styles.input}
                      placeholder="الكمية في المخزن"
                      value={newVariant.stock_quantity}
                      onChangeText={(text) => setNewVariant({ ...newVariant, stock_quantity: text })}
                      keyboardType="numeric"
                    />
                  )}
                  <TextInput
                    style={styles.input}
                    placeholder="SKU (اختياري)"
                    value={newVariant.sku}
                    onChangeText={(text) => setNewVariant({ ...newVariant, sku: text })}
                  />
                  <TouchableOpacity 
                    style={styles.imageButton} 
                    onPress={() => pickVariantImage()}
                  >
                    <Text style={styles.imageButtonText}>
                      {newVariant.image_url ? 'تم رفع صورة' : 'اختر صورة لهذا اللون'}
                    </Text>
                  </TouchableOpacity>
                  {newVariant.image_url && (
                    <Image source={{ uri: newVariant.image_url }} style={styles.variantImagePreview} />
                  )}
                  <TouchableOpacity
                    style={[styles.addVariantButton, editingVariant && styles.updateVariantButton]}
                    onPress={editingVariant ? updateVariant : addVariant}
                  >
                    <Text style={styles.addVariantButtonText}>
                      {editingVariant ? 'تحديث المتغير' : 'إضافة متغير'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <TouchableOpacity
                style={styles.submitButton}
                onPress={editingProduct ? updateProduct : addProduct}
              >
                <Text style={styles.submitButtonText}>
                  {editingProduct ? 'تحديث المنتج' : 'إضافة منتج'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Search and Filters */}
            <View style={styles.filtersContainer}>
              {/* Search */}
              <View style={styles.searchContainer}>
                <Ionicons name="search-outline" size={20} color="#666" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="بحث عن منتج (اسم، SKU، وصف)..."
                  value={productSearchQuery}
                  onChangeText={setProductSearchQuery}
                />
                {productSearchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setProductSearchQuery('')}>
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Filters Row */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersRow}>
                {/* Section Filter */}
                <View style={styles.filterGroup}>
                  <Text style={styles.filterLabel}>القسم:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <TouchableOpacity
                      style={[styles.filterChip, !productFilterSection && styles.filterChipActive]}
                      onPress={() => setProductFilterSection(null)}
                    >
                      <Text style={[styles.filterChipText, !productFilterSection && styles.filterChipTextActive]}>
                        الكل
                      </Text>
                    </TouchableOpacity>
                    {sections.filter(s => s.is_active).map((section) => (
                      <TouchableOpacity
                        key={section.id}
                        style={[styles.filterChip, productFilterSection === section.id && styles.filterChipActive]}
                        onPress={() => {
                          setProductFilterSection(section.id);
                          setProductFilterCategory(null);
                        }}
                      >
                        <Text style={[styles.filterChipText, productFilterSection === section.id && styles.filterChipTextActive]}>
                          {section.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Category Filter */}
                {productFilterSection && (
                  <View style={styles.filterGroup}>
                    <Text style={styles.filterLabel}>الفئة:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <TouchableOpacity
                        style={[styles.filterChip, !productFilterCategory && styles.filterChipActive]}
                        onPress={() => setProductFilterCategory(null)}
                      >
                        <Text style={[styles.filterChipText, !productFilterCategory && styles.filterChipTextActive]}>
                          الكل
                        </Text>
                      </TouchableOpacity>
                      {categories.filter(c => c.section_id === productFilterSection).map((category) => (
                        <TouchableOpacity
                          key={category.id}
                          style={[styles.filterChip, productFilterCategory === category.id && styles.filterChipActive]}
                          onPress={() => setProductFilterCategory(category.id)}
                        >
                          <Text style={[styles.filterChipText, productFilterCategory === category.id && styles.filterChipTextActive]}>
                            {category.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Source Filter */}
                <View style={styles.filterGroup}>
                  <Text style={styles.filterLabel}>المصدر:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <TouchableOpacity
                      style={[styles.filterChip, productFilterSource === 'all' && styles.filterChipActive]}
                      onPress={() => setProductFilterSource('all')}
                    >
                      <Text style={[styles.filterChipText, productFilterSource === 'all' && styles.filterChipTextActive]}>
                        الكل
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.filterChip, productFilterSource === 'warehouse' && styles.filterChipActive]}
                      onPress={() => setProductFilterSource('warehouse')}
                    >
                      <Text style={[styles.filterChipText, productFilterSource === 'warehouse' && styles.filterChipTextActive]}>
                        مخزن
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.filterChip, productFilterSource === 'external' && styles.filterChipActive]}
                      onPress={() => setProductFilterSource('external')}
                    >
                      <Text style={[styles.filterChipText, productFilterSource === 'external' && styles.filterChipTextActive]}>
                        خارجي
                      </Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              </ScrollView>

              {/* Sort */}
              <View style={styles.sortContainer}>
                <Text style={styles.sortLabel}>ترتيب حسب:</Text>
                <View style={styles.sortRow}>
                  <TouchableOpacity
                    style={[styles.sortChip, productSortBy === 'date' && styles.sortChipActive]}
                    onPress={() => {
                      if (productSortBy === 'date') {
                        setProductSortOrder(productSortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setProductSortBy('date');
                        setProductSortOrder('desc');
                      }
                    }}
                  >
                    <Text style={[styles.sortChipText, productSortBy === 'date' && styles.sortChipTextActive]}>
                      التاريخ {productSortBy === 'date' && (productSortOrder === 'asc' ? '↑' : '↓')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.sortChip, productSortBy === 'name' && styles.sortChipActive]}
                    onPress={() => {
                      if (productSortBy === 'name') {
                        setProductSortOrder(productSortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setProductSortBy('name');
                        setProductSortOrder('asc');
                      }
                    }}
                  >
                    <Text style={[styles.sortChipText, productSortBy === 'name' && styles.sortChipTextActive]}>
                      الاسم {productSortBy === 'name' && (productSortOrder === 'asc' ? '↑' : '↓')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.sortChip, productSortBy === 'price' && styles.sortChipActive]}
                    onPress={() => {
                      if (productSortBy === 'price') {
                        setProductSortOrder(productSortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setProductSortBy('price');
                        setProductSortOrder('asc');
                      }
                    }}
                  >
                    <Text style={[styles.sortChipText, productSortBy === 'price' && styles.sortChipTextActive]}>
                      السعر {productSortBy === 'price' && (productSortOrder === 'asc' ? '↑' : '↓')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.sortChip, productSortBy === 'stock' && styles.sortChipActive]}
                    onPress={() => {
                      if (productSortBy === 'stock') {
                        setProductSortOrder(productSortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setProductSortBy('stock');
                        setProductSortOrder('asc');
                      }
                    }}
                  >
                    <Text style={[styles.sortChipText, productSortBy === 'stock' && styles.sortChipTextActive]}>
                      المخزون {productSortBy === 'stock' && (productSortOrder === 'asc' ? '↑' : '↓')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Results Count */}
              <Text style={styles.resultsCount}>
                عرض {paginatedProductsData.totalProducts} منتج
              </Text>
            </View>

            <View style={styles.gridContainer}>
              {paginatedProductsData.products && paginatedProductsData.products.length > 0 ? paginatedProductsData.products.map((product) => {
                const isEditing = editingProductId === product.id;
                const quickEdit = quickEditProduct[product.id] || {};
                const displayName = isEditing ? (quickEdit.name !== undefined ? quickEdit.name : product.name) : product.name;
                const displayPrice = isEditing ? (quickEdit.price !== undefined ? quickEdit.price : product.price) : product.price;
                const displayStock = isEditing ? (quickEdit.stock_quantity !== undefined ? quickEdit.stock_quantity : product.stock_quantity) : product.stock_quantity;
                
                // Ensure all values are strings for TextInput
                const safeDisplayName = displayName || '';
                const safeDisplayPrice = typeof displayPrice === 'number' && !isNaN(displayPrice) ? displayPrice : (product.price || 0);
                const safeDisplayStock = typeof displayStock === 'number' && !isNaN(displayStock) ? displayStock : (product.stock_quantity || 0);

                return (
                  <View key={product.id} style={styles.gridCard}>
                    {(product.primary_image_url || product.image_url) && (
                      <Image
                        source={{ uri: product.primary_image_url || product.image_url }}
                        style={styles.gridProductImage}
                        resizeMode="contain"
                      />
                    )}
                    
                    <View style={styles.cardHeader}>
                      {isEditing ? (
                        <TextInput
                          style={styles.inlineInput}
                          value={safeDisplayName}
                          onChangeText={(text) => setQuickEditProduct({ ...quickEditProduct, [product.id]: { ...quickEdit, name: text } })}
                          placeholder="اسم المنتج"
                        />
                      ) : (
                        <Text style={styles.gridCardTitle} numberOfLines={2}>{product.name}</Text>
                      )}
                      <TouchableOpacity
                        style={styles.cardMenuButton}
                        onPress={() => {
                          if (isEditing) {
                            setEditingProductId(null);
                            setQuickEditProduct({});
                          } else {
                            setEditingProductId(product.id);
                            setQuickEditProduct({ [product.id]: {} });
                          }
                        }}
                      >
                        <Ionicons name={isEditing ? "checkmark" : "create-outline"} size={18} color={isEditing ? "#10B981" : "#666"} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.gridProductPrice}>
                      {isEditing ? (
                        <TextInput
                          style={styles.inlineInputSmall}
                          value={typeof safeDisplayPrice === 'number' && !isNaN(safeDisplayPrice) ? safeDisplayPrice.toString() : ''}
                          onChangeText={(text) => setQuickEditProduct({ ...quickEditProduct, [product.id]: { ...quickEdit, price: parseFloat(text) || 0 } })}
                          placeholder="السعر"
                          keyboardType="numeric"
                        />
                      ) : (
                        <>
                          {product.original_price && product.original_price > product.price ? (
                            <View>
                              <Text style={styles.gridOriginalPrice}>{formatPrice(product.original_price)} ج.م</Text>
                              <Text style={styles.gridDiscountPrice}>{formatPrice(product.price)} ج.م</Text>
                              {product.discount_percentage && (
                                <Text style={styles.gridDiscountBadge}>-{String(product.discount_percentage || 0)}%</Text>
                              )}
                            </View>
                          ) : (
                            <Text style={styles.gridPrice}>{formatPrice(product.price)} ج.م</Text>
                          )}
                        </>
                      )}
                    </View>

                    <View style={styles.gridCardMeta}>
                      {isEditing ? (
                        <TextInput
                          style={styles.inlineInputSmall}
                          value={typeof safeDisplayStock === 'number' && !isNaN(safeDisplayStock) ? safeDisplayStock.toString() : ''}
                          onChangeText={(text) => setQuickEditProduct({ ...quickEditProduct, [product.id]: { ...quickEdit, stock_quantity: parseInt(text) || 0 } })}
                          placeholder="المخزون"
                          keyboardType="numeric"
                        />
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="cube-outline" size={12} color="#6B7280" />
                          <Text style={styles.gridCardMetaText}>{product.stock_quantity}</Text>
                        </View>
                      )}
                      {product.category && !isEditing && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="pricetag-outline" size={12} color="#6B7280" />
                          <Text style={styles.gridCardMetaText} numberOfLines={1}>{product.category}</Text>
                        </View>
                      )}
                      {product.sku && !isEditing && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="barcode-outline" size={12} color="#6B7280" />
                          <Text style={styles.gridCardMetaText} numberOfLines={1}>SKU: {product.sku}</Text>
                        </View>
                      )}
                      {product.source_type && !isEditing && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons 
                            name={product.source_type === 'warehouse' ? 'cube-outline' : 'globe-outline'} 
                            size={12} 
                            color={product.source_type === 'warehouse' ? '#10B981' : '#FF9800'} 
                          />
                          <Text style={[
                            styles.gridCardMetaText,
                            { color: product.source_type === 'warehouse' ? '#10B981' : '#FF9800' }
                          ]}>
                            {product.source_type === 'warehouse' ? 'مخزن' : 'خارجي'}
                          </Text>
                        </View>
                      )}
                      {product.category_data?.section_data && !isEditing && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="folder-outline" size={12} color="#6B7280" />
                          <Text style={styles.gridCardMetaText} numberOfLines={1}>
                            القسم: {product.category_data.section_data.name}
                          </Text>
                        </View>
                      )}
                      {productVariantsCount[product.id] !== undefined && productVariantsCount[product.id] > 0 && !isEditing && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="color-palette-outline" size={12} color="#6366F1" />
                          <Text style={styles.gridCardMetaText}>
                            {productVariantsCount[product.id]} متغير
                          </Text>
                        </View>
                      )}
                      {product.is_active !== undefined && !isEditing && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons 
                            name={product.is_active ? 'checkmark-circle' : 'close-circle'} 
                            size={12} 
                            color={product.is_active ? '#10B981' : '#EF4444'} 
                          />
                          <Text style={[
                            styles.gridCardMetaText,
                            { color: product.is_active ? '#10B981' : '#EF4444' }
                          ]}>
                            {product.is_active ? 'نشط' : 'غير نشط'}
                          </Text>
                        </View>
                      )}
                    </View>

                    {isEditing && (
                      <View style={styles.quickEditActions}>
                        <TouchableOpacity
                          style={[styles.quickEditButton, styles.saveButton]}
                          onPress={async () => {
                            const updates = quickEditProduct[product.id];
                            if (updates && Object.keys(updates).length > 0) {
                              setLoading(true);
                              try {
                                const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
                                const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
                                const accessToken = await getAccessToken();

                                await fetch(`${supabaseUrl}/rest/v1/products?id=eq.${product.id}`, {
                                  method: 'PATCH',
                                  headers: {
                                    'apikey': supabaseKey || '',
                                    'Authorization': `Bearer ${accessToken}`,
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify(updates)
                                });

                                sweetAlert.showSuccess('نجح', 'تم التحديث بنجاح', () => {
                                  setEditingProductId(null);
                                  setQuickEditProduct({});
                                  loadData();
                                });
                              } catch (error: any) {
                                sweetAlert.showError('خطأ', error.message || 'فشل التحديث');
                              } finally {
                                setLoading(false);
                              }
                            } else {
                              setEditingProductId(null);
                              setQuickEditProduct({});
                            }
                          }}
                        >
                          <Ionicons name="checkmark" size={14} color="#fff" />
                          <Text style={styles.quickEditButtonText}>حفظ</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.quickEditButton, styles.cancelQuickEditButton]}
                          onPress={() => {
                            setEditingProductId(null);
                            setQuickEditProduct({});
                          }}
                        >
                          <Ionicons name="close" size={14} color="#fff" />
                          <Text style={styles.quickEditButtonText}>إلغاء</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {!isEditing && (
                      <>
                        <TouchableOpacity
                          style={styles.duplicateButton}
                          onPress={() => duplicateProduct(product)}
                        >
                          <Ionicons name="copy-outline" size={14} color="#6366F1" />
                          <Text style={styles.duplicateButtonText}>نسخ</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.fullEditButton}
                          onPress={() => startEditProduct(product)}
                        >
                          <Ionicons name="create-outline" size={14} color="#2196F3" />
                          <Text style={styles.fullEditButtonText}>تعديل كامل</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteButtonSmall}
                          onPress={() => deleteProduct(product.id)}
                        >
                          <Ionicons name="trash-outline" size={14} color="#fff" />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                );
              }) : (
                <View style={{ padding: 20, alignItems: 'center', width: '100%' }}>
                  <Text style={{ color: '#666', fontSize: 16 }}>
                    {productSearchQuery || productFilterSection || productFilterCategory || productFilterSource !== 'all' 
                      ? 'لا توجد منتجات تطابق البحث' 
                      : 'لا توجد منتجات'}
                  </Text>
                </View>
              )}
            </View>

            {/* Pagination */}
            {paginatedProductsData.totalPages > 1 && (
              <View style={styles.paginationContainer}>
                <TouchableOpacity
                  style={[styles.paginationButton, productCurrentPage === 1 && styles.paginationButtonDisabled]}
                  onPress={() => setProductCurrentPage(Math.max(1, productCurrentPage - 1))}
                  disabled={productCurrentPage === 1}
                >
                  <Ionicons name="chevron-back" size={20} color={productCurrentPage === 1 ? '#999' : '#EE1C47'} />
                </TouchableOpacity>
                
                <View style={styles.paginationInfo}>
                  <Text style={styles.paginationText}>
                    صفحة {productCurrentPage} من {paginatedProductsData.totalPages}
                  </Text>
                  <Text style={styles.paginationSubText}>
                    ({paginatedProductsData.totalProducts} منتج)
                  </Text>
                </View>
                
                <TouchableOpacity
                  style={[styles.paginationButton, productCurrentPage === paginatedProductsData.totalPages && styles.paginationButtonDisabled]}
                  onPress={() => setProductCurrentPage(Math.min(paginatedProductsData.totalPages, productCurrentPage + 1))}
                  disabled={productCurrentPage === paginatedProductsData.totalPages}
                >
                  <Ionicons name="chevron-forward" size={20} color={productCurrentPage === paginatedProductsData.totalPages ? '#999' : '#EE1C47'} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {activeTab === 'users' && (
          <View>
            <View style={styles.gridContainer}>
              {users.map((userItem) => (
                <View key={userItem.id} style={styles.gridCard}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.gridCardTitle} numberOfLines={1}>
                        {userItem.full_name || userItem.email}
                      </Text>
                      <Text style={styles.gridCardDescription} numberOfLines={1}>
                        {userItem.email}
                      </Text>
                    </View>
                  </View>

                  {userItem.phone && (
                    <View style={styles.gridCardMeta}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="call-outline" size={12} color="#6B7280" />
                        <Text style={styles.gridCardMetaText}>{userItem.phone}</Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.gridCardMeta}>
                    <View style={[styles.statusBadgeSmall, getRoleBadgeStyle(userItem.role)]}>
                      <Text style={styles.statusBadgeTextSmall}>{getRoleText(userItem.role)}</Text>
                    </View>
                  </View>

                  <View style={styles.roleButtonsGrid}>
                    <TouchableOpacity
                      style={[styles.roleButtonSmall, userItem.role === 'customer' && styles.roleButtonActive]}
                      onPress={() => updateUserRole(userItem.id, 'customer')}
                    >
                      <Text style={[styles.roleButtonTextSmall, userItem.role === 'customer' && styles.roleButtonTextActive]}>
                        مستخدم
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.roleButtonSmall, userItem.role === 'employee' && styles.roleButtonActive]}
                      onPress={() => updateUserRole(userItem.id, 'employee')}
                    >
                      <Text style={[styles.roleButtonTextSmall, userItem.role === 'employee' && styles.roleButtonTextActive]}>
                        موظف
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.roleButtonSmall, userItem.role === 'manager' && styles.roleButtonActive]}
                      onPress={() => updateUserRole(userItem.id, 'manager')}
                    >
                      <Text style={[styles.roleButtonTextSmall, userItem.role === 'manager' && styles.roleButtonTextActive]}>
                        مدير
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.roleButtonSmall, userItem.role === 'admin' && styles.roleButtonActive]}
                      onPress={() => updateUserRole(userItem.id, 'admin')}
                    >
                      <Text style={[styles.roleButtonTextSmall, userItem.role === 'admin' && styles.roleButtonTextActive]}>
                        أدمن
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {activeTab === 'categories' && (
          <View>
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>
                {editingCategory ? 'تعديل فئة' : 'إضافة فئة جديدة'}
              </Text>
              {editingCategory && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={cancelEditCategory}
                >
                  <Text style={styles.cancelButtonText}>إلغاء التعديل</Text>
                </TouchableOpacity>
              )}
              <TextInput
                style={styles.input}
                placeholder="اسم الفئة *"
                value={newCategory.name}
                onChangeText={(text) => setNewCategory({ ...newCategory, name: text })}
              />
              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>القسم (اختياري)</Text>
                <View style={styles.picker}>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => setShowSectionDropdown(!showSectionDropdown)}
                  >
                    <Text style={styles.pickerButtonText}>
                      {newCategory.section_id 
                        ? sections.find(s => s.id === newCategory.section_id)?.name || 'اختر القسم'
                        : 'بدون قسم'}
                    </Text>
                    <Ionicons 
                      name={showSectionDropdown ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color="#666" 
                    />
                  </TouchableOpacity>
                  {showSectionDropdown && (
                    <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                      <TouchableOpacity
                        style={[styles.dropdownItem, !newCategory.section_id && styles.dropdownItemActive]}
                        onPress={() => {
                          setNewCategory({ ...newCategory, section_id: '' });
                          setShowSectionDropdown(false);
                        }}
                      >
                        <Text style={[styles.dropdownItemText, !newCategory.section_id && styles.dropdownItemTextActive]}>
                          بدون قسم
                        </Text>
                        {!newCategory.section_id && (
                          <Ionicons name="checkmark" size={18} color="#6366F1" />
                        )}
                      </TouchableOpacity>
                      {sections.filter(s => s.is_active).map((section) => (
                        <TouchableOpacity
                          key={section.id}
                          style={[styles.dropdownItem, newCategory.section_id === section.id && styles.dropdownItemActive]}
                          onPress={() => {
                            setNewCategory({ ...newCategory, section_id: section.id });
                            setShowSectionDropdown(false);
                          }}
                        >
                          {section.icon && (
                            <Ionicons 
                              name={section.icon as any} 
                              size={18} 
                              color={newCategory.section_id === section.id ? '#6366F1' : '#666'} 
                              style={{ marginRight: 8 }} 
                            />
                          )}
                          <Text style={[styles.dropdownItemText, newCategory.section_id === section.id && styles.dropdownItemTextActive]}>
                            {section.name}
                          </Text>
                          {newCategory.section_id === section.id && (
                            <Ionicons name="checkmark" size={18} color="#6366F1" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              </View>
              <TextInput
                style={styles.input}
                placeholder="الوصف (اختياري)"
                value={newCategory.description}
                onChangeText={(text) => setNewCategory({ ...newCategory, description: text })}
                multiline
              />
              <TextInput
                style={styles.input}
                placeholder="أيقونة (اسم أيقونة Ionicons - اختياري)"
                value={newCategory.icon}
                onChangeText={(text) => setNewCategory({ ...newCategory, icon: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="ترتيب العرض (رقم - كلما قل الرقم كلما ظهر أولاً)"
                value={newCategory.display_order}
                onChangeText={(text) => setNewCategory({ ...newCategory, display_order: text })}
                keyboardType="numeric"
              />
              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>الفئة نشطة (ستظهر في الموقع)</Text>
                <TouchableOpacity
                  style={[styles.switch, newCategory.is_active && styles.switchActive]}
                  onPress={() => setNewCategory({ ...newCategory, is_active: !newCategory.is_active })}
                >
                  <View style={[styles.switchThumb, newCategory.is_active && styles.switchThumbActive]} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={editingCategory ? updateCategory : addCategory}
              >
                <Text style={styles.submitButtonText}>
                  {editingCategory ? 'تحديث الفئة' : 'إضافة فئة'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.gridContainer}>
              {categories.map((category) => {
                const isEditing = editingCategoryId === category.id;
                const quickEdit = quickEditCategory[category.id] || {};
                const displayName = isEditing ? (quickEdit.name !== undefined ? quickEdit.name : category.name) : category.name;
                const displayOrder = isEditing ? (quickEdit.display_order !== undefined ? quickEdit.display_order : category.display_order) : category.display_order;
                const displayActive = isEditing ? (quickEdit.is_active !== undefined ? quickEdit.is_active : category.is_active) : category.is_active;
                
                // Ensure all values are safe for TextInput
                const safeDisplayName = displayName || '';
                const safeDisplayOrder = displayOrder !== undefined && displayOrder !== null ? displayOrder : (category.display_order || 0);

                return (
                  <View key={category.id} style={styles.gridCard}>
                    <View style={styles.cardHeader}>
                      {category.icon && (
                        <Ionicons name={category.icon as any} size={20} color="#EE1C47" style={styles.cardIcon} />
                      )}
                      {isEditing ? (
                        <TextInput
                          style={styles.inlineInput}
                          value={safeDisplayName}
                          onChangeText={(text) => setQuickEditCategory({ ...quickEditCategory, [category.id]: { ...quickEdit, name: text } })}
                          placeholder="اسم الفئة"
                        />
                      ) : (
                        <Text style={styles.gridCardTitle} numberOfLines={1}>{category.name}</Text>
                      )}
                      <TouchableOpacity
                        style={styles.cardMenuButton}
                        onPress={() => {
                          if (isEditing) {
                            setEditingCategoryId(null);
                            setQuickEditCategory({});
                          } else {
                            setEditingCategoryId(category.id);
                            setQuickEditCategory({ [category.id]: {} });
                          }
                        }}
                      >
                        <Ionicons name={isEditing ? "checkmark" : "create-outline"} size={18} color={isEditing ? "#10B981" : "#666"} />
                      </TouchableOpacity>
                    </View>
                    
                    {category.description && !isEditing && (
                      <Text style={styles.gridCardDescription} numberOfLines={2}>{category.description}</Text>
                    )}

                    {category.section_id && !isEditing && (
                      <Text style={styles.gridCardSection}>
                        القسم: {(() => {
                          const sectionName = category.section_data?.name || sections.find(s => s.id === category.section_id)?.name;
                          return sectionName || 'غير معروف';
                        })()}
                      </Text>
                    )}

                    <View style={styles.gridCardMeta}>
                      {isEditing ? (
                        <TextInput
                          style={styles.inlineInputSmall}
                          value={safeDisplayOrder.toString()}
                          onChangeText={(text) => setQuickEditCategory({ ...quickEditCategory, [category.id]: { ...quickEdit, display_order: parseInt(text) || 0 } })}
                          placeholder="ترتيب"
                          keyboardType="numeric"
                        />
                      ) : (
                        <Text style={styles.gridCardMetaText}>ترتيب: {String(category.display_order || 0)}</Text>
                      )}
                      <TouchableOpacity
                        style={[styles.statusBadgeSmall, displayActive ? styles.statusBadgeActive : styles.statusBadgeInactive]}
                        onPress={() => {
                          if (isEditing) {
                            setQuickEditCategory({ ...quickEditCategory, [category.id]: { ...quickEdit, is_active: !displayActive } });
                          }
                        }}
                      >
                        <Text style={styles.statusBadgeTextSmall}>
                          {displayActive ? 'نشطة' : 'غير نشطة'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Manage Variants Button */}
                    {!isEditing && (
                      <TouchableOpacity
                        style={styles.manageVariantsButton}
                        onPress={() => {
                          setSelectedCategoryForVariants(category.id);
                          loadCategoryVariantsForManagement(category.id);
                        }}
                      >
                        <Ionicons name="color-palette-outline" size={16} color="#6366F1" />
                        <Text style={styles.manageVariantsButtonText}>إدارة الألوان والمقاسات</Text>
                      </TouchableOpacity>
                    )}

                    {isEditing && (
                      <View style={styles.quickEditActions}>
                        <TouchableOpacity
                          style={[styles.quickEditButton, styles.saveButton]}
                          onPress={async () => {
                            const updates = quickEditCategory[category.id];
                            if (updates && Object.keys(updates).length > 0) {
                              setLoading(true);
                              try {
                                const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
                                const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
                                const accessToken = await getAccessToken();

                                await fetch(`${supabaseUrl}/rest/v1/categories?id=eq.${category.id}`, {
                                  method: 'PATCH',
                                  headers: {
                                    'apikey': supabaseKey || '',
                                    'Authorization': `Bearer ${accessToken}`,
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify(updates)
                                });

                                sweetAlert.showSuccess('نجح', 'تم التحديث بنجاح', () => {
                                  setEditingCategoryId(null);
                                  setQuickEditCategory({});
                                  loadCategories();
                                });
                              } catch (error: any) {
                                sweetAlert.showError('خطأ', error.message || 'فشل التحديث');
                              } finally {
                                setLoading(false);
                              }
                            } else {
                              setEditingCategoryId(null);
                              setQuickEditCategory({});
                            }
                          }}
                        >
                          <Ionicons name="checkmark" size={14} color="#fff" />
                          <Text style={styles.quickEditButtonText}>حفظ</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.quickEditButton, styles.cancelQuickEditButton]}
                          onPress={() => {
                            setEditingCategoryId(null);
                            setQuickEditCategory({});
                          }}
                        >
                          <Ionicons name="close" size={14} color="#fff" />
                          <Text style={styles.quickEditButtonText}>إلغاء</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {!isEditing && (
                      <TouchableOpacity
                        style={styles.deleteButtonSmall}
                        onPress={() => deleteCategory(category.id)}
                      >
                        <Ionicons name="trash-outline" size={14} color="#fff" />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Category Variants Management Modal */}
            {selectedCategoryForVariants && (
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>
                      إدارة الألوان والمقاسات - {categories.find(c => c.id === selectedCategoryForVariants)?.name}
                    </Text>
                    <TouchableOpacity
                      style={styles.modalCloseButton}
                      onPress={() => {
                        setSelectedCategoryForVariants(null);
                        setCategoryColorsList([]);
                        setCategorySizesList([]);
                      }}
                    >
                      <Ionicons name="close" size={24} color="#666" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={styles.modalBody}>
                    {/* Colors Management */}
                    <View style={styles.variantsManagementSection}>
                      <Text style={styles.sectionTitle}>الألوان</Text>
                      
                      {/* Add New Color */}
                      <View style={styles.addVariantForm}>
                        <TextInput
                          style={styles.input}
                          placeholder="اسم اللون (مثل: أحمر، أسود)"
                          value={newCategoryColor.color_name}
                          onChangeText={(text) => setNewCategoryColor({ ...newCategoryColor, color_name: text })}
                        />
                        <TextInput
                          style={styles.input}
                          placeholder="كود اللون (مثل: #FF0000) - اختياري"
                          value={newCategoryColor.color_hex}
                          onChangeText={(text) => setNewCategoryColor({ ...newCategoryColor, color_hex: text })}
                        />
                        <TextInput
                          style={styles.input}
                          placeholder="ترتيب العرض"
                          value={newCategoryColor.display_order}
                          onChangeText={(text) => setNewCategoryColor({ ...newCategoryColor, display_order: text })}
                          keyboardType="numeric"
                        />
                        <TouchableOpacity
                          style={styles.addVariantButton}
                          onPress={addCategoryColor}
                        >
                          <Text style={styles.addVariantButtonText}>إضافة لون</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Colors List */}
                      {categoryColorsList.length > 0 && (
                        <View style={styles.variantsList}>
                          {categoryColorsList.map((color) => (
                            <View key={color.id} style={styles.variantCard}>
                              <View style={styles.variantHeader}>
                                <View style={styles.variantInfo}>
                                  {color.color_hex && (
                                    <View style={[styles.colorCircle, { backgroundColor: color.color_hex }]} />
                                  )}
                                  <Text style={styles.variantColorText}>{String(color.color_name || '')}</Text>
                                  {color.color_hex && (
                                    <Text style={styles.variantColorText}>({String(color.color_hex)})</Text>
                                  )}
                                  <Text style={styles.variantStockText}>ترتيب: {String(color.display_order || 0)}</Text>
                                </View>
                                <TouchableOpacity
                                  style={styles.variantDeleteButton}
                                  onPress={() => deleteCategoryColor(color.id)}
                                >
                                  <Ionicons name="trash-outline" size={16} color="#f44336" />
                                </TouchableOpacity>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>

                    {/* Sizes Management */}
                    <View style={styles.variantsManagementSection}>
                      <Text style={styles.sectionTitle}>المقاسات</Text>
                      
                      {/* Add New Size */}
                      <View style={styles.addVariantForm}>
                        <TextInput
                          style={styles.input}
                          placeholder="قيمة المقاس (مثل: L, 42, 100x200)"
                          value={newCategorySize.size_value}
                          onChangeText={(text) => setNewCategorySize({ ...newCategorySize, size_value: text })}
                        />
                        <TextInput
                          style={styles.input}
                          placeholder="وحدة القياس (مثل: مقاس، رقم، سم) - اختياري"
                          value={newCategorySize.size_unit}
                          onChangeText={(text) => setNewCategorySize({ ...newCategorySize, size_unit: text })}
                        />
                        <TextInput
                          style={styles.input}
                          placeholder="ترتيب العرض"
                          value={newCategorySize.display_order}
                          onChangeText={(text) => setNewCategorySize({ ...newCategorySize, display_order: text })}
                          keyboardType="numeric"
                        />
                        <TouchableOpacity
                          style={styles.addVariantButton}
                          onPress={addCategorySize}
                        >
                          <Text style={styles.addVariantButtonText}>إضافة مقاس</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Sizes List */}
                      {categorySizesList.length > 0 && (
                        <View style={styles.variantsList}>
                          {categorySizesList.map((size) => (
                            <View key={size.id} style={styles.variantCard}>
                              <View style={styles.variantHeader}>
                                <View style={styles.variantInfo}>
                                  <Text style={styles.variantSizeText}>
                                    {String(size.size_value || '')}{size.size_unit ? ` (${String(size.size_unit)})` : ''}
                                  </Text>
                                  <Text style={styles.variantStockText}>ترتيب: {String(size.display_order || 0)}</Text>
                                </View>
                                <TouchableOpacity
                                  style={styles.variantDeleteButton}
                                  onPress={() => deleteCategorySize(size.id)}
                                >
                                  <Ionicons name="trash-outline" size={16} color="#f44336" />
                                </TouchableOpacity>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  </ScrollView>
                </View>
              </View>
            )}
          </View>
        )}

        {activeTab === 'sections' && (
          <View>
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>
                {editingSection ? 'تعديل قسم' : 'إضافة قسم جديد'}
              </Text>
              {editingSection && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={cancelEditSection}
                >
                  <Text style={styles.cancelButtonText}>إلغاء التعديل</Text>
                </TouchableOpacity>
              )}
              <TextInput
                style={styles.input}
                placeholder="اسم القسم *"
                value={newSection.name}
                onChangeText={(text) => setNewSection({ ...newSection, name: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="الوصف (اختياري)"
                value={newSection.description}
                onChangeText={(text) => setNewSection({ ...newSection, description: text })}
                multiline
              />
              <TextInput
                style={styles.input}
                placeholder="أيقونة (اسم أيقونة Ionicons - اختياري)"
                value={newSection.icon}
                onChangeText={(text) => setNewSection({ ...newSection, icon: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="ترتيب العرض (رقم - كلما قل الرقم كلما ظهر أولاً)"
                value={newSection.display_order}
                onChangeText={(text) => setNewSection({ ...newSection, display_order: text })}
                keyboardType="numeric"
              />
              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>القسم نشط (ستظهر في الموقع)</Text>
                <TouchableOpacity
                  style={[styles.switch, newSection.is_active && styles.switchActive]}
                  onPress={() => setNewSection({ ...newSection, is_active: !newSection.is_active })}
                >
                  <View style={[styles.switchThumb, newSection.is_active && styles.switchThumbActive]} />
                </TouchableOpacity>
              </View>

              {/* Add Categories to Section */}
              {!editingSection && (
                <>
                  <TouchableOpacity
                    style={[styles.submitButton, styles.secondaryButton]}
                    onPress={() => setShowAddCategoryToSection(!showAddCategoryToSection)}
                  >
                    <Ionicons name={showAddCategoryToSection ? "chevron-up" : "chevron-down"} size={20} color="#fff" style={{ marginLeft: 8 }} />
                    <Text style={styles.submitButtonText}>
                      {showAddCategoryToSection ? 'إخفاء إضافة الفئات' : 'إضافة فئات لهذا القسم (اختياري)'}
                    </Text>
                  </TouchableOpacity>

                  {showAddCategoryToSection && (
                    <View style={styles.categoriesFormContainer}>
                      <Text style={styles.sectionSubtitle}>إضافة فئات للقسم</Text>
                      {sectionCategories.map((cat, index) => (
                        <View key={index} style={styles.categoryFormItem}>
                          <View style={styles.categoryFormHeader}>
                            <Text style={styles.categoryFormTitle}>فئة {index + 1}</Text>
                            <TouchableOpacity
                              onPress={() => {
                                const newCats = sectionCategories.filter((_, i) => i !== index);
                                setSectionCategories(newCats);
                              }}
                            >
                              <Ionicons name="trash-outline" size={20} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                          <TextInput
                            style={styles.input}
                            placeholder="اسم الفئة *"
                            value={cat.name}
                            onChangeText={(text) => {
                              const newCats = [...sectionCategories];
                              newCats[index].name = text;
                              setSectionCategories(newCats);
                            }}
                          />
                          <TextInput
                            style={styles.input}
                            placeholder="الوصف (اختياري)"
                            value={cat.description}
                            onChangeText={(text) => {
                              const newCats = [...sectionCategories];
                              newCats[index].description = text;
                              setSectionCategories(newCats);
                            }}
                            multiline
                          />
                          <TextInput
                            style={styles.input}
                            placeholder="أيقونة (اختياري)"
                            value={cat.icon}
                            onChangeText={(text) => {
                              const newCats = [...sectionCategories];
                              newCats[index].icon = text;
                              setSectionCategories(newCats);
                            }}
                          />
                          <TextInput
                            style={styles.input}
                            placeholder="ترتيب العرض"
                            value={cat.display_order}
                            onChangeText={(text) => {
                              const newCats = [...sectionCategories];
                              newCats[index].display_order = text;
                              setSectionCategories(newCats);
                            }}
                            keyboardType="numeric"
                          />
                        </View>
                      ))}
                      <TouchableOpacity
                        style={[styles.submitButton, styles.addMoreButton]}
                        onPress={() => {
                          setSectionCategories([...sectionCategories, {
                            name: '',
                            description: '',
                            icon: '',
                            display_order: (sectionCategories.length + 1).toString(),
                            is_active: true,
                          }]);
                        }}
                      >
                        <Ionicons name="add-circle-outline" size={20} color="#fff" style={{ marginLeft: 8 }} />
                        <Text style={styles.submitButtonText}>إضافة فئة أخرى</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}

              <TouchableOpacity
                style={styles.submitButton}
                onPress={editingSection ? updateSection : addSection}
              >
                <Text style={styles.submitButtonText}>
                  {editingSection ? 'تحديث القسم' : 'إضافة قسم'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.gridContainer}>
              {sections.map((section) => {
                const isEditing = editingSectionId === section.id;
                const quickEdit = quickEditSection[section.id] || {};
                const displayName = isEditing ? (quickEdit.name !== undefined ? quickEdit.name : section.name) : section.name;
                const displayOrder = isEditing ? (quickEdit.display_order !== undefined ? quickEdit.display_order : section.display_order) : section.display_order;
                const displayActive = isEditing ? (quickEdit.is_active !== undefined ? quickEdit.is_active : section.is_active) : section.is_active;
                
                // Ensure all values are safe for TextInput
                const safeDisplayName = displayName || '';
                const safeDisplayOrder = displayOrder !== undefined && displayOrder !== null ? displayOrder : (section.display_order || 0);

                return (
                  <View key={section.id} style={styles.gridCard}>
                    <View style={styles.cardHeader}>
                      {section.icon && (
                        <Ionicons name={section.icon as any} size={20} color="#EE1C47" style={styles.cardIcon} />
                      )}
                      {isEditing ? (
                        <TextInput
                          style={styles.inlineInput}
                          value={safeDisplayName}
                          onChangeText={(text) => setQuickEditSection({ ...quickEditSection, [section.id]: { ...quickEdit, name: text } })}
                          placeholder="اسم القسم"
                        />
                      ) : (
                        <Text style={styles.gridCardTitle} numberOfLines={1}>{section.name}</Text>
                      )}
                      <TouchableOpacity
                        style={styles.cardMenuButton}
                        onPress={() => {
                          if (isEditing) {
                            setEditingSectionId(null);
                            setQuickEditSection({});
                          } else {
                            setEditingSectionId(section.id);
                            setQuickEditSection({ [section.id]: {} });
                          }
                        }}
                      >
                        <Ionicons name={isEditing ? "checkmark" : "create-outline"} size={18} color={isEditing ? "#10B981" : "#666"} />
                      </TouchableOpacity>
                    </View>
                    
                    {section.description && !isEditing && (
                      <Text style={styles.gridCardDescription} numberOfLines={2}>{section.description}</Text>
                    )}

                    <View style={styles.gridCardMeta}>
                      {isEditing ? (
                        <TextInput
                          style={styles.inlineInputSmall}
                          value={safeDisplayOrder.toString()}
                          onChangeText={(text) => setQuickEditSection({ ...quickEditSection, [section.id]: { ...quickEdit, display_order: parseInt(text) || 0 } })}
                          placeholder="ترتيب"
                          keyboardType="numeric"
                        />
                      ) : (
                        <Text style={styles.gridCardMetaText}>ترتيب: {String(section.display_order || 0)}</Text>
                      )}
                      <TouchableOpacity
                        style={[styles.statusBadgeSmall, displayActive ? styles.statusBadgeActive : styles.statusBadgeInactive]}
                        onPress={() => {
                          if (isEditing) {
                            setQuickEditSection({ ...quickEditSection, [section.id]: { ...quickEdit, is_active: !displayActive } });
                          }
                        }}
                      >
                        <Text style={styles.statusBadgeTextSmall}>
                          {displayActive ? 'نشط' : 'غير نشط'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {isEditing && (
                      <View style={styles.quickEditActions}>
                        <TouchableOpacity
                          style={[styles.quickEditButton, styles.saveButton]}
                          onPress={async () => {
                            const updates = quickEditSection[section.id];
                            if (updates && Object.keys(updates).length > 0) {
                              setLoading(true);
                              try {
                                const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
                                const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
                                const accessToken = await getAccessToken();

                                await fetch(`${supabaseUrl}/rest/v1/sections?id=eq.${section.id}`, {
                                  method: 'PATCH',
                                  headers: {
                                    'apikey': supabaseKey || '',
                                    'Authorization': `Bearer ${accessToken}`,
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify(updates)
                                });

                                sweetAlert.showSuccess('نجح', 'تم التحديث بنجاح', () => {
                                  setEditingSectionId(null);
                                  setQuickEditSection({});
                                  loadSections();
                                });
                              } catch (error: any) {
                                sweetAlert.showError('خطأ', error.message || 'فشل التحديث');
                              } finally {
                                setLoading(false);
                              }
                            } else {
                              setEditingSectionId(null);
                              setQuickEditSection({});
                            }
                          }}
                        >
                          <Ionicons name="checkmark" size={14} color="#fff" />
                          <Text style={styles.quickEditButtonText}>حفظ</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.quickEditButton, styles.cancelQuickEditButton]}
                          onPress={() => {
                            setEditingSectionId(null);
                            setQuickEditSection({});
                          }}
                        >
                          <Ionicons name="close" size={14} color="#fff" />
                          <Text style={styles.quickEditButtonText}>إلغاء</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {!isEditing && (
                      <TouchableOpacity
                        style={styles.deleteButtonSmall}
                        onPress={() => deleteSection(section.id)}
                      >
                        <Ionicons name="trash-outline" size={14} color="#fff" />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}
        </View>
      </ScrollView>

      {/* SweetAlert */}
      {sweetAlert.alert.options && (
        <SweetAlert
          visible={sweetAlert.alert.visible}
          type={sweetAlert.alert.options.type}
          title={sweetAlert.alert.options.title}
          message={sweetAlert.alert.options.message}
          confirmText={sweetAlert.alert.options.confirmText}
          cancelText={sweetAlert.alert.options.cancelText}
          onConfirm={sweetAlert.alert.options.onConfirm}
          onCancel={sweetAlert.alert.options.onCancel}
          onClose={sweetAlert.hideAlert}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tabsWeb: {
    maxWidth: 1400,
    alignSelf: 'center',
    width: '100%',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#EE1C47',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#EE1C47',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 10,
  },
  scrollContent: {
    padding: Platform.OS === 'web' ? 20 : 0,
  },
  contentWrapper: {
    padding: Platform.OS === 'web' ? 0 : 0,
  },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
  },
  gridCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    width: Platform.OS === 'web' 
      ? Math.floor((Math.min(Dimensions.get('window').width, 1400) - 60) / 3) - 8
      : (Dimensions.get('window').width - 40) / 2 - 6,
    minWidth: Platform.OS === 'web' ? 280 : 150,
    maxWidth: Platform.OS === 'web' ? 400 : undefined,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  cardIcon: {
    marginRight: 4,
  },
  gridCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  gridCardDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 16,
  },
  gridCardSection: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 6,
  },
  gridCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
  gridCardMetaText: {
    fontSize: 11,
    color: '#6B7280',
  },
  inlineInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 6,
    fontSize: 14,
    backgroundColor: '#F9FAFB',
  },
  inlineInputSmall: {
    width: 60,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 4,
    fontSize: 12,
    backgroundColor: '#F9FAFB',
    textAlign: 'center',
  },
  cardMenuButton: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  statusBadgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    minWidth: 50,
    alignItems: 'center',
  },
  statusBadgeTextSmall: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  quickEditActions: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  quickEditButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 4,
  },
  saveButton: {
    backgroundColor: '#10B981',
  },
  cancelQuickEditButton: {
    backgroundColor: '#6B7280',
  },
  quickEditButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  deleteButtonSmall: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#EF4444',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  gridProductImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F3F4F6',
    objectFit: 'contain', // For web compatibility
  },
  gridProductPrice: {
    marginBottom: 8,
    minHeight: 40,
  },
  gridPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#EE1C47',
  },
  gridOriginalPrice: {
    fontSize: 12,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  gridDiscountPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#EE1C47',
  },
  gridDiscountBadge: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
    marginTop: 2,
  },
  fullEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#E3F2FD',
    marginTop: 8,
    gap: 4,
  },
  fullEditButtonText: {
    color: '#2196F3',
    fontSize: 11,
    fontWeight: '600',
  },
  duplicateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#EEF2FF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#6366F1',
    gap: 4,
  },
  duplicateButtonText: {
    color: '#6366F1',
    fontSize: 11,
    fontWeight: '600',
  },
  filtersContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
  },
  filtersRow: {
    marginBottom: 15,
  },
  filterGroup: {
    marginRight: 15,
    marginBottom: 10,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 6,
  },
  filterChipActive: {
    backgroundColor: '#EE1C47',
    borderColor: '#EE1C47',
  },
  filterChipText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  sortContainer: {
    marginTop: 10,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  sortLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  sortRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sortChipActive: {
    backgroundColor: '#EE1C47',
    borderColor: '#EE1C47',
  },
  sortChipText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  sortChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  resultsCount: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 10,
    textAlign: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 15,
  },
  paginationButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationInfo: {
    alignItems: 'center',
  },
  paginationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  paginationSubText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  gridProductImageSmall: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginTop: 8,
    backgroundColor: '#F3F4F6',
  },
  shipmentActions: {
    marginTop: 8,
  },
  statusPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    paddingBottom: 4,
  },
  statusOption: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusOptionActive: {
    backgroundColor: '#EE1C47',
    borderColor: '#EE1C47',
  },
  statusOptionText: {
    fontSize: 10,
    color: '#6B7280',
  },
  statusOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  roleButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  roleButtonSmall: {
    flex: 1,
    minWidth: 60,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  roleButtonTextSmall: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
  },
  roleButtonTextActive: {
    color: '#fff',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  actionButtons: {
    marginTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    marginTop: 5,
    gap: 5,
  },
  editButton: {
    backgroundColor: '#2196F3',
  },
  deleteButton: {
    backgroundColor: '#f44336',
  },
  actionButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  productInfo: {
    flex: 1,
  },
  productThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginLeft: 10,
  },
  cancelButton: {
    backgroundColor: '#999',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
  },
  pickerContainer: {
    marginBottom: 10,
  },
  pickerLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  picker: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownList: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    maxHeight: 200,
    zIndex: 1000,
    elevation: 5,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemActive: {
    backgroundColor: '#F0F4FF',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  dropdownItemTextActive: {
    color: '#6366F1',
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#6366F1',
    marginBottom: 10,
  },
  addMoreButton: {
    backgroundColor: '#10B981',
    marginTop: 10,
  },
  categoriesFormContainer: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 15,
  },
  categoryFormItem: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryFormTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  imageButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  imageButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#EE1C47',
    padding: 15,
    borderRadius: 8,
  },
  submitButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  userPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  roleLabel: {
    fontSize: 14,
    color: '#333',
    marginRight: 10,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  roleButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  roleButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  roleButtonActive: {
    backgroundColor: '#EE1C47',
    borderColor: '#EE1C47',
  },
  roleButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  imagesPreview: {
    marginTop: 10,
    marginBottom: 10,
  },
  imagesPreviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  imagesList: {
    flexDirection: 'row',
  },
  imagePreviewItem: {
    position: 'relative',
    marginRight: 10,
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#ddd',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  primaryBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  primaryBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  imageActions: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    flexDirection: 'row',
    gap: 5,
  },
  imageActionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 10,
    paddingHorizontal: 5,
  },
  priceInfo: {
    marginBottom: 5,
  },
  originalPriceText: {
    fontSize: 14,
    color: '#999',
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },
  discountPriceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#EE1C47',
    marginBottom: 2,
  },
  discountPercentageText: {
    fontSize: 14,
    color: '#FF6B00',
    fontWeight: '600',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  categoryInfo: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'flex-start',
  },
  categoryIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  categoryDetails: {
    flex: 1,
  },
  categoryDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    marginBottom: 8,
  },
  categoryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 5,
  },
  categoryMetaText: {
    fontSize: 12,
    color: '#999',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeActive: {
    backgroundColor: '#4CAF50',
  },
  statusBadgeInactive: {
    backgroundColor: '#999',
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingVertical: 10,
  },
  switchLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  switch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchActive: {
    backgroundColor: '#4CAF50',
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  selectContainer: {
    marginBottom: 15,
  },
  selectLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 8,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    gap: 8,
  },
  radioOptionActive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EE1C47',
  },
  radioOptionText: {
    fontSize: 14,
    color: '#666',
  },
  radioOptionTextActive: {
    color: '#EE1C47',
    fontWeight: '600',
  },
  categorySelect: {
    flexDirection: 'row',
  },
  categorySelectChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categorySelectChipActive: {
    backgroundColor: '#EE1C47',
    borderColor: '#EE1C47',
  },
  categorySelectChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  categorySelectChipTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  // Variants styles
  variantsSection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 10,
  },
  formSubTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 15,
    marginTop: 10,
  },
  variantsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  variantCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    width: '48%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  variantImageContainer: {
    width: '100%',
    height: 160,
    backgroundColor: '#F9FAFB',
  },
  variantCardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  variantImagePlaceholder: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  variantImagePlaceholderText: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 8,
  },
  variantCardContent: {
    padding: 12,
  },
  variantCardHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  variantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  variantInfo: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  variantColorBadge: {
    backgroundColor: '#EE1C47',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  variantColorText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  variantSizeBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  variantSizeText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  variantCardDetails: {
    gap: 6,
  },
  variantDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  variantPriceText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  variantStockText: {
    fontSize: 12,
    color: '#374151',
  },
  variantSkuText: {
    fontSize: 11,
    color: '#6B7280',
  },
  variantCardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  variantActionText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyVariantsContainer: {
    padding: 40,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyVariantsText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 12,
  },
  emptyVariantsSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  variantEditButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  variantDeleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f44336',
  },
  updateVariantButton: {
    backgroundColor: '#2196F3',
  },
  variantImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginTop: 8,
  },
  variantImagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 10,
  },
  sizeInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  addVariantButton: {
    backgroundColor: '#10B981',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  addVariantButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  variantOptionsList: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  variantOptionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
    marginBottom: 8,
  },
  variantOptionChipActive: {
    backgroundColor: '#EE1C47',
    borderColor: '#EE1C47',
  },
  variantOptionChipText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  variantOptionChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  colorCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  addNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#10B981',
    marginTop: 8,
  },
  addNewButtonText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
    marginLeft: 6,
  },
  manageVariantsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    marginTop: 10,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  manageVariantsButtonText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
    marginLeft: 6,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxWidth: 600,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
  },
  modalCloseButton: {
    padding: 5,
  },
  modalBody: {
    padding: 20,
    maxHeight: '70vh',
  },
  variantsManagementSection: {
    marginBottom: 30,
  },
});

