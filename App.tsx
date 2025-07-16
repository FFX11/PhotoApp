"use client"

import { NavigationContainer } from "@react-navigation/native"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { Camera, Image, Upload, Settings } from "lucide-react-native"
import { AuthProvider, useAuthContext } from "./context/AuthContext"
import { PhotoProvider } from "./context/PhotoContext"
import { StatusBar, ActivityIndicator, View, Text, Platform } from "react-native"
import { useEffect, useState } from "react"
import React from "react"
import { __DEV__ } from "react-native"

// Import screens with error handling
let CameraScreen: any
let GalleryScreen: any
let UploadScreen: any
let SettingsScreen: any
let LoginScreen: any
let PhotoDetailScreen: any
let AboutScreen: any
let MapScreen: any

try {
  CameraScreen = require("./screens/CameraScreen").default
  GalleryScreen = require("./screens/GalleryScreen").default
  UploadScreen = require("./screens/UploadScreen").default
  SettingsScreen = require("./screens/SettingsScreen").default
  LoginScreen = require("./screens/LoginScreen").default
  PhotoDetailScreen = require("./screens/PhotoDetailScreen").default
  AboutScreen = require("./screens/AboutScreen").default
  MapScreen = require("./screens/MapScreen").default
} catch (error) {
  console.error("❌ Error importing screens:", error)
}

const Tab = createBottomTabNavigator()
const Stack = createNativeStackNavigator()

// Fallback component for when screens fail to load
const FallbackScreen = ({ screenName }: { screenName: string }) => (
  <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#3a3a3a" }}>
    <Text style={{ color: "#b8860b", fontSize: 16 }}>{screenName} temporarily unavailable</Text>
    <Text style={{ color: "#8a8a8a", fontSize: 12, marginTop: 8 }}>Please restart the app</Text>
  </View>
)

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
          paddingBottom: 5,
          paddingTop: 5,
        },
      }}
    >
      <Tab.Screen
        name="Camera"
        component={CameraScreen || (() => <FallbackScreen screenName="Camera" />)}
        options={{
          tabBarIcon: ({ color }) => <Camera size={24} color={color} />,
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Gallery"
        component={GalleryScreen || (() => <FallbackScreen screenName="Gallery" />)}
        options={{
          tabBarIcon: ({ color }) => <Image size={24} color={color} />,
          title: "Photos",
          headerStyle: { backgroundColor: "#3a3a3a" },
          headerTintColor: "#b8860b",
        }}
      />
      <Tab.Screen
        name="Upload"
        component={UploadScreen || (() => <FallbackScreen screenName="Upload" />)}
        options={{
          tabBarIcon: ({ color }) => <Upload size={24} color={color} />,
          title: "Upload",
          headerStyle: { backgroundColor: "#3a3a3a" },
          headerTintColor: "#b8860b",
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen || (() => <FallbackScreen screenName="Settings" />)}
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
  const { user, isLoading } = useAuthContext()
  const [appReady, setAppReady] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log("🚀 App initialization starting...")
        console.log("📱 Platform:", Platform.OS)
        console.log("🏗️ Build type:", __DEV__ ? "Development" : "Production")

        // Longer delay for production builds
        const delay = __DEV__ ? 500 : 2000
        await new Promise((resolve) => setTimeout(resolve, delay))

        console.log("✅ App initialization complete")
        setAppReady(true)
      } catch (error) {
        console.error("❌ App initialization error:", error)
        setInitError(error instanceof Error ? error.message : "Unknown initialization error")
        setAppReady(true)
      }
    }

    initializeApp()
  }, [])

  if (isLoading || !appReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#3a3a3a",
        }}
      >
        <ActivityIndicator size="large" color="#b8860b" />
        <Text
          style={{
            color: "#b8860b",
            marginTop: 16,
            fontSize: 16,
            fontFamily: "Lato",
            textAlign: "center",
          }}
        >
          Loading Construction Photo Manager...
        </Text>
        <Text
          style={{
            color: "#8a8a8a",
            marginTop: 8,
            fontSize: 12,
            textAlign: "center",
          }}
        >
          {__DEV__ ? "Development Mode" : "Production Mode"}
        </Text>
        {initError && (
          <Text
            style={{
              color: "#ef4444",
              marginTop: 8,
              fontSize: 12,
              textAlign: "center",
              paddingHorizontal: 20,
            }}
          >
            Error: {initError}
          </Text>
        )}
      </View>
    )
  }

  if (initError) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#3a3a3a",
          padding: 20,
        }}
      >
        <Text
          style={{
            color: "#b8860b",
            fontSize: 18,
            fontWeight: "bold",
            textAlign: "center",
            marginBottom: 16,
          }}
        >
          Construction Photo Manager
        </Text>
        <Text
          style={{
            color: "#ef4444",
            fontSize: 14,
            textAlign: "center",
            marginBottom: 16,
          }}
        >
          Initialization Error: {initError}
        </Text>
        <Text
          style={{
            color: "#8a8a8a",
            fontSize: 12,
            textAlign: "center",
          }}
        >
          Please restart the app or contact support.
        </Text>
      </View>
    )
  }

  try {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            <>
              <Stack.Screen name="Main" component={MainTabs} />
              {PhotoDetailScreen && (
                <Stack.Screen
                  name="PhotoDetail"
                  component={PhotoDetailScreen}
                  options={{
                    headerShown: true,
                    title: "Photo Details",
                    headerStyle: { backgroundColor: "#3a3a3a" },
                    headerTintColor: "#b8860b",
                  }}
                />
              )}
              {AboutScreen && (
                <Stack.Screen
                  name="About"
                  component={AboutScreen}
                  options={{
                    headerShown: true,
                    title: "About",
                    headerStyle: { backgroundColor: "#3a3a3a" },
                    headerTintColor: "#b8860b",
                  }}
                />
              )}
              {MapScreen && (
                <Stack.Screen
                  name="Map"
                  component={MapScreen}
                  options={{
                    headerShown: true,
                    title: "Photo Map",
                    headerStyle: { backgroundColor: "#3a3a3a" },
                    headerTintColor: "#b8860b",
                  }}
                />
              )}
            </>
          ) : (
            <Stack.Screen name="Login" component={LoginScreen || (() => <FallbackScreen screenName="Login" />)} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    )
  } catch (error) {
    console.error("❌ Navigation error:", error)
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#3a3a3a",
          padding: 20,
        }}
      >
        <Text
          style={{
            color: "#ef4444",
            fontSize: 16,
            textAlign: "center",
          }}
        >
          Navigation Error: {error instanceof Error ? error.message : "Unknown error"}
        </Text>
      </View>
    )
  }
}

