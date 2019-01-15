import Logger from "./logger.js"
import OrientationHandler from "./orientationhandler.js"
import LocationHandler from "./locationhandler.js"

// https://developer.apple.com/library/archive/documentation/DeviceInformation/Reference/iOSDeviceCompatibility/Cameras/Cameras.html#//apple_ref/doc/uid/TP40013599-CH107-SW21
// 1280x720 X_FOV = 60.983 => Y_FOV = 34.30

// empirical value: 40
const Y_FOV_LANDSCAPE = 40
const PLANE_DISTANCE = 100

/*
const HORIZ_FOV = 132
const VERT_FOV = 82
*/
const HORIZ_FOV = 66
const VERT_FOV = 41

const MIN_EAST = -100000
const MIN_NORTH = 6400000
const TILE_EXTENTS = 12750

const NEAR_CLIP = 50
const FAR_CLIP = TILE_EXTENTS * 2

const tileServer = "https://s3-eu-west-1.amazonaws.com/kd-flightsim/topography"

let isVideoPlaying = false

const orientation = new OrientationHandler()
const location = new LocationHandler(gotLocation)
const deviceObject = new THREE.Object3D()

const canvas = document.getElementById("canvas")
const renderer = new THREE.WebGLRenderer({ canvas: canvas })
renderer.setPixelRatio(window.devicePixelRatio)
renderer.context.disable(renderer.context.DEPTH_TEST)

const camera = new THREE.PerspectiveCamera()
camera.near = NEAR_CLIP
camera.far = FAR_CLIP

const scene = new THREE.Scene()

const video = document.getElementById("video")
const videoTexture = new THREE.VideoTexture(video)

// relative coordinates from camera to texture plane
const planeRelativePosition = new THREE.Vector3(0, 0, -PLANE_DISTANCE)

// const planeRelativePosition = new THREE.Vector3(0, 0, -8 * PLANE_DISTANCE)

const planeGeometry = new THREE.PlaneGeometry(1, 1, 20, 10)

// Far sphere, convex
/*
const planeGeometry = new THREE.SphereBufferGeometry(
  5 * PLANE_DISTANCE, // radius
  30, // segments x
  10, // segments y
  (90 - HORIZ_FOV / 2) * THREE.Math.DEG2RAD, // horiz startangle, 0 = directly behind camera
  HORIZ_FOV * THREE.Math.DEG2RAD, // horiz sweep
  (90 - VERT_FOV / 2) * THREE.Math.DEG2RAD, // vert startangle
  VERT_FOV * THREE.Math.DEG2RAD // vert sweep
)
*/

// Near sphere, concave
/*
const planeGeometry = new THREE.SphereBufferGeometry(
  150, // radius
  30, // segments x
  10, // segments y
  (270 - HORIZ_FOV / 2) * THREE.Math.DEG2RAD, // horiz startangle, 0 = directly behind camera
  132 * THREE.Math.DEG2RAD, // horiz sweep
  (90 - VERT_FOV / 2) * THREE.Math.DEG2RAD, // vert startangle
  82 * THREE.Math.DEG2RAD // vert sweep
)

// flip normals inward, so the inside of the sphere is visible
// this also x-flips the texture so it becomes correct
planeGeometry.scale(-1, 1, 1)
*/

const displacementCanvas = document.getElementById("lenscorrection")
displacementCanvas.width = 256
displacementCanvas.height = 128
const displacementCtx = displacementCanvas.getContext("2d")
const imageData = displacementCtx.getImageData(0, 0, 256, 128)
let imageArray = []

for (let i = 0; i < 256; i++) {
  for (let j = 0; j < 128; j++) {
    const intensity = 255 - ((i - 127) * (i - 127) + (j - 64) * (j - 64)) / 80
    const address = 4 * (j * 256 + i)
    imageArray[address] = intensity
    imageArray[address + 1] = intensity
    imageArray[address + 2] = intensity
    imageArray[address + 3] = 255
  }
}

imageData.data.set(new Uint8Array(imageArray))
displacementCtx.putImageData(imageData, 0, 0)

const dataURL = displacementCanvas.toDataURL()

const planeMaterial = new THREE.MeshPhongMaterial({ map: videoTexture })
const lensDisplacementMap = new THREE.TextureLoader().load(dataURL)

planeMaterial.displacementMap = lensDisplacementMap
planeMaterial.displacementScale = 10

// const planeMaterial = new THREE.MeshBasicMaterial({ map: videoTexture })
// const planeMaterial = new THREE.MeshBasicMaterial()
// planeMaterial.wireframe = true
// planeMaterial.side = THREE.BackSide

const plane = new THREE.Mesh(planeGeometry, planeMaterial)
scene.add(plane)

const cubeGeometry = new THREE.BoxBufferGeometry(5, 5, 5)
const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
const cube = new THREE.Mesh(cubeGeometry, cubeMaterial)
scene.add(cube)

const ambientLight = new THREE.AmbientLight(0x888888)
scene.add(ambientLight)

