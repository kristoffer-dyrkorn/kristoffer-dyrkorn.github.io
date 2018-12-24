const Y_FOV_LANDSCAPE = 37.5
const PLANE_DISTANCE = 100

const MIN_EAST = -100000
const MIN_NORTH = 6400000
const TILE_EXTENTS = 12750

const NEAR_CLIP = 50
const FAR_CLIP = TILE_EXTENTS * 2

const tileServer = "https://s3-eu-west-1.amazonaws.com/kd-flightsim/topography"

let actualHeading = 0
let headingAccuracy = 0
let areTilesLoaded = false
let isVideoPlaying = false

const gyroSample = new THREE.Euler(0, 0, 0, "ZXY")
const deviceObject = new THREE.Object3D()

const canvas = document.getElementById("canvas")
const renderer = new THREE.WebGLRenderer({ canvas: canvas })
renderer.setPixelRatio(window.devicePixelRatio)

const camera = new THREE.PerspectiveCamera()
camera.near = NEAR_CLIP
camera.far = FAR_CLIP

const scene = new THREE.Scene()

const video = document.getElementById("video")
const videoTexture = new THREE.VideoTexture(video)

// relative coordinates from camera to texture plane
const planeRelativePosition = new THREE.Vector3(0, 0, -PLANE_DISTANCE)

const planeGeometry = new THREE.PlaneBufferGeometry()
const planeMaterial = new THREE.MeshBasicMaterial({ map: videoTexture })
const plane = new THREE.Mesh(planeGeometry, planeMaterial)
// scene.add(plane)

const cubeGeometry = new THREE.BoxBufferGeometry(5, 5, 5)
const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
const cube = new THREE.Mesh(cubeGeometry, cubeMaterial)
scene.add(cube)

const ambientLight = new THREE.AmbientLight(0x888888)
scene.add(ambientLight)

const lights = []
lights[0] = new THREE.PointLight(0xffffff, 0.8, 0)
lights[0].position.set(20, 20, 40)
scene.add(lights[0])

window.addEventListener("deviceorientation", updateOrientation)
window.addEventListener("orientationchange", resetViewport)
video.addEventListener("playing", prepareVideoOutput)
canvas.addEventListener("click", startVideo)

const watchID = navigator.geolocation.watchPosition(gotLocation, locationError, {
  enableHighAccuracy: true,
  maximumAge: 1000
})

resetViewport()
drawScene()

function drawScene() {
  requestAnimationFrame(drawScene)

  const orientation = new THREE.Matrix4()
  //  orientation.makeRotationZ(-actualHeading * THREE.Math.DEG2RAD)

  const deviceOrientation = new THREE.Matrix4()
  deviceOrientation.makeRotationFromEuler(gyroSample)

  const screenOrientation = new THREE.Matrix4()
  screenOrientation.makeRotationZ(-window.orientation * THREE.Math.DEG2RAD)

  orientation.multiply(deviceOrientation)
  orientation.multiply(screenOrientation)
  deviceObject.setRotationFromMatrix(orientation)

  // interpolate camera orientation towards sensor-read orientation
  camera.quaternion.slerp(deviceObject.quaternion, 0.3)

  // reset the plane location: place it relative to the camera
  plane.position.copy(planeRelativePosition)

  // overwrite plane.position with the world coordinates for the plane,
  // based on current camera position and orientation
  camera.localToWorld(plane.position)

  // copy the camera orientation to the plane so the plane becomes parallel to the camera
  plane.quaternion.copy(camera.quaternion)

  renderer.render(scene, camera)
}

function resetViewport() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.fov = Y_FOV_LANDSCAPE
  if (window.orientation == 0) {
    camera.fov = camera.fov / camera.aspect
  }

  // resize plane according to camera fov and aspect
  plane.scale.y = Math.tan(camera.fov * 0.8 * THREE.Math.DEG2RAD) * PLANE_DISTANCE
  plane.scale.x = plane.scale.y * camera.aspect

  camera.updateProjectionMatrix()

  renderer.setSize(window.innerWidth, window.innerHeight)
}

