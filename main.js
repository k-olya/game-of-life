var options = {
  width: 64,
  height: 64,
  generationLifetime: 125,
};

// set initial canvas size
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
var gl = canvas.getContext("webgl");

// set maximum texture resolution to 4096 or as high as device supports
var maxWidth = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), 4096);
widthInput.max = Math.log2(maxWidth);
widthDiv.innerHTML = options.width;
timeDiv.innerHTML = options.generationLifetime;

// Create shaders
var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
var morphShader = createShader(gl, gl.FRAGMENT_SHADER, morphShaderSource);
var randomShader = createShader(gl, gl.FRAGMENT_SHADER, randomShaderSource);
var mouseShader = createShader(gl, gl.FRAGMENT_SHADER, mouseShaderSource);
var renderShader = createShader(gl, gl.FRAGMENT_SHADER, renderShaderSource);

// Create programs
var morphProgram = createProgram(gl, vertexShader, morphShader);
var randomProgram = createProgram(gl, vertexShader, randomShader);
var mouseProgram = createProgram(gl, vertexShader, mouseShader);
var renderProgram = createProgram(gl, vertexShader, renderShader);

// Look up attributes
var morphPositionLocation = gl.getAttribLocation(morphProgram, "a_position");
var randomPositionLocation = gl.getAttribLocation(randomProgram, "a_position");
var mousePositionLocation = gl.getAttribLocation(mouseProgram, "a_position");
var renderPositionLocation = gl.getAttribLocation(renderProgram, "a_position");

// Look up uniforms
var morphUniforms = getUniformLocations(
  gl,
  morphProgram,
  "u_resolution",
  "u_texture_last"
);
var randomUniforms = getUniformLocations(
  gl,
  randomProgram,
  "u_resolution",
  "u_seed"
);
var mouseUniforms = getUniformLocations(
  gl,
  mouseProgram,
  "u_resolution",
  "u_cursor_position",
  "u_mouse_button",
  "u_texture_last"
);
var renderUniforms = getUniformLocations(
  gl,
  renderProgram,
  "u_time",
  "u_resolution",
  "u_screen_resolution",
  "u_texture_last",
  "u_texture_next",
  "u_offset",
  "u_scale"
);

// Create vertex buffers and bind them to respective programs
var vertexBuffer = createVertexBuffer(gl);
enableVertexBuffer(gl, morphPositionLocation);
enableVertexBuffer(gl, randomPositionLocation);
enableVertexBuffer(gl, mousePositionLocation);
enableVertexBuffer(gl, renderPositionLocation);

// Create framebuffers for texture rendering
var texture0Framebuffer = gl.createFramebuffer();
var texture1Framebuffer = gl.createFramebuffer();

// Create two textures
var texture0 = createTexture(
  gl,
  gl.TEXTURE0,
  options.width,
  options.height,
  texture0Framebuffer
);
var texture1 = createTexture(
  gl,
  gl.TEXTURE1,
  options.width,
  options.height,
  texture1Framebuffer
);

// fill the initial texture with random values
gl.useProgram(randomProgram);
gl.uniform2f(randomUniforms.u_resolution, options.width, options.height);
gl.uniform1f(randomUniforms.u_seed, rand(0.1, 0.9));
fillFramebuffer(gl, options.width, options.height, texture0Framebuffer);

// render loop variables
let prevTime = 0;
let nextTexture = 0;
let mousex = 0;
let mousey = 0;
let mouseButton = 0;
let paused = false;
let aspectRatio;
let frameCounter = 0;
let secondStartTime = 0;
let scale = 1.0;
let offsetx = 0;
let offsety = 0;

