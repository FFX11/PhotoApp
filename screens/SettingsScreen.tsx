"use client"

import { useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { useAuthContext } from "../context/AuthContext"
import { usePhotoContext } from "../context/PhotoContext"
import { LogOut, User, Trash2, RefreshCw, Info, Shield } from "lucide-react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import type { NavigationProp } from "@react-navigation/native"
import type { RootStackParamList } from "../types/navigation"

type SettingsScreenNavigationProp = NavigationProp<RootStackParamList>

export default function SettingsScreen() {
  const { user, logout, canViewSensitiveData } = useAuthContext()
  const { clearAllPhotos, photos } = usePhotoContext()
  const navigation = useNavigation<SettingsScreenNavigationProp>()
  const [saveLocationData, setSaveLocationData] = useState(true)
  const [autoUpload, setAutoUpload] = useState(false)
  const [highQualityPhotos, setHighQualityPhotos] = useState(true)

  const handleLogout = () => {
    console.log("User logout requested")
    logout()
  }

  const handleClearAllPhotos = () => {
    if (!canViewSensitiveData()) {
      console.log("Permission denied: Only supervisors and admins can clear all photos")
      return
    }

    console.log(`Clearing all ${photos.length} photos from local storage`)
    clearAllPhotos()
    console.log("All photos cleared successfully")
  }

  const handleSyncSettings = async () => {
    try {
      await AsyncStorage.setItem(
        "settings",
        JSON.stringify({
          saveLocationData,
          autoUpload,
          highQualityPhotos,
        }),
      )
      console.log("Settings saved successfully")
    } catch (error) {
      console.error("Error saving settings:", error)
    }
  }

  const handleAbout = () => {
    navigation.navigate("About")
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>User not found</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <User size={24} color="#b8860b" />
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            <View style={[styles.roleBadge, getRoleBadgeStyle(user.role)]}>
              <Shield size={12} color="#ffffff" />
              <Text style={styles.roleText}>{user.role.toUpperCase()}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Settings</Text>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Save Location Data</Text>
          <Switch
            value={saveLocationData}
            onValueChange={setSaveLocationData}
            trackColor={{ false: "#5a5a5a", true: "#b8860b" }}
            thumbColor="#ffffff"
          />
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Auto Upload When Connected</Text>
          <Switch
            value={autoUpload}
            onValueChange={setAutoUpload}
            trackColor={{ false: "#5a5a5a", true: "#b8860b" }}
            thumbColor="#ffffff"
          />
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>High Quality Photos</Text>
          <Switch
            value={highQualityPhotos}
            onValueChange={setHighQualityPhotos}
            trackColor={{ false: "#5a5a5a", true: "#b8860b" }}
            thumbColor="#ffffff"
          />
        </View>
      </View>

      {canViewSensitiveData() && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Admin Settings</Text>

          <TouchableOpacity style={styles.actionButton} onPress={handleSyncSettings}>
            <RefreshCw size={20} color="#b8860b" />
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionText}>Sync Settings</Text>
              <Text style={styles.actionSubtext}>Save current settings</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleClearAllPhotos}>
            <Trash2 size={20} color="#ef4444" />
            <View style={styles.actionTextContainer}>
              <Text style={[styles.actionText, { color: "#ef4444" }]}>Clear All Photos</Text>
              <Text style={styles.actionSubtext}>Delete all {photos.length} stored photos</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Information</Text>

        <TouchableOpacity style={styles.actionButton} onPress={handleAbout}>
          <Info size={20} color="#b8860b" />
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionText}>About</Text>
            <Text style={styles.actionSubtext}>App information and credits</Text>
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <LogOut size={20} color="#3a3a3a" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.version}>Construction Photo Manager v1.0.0</Text>
        <Text style={styles.copyright}>© 2025 A.M. Erdbau und Kabelverlegung GmbH & Co. KG</Text>
      </View>
    </ScrollView>
  )
}

const getRoleBadgeStyle = (role: string) => {
  switch (role) {
    case "admin":
      return { backgroundColor: "#ef4444" }
    case "super":
      return { backgroundColor: "#f59e0b" }
    default:
      return { backgroundColor: "#b8860b" }
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#3a3a3a",
  },
  section: {
    backgroundColor: "#4a4a4a",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#5a5a5a",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#b8860b",
    marginBottom: 12,
    fontFamily: "Lato",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#5a5a5a",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#b8860b",
  },
  userDetails: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#b8860b",
    fontFamily: "Lato",
  },
  userEmail: {
    fontSize: 14,
    color: "#8a8a8a",
    marginTop: 2,
    fontFamily: "Lato",
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  roleText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
    fontFamily: "Lato",
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#5a5a5a",
  },
  settingLabel: {
    fontSize: 16,
    color: "#b8860b",
    fontFamily: "Lato",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#5a5a5a",
  },
  actionTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  actionText: {
    fontSize: 16,
    color: "#b8860b",
    fontFamily: "Lato",
  },
  actionSubtext: {
    fontSize: 12,
    color: "#8a8a8a",
    marginTop: 2,
    fontFamily: "Lato",
  },
  logoutButton: {
    backgroundColor: "#b8860b",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 24,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  logoutText: {
    color: "#3a3a3a",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 8,
    fontFamily: "Lato",
  },
  footer: {
    padding: 16,
    alignItems: "center",
  },
  version: {
    fontSize: 12,
    color: "#8a8a8a",
    marginBottom: 4,
    fontFamily: "Lato",
  },
  copyright: {
    fontSize: 10,
    color: "#8a8a8a",
    textAlign: "center",
    fontFamily: "Lato",
  },
  errorText: {
    fontSize: 16,
    color: "#ef4444",
    textAlign: "center",
    marginTop: 20,
    fontFamily: "Lato",
  },
})