function updateOrientation(event) {
  headingAccuracy = event.webkitCompassAccuracy
  actualHeading = -event.webkitCompassHeading + window.orientation

  actualHeading %= 360
  if (actualHeading < 0) {
    actualHeading += 360
  }

  gyroSample.x = event.beta * THREE.Math.DEG2RAD
  gyroSample.y = event.gamma * THREE.Math.DEG2RAD
  //  gyroSample.z = event.alpha * THREE.Math.DEG2RAD
  gyroSample.z = actualHeading * THREE.Math.DEG2RAD
}

function startVideo() {
  if (!isVideoPlaying) {
    const constraints = {
      audio: false,
      video: {
        facingMode: "environment",
        width: 1280,
        height: 720
      }
    }
    navigator.mediaDevices.getUserMedia(constraints).then(stream => {
      video.srcObject = stream
      video.play()
    })
  }
}

function prepareVideoOutput() {
  console.log("Now playing " + video.videoWidth + "x" + video.videoHeight)
  isVideoPlaying = true
}

function loadTiles(eastPosition, northPosition) {
  // coords of lower left point of center tile
  const centerEast = Math.trunc((eastPosition - MIN_EAST) / TILE_EXTENTS) * TILE_EXTENTS + MIN_EAST
  const centerNorth = Math.trunc((northPosition - MIN_NORTH) / TILE_EXTENTS) * TILE_EXTENTS + MIN_NORTH

  loadTile(centerEast, centerNorth, 255)

  loadTile(centerEast - TILE_EXTENTS, centerNorth - TILE_EXTENTS, 127)
  loadTile(centerEast, centerNorth - TILE_EXTENTS, 127)
  loadTile(centerEast + TILE_EXTENTS, centerNorth - TILE_EXTENTS, 127)

  loadTile(centerEast - TILE_EXTENTS, centerNorth, 127)
  loadTile(centerEast + TILE_EXTENTS, centerNorth, 127)

  loadTile(centerEast - TILE_EXTENTS, centerNorth + TILE_EXTENTS, 127)
  loadTile(centerEast, centerNorth + TILE_EXTENTS, 127)
  loadTile(centerEast + TILE_EXTENTS, centerNorth + TILE_EXTENTS, 127)
}

function loadTile(east, north, resolution) {
  const tileGeometry = new THREE.PlaneGeometry(TILE_EXTENTS, TILE_EXTENTS, resolution, resolution)
  const tileMaterial = new THREE.MeshPhongMaterial()

  const tileURL = `${tileServer}/${east}-${north}.png`
  console.log("Loading tile: " + tileURL)
  tileMaterial.displacementMap = new THREE.TextureLoader().load(tileURL)
  tileMaterial.displacementScale = 2550
  tileMaterial.wireframe = true

  const tile = new THREE.Mesh(tileGeometry, tileMaterial)
  tile.position.x = east + TILE_EXTENTS / 2
  tile.position.y = north + TILE_EXTENTS / 2
  scene.add(tile)
}

function gotLocation(position) {
  console.log("Heading accuracy, degrees: " + headingAccuracy)
  console.log("Position accuracy, meters: " + position.coords.accuracy)

  const pos = latLonToUTM(position.coords.latitude, position.coords.longitude, 33)

  if (position.coords.accuracy < 100) {
    if (!areTilesLoaded) {
      loadTiles(pos.e, pos.n)
      areTilesLoaded = true

      camera.position.x = pos.e
      camera.position.y = pos.n
      camera.position.z = position.coords.altitude + 30

      cube.position.x = camera.position.x
      cube.position.y = camera.position.y + 75
      cube.position.z = camera.position.z
    }
  }
}

function locationError(error) {
  console.log(error.message)
}
