/**
 * App.tsx — Root navigator for UTUBooking mobile.
 *
 * Architecture:
 *   Bottom Tab Navigator
 *   ├─ Home Stack
 *   │   ├─ HomeScreen           (search hub)
 *   │   ├─ HotelResultsScreen   (search results)
 *   │   ├─ HotelDetailScreen    (hotel detail)
 *   │   └─ BookingFlowScreen    (3-step booking wizard)
 *   ├─ MyTrips Stack
 *   │   └─ MyTripsScreen
 *   └─ Loyalty Stack
 *       └─ LoyaltyScreen
 *
 * i18next is initialised here so translations are ready before any screen mounts.
 * RTL is applied at boot via applyRTL().
 */
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { I18nextProvider } from 'react-i18next';
import { Text } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// i18n — must import before screens so resources are registered
import i18n, { applyRTL } from './i18n';

// Screens
import HomeScreen                          from './screens/HomeScreen';
import HotelResultsScreen, { type HotelCardData } from './screens/HotelResultsScreen';
import HotelDetailScreen                   from './screens/HotelDetailScreen';
import BookingFlowScreen                   from './screens/BookingFlowScreen';
import MyTripsScreen                       from './screens/MyTripsScreen';
import LoyaltyScreen                       from './screens/LoyaltyScreen';
import FlightSearchScreen, { type FlightOffer } from './screens/FlightSearchScreen';
import CarRentalScreen,    { type CarOffer }    from './screens/CarRentalScreen';

// ─── Navigation param lists ───────────────────────────────────────────────────
export type RootStackParamList = {
  Home:          undefined;
  HotelResults:  { destination?: string; checkIn?: string; checkOut?: string; guests?: number };
  HotelDetail:   { hotel: HotelCardData };
  BookingFlow:   { hotel: HotelCardData; nights: number; total: number };
  MyTrips:       undefined;
  Loyalty:       undefined;
  FlightResults: { origin?: string; destination?: string; date?: string; returnDate?: string; passengers?: number; cabin?: 'economy' | 'business' };
  CarRental:     { pickupCity?: string; pickupDate?: string; dropoffDate?: string; transmission?: 'automatic' | 'manual' };
};

type TabParamList = {
  HomeTab:    undefined;
  TripsTab:   undefined;
  LoyaltyTab: undefined;
};

// ─── Navigators ───────────────────────────────────────────────────────────────
const Stack  = createNativeStackNavigator<RootStackParamList>();
const Tab    = createBottomTabNavigator<TabParamList>();

// Apply RTL for current language at boot
applyRTL(i18n.language as 'en' | 'ar');

// Singleton QueryClient — outside component to survive re-renders
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            60_000,
      gcTime:               300_000,
      retry:                1,
      refetchOnWindowFocus: false,
    },
  },
});

// ─── Home Stack ───────────────────────────────────────────────────────────────
function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle:          { backgroundColor: '#10B981' },
        headerTintColor:      '#FFFFFF',
        headerTitleStyle:     { fontWeight: '700' },
        headerBackButtonMenuEnabled: false,
      }}
    >
      <Stack.Screen name="Home"         component={HomeScreen}         options={{ headerShown: false }} />
      <Stack.Screen name="HotelResults" component={HotelResultsScreen} options={{ title: i18n.t('results.title') }} />
      <Stack.Screen name="HotelDetail"  component={HotelDetailScreen}  options={{ title: '' }} />
      <Stack.Screen name="BookingFlow"  component={BookingFlowScreen}  options={{ title: i18n.t('booking.title') }} />
      {/* MyTrips reachable from BookingFlow confirmation screen */}
      <Stack.Screen name="MyTrips"       component={MyTripsScreen}       options={{ title: i18n.t('trips.title') }} />
      <Stack.Screen name="FlightResults" component={FlightSearchScreen}  options={{ title: i18n.t('flights.title') }} />
      <Stack.Screen name="CarRental"     component={CarRentalScreen}     options={{ title: i18n.t('cars.title') }} />
    </Stack.Navigator>
  );
}

// ─── Trips Stack ──────────────────────────────────────────────────────────────
function TripsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle:      { backgroundColor: '#10B981' },
        headerTintColor:  '#FFFFFF',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="MyTrips" component={MyTripsScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

// ─── Loyalty Stack ────────────────────────────────────────────────────────────
function LoyaltyStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle:      { backgroundColor: '#10B981' },
        headerTintColor:  '#FFFFFF',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen
        name="Loyalty"
        component={LoyaltyScreen}
        options={{ title: i18n.t('loyalty.title') }}
      />
    </Stack.Navigator>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <NavigationContainer>
          <StatusBar style="light" />
          <Tab.Navigator
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarActiveTintColor:   '#10B981',
              tabBarInactiveTintColor: '#9CA3AF',
              tabBarStyle:             { borderTopColor: '#E5E7EB', height: 60, paddingBottom: 8 },
              tabBarLabelStyle:        { fontSize: 12, fontWeight: '600' },
              tabBarIcon: ({ focused }) => {
                let icon = '🏠';
                if (route.name === 'TripsTab')   icon = '✈️';
                if (route.name === 'LoyaltyTab') icon = '⭐';
                return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.6 }}>{icon}</Text>;
              },
            })}
          >
            <Tab.Screen
              name="HomeTab"
              component={HomeStack}
              options={{ tabBarLabel: i18n.t('tabs.home'), tabBarAccessibilityLabel: i18n.t('tabs.home') }}
            />
            <Tab.Screen
              name="TripsTab"
              component={TripsStack}
              options={{ tabBarLabel: i18n.t('tabs.trips'), tabBarAccessibilityLabel: i18n.t('tabs.trips') }}
            />
            <Tab.Screen
              name="LoyaltyTab"
              component={LoyaltyStack}
              options={{ tabBarLabel: i18n.t('loyalty.title'), tabBarAccessibilityLabel: i18n.t('loyalty.title') }}
            />
          </Tab.Navigator>
        </NavigationContainer>
      </I18nextProvider>
    </QueryClientProvider>
  );
}
