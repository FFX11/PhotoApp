import * as FileSystem from "expo-file-system"
import { getOverlayMetadata } from "./imageUtils"

// Nextcloud configuration
const NEXTCLOUD_CONFIG = {
  baseUrl: "https://cloud.amerdbau.de",
  username: "admin",
  password: "admin",
  webdavPath: "/remote.php/dav/files/admin", // WebDAV endpoint for admin user
}

/**
 * Create a fetch request with timeout
 */
const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = 10000): Promise<Response> => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

/**
 * Create Basic Auth header for Nextcloud
 */
const createAuthHeader = (): string => {
  const credentials = `${NEXTCLOUD_CONFIG.username}:${NEXTCLOUD_CONFIG.password}`
  const encoded = btoa(credentials)
  return `Basic ${encoded}`
}

/**
 * Clean string for folder/file names
 */
const cleanForFilename = (str: string): string => {
  return str
    .replace(/[^a-zA-Z0-9\s\-_]/g, "") // Remove special characters
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .substring(0, 50) // Limit length
    .replace(/^_+|_+$/g, "") // Remove leading/trailing underscores
}

/**
 * Parse location string to get city and street
 */
const parseLocationInfo = (locationString: string): { city: string; street: string } => {
  if (!locationString) {
    return { city: "Unknown", street: "Unknown" }
  }

  // Split by comma and clean up
  const parts = locationString.split(",").map((part) => part.trim())

  if (parts.length >= 2) {
    // Assume first part is street/area, second is city
    return {
      street: cleanForFilename(parts[0]) || "Unknown",
      city: cleanForFilename(parts[1]) || "Unknown",
    }
  } else {
    // Only one part, treat as city
    return {
      city: cleanForFilename(parts[0]) || "Unknown",
      street: "Unknown",
    }
  }
}

/**
 * Check if Nextcloud server is reachable and credentials are valid
 */
export const checkNextcloudConnection = async (): Promise<boolean> => {
  try {
    console.log("🔍 Testing Nextcloud connection...")

    const response = await fetchWithTimeout(
      `${NEXTCLOUD_CONFIG.baseUrl}${NEXTCLOUD_CONFIG.webdavPath}/`,
      {
        method: "PROPFIND",
        headers: {
          Authorization: createAuthHeader(),
          "Content-Type": "application/xml",
          Depth: "0",
        },
      },
      10000, // 10 second timeout
    )

    console.log("📡 Connection test response status:", response.status)

    if (response.status === 207 || response.status === 200) {
      console.log("✅ Nextcloud connection successful")
      return true
    } else {
      console.log("❌ Nextcloud connection failed:", response.status, response.statusText)
      return false
    }
  } catch (error) {
    console.error("❌ Error checking Nextcloud connection:", error)
    return false
  }
}

/**
 * Create a folder in Nextcloud if it doesn't exist
 */
export const createNextcloudFolder = async (folderPath: string): Promise<boolean> => {
  try {
    console.log(`📁 Creating Nextcloud folder: ${folderPath}`)

    const response = await fetchWithTimeout(
      `${NEXTCLOUD_CONFIG.baseUrl}${NEXTCLOUD_CONFIG.webdavPath}/${folderPath}`,
      {
        method: "MKCOL",
        headers: {
          Authorization: createAuthHeader(),
        },
      },
      5000, // 5 second timeout
    )

    // 201 = created, 405 = already exists
    if (response.status === 201 || response.status === 405) {
      console.log(`✅ Folder ready: ${folderPath}`)
      return true
    } else {
      console.log(`❌ Failed to create folder: ${response.status} ${response.statusText}`)
      return false
    }
  } catch (error) {
    console.error("❌ Error creating Nextcloud folder:", error)
    return false
  }
}

/**
 * Upload a photo to Nextcloud server with enhanced folder structure
 */