// render loop
function renderLoop(time) {
  // request the next frame
  requestAnimationFrame(renderLoop);

  // update frame counter
  frameCounter++;
  if (!secondStartTime) {
    secondStartTime = time;
  }
  if (time - secondStartTime >= 1000.0) {
    performanceDiv.innerHTML =
      ((frameCounter / (time - secondStartTime)) * 1000.0).toFixed(2) + "fps";
    frameCounter = 0;
    secondStartTime = time;
  }

  const delta = time - prevTime;

  let t0, t1;
  // evolve pattern only once in a while
  if (delta >= options.generationLifetime && !paused) {
    prevTime = time;

    // draw game of life and measure performance
    gl.useProgram(morphProgram);
    gl.uniform2f(morphUniforms.u_resolution, options.width, options.height);
    gl.uniform1i(morphUniforms.u_texture_last, nextTexture);
    fillFramebuffer(
      gl,
      options.width,
      options.height,
      nextTexture === 0 ? texture1Framebuffer : texture0Framebuffer
    );

    nextTexture = Number(!nextTexture);
    t1 = nextTexture;
    t0 = Number(!nextTexture);
  } else if (mouseButton > 0) {
    gl.useProgram(mouseProgram);
    gl.uniform2f(mouseUniforms.u_resolution, options.width, options.height);
    gl.uniform2f(mouseUniforms.u_cursor_position, mousex, mousey);
    gl.uniform1i(mouseUniforms.u_mouse_button, mouseButton);

    gl.uniform1i(mouseUniforms.u_texture_last, nextTexture);
    fillFramebuffer(
      gl,
      options.width,
      options.height,
      nextTexture === 0 ? texture1Framebuffer : texture0Framebuffer
    );
    nextTexture = Number(!nextTexture);
    t1 = nextTexture;
    t0 = Number(!nextTexture);
  } else {
    t1 = Number(!nextTexture);
    t0 = nextTexture;
  }

  // Bind render program and set uniforms
  gl.useProgram(renderProgram);

  gl.uniform2f(renderUniforms.u_screen_resolution, canvas.width, canvas.height);
  gl.uniform2f(renderUniforms.u_resolution, options.width, options.height);
  gl.uniform1i(renderUniforms.u_texture_last, t1);
  gl.uniform1i(renderUniforms.u_texture_next, t0);

  gl.uniform2f(renderUniforms.u_offset, offsetx, offsety);
  gl.uniform1f(renderUniforms.u_scale, scale);

  gl.uniform1f(renderUniforms.u_time, delta / options.generationLifetime);
  // draw
  fillFramebuffer(gl, canvas.width, canvas.height);
}

// resize canvas with window
function resizeWindow() {
  canvas.height = window.innerHeight; // *  window.devicePixelRatio;
  canvas.width = window.innerWidth; // * window.devicePixelRatio;
  aspectRatio = canvas.width / canvas.height;
}

resizeWindow();
window.addEventListener("resize", resizeWindow);

// resize game field
function resizeGame(e) {
  let v = parseInt(e.target.value);

  // use logarithmic scale
  v = Math.floor(Math.pow(2, v));

  // resizing texture 0
  var newTextureFramebuffer = gl.createFramebuffer();
  var newTexture = createTexture(gl, gl.TEXTURE2, v, v, newTextureFramebuffer);

  gl.bindFramebuffer(gl.FRAMEBUFFER, texture0Framebuffer);

  var srcX = 0;
  var srcY = 0;
  var cropWidth = Math.min(options.width, v);
  var cropHeight = Math.min(options.height, v);
  gl.copyTexSubImage2D(
    gl.TEXTURE_2D,
    0,
    0,
    0,
    srcX,
    srcY,
    cropWidth,
    cropHeight
  );

  gl.deleteTexture(texture0);
  gl.deleteFramebuffer(texture0Framebuffer);
  texture0 = newTexture;
  texture0Framebuffer = newTextureFramebuffer;
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture0);

  // resizing texture 1
  newTextureFramebuffer = gl.createFramebuffer();
  newTexture = createTexture(gl, gl.TEXTURE2, v, v, newTextureFramebuffer);

  gl.bindFramebuffer(gl.FRAMEBUFFER, texture1Framebuffer);

  gl.copyTexSubImage2D(
    gl.TEXTURE_2D,
    0,
    0,
    0,
    srcX,
    srcY,
    cropWidth,
    cropHeight
  );

  gl.deleteTexture(texture1);
  gl.deleteFramebuffer(texture1Framebuffer);
  texture1 = newTexture;
  texture1Framebuffer = newTextureFramebuffer;
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, texture1);

  options.width = v;
  options.height = v;
  widthDiv.innerHTML = v;
}

