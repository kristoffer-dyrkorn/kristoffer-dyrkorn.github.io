import * as THREE from "./three.module.js";

const utm33NProjection = "+proj=utm +zone=33 +datum=WGS84 +units=m +no_defs";

export default class LocationHandler {
  constructor() {}

  async getPosition() {
    console.log("Getting GPS data.");

    const locationPromise = new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (location) => {
          const lon = location.coords.longitude;
          const lat = location.coords.latitude;
          const alt = location.coords.altitude;

          console.log(
            "Got location. Accuracy: " +
              location.coords.accuracy.toFixed(0) +
              " m."
          );

          const utm = proj4(utm33NProjection, [lon, lat]);
          const utmLocation = new THREE.Vector3(utm[0], utm[1], alt);

          resolve(utmLocation);
        },
        (error) => reject(error),
        {
          enableHighAccuracy: true,
        }
      );
    });

    const location = await locationPromise.catch((error) =>
      console.log("Error getting location: " + error)
    );
    return location;
  }
}