/*
const lights = []
lights[0] = new THREE.PointLight(0xffffff, 0.8, 0)
lights[0].position.set(20, 20, 40)
scene.add(lights[0])
*/

window.addEventListener("orientationchange", resetViewport)
canvas.addEventListener("click", startVideo)

window.addEventListener("touchstart", readTouchPosition, false)
window.addEventListener("touchmove", calculateTouchDelta, false)

let currentTouch = null

function readTouchPosition(event) {
  //  event.preventDefault()
  currentTouch = {
    pageX: event.changedTouches[0].pageX,
    pageY: event.changedTouches[0].pageY
  }
}

function calculateTouchDelta(event) {
  event.preventDefault()
  const delta = (20 * (event.changedTouches[0].pageX - currentTouch.pageX)) / window.innerWidth
  orientation.adjustBaseHeading(delta)

  readTouchPosition(event)
}

Logger.log("Getting GPS data.")

resetViewport()
drawScene()

function drawScene() {
  requestAnimationFrame(drawScene)

  // assign effective device orientation to device object
  deviceObject.setRotationFromMatrix(orientation.get())

  // interpolate camera orientation towards this orientation
  camera.quaternion.slerp(deviceObject.quaternion, 0.5)

  // reset the plane location, place it relative to the camera
  plane.position.copy(planeRelativePosition)

  // overwrite plane.position with the world coordinates for the plane,
  // based on current camera position and orientation
  camera.localToWorld(plane.position)

  // set the plane orientation to the camera orientation
  // so the plane becomes parallel to the camera
  plane.quaternion.copy(camera.quaternion)

  renderer.render(scene, camera)
}

function resetViewport() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.fov = Y_FOV_LANDSCAPE
  if (window.orientation == 0) {
    camera.fov = camera.fov / camera.aspect
  }

  camera.updateProjectionMatrix()

  // resize plane according to camera y fov and aspect
  plane.scale.y = Math.tan(camera.fov * THREE.Math.DEG2RAD) * PLANE_DISTANCE * 0.8
  plane.scale.x = plane.scale.y * camera.aspect

  // update output window size
  renderer.setSize(window.innerWidth, window.innerHeight)

  // update landscape/portrait rendering adjustment
  orientation.setViewportRotation(-window.orientation * THREE.Math.DEG2RAD)
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
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(stream => {
        video.srcObject = stream
        try {
          video.play()
          isVideoPlaying = true
          console.log(`Playing ${video.videoWidth} x ${video.videoHeight}`)
        } catch (error) {
          console.error(`Error playing video from camera: ${error}`)
        }
      })
      .catch(function(error) {
        console.error(`Error reading video from camera: ${error}`)
      })
  }
}

function loadTile(east, north, resolution) {
  const tileGeometry = new THREE.PlaneGeometry(TILE_EXTENTS, TILE_EXTENTS, resolution, resolution)
  const tileMaterial = new THREE.MeshPhongMaterial()

  const tileFile = `${east}-${north}.png`
  const tileURL = `${tileServer}/${tileFile}`
  //  Logger.log(`Loading tile: ${tileFile}`)
  tileMaterial.displacementMap = new THREE.TextureLoader().load(tileURL)
  tileMaterial.displacementScale = 2550
  tileMaterial.wireframe = true

  const tile = new THREE.Mesh(tileGeometry, tileMaterial)
  tile.position.x = east + TILE_EXTENTS / 2
  tile.position.y = north + TILE_EXTENTS / 2
  scene.add(tile)
}

function loadTiles(eastPosition, northPosition) {
  // coords of lower left point of center tile
  const centerEast = Math.trunc((eastPosition - MIN_EAST) / TILE_EXTENTS) * TILE_EXTENTS + MIN_EAST
  const centerNorth = Math.trunc((northPosition - MIN_NORTH) / TILE_EXTENTS) * TILE_EXTENTS + MIN_NORTH

  loadTile(centerEast, centerNorth, 256)

  loadTile(centerEast - TILE_EXTENTS, centerNorth - TILE_EXTENTS, 128)
  loadTile(centerEast, centerNorth - TILE_EXTENTS, 128)
  loadTile(centerEast + TILE_EXTENTS, centerNorth - TILE_EXTENTS, 128)

  loadTile(centerEast - TILE_EXTENTS, centerNorth, 128)
  loadTile(centerEast + TILE_EXTENTS, centerNorth, 128)

  loadTile(centerEast - TILE_EXTENTS, centerNorth + TILE_EXTENTS, 128)
  loadTile(centerEast, centerNorth + TILE_EXTENTS, 128)
  loadTile(centerEast + TILE_EXTENTS, centerNorth + TILE_EXTENTS, 128)
}

function gotLocation(east, north, altitude) {
  Logger.clear()
  loadTiles(east, north)

  camera.position.x = east
  camera.position.y = north
  camera.position.z = altitude + 15

  cube.position.x = camera.position.x
  cube.position.y = camera.position.y + 75
  cube.position.z = camera.position.z
}
