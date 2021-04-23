import OrientationHandler from "./orientationhandler.js";
import LocationHandler from "./locationhandler.js";
import * as THREE from "./three.module.js";
import Renderer from "./renderer.js";
import Terrain from "./terrain.js";
import VideoHandler from "./videohandler.js";
import { GUI } from "./dat.gui.module.js";

const canvasElement = document.getElementById("glcanvas");
const videoElement = document.getElementById("video");

const video = new VideoHandler(videoElement);
const renderer = new Renderer(canvasElement, videoElement);
const terrain = new Terrain(renderer);

const orientation = new OrientationHandler();
const location = new LocationHandler();

let orientationChangeID;

const startButton = document.getElementById("start");
startButton.addEventListener("click", start);

const controller = new (function () {
  this.fov = 38;
  this.showMesh = true;
  this.minDist = 2000;
  this.maxDist = 7000;
  this.minElev = 200;
  this.maxElev = 3000;
  this.poiType = "Ås";
})();

const gui = new GUI();
gui
  .add(controller, "fov", 35, 45, 1)
  .name("FOV")
  .onChange(function () {
    renderer.yFovLandscape = controller.fov;
    resetViewport();
  });
gui
  .add(controller, "showMesh", true)
  .name("Show mesh")
  .onChange(function () {
    terrain.setVisibility(controller.showMesh);
  });
gui
  .add(controller, "minDist", 100, 30000, 100)
  .name("Near limit")
  .onFinishChange(function () {
    terrain.updatePois(
      controller.minDist,
      controller.maxDist,
      controller.minElev,
      controller.maxElev,
      controller.poiType
    );
  });
gui
  .add(controller, "maxDist", 100, 30000, 100)
  .name("Far limit")
  .onFinishChange(function () {
    terrain.updatePois(
      controller.minDist,
      controller.maxDist,
      controller.minElev,
      controller.maxElev,
      controller.poiType
    );
  });
gui
  .add(controller, "minElev", 0, 3000, 100)
  .name("Min elevation")
  .onFinishChange(function () {
    terrain.updatePois(
      controller.minDist,
      controller.maxDist,
      controller.minElev,
      controller.maxElev,
      controller.poiType
    );
  });
gui
  .add(controller, "maxElev", 0, 3000, 100)
  .name("Max elevation")
  .onFinishChange(function () {
    terrain.updatePois(
      controller.minDist,
      controller.maxDist,
      controller.minElev,
      controller.maxElev,
      controller.poiType
    );
  });
gui
  .add(controller, "poiType", ["Ås", "Fjell", "Turisthytte"])
  .name("Poi type")
  .onChange(function () {
    terrain.updatePois(
      controller.minDist,
      controller.maxDist,
      controller.minElev,
      controller.maxElev,
      controller.poiType
    );
  });

window.addEventListener("orientationchange", () => {
  // Safari bug: window sizes are NOT immediately updated as orientations change
  // insert a delay to get the new values
  // https://bugs.webkit.org/show_bug.cgi?id=170595
  // https://github.com/dimsemenov/PhotoSwipe/issues/1315

  clearTimeout(orientationChangeID);
  orientationChangeID = setTimeout(() => resetViewport(), 500);
});

canvasElement.addEventListener("touchstart", resetTouch);
canvasElement.addEventListener("touchmove", readMove);
canvasElement.addEventListener("touchend", endTouch);

let lastTouch;

function resetTouch(event) {
  lastTouch = {
    pageX: event.changedTouches[0].pageX,
    pageY: event.changedTouches[0].pageY,
    deltaHeading: 0,
    deltaPitch: 0,
  };
}

function readMove(event) {
  lastTouch.deltaHeading =
    (40 * (event.changedTouches[0].pageX - lastTouch.pageX)) /
    window.innerWidth;
  lastTouch.deltaPitch =
    (25 * (event.changedTouches[0].pageY - lastTouch.pageY)) /
    window.innerHeight;

  // adjust virtual camera to better match actual orientation of physical device
  orientation.adjustBaseHeading(lastTouch.deltaHeading);
  orientation.adjustBasePitch(lastTouch.deltaPitch);
  resetTouch(event);
}

function endTouch(event) {
  //  resetTouch(event);
}

function drawScene() {
  requestAnimationFrame(drawScene);

  // read the device orientation and align the virtual camera to it
  renderer.setCameraOrientation(orientation.get());
  renderer.render();
}

function resetViewport() {
  renderer.updateViewport(window.innerWidth, window.innerHeight);
  orientation.setViewportRotation(-window.orientation * THREE.Math.DEG2RAD);
}

async function start() {
  // remove start button
  document.getElementById("buttoncontainer").remove();

  // set up orientation handler
  orientation.listen();

  // get position
  const utmLocation = await location.getPosition();

  // position the virtual camera and load tiles
  renderer.setCameraPosition(utmLocation);
  await terrain.loadTiles(utmLocation);

  // get video from camera
  await video.start();

  resetViewport();
  drawScene();
}
