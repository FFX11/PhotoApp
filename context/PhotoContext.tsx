"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"

interface Location {
  latitude: number
  longitude: number
}

interface Photo {
  id: string
  uri: string
  timestamp: string
  location?: Location
  cityInfo?: string
  streetInfo?: string
  uploaded: boolean
  uploadedAt?: string
  notes?: string
  pendingUpload?: boolean
  userId?: string
  watermarked?: boolean
  compressed?: boolean
  hasLocationData?: boolean
}

interface PhotoContextType {
  photos: Photo[]
  addPhoto: (photo: Omit<Photo, "id" | "uploaded" | "pendingUpload">) => Promise<string>
  deletePhoto: (id: string) => Promise<void>
  markAsUploaded: (id: string) => Promise<void>
  markForUpload: (id: string) => Promise<void>
  unmarkForUpload: (id: string) => Promise<void>
  updatePhotoNotes: (id: string, notes: string) => Promise<void>
  updatePhotoLocation: (id: string, location: string) => Promise<void>
  updatePhotoUri: (id: string, newUri: string) => Promise<void> // New function to update photo URI
  clearAllPhotos: () => Promise<void>
}

const PhotoContext = createContext<PhotoContextType | undefined>(undefined)

export function PhotoProvider({ children }: { children: ReactNode }) {
  const [photos, setPhotos] = useState<Photo[]>([])

  useEffect(() => {
    loadPhotos()
  }, [])

  const loadPhotos = async () => {
    try {
      const storedPhotos = await AsyncStorage.getItem("photos")
      if (storedPhotos) {
        setPhotos(JSON.parse(storedPhotos))
      }
    } catch (error) {
      console.error("Error loading photos:", error)
    }
  }

  const savePhotos = async (newPhotos: Photo[]) => {
    try {
      await AsyncStorage.setItem("photos", JSON.stringify(newPhotos))
      setPhotos(newPhotos)
    } catch (error) {
      console.error("Error saving photos:", error)
    }
  }

  const addPhoto = async (photo: Omit<Photo, "id" | "uploaded" | "pendingUpload">): Promise<string> => {
    const photoId = Date.now().toString()
    const newPhoto: Photo = {
      ...photo,
      id: photoId,
      uploaded: false,
      pendingUpload: false,
    }
    const newPhotos = [newPhoto, ...photos]
    await savePhotos(newPhotos)
    return photoId
  }

  const deletePhoto = async (id: string) => {
    const newPhotos = photos.filter((photo) => photo.id !== id)
    await savePhotos(newPhotos)
  }

  const markAsUploaded = async (id: string) => {
    const newPhotos = photos.map((photo) =>
      photo.id === id
        ? {
            ...photo,
            uploaded: true,
            uploadedAt: new Date().toISOString(),
            pendingUpload: false,
          }
        : photo,
    )
    await savePhotos(newPhotos)
  }

  const markForUpload = async (id: string) => {
    const newPhotos = photos.map((photo) => (photo.id === id ? { ...photo, pendingUpload: true } : photo))
    await savePhotos(newPhotos)
  }

  const unmarkForUpload = async (id: string) => {
    const newPhotos = photos.map((photo) => (photo.id === id ? { ...photo, pendingUpload: false } : photo))
    await savePhotos(newPhotos)
  }

  const updatePhotoNotes = async (id: string, notes: string) => {
    const newPhotos = photos.map((photo) => (photo.id === id ? { ...photo, notes } : photo))
    await savePhotos(newPhotos)
  }

  const updatePhotoLocation = async (id: string, location: string) => {
    const newPhotos = photos.map((photo) => (photo.id === id ? { ...photo, cityInfo: location } : photo))
    await savePhotos(newPhotos)
  }

  const updatePhotoUri = async (id: string, newUri: string) => {
    const newPhotos = photos.map((photo) => (photo.id === id ? { ...photo, uri: newUri } : photo))
    await savePhotos(newPhotos)
    console.log("✅ Photo URI updated in context:", id, "->", newUri)
  }

  const clearAllPhotos = async () => {
    try {
      await AsyncStorage.removeItem("photos")
      setPhotos([])
      console.log("✅ All photos cleared successfully")
    } catch (error) {
      console.error("❌ Error clearing photos:", error)
      throw error
    }
  }

  return (
    <PhotoContext.Provider
      value={{
        photos,
        addPhoto,
        deletePhoto,
        markAsUploaded,
        markForUpload,
        unmarkForUpload,
        updatePhotoNotes,
        updatePhotoLocation,
        updatePhotoUri,
        clearAllPhotos,
      }}
    >
      {children}
    </PhotoContext.Provider>
  )
}

export function usePhotoContext() {
  const context = useContext(PhotoContext)
  if (context === undefined) {
    throw new Error("usePhotoContext must be used within a PhotoProvider")
  }
  return context
}
