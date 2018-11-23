const DEGREES_TO_RADIANS = Math.PI / 180.0;
const Y_FOV_LANDSCAPE = 37.5 * DEGREES_TO_RADIANS;
const DEVICE_PIXEL_RATIO = window.devicePixelRatio || 1;

let canvas;
let gl;
let camera;
let stars;

let actualHeading = 0;

let xRot;
let yRot;
let zRot;

let prevTimestamp;

function start() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl');

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.BLEND);

  gl.getExtension('OES_standard_derivatives');

  camera = new Camera();
  stars = new Starfield(1000);

  window.addEventListener("deviceorientation", updateOrientation);
  window.addEventListener("orientationchange", resetViewport);

  logMessages();
  resetViewport();
  drawScene();
}

function logMessages() {
  console.log(`${xRot} ${yRot} ${zRot}, ${actualHeading}`);
  setTimeout(logMessages, 1000);
}

function drawScene(timestamp) {
  requestAnimationFrame(drawScene);

  let frameTime = timestamp - prevTimestamp || 0;
  prevTimestamp = timestamp;

  camera.updateEulerAngles(xRot, yRot, zRot);
  camera.rotateZ(-window.orientation);   

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  stars.render(camera);
}

function resetViewport() {
  canvas.width = window.innerWidth * DEVICE_PIXEL_RATIO;
  canvas.height = window.innerHeight * DEVICE_PIXEL_RATIO;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';

  if (window.orientation == 0) {
    camera.setProjectionMatrix(canvas.height / canvas.width * Y_FOV_LANDSCAPE, canvas.width/canvas.height);
  } else {
    camera.setProjectionMatrix(Y_FOV_LANDSCAPE, canvas.width/canvas.height);
  }

  gl.viewport(0, 0, canvas.width, canvas.height);
}

function updateOrientation(event) {
  if (event.webkitCompassHeading) {
    actualHeading = event.webkitCompassHeading + window.orientation;
    if (actualHeading > 360) {
      actualHeading -= 360;
    }
    if (actualHeading < 0) {
      actualHeading += 360;
    }
  }

  xRot = event.beta;
  yRot = event.gamma;
  zRot = event.alpha;
}
