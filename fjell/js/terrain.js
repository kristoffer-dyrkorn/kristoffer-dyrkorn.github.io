import * as THREE from "./three.module.js"
import Logger from "./logger.js"
import { OBJLoader } from "./OBJLoader.js"
import Tile from "./tile.js"

const MIN_EAST = -100000
const MIN_NORTH = 6400000
const TILE_EXTENTS = 12750

// const tileServer = "https://s3-eu-west-1.amazonaws.com/kd-flightsim/topography";
const tileServer = "meshes"

export default class Terrain {
  constructor(scene) {
    this.camera = scene.camera
    this.scene = scene.scene
    this.fontLoader = new THREE.FontLoader()

    // https://fonts.google.com/specimen/Open+Sans?preview.text_type=custom
    // https://gero3.github.io/facetype.js/
    this.fontLoader.load("fonts/open_sans_light.json", (font) => {
      this.font = font
    })

    this.tiles = []
  }

  loadTiles(position) {
    // given a location, find the lower left point of the surrounding tile
    const minx = Math.trunc((position.x - MIN_EAST) / TILE_EXTENTS) * TILE_EXTENTS + MIN_EAST
    const miny = Math.trunc((position.y - MIN_NORTH) / TILE_EXTENTS) * TILE_EXTENTS + MIN_NORTH

    Logger.log("Loading tiles and landscape features.")

    // load 3x3 tiles - where the center tile surrounds the input location
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        const tile = new Tile(x * TILE_EXTENTS + minx, y * TILE_EXTENTS + miny, this.camera, this.scene, this.font)
        this.tiles.push(tile)
        tile.load()
      }
    }
  }

  getHorizonTriangles(mesh) {
    const vertices = []

    const meshNormal = mesh.attributes.normal
    const meshPosition = mesh.attributes.position

    // for each input normal
    for (let i = 0; i < meshNormal.count; i += 3) {
      // if the z component is nearly 1.0 (ie the normal points nearly straight up)
      if (meshNormal.array[i + 2] > 0.98) {
        // add the triangle to the output geometry buffer
        vertices.push(meshPosition.array[i], meshPosition.array[i + 1], meshPosition.array[i + 2])
      }
    }

    const outputGeometry = new THREE.BufferGeometry()
    outputGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(vertices), 3))
    return outputGeometry
  }
}
