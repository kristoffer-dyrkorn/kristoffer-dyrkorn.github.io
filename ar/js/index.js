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
const FAR_CLIP = 2 * TILE_EXTENTS

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

const renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
  minFilter: THREE.LinearFilter,
  magFilter: THREE.NearestFilter,
  format: THREE.RGBFormat
})

const screenMaterial = new THREE.ShaderMaterial({
  uniforms: { renderTexture: { value: renderTarget.texture } },
  vertexShader: `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`,
  fragmentShader: `
  varying vec2 vUv;
  uniform sampler2D renderTexture;
  void main() {
    gl_FragColor = texture2D(renderTexture, vUv);
  }`,
  depthWrite: false
})

const virtualScene = new THREE.Scene()
const screenScene = new THREE.Scene()

const virtualCamera = new THREE.PerspectiveCamera()
virtualCamera.near = NEAR_CLIP
virtualCamera.far = FAR_CLIP

const screenCamera = new THREE.OrthographicCamera()
screenCamera.position.z = 100

const planeGeometry = new THREE.PlaneBufferGeometry()
const plane = new THREE.Mesh(planeGeometry, screenMaterial)

screenScene.add(plane)

// const planeMaterial = new THREE.MeshBasicMaterial({ map: videoTexture })

const cubeGeometry = new THREE.BoxBufferGeometry(5, 5, 5)
const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
const cube = new THREE.Mesh(cubeGeometry, cubeMaterial)
virtualScene.add(cube)

const ambientLight = new THREE.AmbientLight(0x888888)
virtualScene.add(ambientLight)

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
  virtualCamera.quaternion.slerp(deviceObject.quaternion, 0.5)

  renderer.clear()

  // render virtual scene into renderTarget (a texture)
  renderer.render(virtualScene, virtualCamera, renderTarget, true)

  // render texture on screen
  renderer.render(screenScene, screenCamera)
}

function resetViewport() {
  virtualCamera.aspect = window.innerWidth / window.innerHeight
  virtualCamera.fov = Y_FOV_LANDSCAPE
  if (window.orientation == 0) {
    virtualCamera.fov = virtualCamera.fov / virtualCamera.aspect
  }
  virtualCamera.updateProjectionMatrix()

  screenCamera.left = -0.5
  screenCamera.right = 0.5
  screenCamera.top = 0.5
  screenCamera.bottom = -0.5

  // update renderTarget size
  renderTarget.setSize(window.innerWidth, window.innerHeight)

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
  virtualScene.add(tile)
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

  virtualCamera.position.x = east
  virtualCamera.position.y = north
  virtualCamera.position.z = altitude + 15

  cube.position.x = virtualCamera.position.x
  cube.position.y = virtualCamera.position.y + 75
  cube.position.z = virtualCamera.position.z
}
