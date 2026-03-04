// services/navigationService.js

// Major cities (Tamil Nadu + Bangalore + Missing towns)
const CITY_COORDS = {
  Chennai: { lat: 13.0827, lng: 80.2707 },
  Coimbatore: { lat: 11.0168, lng: 76.9558 },
  Madurai: { lat: 9.9252, lng: 78.1198 },
  Trichy: { lat: 10.7905, lng: 78.7047 },
  Salem: { lat: 11.6643, lng: 78.146 },
  Dindigul: { lat: 10.367, lng: 77.9803 },
  Thanjavur: { lat: 10.787, lng: 79.1378 },
  Hosur: { lat: 12.7406, lng: 77.8253 },
  Nagercoil: { lat: 8.1773, lng: 77.434 },
  Kanchipuram: { lat: 12.8342, lng: 79.7036 },
  Kanyakumari: { lat: 8.0883, lng: 77.5385 },
  Karaikudi: { lat: 10.0667, lng: 78.7833 },
  Cuddalore: { lat: 11.7447, lng: 79.768 },
  Kumbakonam: { lat: 10.9595, lng: 79.3881 },
  Tiruppur: { lat: 11.1085, lng: 77.3411 },
  Ooty: { lat: 11.4102, lng: 76.695 },
  Yercaud: { lat: 11.78, lng: 78.2036 },
  Rameswaram: { lat: 9.288, lng: 79.3127 },
  Kodaikanal: { lat: 10.2381, lng: 77.4892 },
  Bangalore: { lat: 12.9716, lng: 77.5946 },

  // ✅ Added missing towns
  Erode: { lat: 11.341, lng: 77.7172 },
  Dharapuram: { lat: 10.7383, lng: 77.532 },
  Villupuram: { lat: 11.939, lng: 79.493 },
  Tirunelveli: { lat: 8.7139, lng: 77.7567 },
  Tuticorin: { lat: 8.7642, lng: 78.1348 },
};

// Geocoding function
const geocodeLocation = async (locationName) => {
  // Check known cities
  const knownCity = CITY_COORDS[locationName];
  if (knownCity) {
    return {
      lat: knownCity.lat,
      lng: knownCity.lng,
      address: `${locationName}, India`,
    };
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        locationName + ", India"
      )}&limit=1`
    );
    const data = await response.json();

    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        address: data[0].display_name,
      };
    }
  } catch (error) {
    console.error("Geocoding error:", error);
  }

  // throw error if location not found
  throw new Error(`Location "${locationName}" could not be identified.`);
};

export const generateRoute = async (
  fromLocation,
  toLocation,
  transportMode
) => {
  try {
    const [from, to] = await Promise.all([
      geocodeLocation(fromLocation),
      geocodeLocation(toLocation),
    ]);

    const osrmProfiles = {
      car: "driving",
      bus: "driving",
      train: "driving",
      walk: "walking",
      bike: "cycling",
    };

    const profile = osrmProfiles[transportMode] || "driving";

    const response = await fetch(
      `https://router.project-osrm.org/route/v1/${profile}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`
    );

    const data = await response.json();

    if (data.code !== "Ok") {
      throw new Error("Routing failed: " + data.message);
    }

    const distance = data.routes[0].distance / 1000;
    const duration = Math.round(data.routes[0].duration / 60);

    const directions = data.routes[0].geometry.coordinates.map(([lng, lat]) => [
      lat,
      lng,
    ]);

    return { from, to, transportMode, duration, distance, directions };
  } catch (error) {
    console.error("Error generating route:", error);

    // fallback
    const [from, to] = await Promise.all([
      geocodeLocation(fromLocation),
      geocodeLocation(toLocation),
    ]);

    return {
      from,
      to,
      transportMode,
      duration: 60,
      distance: 50,
      directions: [
        [from.lat, from.lng],
        [to.lat, to.lng],
      ],
      isFallback: true,
    };
  }
};

// New function for safety-zoned map
export const generateSafetyRoute = async (
  fromLocation,
  toLocation,
  transportMode
) => {
  try {
    const url = `http://localhost:5000/generate_route?from=${encodeURIComponent(
      fromLocation
    )}&to=${encodeURIComponent(toLocation)}&mode=${encodeURIComponent(
      transportMode
    )}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to generate safety route");
    }
    return await response.text(); // Returns the map HTML
  } catch (error) {
    console.error("Error generating safety route:", error);
    return "<html><body><h1>Failed to generate safety route. Please try again.</h1></body></html>";
  }
};

// services/navigationService.js

// [Keep existing CITY_COORDS, geocodeLocation, and generateRoute as is]

// New function to generate and save safety route
export const generateAndSaveSafetyRoute = async (fromLocation, toLocation, transportMode) => {
  try {
    const url = `http://localhost:5000/generate_and_save_route?from=${encodeURIComponent(fromLocation)}&to=${encodeURIComponent(toLocation)}&mode=${encodeURIComponent(transportMode)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to generate and save safety route');
    }
    const filename = await response.text(); // Returns the filename (e.g., "safety_route_123.html")
    return filename; // Return the filename to use in the iframe src
  } catch (error) {
    console.error("Error generating and saving safety route:", error);
    return null;
  }
};

// [Keep existing generateRoute as is]
