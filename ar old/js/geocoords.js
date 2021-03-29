// Taken from: http://home.hiwaay.net/~taylorc/toolbox/geography/geoutm.html
// Author: Chuck Taylor
// License: The JavaScript source code in this document may be copied and reused without restriction.

const sm_a = 6378137.0
const sm_b = 6356752.314
const sm_EccSquared = 6.69437999013e-3
const UTMScaleFactor = 0.9996

function degToRad(deg) {
  return (deg / 180.0) * Math.PI
}

function centralMeridian(zone) {
  return degToRad(-183.0 + zone * 6.0)
}

function arcLengthOfMeridian(phi) {
  const n = (sm_a - sm_b) / (sm_a + sm_b)

  const alpha = ((sm_a + sm_b) / 2.0) * (1.0 + Math.pow(n, 2.0) / 4.0 + Math.pow(n, 4.0) / 64.0)
  const beta = (-3.0 * n) / 2.0 + (9.0 * Math.pow(n, 3.0)) / 16.0 + (-3.0 * Math.pow(n, 5.0)) / 32.0
  const gamma = (15.0 * Math.pow(n, 2.0)) / 16.0 + (-15.0 * Math.pow(n, 4.0)) / 32.0
  const delta = (-35.0 * Math.pow(n, 3.0)) / 48.0 + (105.0 * Math.pow(n, 5.0)) / 256.0
  const epsilon = (315.0 * Math.pow(n, 4.0)) / 512.0

  return (
    alpha *
    (phi +
      beta * Math.sin(2.0 * phi) +
      gamma * Math.sin(4.0 * phi) +
      delta * Math.sin(6.0 * phi) +
      epsilon * Math.sin(8.0 * phi))
  )
}

function latLonToUTM(lat, lon, utmCode) {
  const ep2 = (Math.pow(sm_a, 2.0) - Math.pow(sm_b, 2.0)) / Math.pow(sm_b, 2.0)

  lat = degToRad(lat)
  lon = degToRad(lon)
  utmCode = centralMeridian(utmCode)

  const nu2 = ep2 * Math.pow(Math.cos(lat), 2.0)
  const N = Math.pow(sm_a, 2.0) / (sm_b * Math.sqrt(1 + nu2))

  const t = Math.tan(lat)
  const t2 = t * t

  const l = lon - utmCode

  const l3coef = 1.0 - t2 + nu2
  const l4coef = 5.0 - t2 + 9 * nu2 + 4.0 * (nu2 * nu2)
  const l5coef = 5.0 - 18.0 * t2 + t2 * t2 + 14.0 * nu2 - 58.0 * t2 * nu2
  const l6coef = 61.0 - 58.0 * t2 + t2 * t2 + 270.0 * nu2 - 330.0 * t2 * nu2
  const l7coef = 61.0 - 479.0 * t2 + 179.0 * (t2 * t2) - t2 * t2 * t2
  const l8coef = 1385.0 - 3111.0 * t2 + 543.0 * (t2 * t2) - t2 * t2 * t2

  let easting =
    N * Math.cos(lat) * l +
    (N / 6.0) * Math.pow(Math.cos(lat), 3.0) * l3coef * Math.pow(l, 3.0) +
    (N / 120.0) * Math.pow(Math.cos(lat), 5.0) * l5coef * Math.pow(l, 5.0) +
    (N / 5040.0) * Math.pow(Math.cos(lat), 7.0) * l7coef * Math.pow(l, 7.0)

  let northing =
    arcLengthOfMeridian(lat) +
    (t / 2.0) * N * Math.pow(Math.cos(lat), 2.0) * Math.pow(l, 2.0) +
    (t / 24.0) * N * Math.pow(Math.cos(lat), 4.0) * l4coef * Math.pow(l, 4.0) +
    (t / 720.0) * N * Math.pow(Math.cos(lat), 6.0) * l6coef * Math.pow(l, 6.0) +
    (t / 40320.0) * N * Math.pow(Math.cos(lat), 8.0) * l8coef * Math.pow(l, 8.0)

  easting = easting * UTMScaleFactor + 500000.0
  northing = northing * UTMScaleFactor
  if (northing < 0.0) northing += 10000000.0

  return { e: easting, n: northing }
}
