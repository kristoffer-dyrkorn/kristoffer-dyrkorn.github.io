import * as THREE from "./three.module.js";

const SERVER = "https://s3-eu-west-1.amazonaws.com/kd-flightsim/";
// const SERVER = "";

const TILE_EXTENTS = 12750;

export default class Tile {
  constructor(x, y, camera, scene, font) {
    this.x = x;
    this.y = y;

    this.camera = camera;
    this.scene = scene;
    this.font = font;

    this.poiData = [];
    this.poiCollection = new THREE.Group();

    this.tileMesh = new THREE.Mesh();
    this.tileMesh.position.set(this.x, this.y, 0);

    this.tileMesh.geometry = new THREE.BufferGeometry();
    this.tileMesh.material = new THREE.MeshBasicMaterial();
    this.tileMesh.material.wireframe = true;
  }

  async load() {
    const tileURL = `${SERVER}meshes/${this.x}-${this.y}.msh`;
    console.log("Loading " + tileURL);

    const response = await fetch(tileURL, {
      mode: "cors",
      credentials: "omit",
    });
    console.log("Done reading " + tileURL);

    const buffer = await response.arrayBuffer();

    let offset = 0;
    const stride = Uint16Array.BYTES_PER_ELEMENT;

    const vertexCount = new Uint16Array(buffer, offset, 1)[0];
    offset += stride * 1; // read 1 uint16

    const vertices = new Uint16Array(buffer, offset, 3 * vertexCount);
    offset += stride * 3 * vertexCount; // 1 vertex = 3 coordinates

    const uvs = new Uint16Array(buffer, offset, 2 * vertexCount);
    offset += stride * 2 * vertexCount; // 1 vertex = 2 texture coordinates

    const triangleCount = new Uint16Array(buffer, offset, 1)[0];
    offset += stride * 1; // read 1 uint16

    const triangles = new Uint16Array(buffer, offset, 3 * triangleCount); // 1 triangle = 3 indices

    const posAttribute = new THREE.BufferAttribute(vertices, 3);
    const uvAttribute = new THREE.BufferAttribute(uvs, 2, true); // uv coordinates must be normalized, ie scaled to 0..1
    const indexAttribute = new THREE.BufferAttribute(triangles, 1);

    this.tileMesh.geometry.setAttribute("position", posAttribute);
    this.tileMesh.geometry.setAttribute("uv", uvAttribute);
    this.tileMesh.geometry.index = indexAttribute;

    this.scene.add(this.tileMesh);
    console.log("Added " + tileURL + " to scene");

    this.loadPois();
  }

  // read all pois for the tile
  // and store poi position info in the this.poiData array
  async loadPois() {
    const poiURL = `${SERVER}poi/${this.x}-${this.y}.json`;

    console.log("Loading " + poiURL);
    const features = await fetch(poiURL).then((response) => response.json());
    console.log("Loaded " + poiURL);
    console.log("Storing pois from " + poiURL);
    features.forEach((feature) => {
      // note: here, the absolute location is stored
      this.poiData.push({
        type: feature.type,
        name: feature.name,
        position: feature.position,
      });
    });

    console.log(
      `Done storing ${this.x}-${this.y}, ${this.poiData.length} features.`
    );
    // show pois using default values
    this.showPois(2000, 7000, 200, 3000, "Ås");
  }

  setVisible(visible) {
    this.tileMesh.visible = visible;
  }

  // using filters, create pois, add them to this.poiCollection and to the scene
  showPois(minDist, maxDist, minElev, maxElev, poiType) {
    console.log(`Removing current pois`);

    // first: remove all current pois from the scene
    this.scene.remove(this.poiCollection);

    // then, dispose all meshes generated from the old poi set
    this.poiCollection.children.forEach((poi) => {
      // a poi is a group of mesh elements, so traverse them
      poi.children.forEach((element) => {
        element.material.dispose();
        element.geometry.dispose();
      });
    });

    console.log(`Setting up new pois`);

    // set up a new poi collection
    this.poiCollection = new THREE.Group();

    this.poiData.forEach((feature) => {
      // scan all pois in the current tile while applying filters

      // check for poi type first
      if (feature.type === poiType.toLowerCase()) {
        const position = feature.position;

        // then, check the distance
        const distance =
          (position[0] - this.camera.position.x) *
            (position[0] - this.camera.position.x) +
          (position[1] - this.camera.position.y) *
            (position[1] - this.camera.position.y) +
          (position[2] - this.camera.position.z) *
            (position[2] - this.camera.position.z);

        if (distance > minDist * minDist && distance < maxDist * maxDist) {
          // if we are within the requested distances,

          // check if poi elevation is inside the filter criterion
          // if so, create and add poi
          if (position[2] > minElev && position[2] < maxElev) {
            const poi = this.buildPoi(feature.name);
            poi.position.set(position[0], position[1], position[2]);

            // rotate the poi so it faces the camera
            poi.rotateZ(
              270 * THREE.Math.DEG2RAD +
                Math.atan2(
                  poi.position.y - this.camera.position.y,
                  poi.position.x - this.camera.position.x
                )
            );

            this.poiCollection.add(poi);
            Tile.totalPois++;
          }
        }
      }
    });

    console.log(`Added ${this.poiCollection.children.length} pois`);
    this.scene.add(this.poiCollection);
  }

  buildPoi(name) {
    const poi = new THREE.Group();

    // poi base (a sphere at the poi position)
    const baseGeometry = new THREE.SphereGeometry(30, 8, 8);
    const baseMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);

    poi.add(base);

    // "sign pole", 300 m tall
    const poleLength = 300;
    const poleGeometry = new THREE.BoxGeometry(10, 10, poleLength);
    const poleMaterial = new THREE.MeshBasicMaterial();
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);

    // make pole end at the base
    // yay! pole position!
    pole.position.set(0, 0, poleLength / 2);

    poi.add(pole);

    // use distance to poi to make far signs larger (even out text sizes)
    //    const cameraDistance = this.camera.position.clone();
    //    cameraDistance.sub(pole.position);
    //    const fontSize = 100 + 0.01 * cameraDistance.length();

    // create poi sign text, 1 meter deep
    const textGeometry = new THREE.TextGeometry(name, {
      font: this.font,
      size: 150,
      height: 1,
    });
    textGeometry.computeBoundingSphere();

    const textMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
    });
    const text = new THREE.Mesh(textGeometry, textMaterial);

    // make text orthogonal to the xy plane
    text.rotateX(90 * THREE.Math.DEG2RAD);

    // center text and place on top of pole
    text.position.set(-textGeometry.boundingSphere.radius, 0, poleLength);

    poi.add(text);
    return poi;
  }
}

Tile.totalPois = 0;
