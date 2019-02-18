import Logger from "./logger.js"
import OrientationHandler from "./orientationhandler.js"
import LocationHandler from "./locationhandler.js"

// https://developer.apple.com/library/archive/documentation/DeviceInformation/Reference/iOSDeviceCompatibility/Cameras/Cameras.html#//apple_ref/doc/uid/TP40013599-CH107-SW21
// 1280x720 X_FOV = 60.983 => Y_FOV = 34.30

// empirical value: 40 degrees gives same horizontal fov
// for video and virtual world - at standstill
const Y_FOV_LANDSCAPE = 40

const MIN_EAST = -100000
const MIN_NORTH = 6400000
const TILE_EXTENTS = 12750

const NEAR_CLIP = 50
const FAR_CLIP = 3 * TILE_EXTENTS

const tileServer = "https://s3-eu-west-1.amazonaws.com/kd-flightsim/topography"

let isVideoPlaying = false

const orientation = new OrientationHandler()
const location = new LocationHandler(gotLocation)
const deviceObject = new THREE.Object3D()

const canvas = document.getElementById("canvas")
const renderer = new THREE.WebGLRenderer({ canvas: canvas })
renderer.setPixelRatio(window.devicePixelRatio)
renderer.autoClear = false

const video = document.getElementById("video")
const videoTexture = new THREE.VideoTexture(video)

const renderTarget = new THREE.WebGLRenderTarget()

const screenMaterial = new THREE.ShaderMaterial({
  uniforms: { renderTexture: { value: renderTarget.texture }, videoTexture: { value: videoTexture } },
  vertexShader: `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`,
  fragmentShader: `
  varying vec2 vUv;
  uniform sampler2D renderTexture;
  uniform sampler2D videoTexture;
  void main() {
    vec4 renderColor = texture2D(renderTexture, vUv);
    vec4 videoColor = texture2D(videoTexture, vUv);
    gl_FragColor = 0.5 * renderColor + 0.5 * videoColor;
  }`,
  depthWrite: false
})

const virtualScene = new THREE.Scene()
const screenScene = new THREE.Scene()

const virtualCamera = new THREE.PerspectiveCamera()
virtualCamera.near = NEAR_CLIP
virtualCamera.far = FAR_CLIP
virtualScene.add(virtualCamera)

const screenCamera = new THREE.OrthographicCamera()
screenScene.add(screenCamera)

const planeGeometry = new THREE.PlaneBufferGeometry()
const plane = new THREE.Mesh(planeGeometry, screenMaterial)
plane.position.z = -100

screenScene.add(plane)

const cubeGeometry = new THREE.BoxBufferGeometry(5, 5, 5)
const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
const cube = new THREE.Mesh(cubeGeometry, cubeMaterial)
virtualScene.add(cube)

const ambientLight = new THREE.AmbientLight(0x888888)
virtualScene.add(ambientLight)

window.addEventListener("orientationchange", resetViewport)
canvas.addEventListener("click", startVideo)

window.addEventListener("touchstart", readTouchPosition)
window.addEventListener("touchmove", calculateTouchDelta)

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
  event.stopPropagation()
  const deltaHeading = (20 * (event.changedTouches[0].pageX - currentTouch.pageX)) / window.innerWidth
  const deltaPitch = (20 * (event.changedTouches[0].pageY - currentTouch.pageY)) / window.innerHeight
  orientation.adjustBaseHeading(deltaHeading)
  orientation.adjustBasePitch(deltaPitch)

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
  virtualCamera.quaternion.slerp(deviceObject.quaternion, 0.5)

  renderer.clear()

  // render virtual scene into renderTarget (a texture)
  renderer.render(virtualScene, virtualCamera, renderTarget, true)

  // render texture, mixed with video stream, onto screen
  renderer.render(screenScene, screenCamera)
}

function resetViewport() {
  const width = window.innerWidth
  const height = window.innerHeight

  virtualCamera.aspect = width / height
  if (window.orientation == 0) {
    virtualCamera.fov = Y_FOV_LANDSCAPE / virtualCamera.aspect
  } else {
    virtualCamera.fov = Y_FOV_LANDSCAPE
  }
  virtualCamera.updateProjectionMatrix()

  screenCamera.left = -width / 2
  screenCamera.right = width / 2
  screenCamera.top = height / 2
  screenCamera.bottom = -height / 2

  screenCamera.updateProjectionMatrix()

  plane.scale.set(width, height, 1)

  renderTarget.setSize(width * window.devicePixelRatio, height * window.devicePixelRatio)
  renderer.setSize(width, height)

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

function loadTile(x, y, resolution) {
  const tileGeometry = new THREE.PlaneGeometry(TILE_EXTENTS, TILE_EXTENTS, resolution, resolution)
  const tileMaterial = new THREE.MeshPhongMaterial()

  const tileFile = `${x}-${y}.png`
  const tileURL = `${tileServer}/${tileFile}`

  tileMaterial.displacementMap = new THREE.TextureLoader().load(tileURL)
  tileMaterial.displacementScale = 2550
  tileMaterial.wireframe = true

  const tile = new THREE.Mesh(tileGeometry, tileMaterial)
  tile.position.set(x + TILE_EXTENTS / 2, y + TILE_EXTENTS / 2, 0)
  virtualScene.add(tile)
}

function loadTiles(position) {
  // coords of lower left point of center tile
  const center = new THREE.Vector3()

  center.x = Math.trunc((position.x - MIN_EAST) / TILE_EXTENTS) * TILE_EXTENTS + MIN_EAST
  center.y = Math.trunc((position.y - MIN_NORTH) / TILE_EXTENTS) * TILE_EXTENTS + MIN_NORTH

  loadTile(center.x, center.y, 256)

  loadTile(center.x - TILE_EXTENTS, center.y - TILE_EXTENTS, 128)
  loadTile(center.x, center.y - TILE_EXTENTS, 128)
  loadTile(center.x + TILE_EXTENTS, center.y - TILE_EXTENTS, 128)

  loadTile(center.x - TILE_EXTENTS, center.y, 128)
  loadTile(center.x + TILE_EXTENTS, center.y, 128)

  loadTile(center.x - TILE_EXTENTS, center.y + TILE_EXTENTS, 128)
  loadTile(center.x, center.y + TILE_EXTENTS, 128)
  loadTile(center.x + TILE_EXTENTS, center.y + TILE_EXTENTS, 128)
}

function gotLocation(east, north, altitude) {
  Logger.clear()

  const position = new THREE.Vector3(east, north, altitude)
  loadTiles(position)

  virtualCamera.position.set(position.x, position.y, position.z + 15)
  cube.position.set(position.x, position.y + 75, position.z + 15)
}
