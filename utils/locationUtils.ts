import * as Location from "expo-location"

interface LocationInfo {
  city: string
  street?: string
  fullAddress: string
}

/**
 * Reverse geocode coordinates to get detailed location information including street
 */
export const reverseGeocode = async (latitude: number, longitude: number): Promise<string> => {
  try {
    const location = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    })

    if (location && location.length > 0) {
      const address = location[0]
      const { city, region, country, district, subregion, street, streetNumber, name } = address

      // Build street address
      let streetAddress = ""
      if (street) {
        streetAddress = streetNumber ? `${street} ${streetNumber}` : street
      } else if (name) {
        streetAddress = name
      }

      // Try different combinations to get the best location description
      if (city && country) {
        return streetAddress ? `${streetAddress}, ${city}, ${country}` : `${city}, ${country}`
      } else if (district && country) {
        return streetAddress ? `${streetAddress}, ${district}, ${country}` : `${district}, ${country}`
      } else if (region && country) {
        return streetAddress ? `${streetAddress}, ${region}, ${country}` : `${region}, ${country}`
      } else if (subregion && country) {
        return streetAddress ? `${streetAddress}, ${subregion}, ${country}` : `${subregion}, ${country}`
      } else if (country) {
        return streetAddress ? `${streetAddress}, ${country}` : country
      }
    }

    // Fallback to coordinates if no location data
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
  } catch (error) {
    console.error("Error reverse geocoding:", error)
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
  }
}

/**
 * Get detailed location information including street
 */
export const getDetailedLocationInfo = async (latitude: number, longitude: number): Promise<LocationInfo> => {
  try {
    const location = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    })

    if (location && location.length > 0) {
      const address = location[0]
      const { city, region, country, district, subregion, street, streetNumber, name } = address

      // Build street address
      let streetAddress = ""
      if (street) {
        streetAddress = streetNumber ? `${street} ${streetNumber}` : street
      } else if (name) {
        streetAddress = name
      }

      // Build city name
      const cityName = city || district || region || subregion || "Unknown Location"

      // Build full address
      let fullAddress = ""
      if (streetAddress && cityName && country) {
        fullAddress = `${streetAddress}, ${cityName}, ${country}`
      } else if (cityName && country) {
        fullAddress = `${cityName}, ${country}`
      } else if (country) {
        fullAddress = country
      } else {
        fullAddress = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
      }

      return {
        city: cityName,
        street: streetAddress || undefined,
        fullAddress: fullAddress,
      }
    }

    // Fallback to coordinates if no location data
    const coordsString = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
    return {
      city: "Unknown Location",
      fullAddress: coordsString,
    }
  } catch (error) {
    console.error("Error getting detailed location info:", error)
    const coordsString = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
    return {
      city: "Unknown Location",
      fullAddress: coordsString,
    }
  }
}

/**
 * Get the current location with high accuracy
 */
export const getCurrentLocation = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync()

    if (status !== "granted") {
      throw new Error("Location permission not granted")
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    })

    return location
  } catch (error) {
    console.error("Error getting current location:", error)
    throw error
  }
}
