import { useState, useEffect } from 'react';
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
import { Order, Shipment, Inventory, Product, User, UserRole, Category, Section } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { uploadImageToImgBB } from '@/lib/imgbb';
import SweetAlert from '@/components/SweetAlert';
import { useSweetAlert } from '@/hooks/useSweetAlert';

export default function AdminScreen() {
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
    category: '',
    category_id: '', // Category ID from categories table
    stock_quantity: '',
    image_url: '', // Keep for backward compatibility
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
  const [newCategoryForSection, setNewCategoryForSection] = useState({
    name: '',
    description: '',
    icon: '',
    display_order: '0',
    is_active: true,
  });
  const [productImages, setProductImages] = useState<Array<{ uri: string; url?: string }>>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editProductImages, setEditProductImages] = useState<Array<{ uri: string; url?: string }>>([]);
  const [newShipment, setNewShipment] = useState({
    cost: '',
    order_ids: [] as string[],
  });

  useEffect(() => {
    checkUserRole();
  }, []);

  useEffect(() => {
    if (user && ['admin', 'manager'].includes(user.role)) {
      loadData();
    }
  }, [user, activeTab]);

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
        setCategories(data || []);
        console.log('✅ Admin: Categories loaded:', data?.length || 0);
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

  const getAccessToken = async (): Promise<string> => {
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
    
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
          
          // Check if token is expired (with 5 minute buffer)
          if (expiresAt && Date.now() / 1000 >= expiresAt - 300) {
            console.log('⚠️ Admin: Token expired, refreshing...');
            const newToken = await refreshTokenIfNeeded();
            return newToken || accessToken || supabaseKey;
          }
          
          return accessToken || supabaseKey;
        }
      } catch (e) {
        console.log('⚠️ Admin: Error reading token from localStorage');
      }
    }
    
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
      
      // Get access_token (with auto-refresh if expired)
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
        const response = await fetch(`${supabaseUrl}/rest/v1/products?select=*&order=created_at.desc`, {
          headers: {
            'apikey': supabaseKey || '',
            'Authorization': `Bearer ${accessToken}`, // Use access_token for RLS
            'Content-Type': 'application/json',
          }
        });
        if (response.ok) {
          const data = await response.json();
          setProducts(data || []);
          console.log('✅ Admin: Products loaded:', data?.length || 0);
        } else {
          console.error('❌ Admin: Error loading products:', await response.text());
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
          // Set first image as primary for backward compatibility
          if (productImages.length === 0 && uploadedImages.length > 0) {
            setNewProduct({ ...newProduct, image_url: uploadedImages[0].url || '' });
          }
          
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
    // Update primary image if needed
    if (newImages.length > 0 && index === 0) {
      setNewProduct({ ...newProduct, image_url: newImages[0].url || '' });
    } else if (newImages.length === 0) {
      setNewProduct({ ...newProduct, image_url: '' });
    }
  };

  const setPrimaryImage = (index: number) => {
    if (productImages[index]?.url) {
      setNewProduct({ ...newProduct, image_url: productImages[index].url || '' });
      // Reorder images to put primary first
      const reordered = [
        productImages[index],
        ...productImages.filter((_, i) => i !== index)
      ];
      setProductImages(reordered);
    }
  };

  const addProduct = async () => {
    if (!newProduct.name || !newProduct.price) {
      if (typeof window !== 'undefined' && Platform.OS === 'web') {
        window.alert('يرجى ملء جميع الحقول المطلوبة');
      } else {
        Alert.alert('خطأ', 'يرجى ملء جميع الحقول المطلوبة');
      }
      return;
    }

    if (productImages.length === 0 && !newProduct.image_url) {
      if (typeof window !== 'undefined' && Platform.OS === 'web') {
        window.alert('يرجى إضافة صورة واحدة على الأقل');
      } else {
        Alert.alert('خطأ', 'يرجى إضافة صورة واحدة على الأقل');
      }
      return;
    }

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
          stock_quantity: parseInt(newProduct.stock_quantity) || 0,
          image_url: newProduct.image_url || productImages[0]?.url || '', // Fallback
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
      if (productImages.length > 0) {
        const imagesToInsert = productImages.map((img, index) => ({
          product_id: productId,
          image_url: img.url || '',
          display_order: index,
          is_primary: index === 0, // First image is primary
        }));

        const imagesResponse = await fetch(`${supabaseUrl}/rest/v1/product_images`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey || '',
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(imagesToInsert)
        });

        if (!imagesResponse.ok) {
          const errorText = await imagesResponse.text();
          console.warn('⚠️ Failed to add product images:', errorText);
          // Continue anyway - product is created
        } else {
          console.log('✅ Product images added:', imagesToInsert.length);
        }
      }

      if (typeof window !== 'undefined' && Platform.OS === 'web') {
        window.alert('تم إضافة المنتج بنجاح');
      } else {
        Alert.alert('نجح', 'تم إضافة المنتج بنجاح');
      }
      
      // Reset form
      setNewProduct({
        name: '',
        description: '',
        price: '',
        original_price: '',
        discount_percentage: '',
        category: '',
        category_id: '',
        stock_quantity: '',
        image_url: '',
      });
      setProductImages([]);
      setEditingProduct(null);
      setEditProductImages([]);
      loadData();
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

  const startEditProduct = (product: Product) => {
    setEditingProduct(product);
    setNewProduct({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      original_price: product.original_price?.toString() || '',
      discount_percentage: product.discount_percentage?.toString() || '',
      category: product.category || '',
      category_id: product.category_id || '',
      stock_quantity: product.stock_quantity.toString(),
      image_url: product.image_url || '',
    });
    setProductImages([]);
    setEditProductImages([]);
  };

  const cancelEdit = () => {
    setEditingProduct(null);
    setNewProduct({
      name: '',
      description: '',
      price: '',
      original_price: '',
      discount_percentage: '',
      category: '',
      stock_quantity: '',
      image_url: '',
    });
    setProductImages([]);
    setEditProductImages([]);
  };

  const updateProduct = async () => {
    if (!editingProduct || !newProduct.name || !newProduct.price) {
      if (typeof window !== 'undefined' && Platform.OS === 'web') {
        window.alert('يرجى ملء جميع الحقول المطلوبة');
      } else {
        Alert.alert('خطأ', 'يرجى ملء جميع الحقول المطلوبة');
      }
      return;
    }

    setLoading(true);
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
          stock_quantity: parseInt(newProduct.stock_quantity) || 0,
          image_url: newProduct.image_url || productImages[0]?.url || editingProduct.image_url,
        })
      });

      if (!productResponse.ok) {
        const errorText = await productResponse.text();
        throw new Error(errorText);
      }

      // Update product images if new images were added
      if (productImages.length > 0) {
        // Delete old images
        await fetch(`${supabaseUrl}/rest/v1/product_images?product_id=eq.${editingProduct.id}`, {
          method: 'DELETE',
          headers: {
            'apikey': supabaseKey || '',
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          }
        });

        // Insert new images
        const imagesToInsert = productImages.map((img, index) => ({
          product_id: editingProduct.id,
          image_url: img.url || '',
          display_order: index,
          is_primary: index === 0,
        }));

        const imagesResponse = await fetch(`${supabaseUrl}/rest/v1/product_images`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey || '',
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(imagesToInsert)
        });

        if (!imagesResponse.ok) {
          console.warn('⚠️ Failed to update product images');
        }
      }

      if (typeof window !== 'undefined' && Platform.OS === 'web') {
        window.alert('تم تحديث المنتج بنجاح');
      } else {
        Alert.alert('نجح', 'تم تحديث المنتج بنجاح');
      }
      
      cancelEdit();
      loadData();
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
              {orders.map((order) => {
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
                      <Text style={styles.gridPrice}>{order.total_amount.toFixed(2)} ج.م</Text>
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
                                  onPress={() => setQuickEditOrder({ ...quickEditOrder, [order.id]: { ...quickEdit, status } })}
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
              })}
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
                    <Text style={styles.gridPrice}>{shipment.cost.toFixed(2)} ج.م</Text>
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
                            <Text style={styles.gridCardMetaText}>{item.cost_per_unit.toFixed(2)} ج.م</Text>
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
              {/* Category Selection */}
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
                  {categories.filter(c => c.is_active).map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[styles.categorySelectChip, newProduct.category_id === category.id && styles.categorySelectChipActive]}
                      onPress={() => setNewProduct({ ...newProduct, category_id: category.id, category: category.name })}
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
              </View>
              <TextInput
                style={styles.input}
                placeholder="الكمية في المخزن"
                value={newProduct.stock_quantity}
                onChangeText={(text) => setNewProduct({ ...newProduct, stock_quantity: text })}
                keyboardType="numeric"
              />
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
              
              <TouchableOpacity
                style={styles.submitButton}
                onPress={editingProduct ? updateProduct : addProduct}
              >
                <Text style={styles.submitButtonText}>
                  {editingProduct ? 'تحديث المنتج' : 'إضافة منتج'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.gridContainer}>
              {products.map((product) => {
                const isEditing = editingProductId === product.id;
                const quickEdit = quickEditProduct[product.id] || {};
                const displayName = isEditing ? (quickEdit.name !== undefined ? quickEdit.name : product.name) : product.name;
                const displayPrice = isEditing ? (quickEdit.price !== undefined ? quickEdit.price : product.price) : product.price;
                const displayStock = isEditing ? (quickEdit.stock_quantity !== undefined ? quickEdit.stock_quantity : product.stock_quantity) : product.stock_quantity;

                return (
                  <View key={product.id} style={styles.gridCard}>
                    {product.image_url && (
                      <Image
                        source={{ uri: product.image_url }}
                        style={styles.gridProductImage}
                        resizeMode="cover"
                      />
                    )}
                    
                    <View style={styles.cardHeader}>
                      {isEditing ? (
                        <TextInput
                          style={styles.inlineInput}
                          value={displayName}
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
                          value={displayPrice.toString()}
                          onChangeText={(text) => setQuickEditProduct({ ...quickEditProduct, [product.id]: { ...quickEdit, price: parseFloat(text) || 0 } })}
                          placeholder="السعر"
                          keyboardType="numeric"
                        />
                      ) : (
                        <>
                          {product.original_price && product.original_price > product.price ? (
                            <View>
                              <Text style={styles.gridOriginalPrice}>{product.original_price.toFixed(2)} ج.م</Text>
                              <Text style={styles.gridDiscountPrice}>{product.price.toFixed(2)} ج.م</Text>
                              {product.discount_percentage && (
                                <Text style={styles.gridDiscountBadge}>-{product.discount_percentage}%</Text>
                              )}
                            </View>
                          ) : (
                            <Text style={styles.gridPrice}>{product.price.toFixed(2)} ج.م</Text>
                          )}
                        </>
                      )}
                    </View>

                    <View style={styles.gridCardMeta}>
                      {isEditing ? (
                        <TextInput
                          style={styles.inlineInputSmall}
                          value={displayStock.toString()}
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
              })}
            </View>
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
                    onPress={() => {
                      // Simple dropdown using Alert
                      const options = ['بدون قسم', ...sections.map(s => s.name)];
                      if (Platform.OS === 'web') {
                        const selected = window.prompt('اختر القسم:\n' + options.map((o, i) => `${i}. ${o}`).join('\n'), '0');
                        if (selected !== null) {
                          const index = parseInt(selected);
                          if (index === 0) {
                            setNewCategory({ ...newCategory, section_id: '' });
                          } else if (index > 0 && index <= sections.length) {
                            setNewCategory({ ...newCategory, section_id: sections[index - 1].id });
                          }
                        }
                      } else {
                        Alert.alert(
                          'اختر القسم',
                          '',
                          [
                            { text: 'بدون قسم', onPress: () => setNewCategory({ ...newCategory, section_id: '' }) },
                            ...sections.map(section => ({
                              text: section.name,
                              onPress: () => setNewCategory({ ...newCategory, section_id: section.id })
                            })),
                            { text: 'إلغاء', style: 'cancel' }
                          ]
                        );
                      }
                    }}
                  >
                    <Text style={styles.pickerButtonText}>
                      {newCategory.section_id 
                        ? sections.find(s => s.id === newCategory.section_id)?.name || 'اختر القسم'
                        : 'بدون قسم'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#666" />
                  </TouchableOpacity>
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

                return (
                  <View key={category.id} style={styles.gridCard}>
                    <View style={styles.cardHeader}>
                      {category.icon && (
                        <Ionicons name={category.icon as any} size={20} color="#EE1C47" style={styles.cardIcon} />
                      )}
                      {isEditing ? (
                        <TextInput
                          style={styles.inlineInput}
                          value={displayName}
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
                      <Text style={styles.gridCardSection}>القسم: {category.section_data?.name || 'غير معروف'}</Text>
                    )}

                    <View style={styles.gridCardMeta}>
                      {isEditing ? (
                        <TextInput
                          style={styles.inlineInputSmall}
                          value={displayOrder.toString()}
                          onChangeText={(text) => setQuickEditCategory({ ...quickEditCategory, [category.id]: { ...quickEdit, display_order: parseInt(text) || 0 } })}
                          placeholder="ترتيب"
                          keyboardType="numeric"
                        />
                      ) : (
                        <Text style={styles.gridCardMetaText}>ترتيب: {category.display_order}</Text>
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

                return (
                  <View key={section.id} style={styles.gridCard}>
                    <View style={styles.cardHeader}>
                      {section.icon && (
                        <Ionicons name={section.icon as any} size={20} color="#EE1C47" style={styles.cardIcon} />
                      )}
                      {isEditing ? (
                        <TextInput
                          style={styles.inlineInput}
                          value={displayName}
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
                          value={displayOrder.toString()}
                          onChangeText={(text) => setQuickEditSection({ ...quickEditSection, [section.id]: { ...quickEdit, display_order: parseInt(text) || 0 } })}
                          placeholder="ترتيب"
                          keyboardType="numeric"
                        />
                      ) : (
                        <Text style={styles.gridCardMetaText}>ترتيب: {section.display_order}</Text>
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
    color: '#333',
    marginBottom: 8,
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
});