export const uploadToNextcloud = async (
  photo: any,
  user: any,
  progressCallback: (progress: number) => void,
): Promise<void> => {
  try {
    console.log("🚀 Starting Nextcloud upload for photo:", photo.id)
    progressCallback(5)

    // Check connection first
    const isConnected = await checkNextcloudConnection()
    if (!isConnected) {
      throw new Error("Cannot connect to Nextcloud server")
    }
    progressCallback(15)

    // Parse location information
    const locationInfo = parseLocationInfo(photo.cityInfo || "")
    console.log("📍 Parsed location:", locationInfo)

    // Create folder structure: ConstructionPhotos/YYYY/MM/DD/City_Street/
    const date = new Date(photo.timestamp)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")

    const folderPath = `ConstructionPhotos/${year}/${month}/${day}/${locationInfo.city}_${locationInfo.street}`
    console.log("📂 Target folder path:", folderPath)

    // Create nested folder structure
    const folderParts = folderPath.split("/")
    let currentPath = ""

    for (let i = 0; i < folderParts.length; i++) {
      currentPath += (i > 0 ? "/" : "") + folderParts[i]
      await createNextcloudFolder(currentPath)
      progressCallback(15 + i * 10)
    }

    progressCallback(50)

    // Use the photo URI directly - it should already be watermarked from camera
    const imageToUpload = photo.uri
    console.log("📤 Uploading photo:", imageToUpload)

    // Check if the photo file exists and get its info
    const fileInfo = await FileSystem.getInfoAsync(imageToUpload)
    if (!fileInfo.exists) {
      throw new Error("Photo file not found at path: " + imageToUpload)
    }

    console.log(`📊 File exists, size: ${fileInfo.size} bytes`)
    progressCallback(55)

    // Create filename with timestamp
    const timestamp =
      date.toISOString().replace(/[:.]/g, "-").split("T")[0] +
      "_" +
      date.toTimeString().split(" ")[0].replace(/:/g, "-")

    const filename = `Construction_${locationInfo.city}_${timestamp}.jpg`
    const remotePath = `${folderPath}/${filename}`

    console.log(`📤 Uploading to: ${remotePath}`)
    progressCallback(65)

    // Read file as binary for upload
    const fileUri = imageToUpload
    console.log("📖 Reading file for upload...")
    progressCallback(75)

    console.log("📡 Sending file to Nextcloud...")
    progressCallback(85)

    // Upload file to Nextcloud
    const uploadResponse = await fetchWithTimeout(
      `${NEXTCLOUD_CONFIG.baseUrl}${NEXTCLOUD_CONFIG.webdavPath}/${remotePath}`,
      {
        method: "PUT",
        headers: {
          Authorization: createAuthHeader(),
          "Content-Type": "image/jpeg",
        },
        body: await fetch(fileUri).then((res) => res.blob()),
      },
      30000, // 30 second timeout for upload
    )

    progressCallback(90)

    if (uploadResponse.status === 201 || uploadResponse.status === 204) {
      console.log("✅ Photo uploaded successfully to Nextcloud")

      // Create comprehensive metadata including notes
      const metadata = await getOverlayMetadata(photo.uri).catch(() => null)
      const uploadMetadata = {
        // Photo Information
        photoId: photo.id,
        timestamp: photo.timestamp,
        uploadedAt: new Date().toISOString(),
        originalFilename: filename,
        fileSize: fileInfo.size,
        fileSizeMB: (fileInfo.size / 1024 / 1024).toFixed(2),

        // Location Information
        location: photo.location,
        cityInfo: photo.cityInfo,
        parsedLocation: locationInfo,
        coordinates: photo.location
          ? {
              latitude: photo.location.latitude,
              longitude: photo.location.longitude,
              accuracy: "GPS",
            }
          : null,

        // User Information
        uploadedBy: user?.name || "Unknown",
        userRole: user?.role || "unknown",

        // Notes and Content
        notes: photo.notes || "",
        hasNotes: !!(photo.notes && photo.notes.trim()),

        // Technical Information
        overlayMetadata: metadata,
        folderStructure: {
          year: year,
          month: month,
          day: day,
          city: locationInfo.city,
          street: locationInfo.street,
          fullPath: folderPath,
        },

        // Upload Information
        uploadMethod: "Construction Photo App",
        appVersion: "1.0.0",
        platform: "React Native",
      }

      // Upload metadata as JSON file
      const metadataFilename = `Construction_${locationInfo.city}_${timestamp}_metadata.json`
      const metadataPath = `${folderPath}/${metadataFilename}`

      await fetchWithTimeout(
        `${NEXTCLOUD_CONFIG.baseUrl}${NEXTCLOUD_CONFIG.webdavPath}/${metadataPath}`,
        {
          method: "PUT",
          headers: {
            Authorization: createAuthHeader(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(uploadMetadata, null, 2),
        },
        10000, // 10 second timeout
      )

      // Also upload notes as separate text file if they exist
      const notesFilename = `Construction_${locationInfo.city}_${timestamp}_notes.txt`
      if (photo.notes && photo.notes.trim()) {
        const notesPath = `${folderPath}/${notesFilename}`

        const notesContent = `Construction Photo Notes
========================
Photo ID: ${photo.id}
Date: ${new Date(photo.timestamp).toLocaleString("de-DE")}
Location: ${photo.cityInfo || "Unknown"}
Coordinates: ${photo.location ? `${photo.location.latitude}, ${photo.location.longitude}` : "Not available"}
Uploaded by: ${user?.name || "Unknown"}
Uploaded at: ${new Date().toLocaleString("de-DE")}

Notes:
------
${photo.notes}

Additional Information:
----------------------
- Photo taken with Construction Photo App
- GPS coordinates are exact location where photo was captured
- Notes were added by the user for additional context
- This file is automatically generated during upload process
`

        await fetchWithTimeout(
          `${NEXTCLOUD_CONFIG.baseUrl}${NEXTCLOUD_CONFIG.webdavPath}/${notesPath}`,
          {
            method: "PUT",
            headers: {
              Authorization: createAuthHeader(),
              "Content-Type": "text/plain; charset=utf-8",
            },
            body: notesContent,
          },
          10000, // 10 second timeout
        )

        console.log("📝 Notes uploaded as separate text file")
      }

      // Create a summary file for the entire upload
      const summaryFilename = `Construction_${locationInfo.city}_${timestamp}_SUMMARY.txt`
      const summaryPath = `${folderPath}/${summaryFilename}`

      const summaryContent = `CONSTRUCTION PHOTO UPLOAD SUMMARY
===================================

📸 PHOTO INFORMATION:
- Photo ID: ${photo.id}
- File Size: ${(fileInfo.size / 1024 / 1024).toFixed(2)} MB
- Upload Date: ${new Date().toLocaleString("de-DE")}
- Photo Date: ${new Date(photo.timestamp).toLocaleString("de-DE")}

📍 LOCATION INFORMATION:
- Location: ${photo.cityInfo || "Unknown"}
- GPS Coordinates: ${photo.location ? `${photo.location.latitude}, ${photo.location.longitude}` : "Not available"}
- City: ${locationInfo.city}
- Street/Area: ${locationInfo.street}

👤 USER INFORMATION:
- Uploaded by: ${user?.name || "Unknown"}
- User Role: ${user?.role || "unknown"}

📝 NOTES:
${photo.notes && photo.notes.trim() ? photo.notes : "No notes provided"}

📁 FILES UPLOADED:
- Main Photo: ${filename}
- Metadata: ${filename.replace(".jpg", "_metadata.json")}
${photo.notes && photo.notes.trim() ? `- Notes File: ${notesFilename}` : ""}
- Summary: ${summaryFilename}

🔧 TECHNICAL DETAILS:
- App Version: 1.0.0
- Platform: React Native
- Upload Method: Construction Photo App
- Folder Structure: ${folderPath}
`

      await fetchWithTimeout(
        `${NEXTCLOUD_CONFIG.baseUrl}${NEXTCLOUD_CONFIG.webdavPath}/${summaryPath}`,
        {
          method: "PUT",
          headers: {
            Authorization: createAuthHeader(),
            "Content-Type": "text/plain; charset=utf-8",
          },
          body: summaryContent,
        },
        10000, // 10 second timeout
      )

      console.log("📋 Upload summary created")

      progressCallback(100)
      console.log(`✅ Upload completed with full metadata - Size: ${(fileInfo.size / 1024 / 1024).toFixed(2)} MB`)
      console.log(`📂 Folder structure: ${folderPath}`)
      console.log(`📝 Notes included: ${!!(photo.notes && photo.notes.trim())}`)
    } else {
      const errorText = await uploadResponse.text().catch(() => "Unknown error")
      throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText} - ${errorText}`)
    }
  } catch (error) {
    console.error("❌ Error uploading to Nextcloud:", error)
    throw error
  }
}

/**
 * Get available storage space on Nextcloud server
 */
export const getNextcloudStorageInfo = async (): Promise<{ used: number; total: number }> => {
  try {
    console.log("📊 Getting Nextcloud storage info...")

    const response = await fetchWithTimeout(
      `${NEXTCLOUD_CONFIG.baseUrl}/ocs/v1.php/cloud/users/${NEXTCLOUD_CONFIG.username}`,
      {
        method: "GET",
        headers: {
          Authorization: createAuthHeader(),
          "OCS-APIRequest": "true",
          Accept: "application/json",
        },
      },
      5000, // 5 second timeout
    )

    if (response.ok) {
      const data = await response.json()
      const quota = data.ocs?.data?.quota

      if (quota) {
        return {
          used: quota.used || 0,
          total: quota.total || 0,
        }
      }
    }

    // Fallback values if API call fails
    return {
      used: 0,
      total: 0,
    }
  } catch (error) {
    console.error("❌ Error getting storage info:", error)
    return {
      used: 0,
      total: 0,
    }
  }
}

/**
 * List files in a Nextcloud directory
 */
export const listNextcloudFiles = async (folderPath = ""): Promise<string[]> => {
  try {
    console.log(`📂 Listing files in: ${folderPath}`)

    const response = await fetchWithTimeout(
      `${NEXTCLOUD_CONFIG.baseUrl}${NEXTCLOUD_CONFIG.webdavPath}/${folderPath}`,
      {
        method: "PROPFIND",
        headers: {
          Authorization: createAuthHeader(),
          "Content-Type": "application/xml",
          Depth: "1",
        },
      },
      10000, // 10 second timeout
    )

    if (response.status === 207) {
      const xmlText = await response.text()
      console.log("📋 Files listed successfully")

      // Parse XML response to extract file names
      const fileMatches = xmlText.match(/<d:href>([^<]+)<\/d:href>/g) || []
      const files = fileMatches
        .map((match) => match.replace(/<\/?d:href>/g, ""))
        .filter((href) => href.endsWith(".jpg") || href.endsWith(".jpeg"))
        .map((href) => href.split("/").pop() || "")
        .filter(Boolean)

      return files
    } else {
      console.log(`❌ Failed to list files: ${response.status}`)
      return []
    }
  } catch (error) {
    console.error("❌ Error listing files:", error)
    return []
  }
}

/**
 * Test upload with a small test file
 */
export const testNextcloudUpload = async (): Promise<boolean> => {
  try {
    console.log("🧪 Testing Nextcloud upload...")

    const testContent = JSON.stringify({
      test: true,
      timestamp: new Date().toISOString(),
      message: "Test upload from Construction Photo App",
    })

    const response = await fetchWithTimeout(
      `${NEXTCLOUD_CONFIG.baseUrl}${NEXTCLOUD_CONFIG.webdavPath}/test_upload.json`,
      {
        method: "PUT",
        headers: {
          Authorization: createAuthHeader(),
          "Content-Type": "application/json",
        },
        body: testContent,
      },
      10000, // 10 second timeout
    )

    if (response.status === 201 || response.status === 204) {
      console.log("✅ Test upload successful")
      return true
    } else {
      console.log(`❌ Test upload failed: ${response.status}`)
      return false
    }
  } catch (error) {
    console.error("❌ Test upload error:", error)
    return false
  }
}
