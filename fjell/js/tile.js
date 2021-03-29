import * as THREE from "./three.module.js"
import Logger from "./logger.js"
import { OBJLoader } from "./OBJLoader.js"

const tileServer = "meshes"
const poiServer = "poi"

export default class Tile {
  constructor(x, y, camera, scene, font) {
    this.x = x
    this.y = y

    this.camera = camera
    this.scene = scene
    this.font = font

    this.poiData = []
    this.poiCollection = new THREE.Group()
  }

  load() {
    const tileFile = `${this.x}-${this.y}.obj`
    const tileURL = `${tileServer}/${tileFile}`

    console.log("Loading " + tileURL)

    Tile.objLoader.load(
      tileURL,
      (object) => {
        this.tileMesh = object.children[0]

        const wireframeGeometry = new THREE.WireframeGeometry(this.tileMesh.geometry)
        const wireframeLines = new THREE.LineSegments(wireframeGeometry)
        wireframeLines.position.set(this.x, this.y, 0)

        this.scene.add(wireframeLines)
        this.loadPois()
      },
      (xhr) => {},
      (error) => {
        console.log("Could not load tile " + tileURL + ", " + error)
      }
    )
  }

  // read all pois for the tile
  // and store poi xy location info in the this.poiData array
  async loadPois() {
    const poiFile = `${this.x}-${this.y}.json`
    const poiURL = `${poiServer}/${poiFile}`

    console.log("Loading " + poiFile)

    const features = await fetch(poiURL).then((response) => response.json())
    features.forEach((feature) => {
      const position = feature.position
      position.push(0)

      // note: here, the absolute location is stored
      this.poiData.push({
        type: feature.type,
        name: feature.name,
        position: position,
      })
    })

    console.log("Done loading " + poiFile + ", " + this.poiData.length + " features.")

    // show pois using default values
    this.showPois(0, 36000, 0, 3000, "turisthytte")
  }

  // using filters, create pois, add them to this.poiCollection and to the scene
  showPois(minDist, maxDist, minElev, maxElev, poiType) {
    // todo: traverse all pois inside this.poiCollection
    // and remove them from scene and from memory

    this.poiData.forEach((feature) => {
      // scan all pois for this tile, applying specified filters
      // first, use the most easily calculated criterion
      if (feature.type === poiType) {
        const position = feature.position

        // then calculate poi distance to camera and use as criterion
        const distance =
          (position[0] - this.camera.position.x) * (position[0] - this.camera.position.x) +
          (position[1] - this.camera.position.y) * (position[1] - this.camera.position.y)

        if (distance > minDist * minDist && distance < maxDist * maxDist) {
          // now, perform the costly elevation calculation

          // mesh triangles use coordinates relative to tile corner
          // so also use that here for ray casting
          const poiPosition = new THREE.Vector3(position[0] - this.x, position[1] - this.y, 10000)

          // find poi elevation by raycasting from above at poi xy location and down against mesh
          const raycaster = new THREE.Raycaster()
          raycaster.set(poiPosition, new THREE.Vector3(0, 0, -1))
          const intersection = raycaster.intersectObject(this.tileMesh)
          position[2] = intersection[0].point.z

          // if elevation is inside bounds, create and add poi
          if (position[2] > minElev && position[2] < maxElev) {
            const poi = this.buildPoi(feature.name)
            // note: here we use absolute coordinates
            poi.position.set(position[0], position[1], position[2])

            // rotate the poi towards the camera
            poi.rotateZ(
              270 * THREE.Math.DEG2RAD +
                Math.atan2(poi.position.y - this.camera.position.y, poi.position.x - this.camera.position.x)
            )

            this.poiCollection.add(poi)
          }
        }
      }
    })

    this.scene.add(this.poiCollection)
  }

  buildPoi(name) {
    const poi = new THREE.Group()

    // poi base (a sphere at the poi position)
    const baseGeometry = new THREE.SphereGeometry(30, 8, 8)
    const baseMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
    })
    const base = new THREE.Mesh(baseGeometry, baseMaterial)

    poi.add(base)

    // "sign pole", 300 m tall
    const poleLength = 300
    const poleGeometry = new THREE.BoxGeometry(10, 10, poleLength)
    const poleMaterial = new THREE.MeshBasicMaterial()
    const pole = new THREE.Mesh(poleGeometry, poleMaterial)

    // make pole end at the base
    pole.position.set(0, 0, poleLength / 2)

    poi.add(pole)

    // use distance to poi to make far signs larger (even out text sizes)
    //    const cameraDistance = this.camera.position.clone();
    //    cameraDistance.sub(pole.position);
    //    const fontSize = 100 + 0.01 * cameraDistance.length();

    // create poi sign text, 1 meter deep
    const textGeometry = new THREE.TextGeometry(name, {
      font: this.font,
      size: 150,
      height: 1,
    })
    textGeometry.computeBoundingSphere()

    const textMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
    })
    const text = new THREE.Mesh(textGeometry, textMaterial)

    // make text orthogonal to the xy plane
    text.rotateX(90 * THREE.Math.DEG2RAD)

    // center text and place on top of pole
    text.position.set(-textGeometry.boundingSphere.radius, 0, poleLength)

    poi.add(text)
    return poi
  }
}

Tile.objLoader = new OBJLoader()
