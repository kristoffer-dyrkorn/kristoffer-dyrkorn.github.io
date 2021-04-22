import OrientationHandler from "./orientationhandler.js"
import LocationHandler from "./locationhandler.js"
import * as THREE from "./three.module.js"
import VirtualScene from "./virtualscene.js"
import ScreenScene from "./screenscene.js"
import Terrain from "./terrain.js"
import VideoHandler from "./videohandler.js"
import Logger from "./logger.js"

const canvasElement = document.getElementById("glcanvas")
const videoElement = document.getElementById("video")

const video = new VideoHandler(videoElement)

const virtualScene = new VirtualScene(canvasElement)
const screenScene = new ScreenScene(videoElement, virtualScene.renderTexture)

const terrain = new Terrain(virtualScene)

const orientation = new OrientationHandler()
const location = new LocationHandler(virtualScene)

let orientationChangeID

const startButton = document.getElementById("start")
startButton.addEventListener("click", start)

window.addEventListener("orientationchange", () => {
  // Safari bug: window sizes are NOT immediately updated as orientations change
  // insert a delay to get the new values
  // https://bugs.webkit.org/show_bug.cgi?id=170595
  // https://github.com/dimsemenov/PhotoSwipe/issues/1315

  clearTimeout(orientationChangeID)
  orientationChangeID = setTimeout(() => resetViewport(), 500)
})

canvasElement.addEventListener("touchstart", resetTouch)
canvasElement.addEventListener("touchmove", readMove)
canvasElement.addEventListener("touchend", endTouch)

window.addEventListener("visibilitychange", async () => {
  // if the app (the tab) has become visible
  if (document.visibilityState === "visible") {
    // update the location, but for now, do not load tiles
    const utmLocation = await location.getPosition()
    virtualScene.setCameraPosition(utmLocation)

    // re-read orientation so we get an updated compass direction
    // TODO: fix event handler leak (we register duplicate event handlers here)
    orientation.getOrientation()
  }
})

resetViewport()
drawScene()

let lastTouch

function resetTouch(event) {
  lastTouch = {
    pageX: event.changedTouches[0].pageX,
    pageY: event.changedTouches[0].pageY,
    deltaHeading: 0,
    deltaPitch: 0,
  }
}

function readMove(event) {
  lastTouch.deltaHeading = (40 * (event.changedTouches[0].pageX - lastTouch.pageX)) / window.innerWidth
  lastTouch.deltaPitch = (25 * (event.changedTouches[0].pageY - lastTouch.pageY)) / window.innerHeight

  // adjust virtual camera to better match actual orientation of physical device
  orientation.adjustBaseHeading(lastTouch.deltaHeading)
  orientation.adjustBasePitch(lastTouch.deltaPitch)
  resetTouch(event)
}

function endTouch(event) {
  if (lastTouch.deltaHeading < 5 && lastTouch.deltaPitch < 5) {
    // if this was a tap, toggle terrain visibility
    terrain.toggleVisibility()
  }
  resetTouch(event)
}

function drawScene() {
  requestAnimationFrame(drawScene)

  // read the device orientation and align the virtual camera to it
  virtualScene.setCameraOrientation(orientation.get())

  // render the virtual scene to a texture
  virtualScene.renderToTexture()

  // blend the virtual scene with a video frame and render it to screen
  virtualScene.renderToScreen(screenScene)
}

function resetViewport() {
  virtualScene.updateViewport(window.innerWidth, window.innerHeight)
  screenScene.updateViewport(window.innerWidth, window.innerHeight)
  orientation.setViewportRotation(-window.orientation * THREE.Math.DEG2RAD)
}

async function start() {
  // remove start button
  document.getElementById("buttoncontainer").style.display = "none"

  //// these need to be called in an interaction handler

  // get video from camera
  video.start()

  // set up orientation handler
  orientation.getOrientation()

  // get position
  const utmLocation = await location.getPosition()

  ////

  // position the virtual camera and load tiles
  virtualScene.setCameraPosition(utmLocation)
  terrain.loadTiles(utmLocation)

  Logger.clear()
}
