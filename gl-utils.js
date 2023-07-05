// helper functions for webgl

// create and compile a shader
function createShader(gl, type, source) {
  var shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader compilation error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

// create and link a program
function createProgram(gl, vertexShader, fragmentShader) {
  var program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Program linking error:", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

// create and configure a texture
function createTexture(gl, glTexture, width, height, framebuffer = null) {
  var texture = gl.createTexture();
  gl.activeTexture(glTexture);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    width,
    height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  if (framebuffer) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0
    );
  }

  return texture;
}

// full-screen triangle strip
const defaultVertices = [
  -1.0,
  -1.0, // Bottom left corner
  1.0,
  -1.0, // Bottom right corner
  -1.0,
  1.0, // Top left corner
  1.0,
  1.0, // Top right corner
];

// create a vertex buffer
function createVertexBuffer(gl, vertices = defaultVertices) {
  var buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  return buffer;
}

// pass current ARRAY_BUFFER to the vertex shader
function enableVertexBuffer(gl, attribLocation) {
  gl.enableVertexAttribArray(attribLocation);
  gl.vertexAttribPointer(attribLocation, 2, gl.FLOAT, false, 0, 0);
}

// fill entire screen
function fillFramebuffer(gl, width, height, framebuffer = null) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.viewport(0, 0, width, height);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

// get all attribute and uniform locations at once in a nice little object
function getAttribLocations(gl, program, ...args) {
  return args.reduce(
    (a, v) => ({ ...a, [v]: gl.getAttribLocation(program, v) }),
    {}
  );
}
function getUniformLocations(gl, program, ...args) {
  return args.reduce(
    (a, v) => ({ ...a, [v]: gl.getUniformLocation(program, v) }),
    {}
  );
}
