"use client"

import { NavigationContainer } from "@react-navigation/native"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { Camera, Image, Upload, Settings } from "lucide-react-native"
import { StatusBar, ActivityIndicator, View, Text, Platform } from "react-native"
import { useEffect, useState } from "react"
import React from "react"
import { __DEV__ } from "react-native"

// Minimal test screens
const TestScreen = ({ title }: { title: string }) => (
  <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#3a3a3a" }}>
    <Text style={{ color: "#b8860b", fontSize: 18, fontWeight: "bold" }}>{title}</Text>
    <Text style={{ color: "#8a8a8a", fontSize: 12, marginTop: 8 }}>
      Platform: {Platform.OS} | Build: {__DEV__ ? "Dev" : "Prod"}
    </Text>
  </View>
)

const Tab = createBottomTabNavigator()
const Stack = createNativeStackNavigator()

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: "#b8860b",
        tabBarInactiveTintColor: "#8a8a8a",
        tabBarStyle: {
          backgroundColor: "#3a3a3a",
          borderTopWidth: 1,
          borderTopColor: "#4a4a4a",
        },
      }}
    >
      <Tab.Screen
        name="Camera"
        component={() => <TestScreen title="Camera Screen" />}
        options={{
          tabBarIcon: ({ color }) => <Camera size={24} color={color} />,
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Gallery"
        component={() => <TestScreen title="Gallery Screen" />}
        options={{
          tabBarIcon: ({ color }) => <Image size={24} color={color} />,
          title: "Photos",
          headerStyle: { backgroundColor: "#3a3a3a" },
          headerTintColor: "#b8860b",
        }}
      />
      <Tab.Screen
        name="Upload"
        component={() => <TestScreen title="Upload Screen" />}
        options={{
          tabBarIcon: ({ color }) => <Upload size={24} color={color} />,
          title: "Upload",
          headerStyle: { backgroundColor: "#3a3a3a" },
          headerTintColor: "#b8860b",
        }}
      />
      <Tab.Screen
        name="Settings"
        component={() => <TestScreen title="Settings Screen" />}
        options={{
          tabBarIcon: ({ color }) => <Settings size={24} color={color} />,
          title: "Settings",
          headerStyle: { backgroundColor: "#3a3a3a" },
          headerTintColor: "#b8860b",
        }}
      />
    </Tab.Navigator>
  )
}

function AppNavigator() {
  const [appReady, setAppReady] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log("🚀 Minimal app initialization starting...")
        console.log("📱 Platform:", Platform.OS)
        console.log("🏗️ Build type:", __DEV__ ? "Development" : "Production")

        // Simple delay
        await new Promise((resolve) => setTimeout(resolve, 1000))

        console.log("✅ Minimal app initialization complete")
        setAppReady(true)
      } catch (error) {
        console.error("❌ Minimal app initialization error:", error)
        setInitError(error instanceof Error ? error.message : "Unknown error")
        setAppReady(true)
      }
    }

    initializeApp()
  }, [])

  if (!appReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#3a3a3a" }}>
        <ActivityIndicator size="large" color="#b8860b" />
        <Text style={{ color: "#b8860b", marginTop: 16, fontSize: 16 }}>Loading Minimal Test App...</Text>
        <Text style={{ color: "#8a8a8a", marginTop: 8, fontSize: 12 }}>
          {__DEV__ ? "Development Mode" : "Production Mode"}
        </Text>
      </View>
    )
  }

  if (initError) {
    return (
      <View
        style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#3a3a3a", padding: 20 }}
      >
        <Text style={{ color: "#ef4444", fontSize: 16, textAlign: "center" }}>Minimal App Error: {initError}</Text>
      </View>
    )
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={MainTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: any) {
    console.error("🚨 Minimal Error Boundary:", error)
    return { hasError: true, error }
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("🚨 Minimal Error Boundary - componentDidCatch:", error)
    console.error("🚨 Error Info:", errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#3a3a3a", padding: 20 }}
        >
          <Text style={{ color: "#ef4444", fontSize: 16, textAlign: "center", marginBottom: 16 }}>
            Minimal App Crashed: {this.state.error?.message || "Unknown error"}
          </Text>
          <Text style={{ color: "#8a8a8a", fontSize: 12, textAlign: "center" }}>
            Platform: {Platform.OS} | Build: {__DEV__ ? "Dev" : "Prod"}
          </Text>
        </View>
      )
    }

    return this.props.children
  }
}

export default function MinimalApp() {
  console.log("🚀 Minimal App component mounting...")
  console.log("📱 Platform:", Platform.OS)
  console.log("🏗️ Build type:", __DEV__ ? "Development" : "Production")

  return (
    <ErrorBoundary>
      <StatusBar barStyle="light-content" backgroundColor="#3a3a3a" />
      <AppNavigator />
    </ErrorBoundary>
  )
}
