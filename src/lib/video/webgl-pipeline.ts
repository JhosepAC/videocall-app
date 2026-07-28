export interface EnhancementConfig {
  enabled: boolean
  whiteBalance: number
  autoWhiteBalance: boolean
  brightness: number
  contrast: number
  saturation: number
  gamma: number
  sharpness: number
  denoise: number
}

export const DEFAULT_ENHANCEMENT: EnhancementConfig = {
  enabled: false,
  whiteBalance: 0,
  autoWhiteBalance: false,
  brightness: 0,
  contrast: 1,
  saturation: 1,
  gamma: 1,
  sharpness: 0,
  denoise: 0,
}

const VS = `#version 300 es
in vec2 a_pos;
in vec2 a_uv;
out vec2 v_uv;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
  v_uv = a_uv;
}`

const FS = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_frame;
uniform sampler2D u_prevFrame;
uniform vec2 u_texel;

uniform float u_wbTemp;
uniform float u_awbGainR;
uniform float u_awbGainB;
uniform float u_bright;
uniform float u_contrast;
uniform float u_saturate;
uniform float u_gamma;
uniform float u_sharp;
uniform float u_denoise;

vec3 gaussianBlur5(sampler2D tex, vec2 uv, vec2 t) {
  vec3 c = vec3(0.0);
  float k[25] = float[](
    1.,4.,7.,4.,1.,
    4.,16.,26.,16.,4.,
    7.,26.,41.,26.,7.,
    4.,16.,26.,16.,4.,
    1.,4.,7.,4.,1.
  );
  float s = 273.0;
  for (int y = -2; y <= 2; y++) {
    for (int x = -2; x <= 2; x++) {
      vec2 o = vec2(float(x), float(y)) * t;
      c += texture(tex, uv + o).rgb * k[(y+2)*5+(x+2)];
    }
  }
  return c / s;
}

vec3 bilateral3x3(sampler2D tex, vec2 uv, vec2 t, float sigmaR) {
  vec3 center = texture(tex, uv).rgb;
  vec3 accum = center;
  float wTotal = 1.0;
  float sigmaS = 1.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      if (x == 0 && y == 0) continue;
      vec2 o = vec2(float(x), float(y)) * t;
      vec3 s = texture(tex, uv + o).rgb;
      float ws = exp(-float(x*x + y*y) / (2.*sigmaS*sigmaS));
      float wr = exp(-length(s - center) / (2.*sigmaR*sigmaR));
      float w = ws * wr;
      accum += s * w;
      wTotal += w;
    }
  }
  return accum / wTotal;
}

