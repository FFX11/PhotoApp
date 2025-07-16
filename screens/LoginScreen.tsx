"use client"

import { useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { useAuthContext } from "../context/AuthContext"
import { __DEV__ } from "react-native"

export default function LoginScreen() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const { login } = useAuthContext()

  const handleLogin = async () => {
    if (!username || !password) {
      setError("Please enter both username and password")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      console.log("🔐 LoginScreen: Attempting login for:", username)

      // Add delay to simulate network request
      await new Promise((resolve) => setTimeout(resolve, 1000))

      if (username === "admin" && password === "admin123") {
        console.log("✅ LoginScreen: Admin login successful")
        await login({
          id: "1",
          name: "Admin User",
          email: "admin@construction.com",
          role: "admin",
        })
      } else if (username === "super" && password === "super123") {
        console.log("✅ LoginScreen: Super user login successful")
        await login({
          id: "2",
          name: "Supervisor",
          email: "supervisor@construction.com",
          role: "super",
        })
      } else if (username === "worker" && password === "worker123") {
        console.log("✅ LoginScreen: Worker login successful")
        await login({
          id: "3",
          name: "Construction Worker",
          email: "worker@construction.com",
          role: "normal",
        })
      } else {
        console.log("❌ LoginScreen: Invalid credentials")
        setError("Invalid username or password")
      }
    } catch (error) {
      console.error("❌ LoginScreen: Login error:", error)
      setError("Failed to login. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={styles.logoContainer}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>📸</Text>
        </View>
        <Text style={styles.appName}>Construction Photo Manager</Text>
        <Text style={styles.companyName}>A.M. ERDBAU</Text>
        <Text style={styles.companySubtitle}>UND KABELVERLEGUNG</Text>
        <Text style={styles.buildInfo}>
          {__DEV__ ? "Development Build" : "Production Build"} | {Platform.OS}
        </Text>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your username"
          placeholderTextColor="#8a8a8a"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your password"
          placeholderTextColor="#8a8a8a"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#3a3a3a" size="small" />
          ) : (
            <Text style={styles.loginButtonText}>Login</Text>
          )}
        </TouchableOpacity>

        {/* <View style={styles.demoAccountsContainer}>
          <Text style={styles.demoAccountsTitle}>Demo Accounts:</Text>
          <Text style={styles.demoAccount}>Admin: admin / admin123</Text>
          <Text style={styles.demoAccount}>Supervisor: super / super123</Text>
          <Text style={styles.demoAccount}>Worker: worker / worker123</Text>
        </View> */}
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#3a3a3a",
    justifyContent: "center",
    padding: 20,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: "#b8860b",
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    fontSize: 40,
    color: "#3a3a3a",
  },
  appName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#b8860b",
    marginTop: 16,
    textAlign: "center",
    fontFamily: "Lato",
  },
  companyName: {
    fontSize: 18,
    color: "#b8860b",
    marginTop: 8,
    textAlign: "center",
    fontWeight: "600",
    letterSpacing: 2,
    fontFamily: "Lato",
  },
  companySubtitle: {
    fontSize: 12,
    color: "#8a8a8a",
    marginTop: 2,
    textAlign: "center",
    letterSpacing: 1,
    fontFamily: "Lato",
  },
  buildInfo: {
    fontSize: 10,
    color: "#6a6a6a",
    marginTop: 8,
    textAlign: "center",
    fontFamily: "Lato",
  },
  formContainer: {
    backgroundColor: "#4a4a4a",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#5a5a5a",
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: "#b8860b",
    marginBottom: 8,
    fontFamily: "Lato",
  },
  input: {
    backgroundColor: "#5a5a5a",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#6a6a6a",
    color: "#b8860b",
    fontFamily: "Lato",
  },
  loginButton: {
    backgroundColor: "#b8860b",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  loginButtonText: {
    color: "#3a3a3a",
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "Lato",
  },
  errorText: {
    color: "#ef4444",
    marginBottom: 16,
    textAlign: "center",
    fontFamily: "Lato",
  },
  demoAccountsContainer: {
    marginTop: 24,
    padding: 12,
    backgroundColor: "#5a5a5a",
    borderRadius: 8,
  },
  demoAccountsTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#b8860b",
    marginBottom: 8,
    fontFamily: "Lato",
  },
  demoAccount: {
    fontSize: 12,
    color: "#8a8a8a",
    marginBottom: 4,
    fontFamily: "Lato",
  },
})
