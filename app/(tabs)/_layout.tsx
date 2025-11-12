import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '@/contexts/CartContext';

export default function TabsLayout() {
  const isWeb = Platform.OS === 'web';
  const { getItemCount } = useCart();
  const cartCount = getItemCount();

  if (isWeb) {
    // Web: Top navigation bar
    return (
      <Tabs
        screenOptions={{
          tabBarPosition: 'top',
          headerShown: true,
          tabBarActiveTintColor: '#EE1C47',
          tabBarInactiveTintColor: '#666',
          tabBarStyle: {
            backgroundColor: '#fff',
            borderBottomWidth: 1,
            borderBottomColor: '#eee',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'الرئيسية',
            tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="cart"
          options={{
            title: 'السلة',
            tabBarIcon: ({ color }) => <Ionicons name="cart" size={24} color={color} />,
            tabBarBadge: cartCount > 0 ? cartCount : undefined,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'الملف الشخصي',
            tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="admin"
          options={{
            title: 'الإدارة',
            tabBarIcon: ({ color }) => <Ionicons name="settings" size={24} color={color} />,
          }}
        />
      </Tabs>
    );
  }

  // Mobile: Bottom navigation bar
  return (
    <Tabs
      screenOptions={{
        tabBarPosition: 'bottom',
        headerShown: true,
        tabBarActiveTintColor: '#EE1C47',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#eee',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'الرئيسية',
          tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'السلة',
          tabBarIcon: ({ color }) => <Ionicons name="cart" size={24} color={color} />,
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'الملف الشخصي',
          tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'الإدارة',
          tabBarIcon: ({ color }) => <Ionicons name="settings" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}

