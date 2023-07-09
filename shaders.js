// fragment shaders

const tf3 = n => n.toFixed(3);

// main game of life shader
var morphShaderSource = `
    precision mediump float;
    uniform vec2 u_resolution;
    uniform sampler2D u_texture_last;

    void main() {
        vec2 st = gl_FragCoord.xy / u_resolution;
        vec4 c = texture2D(u_texture_last, st);
        float sum = c.r;
        
        vec2 st1 = fract((gl_FragCoord.xy + vec2(1.0, 0.0)) / u_resolution);
        sum += texture2D(u_texture_last, st1).r;
        vec2 st2 = fract((gl_FragCoord.xy + vec2(1.0, 1.0)) / u_resolution);
        sum += texture2D(u_texture_last, st2).r;
        vec2 st3 = fract((gl_FragCoord.xy + vec2(0.0, 1.0)) / u_resolution);
        sum += texture2D(u_texture_last, st3).r;
        vec2 st4 = fract((gl_FragCoord.xy + vec2(-1.0, 1.0)) / u_resolution);
        sum += texture2D(u_texture_last, st4).r;
        vec2 st5 = fract((gl_FragCoord.xy + vec2(-1.0, 0.0)) / u_resolution);
        sum += texture2D(u_texture_last, st5).r;
        vec2 st6 = fract((gl_FragCoord.xy + vec2(-1.0, -1.0)) / u_resolution);
        sum += texture2D(u_texture_last, st6).r;
        vec2 st7 = fract((gl_FragCoord.xy + vec2(0.0, -1.0)) / u_resolution);
        sum += texture2D(u_texture_last, st7).r;
        vec2 st8 = fract((gl_FragCoord.xy + vec2(1.0, -1.0)) / u_resolution);
        sum += texture2D(u_texture_last, st8).r;
        
        if (sum == 3.0) {
            gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
        } else if (sum == 4.0) {
            gl_FragColor = c;
        }
    }
`;

// enables drawing with a mouse when used in place of morph shader
var mouseShaderSource = `
    precision mediump float;
    uniform vec2 u_resolution;
    uniform vec2 u_cursor_position;
    uniform int u_mouse_button;
    uniform sampler2D u_texture_last;

    void main() {
        vec2 st = gl_FragCoord.xy / u_resolution;
        vec4 c = texture2D(u_texture_last, st);

        if (floor(gl_FragCoord.xy) == u_cursor_position && u_mouse_button > 0) {
            if (u_mouse_button == 1) {
                gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
            } else if (u_mouse_button == 2) {
                gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            } else {
                gl_FragColor = c;
            }
        } else {
            gl_FragColor = c;
        }
    }
`;

// populates the field with random bits
const randomAliveRatio = 0.15;
var randomShaderSource = `
    precision mediump float;
    uniform vec2 u_resolution;
    uniform float u_seed;

    // art of code's hash21: https://youtu.be/rvDo9LvfoVE
    float random (vec2 st) {
        st = fract(st * vec2(123.45, 456.78));
        st += dot(st, st + u_seed * 42.0);
        return fract(st.x * st.y);
    }
    
    void main() {
        if (random(gl_FragCoord.xy / u_resolution.xy) < ${tf3(
          randomAliveRatio
        )}) {
            gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
        } else {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        }
    }
`;

// handle transitions and scaling to viewport resolution
var renderShaderSource = `
    precision mediump float;
    uniform vec2 u_screen_resolution;
    uniform vec2 u_resolution;
    uniform sampler2D u_texture_last;
    uniform sampler2D u_texture_next;
    uniform float u_time;
    uniform vec2 u_offset;
    uniform float u_scale;

    void border(float w, vec2 st, vec4 color) {
        if (st.x < w) {
            gl_FragColor = color;
        }
        if (st.y < w) {
            gl_FragColor = color;
        }
        if (st.x > 1.0 - w) {
            gl_FragColor = color;
        }
        if (st.y > 1.0 - w) {
            gl_FragColor = color;
        }
    }

    float rect(vec2 st, vec2 xy, vec2 wh) {
        float x = step(xy.x, st.x) * step(st.x, xy.x + wh.x);
        float y = step(xy.y, st.y) * step(st.y, xy.y + wh.y);
        return x * y;
    }

    void main() {
        float aspectRatio = u_screen_resolution.x / u_screen_resolution.y;
        vec2 aspect = vec2(max(aspectRatio, 1.0), max(1.0 / aspectRatio, 1.0));
        vec2 st = (gl_FragCoord.xy / u_screen_resolution - 0.5) * aspect + 0.5;
        vec4 c = vec4(1.0, 1.0, 1.0, 1.0);
        vec4 white = c;
        
        // add a small padding
        st = st * 1.04 - 0.02;

        // draw scrollbars
        c *= rect(st, vec2(0.0, -0.01), vec2(1.0 * u_scale, 0.005))
            + rect(st, vec2(-0.01, 0.0), vec2(0.005, 1.0 * u_scale));
        c *= step(u_scale, 0.98);

        // add scale and offset
        st += u_offset;
        st *= u_scale;
        
        vec2 rv = 0.4 / u_resolution;
        vec2 cv = (floor(st * u_resolution) + 0.5) / u_resolution;
        float r = min(rv.x, rv.y);
        float l = length(st - cv);
        vec4 last = texture2D(u_texture_last, st);
        vec4 next = texture2D(u_texture_next, st);
        vec4 circle = mix(last, next, clamp(u_time * 4.0, 0.0, 1.0));
        circle.a = 1.0;

        vec4 zero = vec4(0.0, 0.0, 0.0, 1.0);
        float m = smoothstep(r + 0.002 * u_scale, r, l);
        circle = mix(zero, circle, m); // obtain final pixel color
        circle *= rect(st, vec2(0.0, 0.), vec2(1., 1.));

        gl_FragColor = c + circle;

        // border(0.0015, st, vec4(0.1, 0.1, 0.12, 1.0));
    }
`;

// vertex shader
var vertexShaderSource = `
    attribute vec2 a_position;
    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
    }
`;