// debounce resize to avoid resizing too many times
function debounce(func, delay) {
  let timeoutId;

  return function (...args) {
    clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}
widthInput.addEventListener("input", debounce(resizeGame, 5));

// change game speed
function setGenerationLifetime(e) {
  let v = parseInt(e.target.value);
  options.generationLifetime = v;
  timeDiv.innerHTML = v;
}
timeInput.addEventListener("input", setGenerationLifetime);

// fill the next texture with random values
function randomize() {
  gl.useProgram(randomProgram);
  gl.uniform2f(randomUniforms.u_resolution, options.width, options.height);
  gl.uniform1f(randomUniforms.u_seed, rand(0.1, 0.9));
  fillFramebuffer(
    gl,
    options.width,
    options.height,
    nextTexture === 0 ? texture0Framebuffer : texture1Framebuffer
  );
  resume();
}
randomButton.addEventListener("click", randomize);

// fill the next texture with zeroes
function clear() {
  gl.bindFramebuffer(
    gl.FRAMEBUFFER,
    nextTexture === 0 ? texture0Framebuffer : texture1Framebuffer
  );
  gl.clear(gl.COLOR_BUFFER_BIT);
  pause();
}
clearButton.addEventListener("click", clear);

// pause
function pause() {
  paused = true;
  pauseButton.style.display = "none";
  playButton.style.display = "block";
}
pauseButton.addEventListener("click", pause);

// resume
function resume() {
  paused = false;
  playButton.style.display = "none";
  pauseButton.style.display = "block";
}
playButton.addEventListener("click", resume);

// mouse controls
function mousedown(e) {
  if (!(e.ctrlKey || e.altKey || e.metaKey || e.shiftKey)) {
    mouseButton = e.buttons;
  }
  if (e.buttons !== 4) {
    pause();
  }
}
function mouseup(e) {
  mouseButton = 0;
}
function mousemove(e) {
  if (!(e.ctrlKey || e.altKey || e.metaKey || e.shiftKey)) {
    mouseButton = e.buttons;
  }
  let x = e.clientX;
  let y = e.clientY;
  let aspectRatio = canvas.width / canvas.height;
  let aspectX = Math.max(aspectRatio, 1.0);
  let aspectY = Math.max(1.0 / aspectRatio, 1.0);
  let mpx = (x / canvas.width - 0.5) * aspectX + 0.5;
  let mpy = (y / canvas.height - 0.5) * aspectY + 0.5;
  mpx = clamp(mpx * 1.02 - 0.01);
  mpy = 1.0 - clamp(mpy * 1.02 - 0.01);
  mousex = Math.floor(mpx * options.width);
  mousey = Math.floor(mpy * options.height);
}
function dblclick(e) {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    document.documentElement.requestFullscreen();
  }
}
canvas.addEventListener("mousedown", mousedown);
canvas.addEventListener("mouseup", mouseup);
canvas.addEventListener("mousemove", mousemove);
canvas.addEventListener("dblclick", dblclick);
function contextMenu(e) {
  if (
    !(e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) &&
    e.target === canvas
  ) {
    mouseButton = 2;
    return false;
  }
  return true;
}
window.oncontextmenu = contextMenu;

// mouse wheel
function mwheel(e) {
  let d = e.deltaY < 0 ? 1.5 : 0.66;
  scale = clamp(scale * d, 8.0 / options.width, 1.0);
}
window.addEventListener("wheel", mwheel);

// touch controls
function touchstart(e) {
  mouseButton = 1;
  pause();
}
function touchend(e) {
  mouseButton = 0;
}
function touchmove(e) {
  console.log(e);
  mousemove({
    buttons: 1,
    clientX: e.touches[0].clientX,
    clientY: e.touches[0].clientY,
  });
}
canvas.addEventListener("touchstart", touchstart);
canvas.addEventListener("touchend", touchend);
canvas.addEventListener("touchmove", touchmove);

// Start the render loop
renderLoop();
