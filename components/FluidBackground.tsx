"use client"

import { useEffect, useRef } from "react"

// フルスクリーン三角形（頂点バッファ不要、gl_VertexIDだけでNDC全体を覆う）
const VERTEX_SHADER = `#version 300 es
void main() {
  vec2 pos = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(pos * 2.0 - 1.0, 0.0, 1.0);
}`

// Ashima Arts simplex noise (3D) + Inigo Quilez流のdomain warpingで
// インクが混ざり合うような有機的な形状変化を作る。色はcosineパレットでゆっくり循環。
const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform vec2 uMouse;
out vec4 outColor;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

float fbm(vec3 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 3; i++) {
    value += amplitude * snoise(p);
    p *= 2.02;
    amplitude *= 0.5;
  }
  return value;
}

// domain warping: ノイズでノイズの座標そのものを歪ませ、大きな塊がゆっくり渦を巻くような
// 自然な流れを作る。warp量を控えめにして細かい渦にならず、大きく柔らかい形状変化に留める
float warp(vec3 p, float t) {
  vec2 q = vec2(
    fbm(p + vec3(0.0, 0.0, t)),
    fbm(p + vec3(5.2, 1.3, -t))
  );
  vec2 r = vec2(
    fbm(p + 1.4 * vec3(q, 0.0) + vec3(1.7, 9.2, t * 0.6)),
    fbm(p + 1.4 * vec3(q, 0.0) + vec3(8.3, 2.8, -t * 0.6))
  );
  return fbm(p + 1.4 * vec3(r, 0.0));
}

// R=G=Bを同じ値にすることで彩度ゼロの純粋なグレースケールにする。tは空間的なノイズ由来の値なので、
// 明暗の変化がそのまま有機的な渦模様として見える。
vec3 palette(float t) {
  float v = 0.82 + 0.14 * cos(6.28318 * t);
  return vec3(v);
}

float hash21(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;

  float t = uTime * 0.035;

  // マウスへごくわずかに流体が引き寄せられる程度の演出（滑らかに追従済みのuMouseを使用）
  vec2 toMouse = uv - uMouse;
  float dist = length(toMouse);
  float mouseInfluence = smoothstep(0.9, 0.0, dist) * 0.1;
  vec2 p = uv - (toMouse / (dist + 1e-4)) * mouseInfluence;

  // スケールを小さくする(=ズームアウト)ほど、塊が画面に対して大きく柔らかく見える
  float n = warp(vec3(p * 0.55, t), t);

  vec3 color = palette(n * 0.5 + t * 0.05);

  float vignette = smoothstep(1.6, 0.25, length(uv));
  color *= mix(0.92, 1.0, vignette);

  // 8bitのバンディングを避けるための微細なディザ
  color += (hash21(gl_FragCoord.xy + uTime) - 0.5) * 0.012;

  outColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}`

function createShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)
  if (!shader) throw new Error("シェーダーオブジェクトの作成に失敗しました")
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error(`シェーダーのコンパイルに失敗しました: ${info}`)
  }
  return shader
}

function createProgram(gl: WebGL2RenderingContext, vsSource: string, fsSource: string): WebGLProgram {
  const vs = createShader(gl, gl.VERTEX_SHADER, vsSource)
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource)
  const program = gl.createProgram()
  if (!program) throw new Error("プログラムオブジェクトの作成に失敗しました")
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program)
    gl.deleteProgram(program)
    throw new Error(`プログラムのリンクに失敗しました: ${info}`)
  }
  gl.deleteShader(vs)
  gl.deleteShader(fs)
  return program
}

/**
 * 液体/インクが混ざり合うような有機的なWebGL背景。フルスクリーン固定、他要素の邪魔をしないよう
 * pointer-events-noneかつ最背面(-z-10)に配置。KOTA (kota.co.uk) の「ゆっくり流れる有機的な
 * グラデーション」という表現を参考にしつつ、シェーダーはAshima simplex noise + IQ流domain warping
 * を用いた完全オリジナル実装。
 */
export function FluidBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "high-performance" })
    if (!gl) {
      console.warn("[FluidBackground] WebGL2に対応していないため背景アニメーションをスキップします。")
      return
    }

    let program: WebGLProgram
    try {
      program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER)
    } catch (err) {
      console.error("[FluidBackground]", err)
      return
    }

    gl.useProgram(program)

    const uResolution = gl.getUniformLocation(program, "uResolution")
    const uTime = gl.getUniformLocation(program, "uTime")
    const uMouse = gl.getUniformLocation(program, "uMouse")

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    let width = 0
    let height = 0

    function resize() {
      if (!canvas) return
      width = Math.max(1, Math.floor(window.innerWidth * dpr))
      height = Math.max(1, Math.floor(window.innerHeight * dpr))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
        gl!.viewport(0, 0, width, height)
      }
    }
    resize()
    window.addEventListener("resize", resize)

    // マウス位置はシェーダー側のuv座標系(中心が原点、y上向き、xはアスペクト比でスケール)に正規化し、
    // 毎フレーム線形補間して滑らかに追従させる(急な変化を避けるため)
    const mouseTarget = { x: 0, y: 0 }
    const mouseSmoothed = { x: 0, y: 0 }

    function handlePointerMove(e: PointerEvent) {
      const aspect = window.innerWidth / window.innerHeight
      mouseTarget.x = (e.clientX / window.innerWidth - 0.5) * aspect
      mouseTarget.y = -(e.clientY / window.innerHeight - 0.5)
    }
    window.addEventListener("pointermove", handlePointerMove)

    let rafId = 0
    const start = performance.now()

    function frame(now: number) {
      const elapsed = (now - start) / 1000
      mouseSmoothed.x += (mouseTarget.x - mouseSmoothed.x) * 0.025
      mouseSmoothed.y += (mouseTarget.y - mouseSmoothed.y) * 0.025

      gl!.uniform2f(uResolution, width, height)
      gl!.uniform1f(uTime, elapsed)
      gl!.uniform2f(uMouse, mouseSmoothed.x, mouseSmoothed.y)
      gl!.drawArrays(gl!.TRIANGLES, 0, 3)
      rafId = requestAnimationFrame(frame)
    }
    rafId = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener("resize", resize)
      window.removeEventListener("pointermove", handlePointerMove)
      gl.deleteProgram(program)
    }
  }, [])

  return (
    // z-index:0(負の値にはしない)。bodyのbackground-colorがビューポートへ伝播し、
    // 負のz-indexだと固定要素の手前に回り込んでしまうブラウザ実装があるため。
    // 他コンテンツの背面に置きたい場合はDOM上でこのコンポーネントを先に配置すること。
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed top-0 left-0 w-screen h-screen z-0 pointer-events-none"
    />
  )
}
