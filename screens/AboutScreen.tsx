"use client"

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from "react-native"
import { Mail, Building, Calendar, User, Code, Shield } from "lucide-react-native"

export default function AboutScreen() {
  const handleEmailPress = () => {
    Linking.openURL("mailto:moealijabba@gmail.com").catch(() => {
      console.log("Could not open email client")
    })
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoEmoji}>📸</Text>
        </View>
        <Text style={styles.appTitle}>Construction Photo Manager</Text>
        <Text style={styles.version}>Version 1.0.0</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About This App</Text>
        <Text style={styles.description}>
          A professional photo management application designed specifically for construction workers and site managers.
          Capture photos with GPS coordinates, manage uploads, and organize your construction site documentation
          efficiently.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Key Features</Text>
        <View style={styles.featureList}>
          <Text style={styles.feature}>📸 Camera with real-time GPS location</Text>
          <Text style={styles.feature}>🗺️ Automatic city and coordinates overlay</Text>
          <Text style={styles.feature}>📅 Date and time stamping</Text>
          <Text style={styles.feature}>💾 Offline photo storage</Text>
          <Text style={styles.feature}>☁️ Cloud upload integration</Text>
          <Text style={styles.feature}>👥 Role-based access control</Text>
          <Text style={styles.feature}>📱 Professional gallery interface</Text>
          <Text style={styles.feature}>🔒 Secure authentication system</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Roles</Text>
        <View style={styles.rolesList}>
          <View style={styles.roleItem}>
            <Shield size={16} color="#b8860b" />
            <View style={styles.roleInfo}>
              <Text style={styles.roleName}>Admin</Text>
              <Text style={styles.roleDescription}>Full access to all features and data</Text>
            </View>
          </View>
          <View style={styles.roleItem}>
            <Shield size={16} color="#daa520" />
            <View style={styles.roleInfo}>
              <Text style={styles.roleName}>Supervisor</Text>
              <Text style={styles.roleDescription}>Can download photos and view location data</Text>
            </View>
          </View>
          <View style={styles.roleItem}>
            <Shield size={16} color="#b8860b" />
            <View style={styles.roleInfo}>
              <Text style={styles.roleName}>Worker</Text>
              <Text style={styles.roleDescription}>Can take photos and upload them</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Company Information</Text>
        <View style={styles.companyInfo}>
          <View style={styles.infoRow}>
            <Building size={20} color="#b8860b" />
            <Text style={styles.companyName}>A.M. Erdbau und Kabelverlegung GmbH & Co. KG</Text>
          </View>
          <View style={styles.infoRow}>
            <Calendar size={20} color="#b8860b" />
            <Text style={styles.infoText}>Copyright © 2025</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Developer</Text>
        <View style={styles.developerInfo}>
          <View style={styles.infoRow}>
            <User size={20} color="#b8860b" />
            <Text style={styles.infoText}>Mohammed</Text>
          </View>
          <TouchableOpacity style={styles.emailRow} onPress={handleEmailPress}>
            <Mail size={20} color="#b8860b" />
            <Text style={styles.emailText}>moealijabba@gmail.com</Text>
          </TouchableOpacity>
          <View style={styles.infoRow}>
            <Code size={20} color="#b8860b" />
            <Text style={styles.infoText}>Mobile App Developer</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          This application is designed to streamline construction site documentation and improve workflow efficiency.
        </Text>
        <Text style={styles.copyright}>© 2025 A.M. Erdbau und Kabelverlegung GmbH & Co. KG</Text>
        <Text style={styles.copyright}>All rights reserved.</Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#2a2a2a",
    fontFamily: "Lato",
  },
  header: {
    alignItems: "center",
    padding: 32,
    backgroundColor: "#3a3a3a",
    borderBottomWidth: 1,
    borderBottomColor: "#4a4a4a",
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: "#b8860b",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoEmoji: {
    fontSize: 32,
    color: "#ffffff",
  },
  appTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#b8860b",
    marginTop: 16,
    textAlign: "center",
    fontFamily: "Lato",
  },
  version: {
    fontSize: 14,
    color: "#888888",
    marginTop: 4,
    fontFamily: "Lato",
  },
  section: {
    backgroundColor: "#3a3a3a",
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#4a4a4a",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#b8860b",
    marginBottom: 12,
    fontFamily: "Lato",
  },
  description: {
    fontSize: 15,
    color: "#cccccc",
    lineHeight: 22,
    fontFamily: "Lato",
  },
  featureList: {
    marginTop: 8,
  },
  feature: {
    fontSize: 14,
    color: "#cccccc",
    marginBottom: 8,
    lineHeight: 20,
    fontFamily: "Lato",
  },
  rolesList: {
    marginTop: 8,
  },
  roleItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: "#2a2a2a",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#4a4a4a",
  },
  roleInfo: {
    marginLeft: 12,
    flex: 1,
  },
  roleName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#b8860b",
    fontFamily: "Lato",
  },
  roleDescription: {
    fontSize: 12,
    color: "#aaaaaa",
    marginTop: 2,
    fontFamily: "Lato",
  },
  companyInfo: {
    marginTop: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: "#2a2a2a",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#4a4a4a",
  },
  companyName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#cccccc",
    marginLeft: 12,
    flex: 1,
    fontFamily: "Lato",
  },
  infoText: {
    fontSize: 15,
    color: "#cccccc",
    marginLeft: 12,
    fontFamily: "Lato",
  },
  developerInfo: {
    marginTop: 8,
  },
  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: "#2a2a2a",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#4a4a4a",
  },
  emailText: {
    fontSize: 15,
    color: "#b8860b",
    marginLeft: 12,
    textDecorationLine: "underline",
    fontFamily: "Lato",
  },
  footer: {
    padding: 24,
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: "#aaaaaa",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
    fontFamily: "Lato",
  },
  copyright: {
    fontSize: 12,
    color: "#888888",
    textAlign: "center",
    marginBottom: 4,
    fontFamily: "Lato",
  },
})
