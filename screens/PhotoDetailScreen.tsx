"use client"

import { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { useRoute, useNavigation } from "@react-navigation/native"
import { usePhotoContext } from "../context/PhotoContext"
import { useAuthContext } from "../context/AuthContext"
import {
  MapPin,
  Calendar,
  Upload,
  Trash2,
  Share as ShareIcon,
  Download,
  Maximize2,
  Edit3,
  Save,
  X,
  Map,
} from "lucide-react-native"
import { format } from "date-fns"
import * as MediaLibrary from "expo-media-library"
import WatermarkedPhoto, { type WatermarkedPhotoRef } from "../components/WatermarkedPhoto"
import { getOverlayMetadata } from "../utils/imageUtils"
import type { RouteProp } from "@react-navigation/native"
import type { NavigationProp } from "@react-navigation/native"
import type { RootStackParamList } from "../types/navigation"

type PhotoDetailRouteProp = RouteProp<RootStackParamList, "PhotoDetail">
type PhotoDetailNavigationProp = NavigationProp<RootStackParamList>

export default function PhotoDetailScreen() {
  const route = useRoute<PhotoDetailRouteProp>()
  const navigation = useNavigation<PhotoDetailNavigationProp>()
  const { photoId } = route.params
  const { photos, deletePhoto, markForUpload, updatePhotoNotes, updatePhotoLocation } = usePhotoContext()
  const { user } = useAuthContext()
  const [photo, setPhoto] = useState<any>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [showFullView, setShowFullView] = useState(false)
  const [overlayData, setOverlayData] = useState<any>(null)
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [isEditingLocation, setIsEditingLocation] = useState(false)
  const [notesText, setNotesText] = useState("")
  const [tempNotes, setTempNotes] = useState("")
  const [locationText, setLocationText] = useState("")
  const [tempLocation, setTempLocation] = useState("")
  const [originalLocation, setOriginalLocation] = useState("")
  const watermarkedPhotoRef = useRef<WatermarkedPhotoRef>(null)

  useEffect(() => {
    const foundPhoto = photos.find((p) => p.id === photoId)
    setPhoto(foundPhoto)
    setNotesText(foundPhoto?.notes || "")
    setLocationText(foundPhoto?.cityInfo || "")

    // Store original location for comparison
    if (foundPhoto?.cityInfo) {
      setOriginalLocation(foundPhoto.cityInfo)
    }

    if (foundPhoto) {
      loadOverlayData(foundPhoto.uri, foundPhoto)
    }
  }, [photoId, photos])

  const loadOverlayData = async (imageUri: string, photoObj?: any) => {
    try {
      const metadata = await getOverlayMetadata(imageUri)

      if (metadata?.overlayData) {
        setOverlayData(metadata.overlayData)
      } else {
        const initialLocation = photoObj?.cityInfo || "Unknown Location"
        setOverlayData({
          city: initialLocation,
          coordinates: photoObj?.location
            ? `${photoObj.location.latitude.toFixed(6)}, ${photoObj.location.longitude.toFixed(6)}`
            : "No coordinates",
          date: photoObj?.timestamp ? format(new Date(photoObj.timestamp), "PPP p") : "Unknown date",
          isLocationEdited: false,
          originalLocation: initialLocation,
        })
      }
    } catch (error) {
      console.error("Error loading overlay data:", error)
    }
  }

  const handleEditNotes = () => {
    setTempNotes(notesText)
    setIsEditingNotes(true)
  }

  const handleSaveNotes = async () => {
    try {
      await updatePhotoNotes(photo.id, tempNotes)
      setNotesText(tempNotes)
      setIsEditingNotes(false)
      Alert.alert("Success", "Notes saved successfully!")
    } catch (error) {
      Alert.alert("Error", "Failed to save notes. Please try again.")
    }
  }

  const handleCancelEditNotes = () => {
    setTempNotes(notesText)
    setIsEditingNotes(false)
  }

  const handleEditLocation = () => {
    setTempLocation(locationText)
    setIsEditingLocation(true)
  }

  const handleSaveLocation = async () => {
    try {
      // First update the photo context
      await updatePhotoLocation(photo.id, tempLocation)

      // Check if location actually changed from original unknown state
      const wasUnknown =
        !originalLocation ||
        originalLocation === "Location not detected" ||
        originalLocation === "Unknown Location" ||
        originalLocation === "Location Unknown"

      const isNowValid = tempLocation && tempLocation.trim() !== ""
      const locationChanged = wasUnknown && isNowValid

      // Update overlay data for watermark
      if (overlayData) {
        setOverlayData({
          ...overlayData,
          city: tempLocation || "Location Unknown",
          isLocationEdited: locationChanged,
          originalLocation: originalLocation,
        })
      }

      setLocationText(tempLocation)
      setIsEditingLocation(false)

      if (locationChanged) {
        Alert.alert(
          "Success",
          "Location updated! The watermark now shows your custom location with a '✓ Location Updated' indicator.",
        )
      } else {
        Alert.alert("Success", "Location updated successfully!")
      }
    } catch (error) {
      Alert.alert("Error", "Failed to update location. Please try again.")
    }
  }

  const handleCancelEditLocation = () => {
    setTempLocation(locationText)
    setIsEditingLocation(false)
  }

  const handleOpenMap = () => {
    navigation.navigate("Map")
  }

  if (!photo) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Photo not found</Text>
      </View>
    )
  }

  const handleDelete = () => {
    const uploadDate = photo.uploadedAt ? new Date(photo.uploadedAt) : null
    const now = new Date()
    const hoursSinceUpload = uploadDate ? (now.getTime() - uploadDate.getTime()) / (1000 * 60 * 60) : 0

    const canDelete =
      user?.role === "admin" ||
      user?.role === "super" ||
      (user?.role === "normal" && (!photo.uploaded || hoursSinceUpload < 24))

    if (!canDelete) {
      Alert.alert("Permission Denied", "You can only delete photos within 24 hours of uploading.")
      return
    }

    Alert.alert("Delete Photo", "Are you sure you want to delete this photo?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deletePhoto(photo.id)
          navigation.goBack()
        },
      },
    ])
  }

  const handleMarkForUpload = () => {
    markForUpload(photo.id)
    Alert.alert(
      "Marked for Upload",
      "This photo will be uploaded when you go to the Upload screen with an internet connection.",
    )
  }

  const handleShare = async () => {
    try {
      await Share.share({
        url: photo.uri,
        message: `Photo taken at ${photo.cityInfo} on ${format(new Date(photo.timestamp), "PPP")}`,
      })
    } catch (error) {
      Alert.alert("Error", "Failed to share photo")
    }
  }

  const handleDownload = async () => {
    if (!user || (user.role !== "admin" && user.role !== "super")) {
      Alert.alert("Permission Denied", "Only admin and super users can download photos.")
      return
    }

    setIsDownloading(true)
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync()

      if (status !== "granted") {
        Alert.alert("Permission Required", "Please grant media library access to download photos.")
        return
      }

      let imageToSave = photo.uri

      if (overlayData && watermarkedPhotoRef.current) {
        try {
          imageToSave = await watermarkedPhotoRef.current.captureImage()
          console.log("Using watermarked version for download:", imageToSave)
        } catch (error) {
          console.error("Error creating watermarked version, using original:", error)
        }
      }

      const asset = await MediaLibrary.createAssetAsync(imageToSave)

      let album = await MediaLibrary.getAlbumAsync("Construction Photos")
      if (!album) {
        album = await MediaLibrary.createAlbumAsync("Construction Photos", asset, false)
      } else {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false)
      }

      Alert.alert("Success", "Photo downloaded to your gallery!\nSaved in: Construction Photos")
    } catch (error) {
      console.error("Error downloading photo:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      Alert.alert("Error", `Failed to download photo: ${errorMessage}`)
    } finally {
      setIsDownloading(false)
    }
  }

  const toggleFullView = () => {
    setShowFullView(!showFullView)
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          {showFullView ? (
            <View style={styles.fullViewContainer}>
              <WatermarkedPhoto ref={watermarkedPhotoRef} imageUri={photo.uri} overlayData={overlayData} />
            </View>
          ) : (
            <Image source={{ uri: photo.uri }} style={styles.image} />
          )}
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <Calendar size={20} color="#64748b" />
            <Text style={styles.infoText}>{format(new Date(photo.timestamp), "PPP p")}</Text>
          </View>

          {/* Editable Location Section */}
          <View style={styles.infoRow}>
            <MapPin size={20} color="#64748b" />
            <View style={styles.locationContainer}>
              {isEditingLocation ? (
                <View style={styles.editLocationContainer}>
                  <TextInput
                    style={styles.locationInput}
                    value={tempLocation}
                    onChangeText={setTempLocation}
                    placeholder="Enter location (e.g., Munich, Bavaria, Germany)"
                    placeholderTextColor="#94a3b8"
                  />
                  <View style={styles.locationActions}>
                    <TouchableOpacity style={styles.cancelButton} onPress={handleCancelEditLocation}>
                      <X size={14} color="#ef4444" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveLocationButton} onPress={handleSaveLocation}>
                      <Save size={14} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.locationDisplay}>
                  <Text style={styles.infoText}>
                    {locationText && locationText !== "Location not detected" && locationText !== "Unknown Location"
                      ? locationText
                      : "Tap to add location"}
                  </Text>
                  <TouchableOpacity style={styles.editLocationIcon} onPress={handleEditLocation}>
                    <Edit3 size={14} color="#64748b" />
                  </TouchableOpacity>
                </View>
              )}
              {photo.location && (
                <Text style={styles.coordsText}>
                  GPS: {photo.location.latitude.toFixed(6)}, {photo.location.longitude.toFixed(6)}
                </Text>
              )}
              {overlayData?.isLocationEdited && (
                <View style={styles.editedIndicator}>
                  <Text style={styles.editedIndicatorText}>✓ Location updated - visible on watermark</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.statusContainer}>
            <Text style={styles.statusLabel}>Status:</Text>
            {photo.uploaded ? (
              <View style={styles.uploadedBadge}>
                <Text style={styles.uploadedText}>Uploaded</Text>
                {photo.uploadedAt && (
                  <Text style={styles.uploadedDate}>on {format(new Date(photo.uploadedAt), "PPP")}</Text>
                )}
              </View>
            ) : (
              <View style={styles.notUploadedBadge}>
                <Text style={styles.notUploadedText}>Not Uploaded</Text>
              </View>
            )}
          </View>

          {/* Notes Section */}
          <View style={styles.notesContainer}>
            <View style={styles.notesHeader}>
              <Text style={styles.notesLabel}>Notes:</Text>
              {!isEditingNotes && (
                <TouchableOpacity style={styles.editButton} onPress={handleEditNotes}>
                  <Edit3 size={16} color="#64748b" />
                </TouchableOpacity>
              )}
            </View>

            {isEditingNotes ? (
              <View style={styles.editNotesContainer}>
                <TextInput
                  style={styles.notesInput}
                  value={tempNotes}
                  onChangeText={setTempNotes}
                  placeholder="Add your notes here..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  autoFocus
                />
                <View style={styles.notesActions}>
                  <TouchableOpacity style={styles.cancelButton} onPress={handleCancelEditNotes}>
                    <X size={16} color="#ef4444" />
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveButton} onPress={handleSaveNotes}>
                    <Save size={16} color="#ffffff" />
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.notesDisplay}>
                <Text style={styles.notesText}>
                  {notesText || "No notes added yet. Tap the edit icon to add notes."}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionButton, styles.fullViewButton]} onPress={toggleFullView}>
              <Maximize2 size={18} color="#ffffff" />
              <Text style={styles.actionButtonText}>{showFullView ? "Normal View" : "Full View"}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionButton, styles.mapButton]} onPress={handleOpenMap}>
              <Map size={18} color="#ffffff" />
              <Text style={styles.actionButtonText}>View Map</Text>
            </TouchableOpacity>

            {!photo.uploaded && (
              <TouchableOpacity style={[styles.actionButton, styles.uploadButton]} onPress={handleMarkForUpload}>
                <Upload size={18} color="#ffffff" />
                <Text style={styles.actionButtonText}>Upload</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.actionRow}>
            {(user?.role === "admin" || user?.role === "super") && (
              <TouchableOpacity
                style={[styles.actionButton, styles.downloadButton]}
                onPress={handleDownload}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <ActivityIndicator size={18} color="#ffffff" />
                ) : (
                  <Download size={18} color="#ffffff" />
                )}
                <Text style={styles.actionButtonText}>{isDownloading ? "Downloading" : "Download"}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={[styles.actionButton, styles.shareButton]} onPress={handleShare}>
              <ShareIcon size={18} color="#ffffff" />
              <Text style={styles.actionButtonText}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={handleDelete}>
              <Trash2 size={18} color="#ffffff" />
              <Text style={styles.actionButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hidden watermarked photo for download purposes */}
        {overlayData && !showFullView && (
          <View style={styles.hiddenWatermarked}>
            <WatermarkedPhoto ref={watermarkedPhotoRef} imageUri={photo.uri} overlayData={overlayData} />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollContainer: {
    flex: 1,
  },
  imageContainer: {
    position: "relative",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: 300,
    resizeMode: "cover",
  },
  fullViewContainer: {
    padding: 20,
    backgroundColor: "#000",
  },
  hiddenWatermarked: {
    position: "absolute",
    left: -9999,
    top: -9999,
    opacity: 0,
  },
  infoContainer: {
    padding: 16,
    backgroundColor: "#ffffff",
    margin: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  infoText: {
    fontSize: 16,
    color: "#1e293b",
    marginLeft: 12,
    flex: 1,
  },
  locationContainer: {
    marginLeft: 12,
    flex: 1,
  },
  locationDisplay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  editLocationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  locationInput: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    color: "#1e293b",
  },
  locationActions: {
    flexDirection: "row",
    gap: 4,
  },
  editLocationIcon: {
    padding: 4,
  },
  saveLocationButton: {
    backgroundColor: "#10b981",
    borderRadius: 4,
    padding: 6,
  },
  coordsText: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
  },
  editedIndicator: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 6,
  },
  editedIndicatorText: {
    color: "#10b981",
    fontSize: 12,
    fontWeight: "500",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 16,
    color: "#1e293b",
    marginRight: 12,
  },
  uploadedBadge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  uploadedText: {
    color: "#10b981",
    fontWeight: "500",
  },
  uploadedDate: {
    color: "#10b981",
    fontSize: 12,
  },
  notUploadedBadge: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  notUploadedText: {
    color: "#f59e0b",
    fontWeight: "500",
  },
  notesContainer: {
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 16,
  },
  notesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  notesLabel: {
    fontSize: 16,
    color: "#1e293b",
    fontWeight: "500",
  },
  editButton: {
    padding: 4,
  },
  notesDisplay: {
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  notesText: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
    fontStyle: "italic",
  },
  editNotesContainer: {
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  notesInput: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    color: "#1e293b",
    minHeight: 120,
    marginBottom: 12,
  },
  notesActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  cancelButtonText: {
    color: "#ef4444",
    fontSize: 12,
    marginLeft: 4,
    fontWeight: "500",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "#10b981",
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 12,
    marginLeft: 4,
    fontWeight: "500",
  },
  actionsContainer: {
    padding: 16,
  },
  actionRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 8,
    marginHorizontal: 6,
  },
  fullViewButton: {
    backgroundColor: "#6366f1",
  },
  mapButton: {
    backgroundColor: "#059669",
  },
  uploadButton: {
    backgroundColor: "#0284c7",
  },
  shareButton: {
    backgroundColor: "#8b5cf6",
  },
  deleteButton: {
    backgroundColor: "#ef4444",
  },
  downloadButton: {
    backgroundColor: "#10b981",
  },
  actionButtonText: {
    color: "#ffffff",
    fontWeight: "500",
    marginLeft: 6,
    fontSize: 13,
  },
  errorText: {
    fontSize: 16,
    color: "#ef4444",
    textAlign: "center",
    marginTop: 20,
  },
})
