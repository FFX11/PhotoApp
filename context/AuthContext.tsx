"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"

// Define user types
type UserRole = "admin" | "super" | "normal"

interface User {
  id: string
  name: string
  email: string
  role: UserRole
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (user: User) => Promise<void>
  logout: () => Promise<void>
  isAuthenticated: boolean
  canDelete: (photo: any) => boolean
  canDownload: () => boolean
  canViewSensitiveData: () => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in
    const checkLoginStatus = async () => {
      try {
        console.log("🔍 AuthContext: Checking login status...")
        const userJson = await AsyncStorage.getItem("user")
        if (userJson) {
          const userData = JSON.parse(userJson)
          console.log("✅ AuthContext: Found existing user:", userData.name)
          setUser(userData)
        } else {
          console.log("ℹ️ AuthContext: No existing user found")
        }
      } catch (error) {
        console.error("❌ AuthContext: Error checking login status:", error)
        // Don't crash the app, just continue without user
        setUser(null)
      } finally {
        setIsLoading(false)
        console.log("✅ AuthContext: Login status check completed")
      }
    }

    checkLoginStatus()
  }, [])

  const login = async (userData: User) => {
    try {
      console.log("🔐 AuthContext: Logging in user:", userData.name)
      await AsyncStorage.setItem("user", JSON.stringify(userData))
      setUser(userData)
      console.log("✅ AuthContext: Login successful")
    } catch (error) {
      console.error("❌ AuthContext: Error logging in:", error)
      throw new Error("Failed to save login data")
    }
  }

  const logout = async () => {
    try {
      console.log("🚪 AuthContext: Logging out user")
      await AsyncStorage.removeItem("user")
      setUser(null)
      console.log("✅ AuthContext: Logout successful")
    } catch (error) {
      console.error("❌ AuthContext: Error logging out:", error)
      // Don't throw error, just set user to null
      setUser(null)
    }
  }

  const canDelete = (photo: any) => {
    if (!user) return false

    try {
      // Admin and super users can delete any photo
      if (user.role === "admin" || user.role === "super") {
        return true
      }

      // Normal users can only delete their own photos within 24 hours
      if (user.role === "normal") {
        if (!photo?.uploaded) return true // Can delete unuploaded photos

        const uploadDate = photo.uploadedAt ? new Date(photo.uploadedAt) : null
        if (!uploadDate) return true

        const hoursSinceUpload = (new Date().getTime() - uploadDate.getTime()) / (1000 * 60 * 60)
        return hoursSinceUpload < 24
      }

      return false
    } catch (error) {
      console.error("❌ AuthContext: Error checking delete permission:", error)
      return false
    }
  }

  const canDownload = () => {
    try {
      return user?.role === "admin" || user?.role === "super"
    } catch (error) {
      console.error("❌ AuthContext: Error checking download permission:", error)
      return false
    }
  }

  const canViewSensitiveData = () => {
    try {
      return user?.role === "admin" || user?.role === "super"
    } catch (error) {
      console.error("❌ AuthContext: Error checking sensitive data permission:", error)
      return false
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        isAuthenticated: !!user,
        canDelete,
        canDownload,
        canViewSensitiveData,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuthContext = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider")
  }
  return context
}
