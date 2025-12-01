import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '@/contexts/CartContext';
import { useDarkMode } from '@/contexts/DarkModeContext';

export default function TabsLayout() {
  const isWeb = Platform.OS === 'web';
  const { getItemCount } = useCart();
  const { isDarkMode, colors } = useDarkMode();
  const cartCount = getItemCount();

  if (isWeb) {
    // Web: Top navigation bar (Temu style)
    return (
      <Tabs
        screenOptions={{
          tabBarPosition: 'top',
          headerShown: false, // Clean header like Temu
          tabBarActiveTintColor: '#EE1C47', // Temu red
          tabBarInactiveTintColor: '#6B7280', // Gray for inactive
          tabBarLabelStyle: {
            fontSize: 14,
            fontWeight: '600',
            marginTop: -4,
          },
          tabBarIconStyle: {
            marginTop: 4,
          },
          tabBarStyle: {
            backgroundColor: '#FFFFFF', // Clean white like Temu
            borderBottomWidth: 1,
            borderBottomColor: '#E5E7EB', // Light gray border
            height: 56,
            paddingTop: 8,
            paddingBottom: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
          },
          tabBarIndicatorStyle: {
            backgroundColor: '#EE1C47', // Temu red indicator
            height: 3,
            borderRadius: 2,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'الرئيسية',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons 
                name={focused ? "home" : "home-outline"} 
                size={22} 
                color={color} 
              />
            ),
          }}
        />
        <Tabs.Screen
          name="cart"
          options={{
            title: 'السلة',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons 
                name={focused ? "cart" : "cart-outline"} 
                size={22} 
                color={color} 
              />
            ),
            tabBarBadge: cartCount > 0 ? cartCount : undefined,
            tabBarBadgeStyle: {
              backgroundColor: '#EE1C47', // Temu red badge
              color: '#FFFFFF',
              fontSize: 11,
              fontWeight: 'bold',
              minWidth: 18,
              height: 18,
            },
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'الملف الشخصي',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons 
                name={focused ? "person" : "person-outline"} 
                size={22} 
                color={color} 
              />
            ),
          }}
        />
        <Tabs.Screen
          name="admin"
          options={{
            title: 'الإدارة',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons 
                name={focused ? "settings" : "settings-outline"} 
                size={22} 
                color={color} 
              />
            ),
          }}
        />
      </Tabs>
    );
  }

  // Mobile: Bottom navigation bar (Temu style)
  return (
    <Tabs
      screenOptions={{
        tabBarPosition: 'bottom',
        headerShown: false, // Clean header like Temu mobile
        tabBarActiveTintColor: '#EE1C47', // Temu red
        tabBarInactiveTintColor: '#9CA3AF', // Gray for inactive
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: -4,
          marginBottom: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
        tabBarStyle: {
          backgroundColor: '#FFFFFF', // Clean white like Temu
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB', // Light gray border
          height: 60,
          paddingTop: 6,
          paddingBottom: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'الرئيسية',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "home" : "home-outline"} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'السلة',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "cart" : "cart-outline"} 
              size={24} 
              color={color} 
            />
          ),
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#EE1C47', // Temu red badge
            color: '#FFFFFF',
            fontSize: 11,
            fontWeight: 'bold',
            minWidth: 18,
            height: 18,
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'الملف الشخصي',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "person" : "person-outline"} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'الإدارة',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "settings" : "settings-outline"} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
    </Tabs>
  );
}

