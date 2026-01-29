// Complete list of GL transitions with their parameters
export const glTransitionDefinitions = [
  {
    "name": "Bounce",
    "displayName": "Bounce",
    "author": "Adrian Purser",
    "defaultParams": {
      "shadow_colour": [0, 0, 0, 0.6],
      "shadow_height": 0.075,
      "bounces": 3
    },
    "paramsTypes": {
      "shadow_colour": "vec4",
      "shadow_height": "float",
      "bounces": "float"
    }
  },
  {
    "name": "BowTieHorizontal",
    "displayName": "Bow Tie Horizontal",
    "author": "huynx",
    "defaultParams": {},
    "paramsTypes": {}
  },
  {
    "name": "BowTieVertical",
    "displayName": "Bow Tie Vertical",
    "author": "huynx",
    "defaultParams": {},
    "paramsTypes": {}
  },
  {
    "name": "ButterflyWaveScrawler",
    "displayName": "Butterfly Wave Scrawler",
    "author": "mandubian",
    "defaultParams": {
      "amplitude": 1,
      "waves": 30,
      "colorSeparation": 0.3
    },
    "paramsTypes": {
      "amplitude": "float",
      "waves": "float",
      "colorSeparation": "float"
    }
  },
  {
    "name": "CircleCrop",
    "displayName": "Circle Crop",
    "author": "fkuteken",
    "defaultParams": {
      "bgcolor": [0, 0, 0, 1]
    },
    "paramsTypes": {
      "bgcolor": "vec4"
    }
  },
  {
    "name": "ColourDistance",
    "displayName": "Colour Distance",
    "author": "P-Seebauer",
    "defaultParams": {
      "power": 5
    },
    "paramsTypes": {
      "power": "float"
    }
  },
  {
    "name": "CrazyParametricFun",
    "displayName": "Crazy Parametric Fun",
    "author": "mandubian",
    "defaultParams": {
      "a": 4,
      "b": 1,
      "amplitude": 120,
      "smoothness": 0.1
    },
    "paramsTypes": {
      "a": "float",
      "b": "float",
      "amplitude": "float",
      "smoothness": "float"
    }
  },
  {
    "name": "CrossZoom",
    "displayName": "Cross Zoom",
    "author": "rectalogic",
    "defaultParams": {
      "strength": 0.4
    },
    "paramsTypes": {
      "strength": "float"
    }
  },
  {
    "name": "Directional",
    "displayName": "Directional",
    "author": "Gaëtan Renaudeau",
    "defaultParams": {
      "direction": [0, 1]
    },
    "paramsTypes": {
      "direction": "vec2"
    }
  },
  {
    "name": "DoomScreenTransition",
    "displayName": "Doom Screen Transition",
    "author": "Zeh Fernando",
    "defaultParams": {
      "bars": 30,
      "amplitude": 2,
      "noise": 0.1,
      "frequency": 0.5,
      "dripScale": 0.5
    },
    "paramsTypes": {
      "bars": "int",
      "amplitude": "float",
      "noise": "float",
      "frequency": "float",
      "dripScale": "float"
    }
  },
  {
    "name": "Dreamy",
    "displayName": "Dreamy",
    "author": "mikolalysenko",
    "defaultParams": {},
    "paramsTypes": {}
  },
  {
    "name": "DreamyZoom",
    "displayName": "Dreamy Zoom",
    "author": "Zeh Fernando",
    "defaultParams": {
      "rotation": 6,
      "scale": 1.2
    },
    "paramsTypes": {
      "rotation": "float",
      "scale": "float"
    }
  },
  {
    "name": "GlitchDisplace",
    "displayName": "Glitch Displace",
    "author": "Matt DesLauriers",
    "defaultParams": {},
    "paramsTypes": {}
  },
  {
    "name": "GlitchMemories",
    "displayName": "Glitch Memories",
    "author": "Gunnar Roth",
    "defaultParams": {},
    "paramsTypes": {}
  },
  {
    "name": "GridFlip",
    "displayName": "Grid Flip",
    "author": "TimDonselaar",
    "defaultParams": {
      "size": [4, 4],
      "pause": 0.1,
      "dividerWidth": 0.05,
      "bgcolor": [0, 0, 0, 1],
      "randomness": 0.1
    },
    "paramsTypes": {
      "size": "ivec2",
      "pause": "float",
      "dividerWidth": "float",
      "bgcolor": "vec4",
      "randomness": "float"
    }
  },
  {
    "name": "InvertedPageCurl",
    "displayName": "Inverted Page Curl",
    "author": "Hewlett-Packard",
    "defaultParams": {},
    "paramsTypes": {}
  },
  {
    "name": "LinearBlur",
    "displayName": "Linear Blur",
    "author": "gre",
    "defaultParams": {
      "intensity": 0.1
    },
    "paramsTypes": {
      "intensity": "float"
    }
  },
  {
    "name": "Mosaic",
    "displayName": "Mosaic",
    "author": "Xaychru",
    "defaultParams": {
      "endx": 2,
      "endy": -1
    },
    "paramsTypes": {
      "endx": "int",
      "endy": "int"
    }
  },
  {
    "name": "PolkaDotsCurtain",
    "displayName": "Polka Dots Curtain",
    "author": "bobylito",
    "defaultParams": {
      "dots": 20,
      "center": [0, 0]
    },
    "paramsTypes": {
      "dots": "float",
      "center": "vec2"
    }
  },
  {
    "name": "Radial",
    "displayName": "Radial",
    "author": "Xaychru",
    "defaultParams": {
      "smoothness": 1
    },
    "paramsTypes": {
      "smoothness": "float"
    }
  },
  {
    "name": "SimpleZoom",
    "displayName": "Simple Zoom",
    "author": "0gust1",
    "defaultParams": {
      "zoom_quickness": 0.8
    },
    "paramsTypes": {
      "zoom_quickness": "float"
    }
  },
  {
    "name": "StereoViewer",
    "displayName": "Stereo Viewer",
    "author": "Ted Schundler",
    "defaultParams": {
      "zoom": 0.88,
      "corner_radius": 0.22
    },
    "paramsTypes": {
      "zoom": "float",
      "corner_radius": "float"
    }
  },
  {
    "name": "Swirl",
    "displayName": "Swirl",
    "author": "Sergey Kosarevsky",
    "defaultParams": {},
    "paramsTypes": {}
  },
  {
    "name": "WaterDrop",
    "displayName": "Water Drop",
    "author": "Paweł Płóciennik",
    "defaultParams": {
      "amplitude": 30,
      "speed": 30
    },
    "paramsTypes": {
      "amplitude": "float",
      "speed": "float"
    }
  },
  {
    "name": "ZoomInCircles",
    "displayName": "Zoom In Circles",
    "author": "dycm8009",
    "defaultParams": {},
    "paramsTypes": {}
  },
  {
    "name": "angular",
    "displayName": "Angular",
    "author": "Fernando Kuteken",
    "defaultParams": {
      "startingAngle": 90
    },
    "paramsTypes": {
      "startingAngle": "float"
    }
  },
  {
    "name": "burn",
    "displayName": "Burn",
    "author": "gre",
    "defaultParams": {
      "color": [0.9, 0.4, 0.2]
    },
    "paramsTypes": {
      "color": "vec3"
    }
  },
  {
    "name": "cannabisleaf",
    "displayName": "Cannabisleaf",
    "author": "@Flexi23",
    "defaultParams": {},
    "paramsTypes": {}
  },
  {
    "name": "circle",
    "displayName": "Circle",
    "author": "Fernando Kuteken",
    "defaultParams": {
      "center": [0.5, 0.5],
      "backColor": [0.1, 0.1, 0.1]
    },
    "paramsTypes": {
      "center": "vec2",
      "backColor": "vec3"
    }
  },
  {
    "name": "circleopen",
    "displayName": "Circleopen",
    "author": "gre",
    "defaultParams": {
      "smoothness": 0.3,
      "opening": true
    },
    "paramsTypes": {
      "smoothness": "float",
      "opening": "bool"
    }
  },
  {
    "name": "colorphase",
    "displayName": "Colorphase",
    "author": "gre",
    "defaultParams": {
      "fromStep": [0, 0.2, 0.4, 0],
      "toStep": [0.6, 0.8, 1, 1]
    },
    "paramsTypes": {
      "fromStep": "vec4",
      "toStep": "vec4"
    }
  },
  {
    "name": "crosshatch",
    "displayName": "Crosshatch",
    "author": "pthrasher",
    "defaultParams": {
      "center": [0.5, 0.5],
      "threshold": 3,
      "fadeEdge": 0.1
    },
    "paramsTypes": {
      "center": "vec2",
      "threshold": "float",
      "fadeEdge": "float"
    }
  },
  {
    "name": "crosswarp",
    "displayName": "Crosswarp",
    "author": "Eke Péter <peterekepeter@gmail.com>",
    "defaultParams": {},
    "paramsTypes": {}
  },
  {
    "name": "cube",
    "displayName": "Cube",
    "author": "gre",
    "defaultParams": {
      "persp": 0.7,
      "unzoom": 0.3,
      "reflection": 0.4,
      "floating": 3
    },
    "paramsTypes": {
      "persp": "float",
      "unzoom": "float",
      "reflection": "float",
      "floating": "float"
    }
  },
  {
    "name": "directionalwarp",
    "displayName": "Directionalwarp",
    "author": "pschroen",
    "defaultParams": {
      "direction": [-1, 1]
    },
    "paramsTypes": {
      "direction": "vec2"
    }
  },
  {
    "name": "directionalwipe",
    "displayName": "Directionalwipe",
    "author": "gre",
    "defaultParams": {
      "direction": [1, -1],
      "smoothness": 0.5
    },
    "paramsTypes": {
      "direction": "vec2",
      "smoothness": "float"
    }
  },
  {
    "name": "displacement",
    "displayName": "Displacement",
    "author": "Travis Fischer",
    "defaultParams": {
      "strength": 0.5
    },
    "paramsTypes": {
      "strength": "float"
    }
  },
  {
    "name": "doorway",
    "displayName": "Doorway",
    "author": "gre",
    "defaultParams": {
      "reflection": 0.4,
      "perspective": 0.4,
      "depth": 3
    },
    "paramsTypes": {
      "reflection": "float",
      "perspective": "float",
      "depth": "float"
    }
  },
  {
    "name": "fade",
    "displayName": "Fade",
    "author": "gre",
    "defaultParams": {},
    "paramsTypes": {}
  },
  {
    "name": "fadecolor",
    "displayName": "Fadecolor",
    "author": "gre",
    "defaultParams": {
      "color": [0, 0, 0],
      "colorPhase": 0.4
    },
    "paramsTypes": {
      "color": "vec3",
      "colorPhase": "float"
    }
  },
  {
    "name": "fadegrayscale",
    "displayName": "Fadegrayscale",
    "author": "gre",
    "defaultParams": {
      "intensity": 0.3
    },
    "paramsTypes": {
      "intensity": "float"
    }
  },
  {
    "name": "flyeye",
    "displayName": "Flyeye",
    "author": "gre",
    "defaultParams": {
      "size": 0.04,
      "zoom": 50,
      "colorSeparation": 0.3
    },
    "paramsTypes": {
      "size": "float",
      "zoom": "float",
      "colorSeparation": "float"
    }
  },
  {
    "name": "heart",
    "displayName": "Heart",
    "author": "gre",
    "defaultParams": {},
    "paramsTypes": {}
  },
  {
    "name": "hexagonalize",
    "displayName": "Hexagonalize",
    "author": "Fernando Kuteken",
    "defaultParams": {
      "steps": 50,
      "horizontalHexagons": 20
    },
    "paramsTypes": {
      "steps": "int",
      "horizontalHexagons": "float"
    }
  },
  {
    "name": "kaleidoscope",
    "displayName": "Kaleidoscope",
    "author": "nwoeanhinnogaehr",
    "defaultParams": {
      "speed": 1,
      "angle": 1,
      "power": 1.5
    },
    "paramsTypes": {
      "speed": "float",
      "angle": "float",
      "power": "float"
    }
  },
  {
    "name": "luma",
    "displayName": "Luma",
    "author": "gre",
    "defaultParams": {},
    "paramsTypes": {}
  },
  {
    "name": "luminance_melt",
    "displayName": "Luminance_melt",
    "author": "0gust1",
    "defaultParams": {
      "direction": true,
      "l_threshold": 0.8,
      "above": false
    },
    "paramsTypes": {
      "direction": "bool",
      "l_threshold": "float",
      "above": "bool"
    }
  },
  {
    "name": "morph",
    "displayName": "Morph",
    "author": "paniq",
    "defaultParams": {
      "strength": 0.1
    },
    "paramsTypes": {
      "strength": "float"
    }
  },
  {
    "name": "multiply_blend",
    "displayName": "Multiply_blend",
    "author": "Fernando Kuteken",
    "defaultParams": {},
    "paramsTypes": {}
  },
  {
    "name": "perlin",
    "displayName": "Perlin",
    "author": "Rich Harris",
    "defaultParams": {
      "scale": 4,
      "smoothness": 0.01,
      "seed": 12.9898
    },
    "paramsTypes": {
      "scale": "float",
      "smoothness": "float",
      "seed": "float"
    }
  },
  {
    "name": "pinwheel",
    "displayName": "Pinwheel",
    "author": "Mr Speaker",
    "defaultParams": {
      "speed": 2
    },
    "paramsTypes": {
      "speed": "float"
    }
  },
  {
    "name": "pixelize",
    "displayName": "Pixelize",
    "author": "gre",
    "defaultParams": {
      "squaresMin": [20, 20],
      "steps": 50
    },
    "paramsTypes": {
      "squaresMin": "ivec2",
      "steps": "int"
    }
  },
  {
    "name": "polar_function",
    "displayName": "Polar_function",
    "author": "Fernando Kuteken",
    "defaultParams": {
      "segments": 5
    },
    "paramsTypes": {
      "segments": "int"
    }
  },
  {
    "name": "randomsquares",
    "displayName": "Randomsquares",
    "author": "gre",
    "defaultParams": {
      "size": [10, 10],
      "smoothness": 0.5
    },
    "paramsTypes": {
      "size": "ivec2",
      "smoothness": "float"
    }
  },
  {
    "name": "ripple",
    "displayName": "Ripple",
    "author": "gre",
    "defaultParams": {
      "amplitude": 100,
      "speed": 50
    },
    "paramsTypes": {
      "amplitude": "float",
      "speed": "float"
    }
  },
  {
    "name": "rotate_scale_fade",
    "displayName": "Rotate_scale_fade",
    "author": "Fernando Kuteken",
    "defaultParams": {
      "center": [0.5, 0.5],
      "rotations": 1,
      "scale": 8,
      "backColor": [0.15, 0.15, 0.15, 1]
    },
    "paramsTypes": {
      "center": "vec2",
      "rotations": "float",
      "scale": "float",
      "backColor": "vec4"
    }
  },
  {
    "name": "squareswire",
    "displayName": "Squareswire",
    "author": "gre",
    "defaultParams": {
      "squares": [10, 10],
      "direction": [1, -0.5],
      "smoothness": 1.6
    },
    "paramsTypes": {
      "squares": "ivec2",
      "direction": "vec2",
      "smoothness": "float"
    }
  },
  {
    "name": "squeeze",
    "displayName": "Squeeze",
    "author": "gre",
    "defaultParams": {
      "colorSeparation": 0.04
    },
    "paramsTypes": {
      "colorSeparation": "float"
    }
  },
  {
    "name": "swap",
    "displayName": "Swap",
    "author": "gre",
    "defaultParams": {
      "reflection": 0.4,
      "perspective": 0.2,
      "depth": 3
    },
    "paramsTypes": {
      "reflection": "float",
      "perspective": "float",
      "depth": "float"
    }
  },
  {
    "name": "undulatingBurnOut",
    "displayName": "Undulating Burn Out",
    "author": "pthrasher",
    "defaultParams": {
      "smoothness": 0.03,
      "center": [0.5, 0.5],
      "color": [0, 0, 0]
    },
    "paramsTypes": {
      "smoothness": "float",
      "center": "vec2",
      "color": "vec3"
    }
  },
  {
    "name": "wind",
    "displayName": "Wind",
    "author": "gre",
    "defaultParams": {
      "size": 0.2
    },
    "paramsTypes": {
      "size": "float"
    }
  },
  {
    "name": "windowblinds",
    "displayName": "Windowblinds",
    "author": "Fabien Benetou",
    "defaultParams": {},
    "paramsTypes": {}
  },
  {
    "name": "windowslice",
    "displayName": "Windowslice",
    "author": "gre",
    "defaultParams": {
      "count": 10,
      "smoothness": 0.5
    },
    "paramsTypes": {
      "count": "float",
      "smoothness": "float"
    }
  },
  {
    "name": "wipeDown",
    "displayName": "Wipe Down",
    "author": "Jake Nelson",
    "defaultParams": {},
    "paramsTypes": {}
  },
  {
    "name": "wipeLeft",
    "displayName": "Wipe Left",
    "author": "Jake Nelson",
    "defaultParams": {},
    "paramsTypes": {}
  },
  {
    "name": "wipeRight",
    "displayName": "Wipe Right",
    "author": "Jake Nelson",
    "defaultParams": {},
    "paramsTypes": {}
  },
  {
    "name": "wipeUp",
    "displayName": "Wipe Up",
    "author": "Jake Nelson",
    "defaultParams": {},
    "paramsTypes": {}
  }
];
