/**
 * Standard vertex shader for all transitions
 */
const standardVertexShader = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

/**
 * Convert gl-transitions format to our internal format
 */
function convertTransition(transition) {
  // Create fragment shader with the transition GLSL
  const fragmentShader = `
    #ifdef GL_ES
    precision mediump float;
    #endif
    
    uniform sampler2D from;
    uniform sampler2D to;
    uniform float progress;
    uniform vec2 resolution;
    uniform float ratio;
    
    varying vec2 v_texCoord;
    
    // Define the functions that gl-transitions expect
    vec4 getFromColor(vec2 uv) {
      return texture2D(from, uv);
    }
    
    vec4 getToColor(vec2 uv) {
      return texture2D(to, uv);
    }
    
    // Include the transition GLSL code
    ${transition.glsl}
    
    void main() {
      vec2 uv = v_texCoord;
      
      // Call the transition function
      vec4 color = transition(uv);
      
      gl_FragColor = color;
    }
  `;

  return {
    name: transition.name,
    author: transition.author,
    license: transition.license,
    vertexShader: standardVertexShader,
    fragmentShader: fragmentShader,
    defaultParams: transition.defaultParams || {},
    paramsTypes: transition.paramsTypes || {},
    setUniforms: (gl, uniforms, params = {}) => {
      // Set default parameters and any custom parameters
      const allParams = { ...transition.defaultParams, ...params };

      Object.entries(allParams).forEach(([key, value]) => {
        // Prefer precomputed uniform locations passed in from renderer
        const uniformLocation = uniforms && uniforms[key] ? uniforms[key] : null;
        if (!uniformLocation) {
          return;
        }

        const paramType = (transition.paramsTypes && transition.paramsTypes[key]) || (typeof value === 'number' ? 'float' : undefined);

        switch (paramType) {
          case 'float':
            gl.uniform1f(uniformLocation, value);
            break;
          case 'int':
            gl.uniform1i(uniformLocation, value);
            break;
          case 'bool':
            gl.uniform1i(uniformLocation, value ? 1 : 0);
            break;
          case 'vec2':
            gl.uniform2f(
              uniformLocation,
              value.x || value[0],
              value.y || value[1]
            );
            break;
          case 'vec3':
            gl.uniform3f(
              uniformLocation,
              value.x || value[0],
              value.y || value[1],
              value.z || value[2]
            );
            break;
          case 'vec4':
            gl.uniform4f(
              uniformLocation,
              value.x || value[0],
              value.y || value[1],
              value.z || value[2],
              value.w || value[3]
            );
            break;
          case 'ivec2':
            gl.uniform2i(
              uniformLocation,
              value.x || value[0] || value,
              value.y || value[1] || value
            );
            break;
          case 'ivec3':
            gl.uniform3i(
              uniformLocation,
              value.x || value[0],
              value.y || value[1],
              value.z || value[2]
            );
            break;
          case 'ivec4':
            gl.uniform4i(
              uniformLocation,
              value.x || value[0],
              value.y || value[1],
              value.z || value[2],
              value.w || value[3]
            );
            break;
          default:
            // Try to set as float by default
            if (typeof value === 'number') {
              gl.uniform1f(uniformLocation, value);
            }
        }
      });
    },
  };
}

// Create a promise that resolves when transitions are loaded
let transitionsLoadedPromise;
let glTransitions = {};
let availableTransitions = [];

async function initializeTransitions() {
  try {
    const GLTransitions = await import('gl-transitions');
    const transitions = GLTransitions.default || GLTransitions;
    // Convert all official transitions
    transitions.forEach(transition => {
      glTransitions[transition.name] = convertTransition(transition);
    });

    // Export list of available transition names for the UI
    availableTransitions = transitions.map(t => ({
      name: t.name,
      displayName: t.name
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim(),
      author: t.author,
      defaultParams: t.defaultParams || {},
      paramsTypes: t.paramsTypes || {},
    }));

    return { glTransitions, availableTransitions };
  } catch (error) {
    console.error('Failed to load GL transitions:', error);
    // Fallback to empty arrays but still resolve
    return { glTransitions: {}, availableTransitions: [] };
  }
}

// Initialize and store the promise
transitionsLoadedPromise = initializeTransitions();

// Export the promise and current values
export { transitionsLoadedPromise, glTransitions, availableTransitions };
