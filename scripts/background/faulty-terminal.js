/*! FaultyTerminal shader by David Haz / React Bits.
 * Adapted for this Jekyll home page. See /assets/licenses/react-bits.txt.
 * OGL is released under the Unlicense; see /assets/licenses/ogl.txt.
 */
import { Renderer, Program, Mesh, Triangle } from "ogl";

const vertexShader = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShader = `
precision mediump float;

varying vec2 vUv;

uniform float iTime;
uniform vec3  iResolution;
uniform float uScale;

uniform vec2  uGridMul;
uniform float uDigitSize;
uniform float uScanlineIntensity;
uniform float uGlitchAmount;
uniform float uFlickerAmount;
uniform float uNoiseAmp;
uniform float uChromaticAberration;
uniform float uDither;
uniform float uCurvature;
uniform vec3  uTint;
uniform vec2  uMouse;
uniform float uMouseStrength;
uniform float uUseMouse;
uniform float uPageLoadProgress;
uniform float uUsePageLoadAnimation;
uniform float uBrightness;
uniform float uLightMode;

float time;

float hash21(vec2 p){
  p = fract(p * 234.56);
  p += dot(p, p + 34.56);
  return fract(p.x * p.y);
}

float noise(vec2 p)
{
  return sin(p.x * 10.0) * sin(p.y * (3.0 + sin(time * 0.090909))) + 0.2; 
}

mat2 rotate(float angle)
{
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

float fbm(vec2 p)
{
  p *= 1.1;
  float f = 0.0;
  float amp = 0.5 * uNoiseAmp;
  
  mat2 modify0 = rotate(time * 0.02);
  f += amp * noise(p);
  p = modify0 * p * 2.0;
  amp *= 0.454545;
  
  mat2 modify1 = rotate(time * 0.02);
  f += amp * noise(p);
  p = modify1 * p * 2.0;
  amp *= 0.454545;
  
  mat2 modify2 = rotate(time * 0.08);
  f += amp * noise(p);
  
  return f;
}

float pattern(vec2 p, out vec2 q, out vec2 r) {
  vec2 offset1 = vec2(1.0);
  vec2 offset0 = vec2(0.0);
  mat2 rot01 = rotate(0.1 * time);
  mat2 rot1 = rotate(0.1);
  
  q = vec2(fbm(p + offset1), fbm(rot01 * p + offset1));
  r = vec2(fbm(rot1 * q + offset0), fbm(q + offset0));
  return fbm(p + r);
}

float digit(vec2 p){
    vec2 grid = uGridMul * 15.0;
    vec2 s = floor(p * grid) / grid;
    p = p * grid;
    vec2 q, r;
    float intensity = pattern(s * 0.1, q, r) * 1.3 - 0.03;
    
    if(uUseMouse > 0.5){
        vec2 mouseWorld = uMouse * uScale;
        float distToMouse = distance(s, mouseWorld);
        float mouseInfluence = exp(-distToMouse * 8.0) * uMouseStrength * 10.0;
        intensity += mouseInfluence;
        
        float ripple = sin(distToMouse * 20.0 - iTime * 5.0) * 0.1 * mouseInfluence;
        intensity += ripple;
    }
    
    if(uUsePageLoadAnimation > 0.5){
        float cellRandom = fract(sin(dot(s, vec2(12.9898, 78.233))) * 43758.5453);
        float cellDelay = cellRandom * 0.8;
        float cellProgress = clamp((uPageLoadProgress - cellDelay) / 0.2, 0.0, 1.0);
        
        float fadeAlpha = smoothstep(0.0, 1.0, cellProgress);
        intensity *= fadeAlpha;
    }
    
    p = fract(p);
    p *= uDigitSize;
    
    float px5 = p.x * 5.0;
    float py5 = (1.0 - p.y) * 5.0;
    float x = fract(px5);
    float y = fract(py5);
    
    float i = floor(py5) - 2.0;
    float j = floor(px5) - 2.0;
    float n = i * i + j * j;
    float f = n * 0.0625;
    
    float isOn = step(0.1, intensity - f);
    float brightness = isOn * (0.2 + y * 0.8) * (0.75 + x * 0.25);
    
    return step(0.0, p.x) * step(p.x, 1.0) * step(0.0, p.y) * step(p.y, 1.0) * brightness;
}

float onOff(float a, float b, float c)
{
  return step(c, sin(iTime + a * cos(iTime * b))) * uFlickerAmount;
}

float displace(vec2 look)
{
    float y = look.y - mod(iTime * 0.25, 1.0);
    float window = 1.0 / (1.0 + 50.0 * y * y);
    return sin(look.y * 20.0 + iTime) * 0.0125 * onOff(4.0, 2.0, 0.8) * (1.0 + cos(iTime * 60.0)) * window;
}

vec3 getColor(vec2 p){
    
    float bar = step(mod(p.y + time * 20.0, 1.0), 0.2) * 0.4 + 1.0;
    bar *= uScanlineIntensity;
    
    float displacement = displace(p);
    p.x += displacement;

    if (uGlitchAmount != 1.0) {
      float extra = displacement * (uGlitchAmount - 1.0);
      p.x += extra;
    }

    float middle = digit(p);
    
    const float off = 0.002;
    float sum = digit(p + vec2(-off, -off)) + digit(p + vec2(0.0, -off)) + digit(p + vec2(off, -off)) +
                digit(p + vec2(-off, 0.0)) + digit(p + vec2(0.0, 0.0)) + digit(p + vec2(off, 0.0)) +
                digit(p + vec2(-off, off)) + digit(p + vec2(0.0, off)) + digit(p + vec2(off, off));
    
    vec3 baseColor = vec3(0.9) * middle + sum * 0.1 * vec3(1.0) * bar;
    return baseColor;
}

vec2 barrel(vec2 uv){
  vec2 c = uv * 2.0 - 1.0;
  float r2 = dot(c, c);
  c *= 1.0 + uCurvature * r2;
  return c * 0.5 + 0.5;
}

void main() {
    time = iTime * 0.333333;
    vec2 uv = vUv;

    if(uCurvature != 0.0){
      uv = barrel(uv);
    }
    
    vec2 p = uv * uScale;
    vec3 col = getColor(p);

    if(uChromaticAberration != 0.0){
      vec2 ca = vec2(uChromaticAberration) / iResolution.xy;
      col.r = getColor(p + ca).r;
      col.b = getColor(p - ca).b;
    }

    col *= uTint;
    col *= uBrightness;

    if(uDither > 0.0){
      float rnd = hash21(gl_FragCoord.xy);
      col += (rnd - 0.5) * (uDither * 0.003922);
    }

    if (uLightMode > 0.5) {
      float energy = max(max(col.r, col.g), col.b);
      float coverage = clamp(smoothstep(0.0, 0.72, energy) * 0.9, 0.0, 0.9);
      vec3 ink = clamp(col * 0.42, 0.0, 0.76);
      col = mix(vec3(1.0), ink, coverage);
    }

    gl_FragColor = vec4(col, 1.0);
}
`;

