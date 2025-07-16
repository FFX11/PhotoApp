"use client"

import { forwardRef, useImperativeHandle, useState, useEffect } from "react"
import { View, StyleSheet, Dimensions } from "react-native"
import { Canvas, Image, Text, useCanvasRef, useImage, Skia } from "@shopify/react-native-skia"
import * as FileSystem from "expo-file-system"

const { width: screenWidth } = Dimensions.get("window")

interface OverlayData {
  city: string
  coordinates: string
  date: string
  street?: string
  isLocationUpdate?: boolean
  originalLocation?: string
}

interface EnhancedWatermarkedPhotoProps {
  imageUri: string
  overlayData: OverlayData
  style?: any
}

export interface EnhancedWatermarkedPhotoRef {
  captureImage: () => Promise<string>
}

const EnhancedWatermarkedPhoto = forwardRef<EnhancedWatermarkedPhotoRef, EnhancedWatermarkedPhotoProps>(
  ({ imageUri, overlayData, style }, ref) => {
    const canvasRef = useCanvasRef()
    const image = useImage(imageUri)
    const [canvasSize, setCanvasSize] = useState({ width: screenWidth - 40, height: 300 })

    useImperativeHandle(ref, () => ({
      captureImage: async () => {
        try {
          if (!canvasRef.current) {
            throw new Error("Canvas not ready")
          }

          const snapshot = canvasRef.current.makeImageSnapshot()
          if (!snapshot) {
            throw new Error("Failed to create snapshot")
          }

          const data = snapshot.encodeToBase64()
          const timestamp = Date.now()
          const filename = `watermarked_photo_${timestamp}.jpg`
          const filePath = `${FileSystem.documentDirectory}${filename}`

          await FileSystem.writeAsStringAsync(filePath, data, {
            encoding: FileSystem.EncodingType.Base64,
          })

          console.log("📸 Watermarked image captured:", filePath)
          return filePath
        } catch (error) {
          console.error("Error capturing watermarked image:", error)
          throw error
        }
      },
    }))

    useEffect(() => {
      if (image) {
        const aspectRatio = image.height() / image.width()
        const newHeight = (screenWidth - 40) * aspectRatio
        setCanvasSize({ width: screenWidth - 40, height: newHeight })
      }
    }, [image])

    if (!image) {
      return <View style={[styles.container, style]} />
    }

    // Create overlay text lines
    const overlayLines = [
      `📍 ${overlayData.city}`,
      ...(overlayData.street ? [`🏠 ${overlayData.street}`] : []),
      `🌐 ${overlayData.coordinates}`,
      `📅 ${overlayData.date}`,
    ]

    // Add location update indicator if this is an updated location
    if (overlayData.isLocationUpdate && overlayData.originalLocation) {
      overlayLines.unshift(`🔄 LOCATION UPDATED`)
      overlayLines.push(`📍 Previous: ${overlayData.originalLocation}`)
    }

    // Create paint objects
    const backgroundPaint = Skia.Paint()
    backgroundPaint.setColor(Skia.Color("rgba(0, 0, 0, 0.8)"))

    const textPaint = Skia.Paint()
    textPaint.setColor(Skia.Color("white"))
    textPaint.setTextSize(16)

    const updateBadgePaint = Skia.Paint()
    updateBadgePaint.setColor(Skia.Color("rgba(255, 107, 53, 0.9)"))

    const updateTextPaint = Skia.Paint()
    updateTextPaint.setColor(Skia.Color("white"))
    updateTextPaint.setTextSize(12)

    return (
      <View style={[styles.container, style]}>
        <Canvas ref={canvasRef} style={{ width: canvasSize.width, height: canvasSize.height }}>
          {/* Draw the main image */}
          <Image image={image} x={0} y={0} width={canvasSize.width} height={canvasSize.height} fit="cover" />

          {/* Draw location update badge if applicable */}
          {overlayData.isLocationUpdate && (
            <>
              <Text x={canvasSize.width - 120} y={25} text="🔄 UPDATED" paint={updateBadgePaint} />
            </>
          )}

          {/* Draw main overlay background */}
          <Text x={15} y={canvasSize.height - 15 - overlayLines.length * 22} text="" paint={backgroundPaint} />

          {/* Draw overlay text lines */}
          {overlayLines.map((line, index) => (
            <Text
              key={index}
              x={20}
              y={canvasSize.height - 20 - (overlayLines.length - index - 1) * 22}
              text={line}
              paint={overlayData.isLocationUpdate && index === 0 ? updateTextPaint : textPaint}
            />
          ))}
        </Canvas>
      </View>
    )
  },
)

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#000",
    borderRadius: 8,
    overflow: "hidden",
  },
})

EnhancedWatermarkedPhoto.displayName = "EnhancedWatermarkedPhoto"

export default EnhancedWatermarkedPhoto
