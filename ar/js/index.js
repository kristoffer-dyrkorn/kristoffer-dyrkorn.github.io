const Y_FOV_LANDSCAPE = 37.5

const NEAR_CLIP = 5
const FAR_CLIP = 15000
const PLANE_DISTANCE = 100

const MIN_EAST = -100000
const MIN_NORTH = 6400000
const TILE_EXTENTS = 12750

const tileServer = "https://s3-eu-west-1.amazonaws.com/kd-flightsim"

let actualHeading = 0
let precision = 0
let isTileLoaded = false
let isVideoPlaying = false

const gyroSample = new THREE.Euler(0, 0, 0, "ZXY")
const rawOrientation = new THREE.Object3D()

const canvas = document.getElementById("canvas")
const renderer = new THREE.WebGLRenderer({ canvas: canvas })
renderer.setPixelRatio(window.devicePixelRatio)

const camera = new THREE.PerspectiveCamera()
camera.near = NEAR_CLIP
camera.far = FAR_CLIP

const scene = new THREE.Scene()

const video = document.getElementById("video")
const videoTexture = new THREE.VideoTexture(video)
videoTexture.minFilter = THREE.LinearFilter

const planeGeometry = new THREE.PlaneBufferGeometry()
const planeMaterial = new THREE.MeshBasicMaterial({ map: videoTexture })
const plane = new THREE.Mesh(planeGeometry, planeMaterial)

// relative coordinates from camera to texture plane
const planePosition = new THREE.Vector3(0, 0, -PLANE_DISTANCE)

// scene.add(plane)

const cubeGeometry = new THREE.BoxBufferGeometry(1, 1, 1)
const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
const cube = new THREE.Mesh(cubeGeometry, cubeMaterial)

scene.add(cube)

const tileURL = "320750-7190500.png"

const tileGeometry = new THREE.PlaneGeometry(TILE_EXTENTS, TILE_EXTENTS, 128, 128)
const tileMaterial = new THREE.MeshPhongMaterial()

console.log("Loading tile: " + tileURL)
const loader = new THREE.TextureLoader()
loader.setCrossOrigin("anonymous")
const tileDisplacementMap = loader.load(tileURL)

tileMaterial.displacementMap = tileDisplacementMap
tileMaterial.wireframe = true

const tile = new THREE.Mesh(tileGeometry, tileMaterial)
scene.add(tile)

// no scene.add(tile) here, tile is added to scene
// first when we have a fix on the GPS location.

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

logMessages()
resetViewport()
drawScene()

function logMessages() {
  //  console.log(`${gyroSample.x}, ${gyroSample.y}, ${gyroSample.z}, ${actualHeading}, ${precision}`)
  setTimeout(logMessages, 2000)
}

function drawScene() {
  requestAnimationFrame(drawScene)

  // read raw orientation data from sensors
  rawOrientation.setRotationFromEuler(gyroSample)
  rawOrientation.rotateZ(-window.orientation * THREE.Math.DEG2RAD)
  rawOrientation.rotateY(-actualHeading * THREE.Math.DEG2RAD)

  // interpolate camera orientation towards sensor-read orientation
  camera.quaternion.slerp(rawOrientation.quaternion, 0.2)

  // position and orient plane relative to camera
  plane.position.copy(planePosition)
  camera.localToWorld(plane.position)
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
  precision = event.webkitCompassAccuracy
  actualHeading = event.webkitCompassHeading + window.orientation
  gyroSample.x = event.beta * THREE.Math.DEG2RAD
  gyroSample.y = event.gamma * THREE.Math.DEG2RAD
  gyroSample.z = event.alpha * THREE.Math.DEG2RAD
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

function gotLocation(position) {
  //  console.log("Pos: " + position.coords.latitude + ", " + position.coords.longitude + ", " + position.coords.altitude)
  //  console.log("Acc: " + position.coords.accuracy + ", vert acc: " + position.coords.altitudeAccuracy)

  const pos = latLonToUTM(position.coords.latitude, position.coords.longitude, 33)

  if (!isTileLoaded) {
    //  if (position.coords.accuracy < 30 && !isTileLoaded) {
    const tileEast = Math.trunc((pos.e - MIN_EAST) / TILE_EXTENTS) * TILE_EXTENTS + MIN_EAST
    const tileNorth = Math.trunc((pos.n - MIN_NORTH) / TILE_EXTENTS) * TILE_EXTENTS + MIN_NORTH
    //    const tileURL = `${tileServer}/topography/${tileEast}-${tileNorth}.png`

    /*
    const loader = new THREE.TextureLoader()
    loader.setCrossOrigin("")
    const tileDisplacementMap = loader.load(
      tileURL,
      function(img) {
        console.log("Image successfully loaded")
        tileDisplacementMap.needsUpdate = true
        tileMaterial.needsUpdate = true
      },
      undefined,
      function(e) {
        console.log("Error loading image")
      }
    )
    */

    tile.position.x = tileEast + TILE_EXTENTS / 2
    tile.position.y = tileNorth + TILE_EXTENTS / 2

    camera.position.x = pos.e
    camera.position.y = pos.n
    camera.position.z = 10

    cube.position.x = camera.position.x
    cube.position.y = camera.position.y + 10
    cube.position.z = camera.position.z

    isTileLoaded = true
  }
}

function locationError(error) {
  console.log(error.message)
}