const container = document.querySelector('[data-faulty-terminal]');
const toggle = document.querySelector('[data-background-toggle]');

if (container && toggle) {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const forcedColors = matchMedia('(forced-colors: active)');
  const increasedContrast = matchMedia('(prefers-contrast: more)');
  const reducedTransparency = matchMedia('(prefers-reduced-transparency: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  let effect = null;
  let paused = false;
  let failed = false;
  let pageActive = true;

  function createEffect() {
    const canvas = document.createElement('canvas');
    const attributes = { alpha: false, depth: false, antialias: false, powerPreference: 'low-power' };
    // Probe first: OGL assumes context creation succeeds. Reading remains usable
    // when WebGL is disabled, unavailable, or the shader cannot compile.
    const gl = canvas.getContext('webgl2', attributes) || canvas.getContext('webgl', attributes);
    if (!gl) return null;
    let geometry, program, observer;
    let frame = null;
    let lastFrame = null;
    let elapsed = 18;
    const mouse = [0.5, 0.5];
    const smoothMouse = new Float32Array(mouse);

    function stop() {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      lastFrame = null;
    }

    function destroy() {
      stop();
      observer?.disconnect();
      window.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('webglcontextlost', contextLost);
      geometry?.remove();
      program?.remove();
      canvas.remove();
      container.classList.remove('is-ready');
      toggle.hidden = true;
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }

    function contextLost(event) {
      event.preventDefault();
      failed = true;
      effect = null;
      destroy();
    }

    function pointerMove(event) {
      if (!finePointer.matches || paused || document.hidden || event.pointerType === 'touch') return;
      const rect = container.getBoundingClientRect();
      mouse[0] = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      mouse[1] = Math.max(0, Math.min(1, 1 - (event.clientY - rect.top) / rect.height));
    }

    try {
      const renderer = new Renderer({ canvas, ...attributes, dpr: 1 });
      gl.clearColor(0, 0, 0, 1);
      geometry = new Triangle(gl);
      program = new Program(gl, {
        vertex: vertexShader,
        fragment: fragmentShader,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          iTime: { value: elapsed },
          iResolution: { value: new Float32Array([1, 1, 1]) },
          uScale: { value: 1.5 },
          uGridMul: { value: new Float32Array([2, 1]) },
          uDigitSize: { value: 1.2 },
          uScanlineIntensity: { value: 0.3 },
          uGlitchAmount: { value: 0.35 },
          uFlickerAmount: { value: 0.25 },
          uNoiseAmp: { value: 1 },
          uChromaticAberration: { value: 0 },
          uDither: { value: 0 },
          uCurvature: { value: 0 },
          uTint: { value: new Float32Array([1, 0.83, 0.86]) },
          uMouse: { value: smoothMouse },
          uMouseStrength: { value: 0.2 },
          uUseMouse: { value: finePointer.matches ? 1 : 0 },
          uPageLoadProgress: { value: 1 },
          uUsePageLoadAnimation: { value: 0 },
          uBrightness: { value: 0.85 },
          uLightMode: { value: 0 }
        }
      });
      if (!gl.getProgramParameter(program.program, gl.LINK_STATUS)) throw new Error('Terminal shader unavailable');
      const mesh = new Mesh(gl, { geometry, program });

      function render() {
        program.uniforms.iTime.value = elapsed;
        program.uniforms.uUseMouse.value = finePointer.matches ? 1 : 0;
        renderer.render({ scene: mesh });
      }

      function resize() {
        const width = Math.max(1, container.clientWidth);
        const height = Math.max(1, container.clientHeight);
        // This fragment shader is expensive: cap both density and total pixels.
        renderer.dpr = Math.min(window.devicePixelRatio || 1, 1, Math.sqrt(720000 / (width * height)));
        renderer.setSize(width, height);
        program.uniforms.iResolution.value.set([canvas.width, canvas.height, width / height]);
        render();
      }

      function update(timestamp) {
        frame = null;
        if (document.hidden || paused || !pageActive) return;
        if (lastFrame === null) lastFrame = timestamp;
        const delta = timestamp - lastFrame;
        if (delta >= 1000 / 30) {
          elapsed += Math.min(delta, 100) * 0.00035;
          lastFrame = timestamp - (delta % (1000 / 30));
          smoothMouse[0] += (mouse[0] - smoothMouse[0]) * 0.12;
          smoothMouse[1] += (mouse[1] - smoothMouse[1]) * 0.12;
          render();
        }
        frame = requestAnimationFrame(update);
      }

      canvas.addEventListener('webglcontextlost', contextLost);
      window.addEventListener('pointermove', pointerMove, { passive: true });
      container.appendChild(canvas);
      resize();
      observer = new ResizeObserver(resize);
      observer.observe(container);
      container.classList.add('is-ready');
      toggle.hidden = false;
      return {
        destroy,
        sync() {
          stop();
          if (!paused && !document.hidden && pageActive) frame = requestAnimationFrame(update);
        }
      };
    } catch {
      destroy();
      return null;
    }
  }

  function sync() {
    if (!pageActive || reducedMotion.matches || forcedColors.matches || increasedContrast.matches || reducedTransparency.matches) {
      effect?.destroy();
      effect = null;
      return;
    }
    if (!effect && !failed && !document.hidden) {
      effect = createEffect();
      failed = !effect;
    }
    effect?.sync();
  }

  toggle.addEventListener('click', () => {
    paused = !paused;
    toggle.textContent = paused ? 'Resume background' : 'Pause background';
    sync();
  });
  [reducedMotion, forcedColors, increasedContrast, reducedTransparency].forEach(preference => preference.addEventListener('change', sync));
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pagehide', () => { pageActive = false; sync(); });
  window.addEventListener('pageshow', event => {
    if (event.persisted) { pageActive = true; failed = false; sync(); }
  });

  // Let the masthead image and initial page render finish before compiling WebGL.
  const schedule = () => {
    if ('requestIdleCallback' in window) window.requestIdleCallback(sync, { timeout: 1500 });
    else setTimeout(sync, 0);
  };
  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule, { once: true });
}
