import * as FileSystem from "expo-file-system"
import { manipulateAsync, SaveFormat } from "expo-image-manipulator"
import { createWatermarkedImage } from "./imageUtils"

interface LocationUpdateData {
  newLocation: string
  originalLocation?: string
  coordinates?: string
  timestamp: string
}

/**
 * Create a new watermarked image with updated location overlay
 * This adds the new location on top of the existing image without removing the old watermark
 */
export const createLocationUpdatedImage = async (
  originalImageUri: string,
  locationUpdateData: LocationUpdateData,
): Promise<string> => {
  try {
    console.log("🏷️ Creating location-updated watermarked image...")

    // First, create a base watermarked image if it's not already watermarked
    const baseImageUri = originalImageUri

    // Create overlay data for the new location
    const overlayData = {
      city: locationUpdateData.newLocation,
      coordinates: locationUpdateData.coordinates || "Updated location",
      date: new Date(locationUpdateData.timestamp).toLocaleDateString("de-DE", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      street: "", // We'll extract this from the new location if possible
      isLocationUpdate: true,
      originalLocation: locationUpdateData.originalLocation,
    }

    // Parse the new location to separate city and street if possible
    const locationParts = locationUpdateData.newLocation.split(",").map((part) => part.trim())
    if (locationParts.length >= 2) {
      overlayData.street = locationParts[0]
      overlayData.city = locationParts[1]
    }

    // Create the watermarked image with new location
    const watermarkedUri = await createWatermarkedImage(baseImageUri, overlayData)

    // Create a special metadata file to indicate this is a location-updated image
    const timestamp = Date.now()
    const metadataPath = watermarkedUri.replace(".jpg", "_location_update_metadata.json")

    const updateMetadata = {
      isLocationUpdate: true,
      originalImageUri: originalImageUri,
      updatedImageUri: watermarkedUri,
      locationUpdate: {
        originalLocation: locationUpdateData.originalLocation,
        newLocation: locationUpdateData.newLocation,
        updatedAt: new Date().toISOString(),
        coordinates: locationUpdateData.coordinates,
      },
      overlayData: overlayData,
      updateReason: "User manually updated location information",
      preservedOriginal: true,
    }

    await FileSystem.writeAsStringAsync(metadataPath, JSON.stringify(updateMetadata, null, 2))

    console.log("✅ Location-updated watermarked image created:", watermarkedUri)
    return watermarkedUri
  } catch (error) {
    console.error("❌ Error creating location-updated image:", error)
    // Return original image if update fails
    return originalImageUri
  }
}

/**
 * Check if an image has been location-updated
 */
export const isLocationUpdatedImage = async (imageUri: string): Promise<boolean> => {
  try {
    const metadataPath = imageUri.replace(".jpg", "_location_update_metadata.json")
    const metadataExists = await FileSystem.getInfoAsync(metadataPath)
    return metadataExists.exists
  } catch (error) {
    return false
  }
}

/**
 * Get location update metadata
 */
export const getLocationUpdateMetadata = async (imageUri: string): Promise<any | null> => {
  try {
    const metadataPath = imageUri.replace(".jpg", "_location_update_metadata.json")
    const metadataExists = await FileSystem.getInfoAsync(metadataPath)

    if (metadataExists.exists) {
      const metadataJson = await FileSystem.readAsStringAsync(metadataPath)
      return JSON.parse(metadataJson)
    }

    return null
  } catch (error) {
    console.error("Error reading location update metadata:", error)
    return null
  }
}

/**
 * Create a visual indicator overlay for location updates
 * This creates a small "UPDATED" badge that can be overlaid on the image
 */
export const createLocationUpdateBadge = async (imageUri: string): Promise<string> => {
  try {
    console.log("🏷️ Adding location update badge...")

    // Add a small "LOCATION UPDATED" watermark in the top-right corner
    const result = await manipulateAsync(
      imageUri,
      [
        // We'll add a simple resize to trigger the manipulator
        // The actual badge would need to be added via canvas or similar
        { resize: { width: undefined, height: undefined } },
      ],
      {
        compress: 0.9,
        format: SaveFormat.JPEG,
      },
    )

    // For now, return the processed image
    // In a full implementation, you'd add a visual badge here
    return result.uri
  } catch (error) {
    console.error("Error adding location update badge:", error)
    return imageUri
  }
}
