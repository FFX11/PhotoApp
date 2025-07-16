"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput } from "react-native"
import { CameraView, type CameraType, useCameraPermissions } from "expo-camera"
import * as Location from "expo-location"
import { useNavigation, useFocusEffect } from "@react-navigation/native"
import { usePhotoContext } from "../context/PhotoContext"
import { useAuthContext } from "../context/AuthContext"
import { Camera as CameraIcon, MapPin, RotateCcw, AlertTriangle } from "lucide-react-native"
import { getDetailedLocationInfo } from "../utils/locationUtils"
import WatermarkedPhoto, { type WatermarkedPhotoRef } from "../components/WatermarkedPhoto"
import type { NavigationProp } from "@react-navigation/native"
import type { RootStackParamList } from "../types/navigation"

type CameraScreenNavigationProp = NavigationProp<RootStackParamList>

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions()
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null)
  const [location, setLocation] = useState<Location.LocationObject | null>(null)
  const [locationInfo, setLocationInfo] = useState<any>(null)
  const [isTakingPhoto, setIsTakingPhoto] = useState<boolean>(false)
  const [facing, setFacing] = useState<CameraType>("back")
  const [isCameraReady, setIsCameraReady] = useState<boolean>(false)
  const [isLocationActive, setIsLocationActive] = useState<boolean>(false)
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null)
  const [locationError, setLocationError] = useState<boolean>(false)
  const [showLocationDialog, setShowLocationDialog] = useState<boolean>(false)
  const cameraRef = useRef<CameraView>(null)
  const watermarkRef = useRef<WatermarkedPhotoRef>(null)
  const navigation = useNavigation<CameraScreenNavigationProp>()
  const { addPhoto } = usePhotoContext()
  const { user } = useAuthContext()
  const [manualAddress, setManualAddress] = useState<string>("")
  const [currentOverlayData, setCurrentOverlayData] = useState<any>(null) // Store current overlay data

  // Create one date instance reused throughout render and takePicture
  const currentDate = new Date()
  const dateString = currentDate.toLocaleDateString() + " " + currentDate.toLocaleTimeString()

  useFocusEffect(
    useCallback(() => {
      setIsCameraReady(false)
      setCapturedPhotoUri(null)
      setCurrentOverlayData(null)
      setTimeout(() => {
        setIsCameraReady(true)
      }, 100)

      if (locationPermission) {
        getCurrentLocation()
      }

      return () => {}
    }, [locationPermission]),
  )

  useEffect(() => {
    requestPermissions()
  }, [])

  useEffect(() => {
    if (permission?.granted) {
      setIsCameraReady(true)
    }
  }, [permission])

  const requestPermissions = async (): Promise<void> => {
    try {
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync()
      setLocationPermission(locationStatus === "granted")

      if (locationStatus === "granted") {
        getCurrentLocation()
      } else {
        setLocationInfo({ fullAddress: "Location permission denied" })
        setLocationError(true)
      }
    } catch (error) {
      console.error("Error requesting permissions:", error)
      setLocationInfo({ fullAddress: "Location permission error" })
      setLocationError(true)
    }
  }

  const getLastKnownLocation = async () => {
    try {
      const lastLocation = await Location.getLastKnownPositionAsync({
        maxAge: 300000, // 5 minutes
      })
      if (lastLocation) {
        setLocation(lastLocation)
        const coords = `${lastLocation.coords.latitude.toFixed(4)}, ${lastLocation.coords.longitude.toFixed(4)}`
        setLocationInfo({
          city: "Last Known Location",
          fullAddress: coords,
        })
        setLocationError(false)
      }
    } catch (lastError) {
      console.error("Error getting last known location:", lastError)
    }
  }

  const getCurrentLocation = async (): Promise<void> => {
    try {
      setIsLocationActive(true)
      setLocationError(false)
      setLocationInfo({ fullAddress: "Getting location..." })

      // Use high accuracy and shorter timeout for faster response
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 10000, // 10 seconds timeout
        maximumAge: 60000, // Accept location up to 1 minute old
      })

      setLocation(currentLocation)

      try {
        const detailedInfo = await getDetailedLocationInfo(
          currentLocation.coords.latitude,
          currentLocation.coords.longitude,
        )
        setLocationInfo(detailedInfo)
        setIsLocationActive(false)
        setLocationError(false)
      } catch (error) {
        console.error("Error getting location details:", error)
        const coords = `${currentLocation.coords.latitude.toFixed(4)}, ${currentLocation.coords.longitude.toFixed(4)}`
        setLocationInfo({
          city: "Location Found",
          fullAddress: coords,
        })
        setIsLocationActive(false)
        setLocationError(false)
      }
    } catch (error) {
      console.error("Error getting location:", error)
      setIsLocationActive(false)
      setLocationError(true)
      setLocationInfo({ fullAddress: "Location not detected" })
      await getLastKnownLocation()
    }
  }

  const takePictureWithManualAddress = async (): Promise<void> => {
    setShowLocationDialog(false)

    if (cameraRef.current && !isTakingPhoto && isCameraReady) {
      setIsTakingPhoto(true)
      try {
        console.log("📸 Taking photo with manual address:", manualAddress.trim() || "No address")
        const photo = await cameraRef.current.takePictureAsync({
          quality: 1.0,
          base64: false,
          skipProcessing: false,
        })

        setCapturedPhotoUri(photo.uri)

        // Create overlay data with manual address or fallback
        const manualOverlayData = {
          city: manualAddress.trim() || "Location Unknown",
          street: undefined,
          coordinates: location
            ? `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`
            : "No GPS coordinates",
          date: dateString,
        }

        console.log("🏷️ Setting overlay data for watermark:", manualOverlayData)
        setCurrentOverlayData(manualOverlayData)

        setTimeout(async () => {
          try {
            if (watermarkRef.current) {
              console.log("🏷️ Creating watermark with manual overlay data...")
              const watermarkedUri = await watermarkRef.current.captureImage()
              console.log("✅ Watermarked image with manual address created:", watermarkedUri)

              const newPhoto = {
                uri: watermarkedUri,
                timestamp: currentDate.toISOString(),
                location: location
                  ? {
                      latitude: location.coords.latitude,
                      longitude: location.coords.longitude,
                    }
                  : undefined,
                cityInfo: manualAddress.trim() || "Location Unknown",
                streetInfo: undefined,
                userId: user?.id,
                watermarked: true,
                compressed: false,
                hasLocationData: !!location,
              }

              const photoId = await addPhoto(newPhoto)
              console.log("📱 Photo with manual address added:", photoId)

              // Reset states
              setCapturedPhotoUri(null)
              setCurrentOverlayData(null)
              setManualAddress("")

              navigation.navigate("PhotoDetail", { photoId })
            }
          } catch (error) {
            console.error("Error creating watermarked image with manual address:", error)
            setCapturedPhotoUri(null)
            setCurrentOverlayData(null)
          } finally {
            setIsTakingPhoto(false)
          }
        }, 500)
      } catch (error) {
        console.error("Error taking picture with manual location:", error)
        setIsTakingPhoto(false)
        setCapturedPhotoUri(null)
        setCurrentOverlayData(null)
      }
    }
  }

  const skipLocationEntry = async (): Promise<void> => {
    setShowLocationDialog(false)
    setManualAddress("")
    await takePicture(true)
  }

  const takePicture = async (forceWithoutLocation = false): Promise<void> => {
    // Check if location is available or if user wants to proceed without it
    const isLocationUnknown =
      !location ||
      locationError ||
      !locationInfo?.city ||
      locationInfo.city === "Location not detected" ||
      locationInfo.city === "Unknown Location" ||
      locationInfo.city === "Location Unknown" ||
      locationInfo.fullAddress === "Location not detected"

    if (!forceWithoutLocation && isLocationUnknown) {
      setShowLocationDialog(true)
      return
    }

    if (cameraRef.current && !isTakingPhoto && isCameraReady) {
      setIsTakingPhoto(true)
      try {
        console.log("📸 Taking high quality photo...")
        const photo = await cameraRef.current.takePictureAsync({
          quality: 1.0, // Maximum quality
          base64: false,
          skipProcessing: false, // Enable processing for better quality
        })

        console.log("📸 Photo taken, setting up for watermark capture...")

        // Set the captured photo URI to trigger watermark creation
        setCapturedPhotoUri(photo.uri)

        // Set current overlay data for normal photos
        const normalOverlayData = {
          city: locationError || !locationInfo?.city ? "Location Unknown" : locationInfo.city,
          street: locationInfo?.street,
          coordinates: location
            ? `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`
            : "No GPS coordinates",
          date: dateString,
        }
        setCurrentOverlayData(normalOverlayData)

        // Wait a moment for the WatermarkedPhoto component to render
        setTimeout(async () => {
          try {
            if (watermarkRef.current) {
              console.log("🏷️ Capturing watermarked image...")
              const watermarkedUri = await watermarkRef.current.captureImage()
              console.log("✅ Watermarked image captured:", watermarkedUri)

              const coordsString = location
                ? `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`
                : "Location not detected"

              const cityInfo =
                locationError || !locationInfo?.fullAddress ? "Location not detected" : locationInfo.fullAddress

              const newPhoto = {
                uri: watermarkedUri, // Use the ViewShot-captured watermarked image
                timestamp: currentDate.toISOString(),
                location: location
                  ? {
                      latitude: location.coords.latitude,
                      longitude: location.coords.longitude,
                    }
                  : undefined, // Changed from null to undefined to match interface
                cityInfo: cityInfo,
                streetInfo: locationInfo?.street,
                userId: user?.id,
                watermarked: true, // Flag to indicate this has visual watermark
                compressed: false, // High quality, not compressed
                hasLocationData: !locationError && !!location,
              }

              // addPhoto now returns the generated ID
              const photoId = await addPhoto(newPhoto)
              console.log("📱 Photo added to gallery with ID:", photoId)

              // Clear the captured photo URI
              setCapturedPhotoUri(null)
              setCurrentOverlayData(null)

              // Navigate using the returned ID
              navigation.navigate("PhotoDetail", { photoId })
            } else {
              throw new Error("Watermark ref not available")
            }
          } catch (error) {
            console.error("Error creating watermarked image:", error)
            // Don't show alert, just log error
            setCapturedPhotoUri(null)
            setCurrentOverlayData(null)
          } finally {
            setIsTakingPhoto(false)
          }
        }, 500) // Give time for component to render
      } catch (error) {
        console.error("Error taking picture:", error)
        // Don't show alert, just log error
        setIsTakingPhoto(false)
        setCapturedPhotoUri(null)
        setCurrentOverlayData(null)
      }
    }
  }

  const toggleCameraFacing = () => {
    setFacing((current) => (current === "back" ? "front" : "back"))
  }

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#b8860b" />
      </View>
    )
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Camera access is required to take photos</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Camera Permission</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const coordsString = location
    ? `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`
    : "Location not detected"

  const getDisplayLocation = () => {
    if (manualAddress.trim()) {
      return manualAddress.trim()
    }
    return locationError || !locationInfo?.city ? "Location not detected" : locationInfo.city
  }

  const overlayData = {
    city: getDisplayLocation(),
    street: locationInfo?.street,
    coordinates: coordsString,
    date: dateString,
  }

  // Use currentOverlayData if available (during photo capture), otherwise use preview overlayData
  const activeOverlayData = currentOverlayData || overlayData

  return (
    <View style={styles.container}>
      {isCameraReady && (
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
          onCameraReady={() => setIsCameraReady(true)}
        />
      )}

      {/* Location status */}
      <View style={styles.locationStatus}>
        {locationError ? (
          <AlertTriangle size={14} color="#ef4444" />
        ) : (
          <MapPin size={14} color={isLocationActive ? "#b8860b" : "#10b981"} />
        )}
        <Text
          style={[
            styles.locationStatusText,
            {
              color: locationError ? "#ef4444" : isLocationActive ? "#b8860b" : "#10b981",
            },
          ]}
        >
          {locationError ? "GPS Unavailable" : isLocationActive ? "GPS Searching" : "GPS Ready"}
        </Text>
      </View>

      {/* Preview overlay */}
      <View style={styles.previewOverlay}>
        <View style={styles.overlayBox}>
          <Text style={styles.overlayText}>📍 {overlayData.city}</Text>
          {overlayData.street && <Text style={styles.overlayText}>🏠 {overlayData.street}</Text>}
          <Text style={styles.overlayText}>🌐 {coordsString}</Text>
          <Text style={styles.overlayText}>📅 {dateString}</Text>
        </View>
      </View>

      {showLocationDialog && (
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogBox}>
            <AlertTriangle size={32} color="#f59e0b" />
            <Text style={styles.dialogTitle}>Location Not Available</Text>
            <Text style={styles.dialogText}>
              GPS location is not detected. You can enter the address manually or take the photo without location.
            </Text>

            <TextInput
              style={styles.addressInput}
              placeholder="Enter address (e.g., Main St, Downtown)"
              placeholderTextColor="#8a8a8a"
              value={manualAddress}
              onChangeText={setManualAddress}
              multiline={false}
              autoCapitalize="words"
              returnKeyType="done"
            />

            <View style={styles.dialogButtons}>
              <TouchableOpacity style={[styles.dialogButton, styles.cancelButton]} onPress={skipLocationEntry}>
                <Text style={styles.cancelButtonText}>Skip Location</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogButton, styles.confirmButton]}
                onPress={takePictureWithManualAddress}
              >
                <Text style={styles.confirmButtonText}>{manualAddress.trim() ? "Use Address" : "Take Photo"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Camera controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
          <RotateCcw size={24} color="#b8860b" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.captureButton, isTakingPhoto && styles.captureButtonDisabled]}
          onPress={() => takePicture()}
          disabled={isTakingPhoto || !isCameraReady}
        >
          {isTakingPhoto ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <CameraIcon size={32} color="#ffffff" />
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.refreshButton} onPress={getCurrentLocation}>
          <MapPin size={24} color="#b8860b" />
        </TouchableOpacity>
      </View>

      {/* Hidden WatermarkedPhoto component for capturing watermarked images */}
      {capturedPhotoUri && (
        <View style={styles.hiddenWatermarkContainer}>
          <WatermarkedPhoto ref={watermarkRef} imageUri={capturedPhotoUri} overlayData={activeOverlayData} />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#3a3a3a",
    padding: 20,
  },
  permissionText: {
    fontSize: 16,
    color: "#b8860b",
    textAlign: "center",
    marginBottom: 20,
    fontFamily: "Lato",
  },
  permissionButton: {
    backgroundColor: "#b8860b",
    padding: 15,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: "#3a3a3a",
    fontWeight: "bold",
    fontFamily: "Lato",
  },
  locationStatus: {
    position: "absolute",
    top: 50,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(58,58,58,0.9)",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#b8860b",
  },
  locationStatusText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: "500",
    fontFamily: "Lato",
  },
  previewOverlay: {
    position: "absolute",
    bottom: 140,
    left: 16,
    right: 16,
  },
  overlayBox: {
    backgroundColor: "rgba(58,58,58,0.9)",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#b8860b",
  },
  overlayText: {
    color: "#b8860b",
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
    fontFamily: "Lato",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  dialogOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  dialogBox: {
    backgroundColor: "#3a3a3a",
    borderRadius: 12,
    padding: 24,
    margin: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#b8860b",
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#b8860b",
    marginTop: 12,
    marginBottom: 8,
    fontFamily: "Lato",
  },
  dialogText: {
    fontSize: 14,
    color: "#b8860b",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
    fontFamily: "Lato",
  },
  dialogButtons: {
    flexDirection: "row",
    gap: 12,
  },
  dialogButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#8a8a8a",
  },
  confirmButton: {
    backgroundColor: "#b8860b",
  },
  cancelButtonText: {
    color: "#8a8a8a",
    fontWeight: "500",
    fontFamily: "Lato",
  },
  confirmButtonText: {
    color: "#3a3a3a",
    fontWeight: "bold",
    fontFamily: "Lato",
  },
  controlsContainer: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  flipButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(58,58,58,0.8)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#b8860b",
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#b8860b",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#ffffff",
  },
  captureButtonDisabled: {
    backgroundColor: "#8a8a8a",
  },
  refreshButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(58,58,58,0.8)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#b8860b",
  },
  hiddenWatermarkContainer: {
    position: "absolute",
    left: -9999,
    top: -9999,
    opacity: 0,
  },
  addressInput: {
    backgroundColor: "rgba(184,134,11,0.1)",
    borderWidth: 1,
    borderColor: "#b8860b",
    borderRadius: 8,
    padding: 12,
    color: "#b8860b",
    fontSize: 14,
    fontFamily: "Lato",
    marginVertical: 16,
    minWidth: 250,
    textAlign: "center",
  },
})
