"use client"

import { View, Text, Image, StyleSheet, Dimensions } from "react-native"
import ViewShot from "react-native-view-shot"
import { useRef, forwardRef, useImperativeHandle, useState, useEffect } from "react"
import * as FileSystem from "expo-file-system"

interface OverlayData {
  city: string
  coordinates: string
  date: string
  street?: string
}

interface WatermarkedPhotoProps {
  imageUri: string
  overlayData: OverlayData
  onCapture?: (uri: string) => void
}

export interface WatermarkedPhotoRef {
  captureImage: () => Promise<string>
}

const { width: screenWidth } = Dimensions.get("window")
const PHOTO_WIDTH = screenWidth - 40
const PHOTO_HEIGHT = (PHOTO_WIDTH * 4) / 3

const WatermarkedPhoto = forwardRef<WatermarkedPhotoRef, WatermarkedPhotoProps>(
  ({ imageUri, overlayData, onCapture }, ref) => {
    const viewShotRef = useRef<ViewShot>(null)
    const [isAlreadyWatermarked, setIsAlreadyWatermarked] = useState(false)

    useEffect(() => {
      checkIfWatermarked()
    }, [imageUri])

    const checkIfWatermarked = async () => {
      try {
        // Check if filename indicates it's already watermarked
        const filename = imageUri.split("/").pop() || ""
        const isWatermarkedFile =
          filename.includes("construction_photo_download_") ||
          filename.includes("watermarked_") ||
          filename.includes("_watermark")

        if (isWatermarkedFile) {
          console.log("Image already appears to be watermarked:", filename)
          setIsAlreadyWatermarked(true)
          return
        }

        // Check file info for additional clues
        const fileInfo = await FileSystem.getInfoAsync(imageUri)
        if (fileInfo.exists) {
          // If file is very recent (within last 30 seconds) and from our app directory,
          // it might be a freshly watermarked image
          const now = Date.now()
          const fileAge = now - (fileInfo.modificationTime || 0) * 1000
          const isFromAppDirectory = imageUri.includes(FileSystem.documentDirectory || "")

          if (isFromAppDirectory && fileAge < 30000) {
            console.log("Recently created image from app directory, likely watermarked")
            setIsAlreadyWatermarked(true)
            return
          }
        }

        setIsAlreadyWatermarked(false)
      } catch (error) {
        console.log("Error checking watermark status:", error)
        setIsAlreadyWatermarked(false)
      }
    }

    const captureImage = async (): Promise<string> => {
      try {
        if (!viewShotRef.current) {
          throw new Error("ViewShot ref not available")
        }

        // If already watermarked, just copy the original file
        if (isAlreadyWatermarked) {
          console.log("Image already watermarked, copying original...")
          const timestamp = Date.now()
          const filename = `construction_photo_download_${timestamp}.jpg`
          const newPath = `${FileSystem.documentDirectory}${filename}`

          await FileSystem.copyAsync({ from: imageUri, to: newPath })
          console.log("Watermarked image copied to:", newPath)

          if (onCapture) {
            onCapture(newPath)
          }

          return newPath
        }

        console.log("Creating new watermarked image...")
        if (!viewShotRef.current || !viewShotRef.current.capture) {
          throw new Error("ViewShot ref or capture method not available")
        }
        const uri = await viewShotRef.current.capture()
        console.log("Captured URI:", uri)

        const timestamp = Date.now()
        const filename = `construction_photo_download_${timestamp}.jpg`
        const newPath = `${FileSystem.documentDirectory}${filename}`

        await FileSystem.copyAsync({ from: uri, to: newPath })
        console.log("Watermarked image saved to:", newPath)

        if (onCapture) {
          onCapture(newPath)
        }

        return newPath
      } catch (error) {
        console.error("Error capturing watermarked image:", error)
        throw error
      }
    }

    useImperativeHandle(ref, () => ({
      captureImage,
    }))

    return (
      <ViewShot
        ref={viewShotRef}
        options={{
          format: "jpg",
          quality: 1.0,
          width: PHOTO_WIDTH * 2,
          height: PHOTO_HEIGHT * 2,
          result: "tmpfile",
        }}
        style={styles.container}
      >
        <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />

        {/* Only show watermark elements if not already watermarked */}
        {!isAlreadyWatermarked && (
          <>
            {/* Company watermark - top right */}
            <View style={styles.companyWatermark}>
              <Text style={styles.companyText}>A.M. Erdbau</Text>
              <Text style={styles.companySubtext}>Construction Photos</Text>
            </View>

            {/* Main overlay - bottom left */}
            <View style={styles.overlay}>
              <View style={styles.overlayRow}>
                <Text style={styles.overlayIcon}>📍</Text>
                <Text style={styles.overlayText} numberOfLines={1}>
                  {overlayData.city}
                </Text>
              </View>

              {overlayData.street && (
                <View style={styles.overlayRow}>
                  <Text style={styles.overlayIcon}>🏠</Text>
                  <Text style={styles.overlayText} numberOfLines={1}>
                    {overlayData.street}
                  </Text>
                </View>
              )}

              <View style={styles.overlayRow}>
                <Text style={styles.overlayIcon}>🌐</Text>
                <Text style={styles.overlayText} numberOfLines={1}>
                  {overlayData.coordinates}
                </Text>
              </View>

              <View style={styles.overlayRow}>
                <Text style={styles.overlayIcon}>📅</Text>
                <Text style={styles.overlayText} numberOfLines={1}>
                  {overlayData.date}
                </Text>
              </View>
            </View>

            {/* Copyright notice - bottom right corner */}
            <View style={styles.copyright}>
              <Text style={styles.copyrightText}>© 2025 A.M. Erdbau GmbH</Text>
            </View>
          </>
        )}

        {/* Show indicator if already watermarked */}
        {isAlreadyWatermarked && (
          <View style={styles.alreadyWatermarkedIndicator}>
            <Text style={styles.alreadyWatermarkedText}>✓ Already Watermarked</Text>
          </View>
        )}
      </ViewShot>
    )
  },
)

WatermarkedPhoto.displayName = "WatermarkedPhoto"

const styles = StyleSheet.create({
  container: {
    width: PHOTO_WIDTH,
    height: PHOTO_HEIGHT,
    backgroundColor: "#000",
  },
  companyWatermark: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(184, 134, 11, 0.3)",
  },
  companyText: {
    color: "#b8860b",
    fontSize: 12,
    fontWeight: "bold",
    fontFamily: "Lato",
    textShadowColor: "rgba(0, 0, 0, 0.9)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  companySubtext: {
    color: "#ffffff",
    fontSize: 8,
    opacity: 0.9,
    fontFamily: "Lato",
    textShadowColor: "rgba(0, 0, 0, 0.9)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  overlay: {
    position: "absolute",
    bottom: 35,
    left: 12,
    right: 80,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(184, 134, 11, 0.3)",
  },
  overlayRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },
  overlayIcon: {
    fontSize: 10,
    marginRight: 6,
    width: 14,
  },
  overlayText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "500",
    flex: 1,
    fontFamily: "Lato",
    textShadowColor: "rgba(0, 0, 0, 0.9)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  copyright: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  copyrightText: {
    color: "#b8860b",
    fontSize: 7,
    opacity: 0.8,
    fontFamily: "Lato",
    textShadowColor: "rgba(0, 0, 0, 0.9)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  alreadyWatermarkedIndicator: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(184, 134, 11, 0.9)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  alreadyWatermarkedText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "bold",
    fontFamily: "Lato",
  },
})

export default WatermarkedPhoto