void main() {
  vec3 color = texture(u_frame, v_uv).rgb;

  float luma = dot(color, vec3(0.299, 0.587, 0.114));
  float mask = smoothstep(0.01, 0.04, luma);

  if (u_denoise > 0.001) {
    vec3 prevColor = texture(u_prevFrame, v_uv).rgb;
    float diff = length(color - prevColor);
    float alphaMin = 0.08 + u_denoise * 0.15;
    float alpha = mix(alphaMin, 1.0, smoothstep(0.0, 0.05 + u_denoise * 0.1, diff));
    color = mix(prevColor, color, alpha);
  }

  if (u_denoise > 0.001) {
    float sigmaR = 0.02 + u_denoise * 0.12;
    color = bilateral3x3(u_frame, v_uv, u_texel, sigmaR);
  }

  if (abs(u_wbTemp) > 0.001 || abs(u_awbGainR - 1.0) > 0.001 || abs(u_awbGainB - 1.0) > 0.001) {
    float finalGainR = u_awbGainR * (1.0 + u_wbTemp * 0.12);
    float finalGainB = u_awbGainB * (1.0 - u_wbTemp * 0.12);
    color *= vec3(finalGainR, 1.0, finalGainB);
  }

  vec3 processed = color;

  processed = mix(vec3(dot(processed, vec3(0.299, 0.587, 0.114))), processed, u_saturate);

  processed += u_bright;
  processed = (processed - 0.5) * u_contrast + 0.5;

  processed = pow(clamp(processed, 0.0, 1.0), vec3(1.0 / u_gamma));

  if (u_sharp > 0.001) {
    vec3 blur = gaussianBlur5(u_frame, v_uv, u_texel);
    processed += (processed - blur) * u_sharp;
  }

  color = mix(color, processed, mask);

  fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}`

export class WebGLPipeline {
  private canvas: HTMLCanvasElement
  private gl: WebGL2RenderingContext | null = null
  private program: WebGLProgram | null = null
  private vao: WebGLVertexArrayObject | null = null
  private videoTex: WebGLTexture | null = null
  private prevTex: WebGLTexture | null = null
  private animId: number = 0
  private video: HTMLVideoElement | null = null
  private config: EnhancementConfig
  private outputStream: MediaStream | null = null
  private resizeObserver: ResizeObserver | null = null
  private frameCount: number = 0
  private awbGainR: number = 1
  private awbGainB: number = 1
  private awbCanvas: HTMLCanvasElement | null = null

  constructor(config: EnhancementConfig = DEFAULT_ENHANCEMENT) {
    this.config = { ...config }
    this.canvas = document.createElement('canvas')
    this.canvas.width = 640
    this.canvas.height = 480
    this.canvas.style.display = 'none'
    document.body.appendChild(this.canvas)

    const gl = this.canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      premultipliedAlpha: false,
    })
    if (!gl) {
      console.warn('[WebGL] WebGL2 not available')
      return
    }
    this.gl = gl

    const vs = this.compileShader(gl, gl.VERTEX_SHADER, VS)
    const fs = this.compileShader(gl, gl.FRAGMENT_SHADER, FS)
    if (!vs || !fs) return

    this.program = gl.createProgram()
    if (!this.program) return
    gl.attachShader(this.program, vs)
    gl.attachShader(this.program, fs)
    gl.linkProgram(this.program)
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.warn('[WebGL] Program link failed:', gl.getProgramInfoLog(this.program))
      return
    }

    this.videoTex = gl.createTexture()
    this.prevTex = gl.createTexture()

    const verts = new Float32Array([
      -1, -1, 0, 0,
       1, -1, 1, 0,
       1,  1, 1, 1,
      -1, -1, 0, 0,
       1,  1, 1, 1,
      -1,  1, 0, 1,
    ])
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW)

    this.vao = gl.createVertexArray()
    gl.bindVertexArray(this.vao)

    const aPos = gl.getAttribLocation(this.program, 'a_pos')
    const aUv = gl.getAttribLocation(this.program, 'a_uv')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0)
    gl.enableVertexAttribArray(aUv)
    gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 16, 8)
    gl.bindVertexArray(null)

    gl.useProgram(this.program)
    gl.uniform1i(gl.getUniformLocation(this.program, 'u_frame'), 0)
    gl.uniform1i(gl.getUniformLocation(this.program, 'u_prevFrame'), 1)

    this.resizeObserver = new ResizeObserver(() => this.syncCanvasSize())
  }

  private compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
    const s = gl.createShader(type)
    if (!s) return null
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('[WebGL] Shader compile error:', gl.getShaderInfoLog(s))
      gl.deleteShader(s)
      return null
    }
    return s
  }

  private syncCanvasSize() {
    const v = this.video
    if (!v || !v.videoWidth || !v.videoHeight) return
    const w = v.videoWidth
    const h = v.videoHeight
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w
      this.canvas.height = h
    }
  }

  private updateAWBGains() {
    const v = this.video
    const gl = this.gl
    if (!v || !gl || v.readyState < 2 || !v.videoWidth) return

    const w = 32
    const h = 32

    if (!this.awbCanvas) {
      this.awbCanvas = document.createElement('canvas')
      this.awbCanvas.width = w
      this.awbCanvas.height = h
    }
    const ctx = this.awbCanvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(v, 0, 0, w, h)
    const data = ctx.getImageData(0, 0, w, h).data

    let sumR = 0, sumG = 0, sumB = 0, count = 0
    for (let i = 0; i < data.length; i += 4) {
      sumR += data[i]
      sumG += data[i + 1]
      sumB += data[i + 2]
      count++
    }

    const avgR = sumR / count / 255
    const avgG = sumG / count / 255
    const avgB = sumB / count / 255

    if (avgR > 0.01 && avgB > 0.01 && avgG > 0.01) {
      this.awbGainR = avgG / avgR
      this.awbGainB = avgG / avgB
    }
  }

  attachVideo(video: HTMLVideoElement) {
    this.video = video
    this.resizeObserver?.observe(video)
    this.syncCanvasSize()
  }

  detachVideo() {
    this.resizeObserver?.unobserve(this.video!)
    this.video = null
  }

  updateConfig(config: Partial<EnhancementConfig>) {
    Object.assign(this.config, config)
  }

  start() {
    this.stop()
    const loop = () => {
      const gl = this.gl
      const v = this.video
      if (!gl || !v || !this.program || !this.vao) {
        this.animId = requestAnimationFrame(loop)
        return
      }

      if (!v.videoWidth || !v.videoHeight || v.readyState < 2) {
        this.animId = requestAnimationFrame(loop)
        return
      }

      this.syncCanvasSize()
      gl.viewport(0, 0, this.canvas.width, this.canvas.height)

      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, this.videoTex)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, v)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, this.prevTex)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

      this.frameCount++
      if (this.config.autoWhiteBalance && this.frameCount % 30 === 0) {
        this.updateAWBGains()
      }

      const cfg = this.config
      const enabled = cfg.enabled

      gl.useProgram(this.program)
      gl.uniform2f(gl.getUniformLocation(this.program, 'u_texel'), 1 / this.canvas.width, 1 / this.canvas.height)
      gl.uniform1f(gl.getUniformLocation(this.program, 'u_wbTemp'), enabled ? cfg.whiteBalance : 0)
      gl.uniform1f(gl.getUniformLocation(this.program, 'u_awbGainR'), enabled ? this.awbGainR : 1)
      gl.uniform1f(gl.getUniformLocation(this.program, 'u_awbGainB'), enabled ? this.awbGainB : 1)
      gl.uniform1f(gl.getUniformLocation(this.program, 'u_bright'), enabled ? cfg.brightness : 0)
      gl.uniform1f(gl.getUniformLocation(this.program, 'u_contrast'), enabled ? cfg.contrast : 1)
      gl.uniform1f(gl.getUniformLocation(this.program, 'u_saturate'), enabled ? cfg.saturation : 1)
      gl.uniform1f(gl.getUniformLocation(this.program, 'u_gamma'), enabled ? cfg.gamma : 1)
      gl.uniform1f(gl.getUniformLocation(this.program, 'u_sharp'), enabled ? cfg.sharpness : 0)
      gl.uniform1f(gl.getUniformLocation(this.program, 'u_denoise'), enabled ? cfg.denoise : 0)

      gl.bindVertexArray(this.vao)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
      gl.bindVertexArray(null)

      gl.bindTexture(gl.TEXTURE_2D, this.prevTex)
      gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGB, 0, 0, this.canvas.width, this.canvas.height, 0)

      this.animId = requestAnimationFrame(loop)
    }
    this.animId = requestAnimationFrame(loop)
  }

  stop() {
    if (this.animId) {
      cancelAnimationFrame(this.animId)
      this.animId = 0
    }
  }

  getOutputTrack(fps: number = 30): MediaStreamTrack | null {
    if (!this.outputStream) {
      this.outputStream = this.canvas.captureStream(fps)
    }
    return this.outputStream.getVideoTracks()[0] ?? null
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas
  }

  destroy() {
    this.stop()
    this.resizeObserver?.disconnect()
    const gl = this.gl
    if (gl) {
      gl.deleteTexture(this.videoTex)
      gl.deleteTexture(this.prevTex)
      gl.deleteProgram(this.program)
    }
    this.canvas.remove()
    this.outputStream?.getTracks().forEach(t => t.stop())
    this.outputStream = null
    this.gl = null
  }
}
