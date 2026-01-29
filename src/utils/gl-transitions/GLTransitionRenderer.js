import { createShaderProgram, createTexture, loadImage } from './webgl-utils';
import { glTransitions } from './transitions';

/**
 * WebGL Transition Renderer for creating smooth transitions between images
 * Integrates with Fabric.js through offscreen canvas rendering
 * Uses official gl-transitions package
 */
export class GLTransitionRenderer {
  constructor(width = 800, height = 600) {
    this.width = width;
    this.height = height;
    this.canvas = null;
    this.gl = null;
    this.program = null;
    this.initialized = false;
    this.currentTransition = null;
    this.textures = {
      from: null,
      to: null
    };
    this.uniforms = {};
    this.attributes = {};
    
    this.init();
  }

  init() {
    try {
      // Create offscreen canvas
      this.canvas = document.createElement('canvas');
      this.canvas.width = this.width;
      this.canvas.height = this.height;

      // Get WebGL context
      this.gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
      
      if (!this.gl) {
        throw new Error('WebGL not supported');
      }

      // Basic setup
      this.gl.viewport(0, 0, this.width, this.height);
      this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
      
      // Enable alpha blending for proper opacity handling
      this.gl.enable(this.gl.BLEND);
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
      
      // Enable premultiplied alpha for canvas textures
      this.gl.pixelStorei(this.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      
      // WebGL initialized with alpha blending support
      
      // Create vertex buffer for full-screen quad
      this.createQuad();
      
      this.initialized = true;
} catch (error) {
      console.error('Failed to initialize GLTransitionRenderer:', error);
      this.initialized = false;
    }
  }

  createQuad() {
    const vertices = new Float32Array([
      -1.0, -1.0,  0.0, 0.0,  // bottom left
       1.0, -1.0,  1.0, 0.0,  // bottom right
      -1.0,  1.0,  0.0, 1.0,  // top left
       1.0,  1.0,  1.0, 1.0   // top right
    ]);

    this.quadBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quadBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
  }

  async loadTransition(transitionName, fromImageSrc, toImageSrc) {
    if (!this.initialized) {
      throw new Error('GLTransitionRenderer not initialized');
    }

    try {
      // Get transition from the official package
      const transition = glTransitions[transitionName];
      if (!transition) {
        throw new Error(`Transition "${transitionName}" not found`);
      }

      // Create shader program
      this.program = createShaderProgram(this.gl, transition.vertexShader, transition.fragmentShader);
      this.gl.useProgram(this.program);

      // Get attribute and uniform locations
      this.attributes = {
        position: this.gl.getAttribLocation(this.program, 'a_position'),
        texCoord: this.gl.getAttribLocation(this.program, 'a_texCoord')
      };

      this.uniforms = {
        progress: this.gl.getUniformLocation(this.program, 'progress'),
        resolution: this.gl.getUniformLocation(this.program, 'resolution'),
        ratio: this.gl.getUniformLocation(this.program, 'ratio'),
        from: this.gl.getUniformLocation(this.program, 'from'),
        to: this.gl.getUniformLocation(this.program, 'to')
      };
      
      // Get additional uniform locations for transition-specific parameters.
      // Include both defaultParams and declared paramsTypes keys so custom-only params are supported.
      const paramKeys = new Set([
        ...Object.keys(transition.defaultParams || {}),
        ...Object.keys(transition.paramsTypes || {}),
      ]);
      paramKeys.forEach(paramName => {
        if (!this.uniforms[paramName]) {
          this.uniforms[paramName] = this.gl.getUniformLocation(this.program, paramName);
        }
      });

      // Load textures
      const [fromTexture, toTexture] = await Promise.all([
        this.loadTexture(fromImageSrc),
        this.loadTexture(toImageSrc)
      ]);

      this.textures.from = fromTexture;
      this.textures.to = toTexture;
      this.currentTransition = transition;
return true;
    } catch (error) {
      console.error('Failed to load transition:', error);
      return false;
    }
  }

  async loadTexture(imageSrc) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      
      image.onload = () => {
        try {
          const texture = createTexture(this.gl, image);
          resolve(texture);
        } catch (error) {
          reject(error);
        }
      };
      
      image.onerror = () => {
        reject(new Error(`Failed to load image: ${imageSrc}`));
      };
      
      image.src = imageSrc;
    });
  }

  /**
   * Updates textures from canvas elements or data URLs
   * This allows updating textures with current fabric object state
   * @param {HTMLCanvasElement|string} fromSource - Canvas element or data URL for 'from' texture
   * @param {HTMLCanvasElement|string} toSource - Canvas element or data URL for 'to' texture
   * @returns {Promise<boolean>} Success status
   */
  async updateTextures(fromSource, toSource) {
    if (!this.initialized) {
      console.error('GLTransitionRenderer not initialized');
      return false;
    }

    if (!fromSource || !toSource) {
      console.error('Invalid sources for texture update');
      return false;
    }

    // Updating GL transition textures...

    try {
      // Load new textures first
      const [fromTexture, toTexture] = await Promise.all([
        this.loadTextureFromSource(fromSource),
        this.loadTextureFromSource(toSource)
      ]);

      if (!fromTexture || !toTexture) {
        console.error('Failed to create textures from sources');
        return false;
      }

      // Clean up existing textures only after new ones are successfully created
      if (this.textures.from) {
        this.gl.deleteTexture(this.textures.from);
      }
      if (this.textures.to) {
        this.gl.deleteTexture(this.textures.to);
      }

      this.textures.from = fromTexture;
      this.textures.to = toTexture;
      
      // GL transition textures updated successfully
      return true;
    } catch (error) {
      console.error('Failed to update textures:', error);
      return false;
    }
  }

  /**
   * Loads texture from various source types
   * @param {HTMLCanvasElement|string} source - Canvas element or data URL
   * @returns {Promise<WebGLTexture>} WebGL texture
   */
  async loadTextureFromSource(source) {
    return new Promise((resolve, reject) => {
      if (source instanceof HTMLCanvasElement) {
        // Direct canvas element
        // Loading texture from canvas
        
        try {
          const texture = createTexture(this.gl, source);
          if (texture) {
            // Successfully created texture from canvas
            resolve(texture);
          } else {
            reject(new Error('Failed to create texture from canvas'));
          }
        } catch (error) {
          console.error('Error creating texture from canvas:', error);
          reject(error);
        }
      } else if (typeof source === 'string') {
        // Data URL or regular URL
        // Loading texture from string source
        
        const image = new Image();
        image.crossOrigin = 'anonymous';
        
        image.onload = () => {
          // Image loaded for texture
          
          try {
            const texture = createTexture(this.gl, image);
            if (texture) {
              // Successfully created texture from image
              resolve(texture);
            } else {
              reject(new Error('Failed to create texture from image'));
            }
          } catch (error) {
            console.error('Error creating texture from image:', error);
            reject(error);
          }
        };
        
        image.onerror = (error) => {
          console.error('Failed to load image for texture:', error);
          reject(new Error(`Failed to load image from source`));
        };
        
        image.src = source;
      } else {
        console.error('Invalid source type for texture:', typeof source);
        reject(new Error('Invalid source type for texture'));
      }
    });
  }

  render(progress = 0, customParams = {}) {
    if (!this.initialized || !this.program || !this.textures.from || !this.textures.to) {
      console.warn('GL Transition render failed: missing requirements', {
        initialized: this.initialized,
        hasProgram: !!this.program,
        hasFromTexture: !!this.textures.from,
        hasToTexture: !!this.textures.to
      });
      return;
    }

    const gl = this.gl;

    // Clear canvas
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Use shader program
    gl.useProgram(this.program);

    // Bind vertex buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);

    // Set up position attribute
    gl.enableVertexAttribArray(this.attributes.position);
    gl.vertexAttribPointer(this.attributes.position, 2, gl.FLOAT, false, 16, 0);

    // Set up texture coordinate attribute
    gl.enableVertexAttribArray(this.attributes.texCoord);
    gl.vertexAttribPointer(this.attributes.texCoord, 2, gl.FLOAT, false, 16, 8);

    // Bind textures
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textures.from);
    gl.uniform1i(this.uniforms.from, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.textures.to);
    gl.uniform1i(this.uniforms.to, 1);

    // Set basic uniforms
    gl.uniform1f(this.uniforms.progress, Math.max(0, Math.min(1, progress)));
    gl.uniform2f(this.uniforms.resolution, this.width, this.height);
    gl.uniform1f(this.uniforms.ratio, this.width / this.height);

    // Set transition-specific uniforms using the transition's setUniforms function
    if (this.currentTransition && this.currentTransition.setUniforms) {
      this.currentTransition.setUniforms(gl, this.uniforms, customParams);
    }

    // Draw quad
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  getCanvas() {
    return this.canvas;
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
  }

  dispose() {
    if (this.gl) {
      if (this.textures.from) {
        this.gl.deleteTexture(this.textures.from);
      }
      if (this.textures.to) {
        this.gl.deleteTexture(this.textures.to);
      }
      if (this.quadBuffer) {
        this.gl.deleteBuffer(this.quadBuffer);
      }
      if (this.program) {
        this.gl.deleteProgram(this.program);
      }
      // Proactively release the WebGL context if possible to avoid exceeding context limits
      try {
        const loseContext = this.gl.getExtension('WEBGL_lose_context');
        if (loseContext && typeof loseContext.loseContext === 'function') {
          loseContext.loseContext();
        }
      } catch (e) {
        // no-op
      }
    }
    this.canvas = null;
    this.gl = null;
    this.initialized = false;
  }
} 