// Enhanced Error Boundary for production builds
interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: any
  errorInfo: any
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: any) {
    console.error("🚨 Error Boundary - getDerivedStateFromError:", error)
    return { hasError: true, error }
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("🚨 Error Boundary - componentDidCatch:", error)
    console.error("🚨 Error Info:", errorInfo)

    this.setState({
      error,
      errorInfo,
    })

    // Log additional info for production debugging
    console.error("🚨 Platform:", Platform.OS)
    console.error("🚨 Build type:", __DEV__ ? "Development" : "Production")
    console.error("🚨 Error stack:", error?.stack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#3a3a3a",
            padding: 20,
          }}
        >
          <Text
            style={{
              color: "#b8860b",
              fontSize: 18,
              fontWeight: "bold",
              textAlign: "center",
              marginBottom: 16,
            }}
          >
            Construction Photo Manager
          </Text>
          <Text
            style={{
              color: "#ef4444",
              fontSize: 14,
              textAlign: "center",
              marginBottom: 16,
            }}
          >
            App Error: {this.state.error?.message || "Unknown error occurred"}
          </Text>
          <Text
            style={{
              color: "#8a8a8a",
              fontSize: 12,
              textAlign: "center",
              marginBottom: 16,
            }}
          >
            Platform: {Platform.OS} | Build: {__DEV__ ? "Dev" : "Prod"}
          </Text>
          <Text
            style={{
              color: "#8a8a8a",
              fontSize: 12,
              textAlign: "center",
            }}
          >
            Please restart the app. If the problem persists, contact support.
          </Text>
        </View>
      )
    }

    return this.props.children
  }
}

export default function App() {
  console.log("🚀 App component mounting...")
  console.log("📱 Platform:", Platform.OS)
  console.log("🏗️ Build type:", __DEV__ ? "Development" : "Production")

  return (
    <ErrorBoundary>
      <AuthProvider>
        <PhotoProvider>
          <StatusBar barStyle="light-content" backgroundColor="#3a3a3a" />
          <AppNavigator />
        </PhotoProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}
