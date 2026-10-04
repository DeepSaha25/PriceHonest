import React, { memo, useEffect, useRef } from "react";
import * as THREE from 'three';
import { effectBudget, resizeEffect, startEffectRuntime } from '../../lib/effectRuntime';

// The original Emerald Horizon wave design, rendered with the shared, bounded
// clock instead of shipping a second Three.js version and a 2x-DPR render loop.
const HORIZON_SHADER = `
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_wave_scale;
uniform float u_variation;
uniform float u_glow;
uniform float u_vignette;
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform mat3 u_hue_rotation;
float hash(float n) { return fract(sin(n) * 1e4); }
float noise(float x) {
  float i = floor(x); float f = fract(x); float u = f * f * (3.0 - 2.0 * f);
  return mix(hash(i), hash(i + 1.0), u);
}
void main() {
  vec2 st = gl_FragCoord.xy / u_resolution.xy;
  float wave = sin(st.x * 3.0 + u_time * 0.5) * 0.1 * u_wave_scale
    + sin(st.x * 5.0 - u_time * 0.3) * 0.05 * u_wave_scale;
  float intensity = 1.0 - smoothstep(-0.1, 0.4, st.y + wave);
  intensity *= (noise(st.x * 2.0 + u_time * 0.1) * 0.5 + 0.5) * 1.5 * u_variation;
  vec3 color = vec3(0.0, 0.02, 0.0);
  color += mix(u_color1, u_color2, st.x + sin(u_time * 0.2) * 0.5) * pow(intensity, 1.5) * 1.2 * u_glow;
  color *= mix(1.0, 1.0 - smoothstep(0.5, 1.2, length(st - vec2(0.5, 0.0))), u_vignette);
  gl_FragColor = vec4(clamp(u_hue_rotation * color, 0.0, 1.0), 1.0);
}`;

export interface EmeraldHorizonBgProps {
  speed?: number;
  waveScale?: number;
  variation?: number;
  hue?: number;
  glow?: number;
  vignette?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const EmeraldHorizonBg = memo(function EmeraldHorizonBg({
  speed = 2.0,
  waveScale = 0.61,
  variation = 1.0,
  hue = -118,
  glow = 0.72,
  vignette = 0.28,
  className = "",
  style = {},
}: EmeraldHorizonBgProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const values = useRef({ speed, waveScale, variation, hue, glow, vignette });
  values.current = { speed, waveScale, variation, hue, glow, vignette };
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'low-power' }); } catch { return; }
    renderer.setClearColor('#09090b', 1);
    renderer.toneMapping = THREE.NoToneMapping;
    const budget = effectBudget();
    const uniforms = {
      u_time: { value: 0 }, u_resolution: { value: new THREE.Vector2(1, 1) },
      u_wave_scale: { value: waveScale }, u_variation: { value: variation },
      u_glow: { value: glow }, u_vignette: { value: vignette },
      u_color1: { value: new THREE.Color().setRGB(0.05, 0.8, 0.2) },
      u_color2: { value: new THREE.Color().setRGB(0, 1, 0.5) },
      u_hue_rotation: { value: new THREE.Matrix3() },
    };
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({ uniforms, vertexShader: 'void main(){gl_Position=vec4(position,1.0);}', fragmentShader: HORIZON_SHADER, depthWrite: false, depthTest: false });
    scene.add(new THREE.Mesh(geometry, material));
    let lastHue: number | undefined;
    const stop = startEffectRuntime(canvas, {
      canvas,
      resize: (scale) => { const size = resizeEffect(renderer, canvas, budget, scale); uniforms.u_resolution.value.set(size.width, size.height); },
      frame: (elapsed) => {
        const config = values.current;
        uniforms.u_time.value = elapsed * config.speed;
        uniforms.u_wave_scale.value = config.waveScale;
        uniforms.u_variation.value = config.variation;
        uniforms.u_glow.value = config.glow;
        uniforms.u_vignette.value = config.vignette;
        if (lastHue !== config.hue) {
          // Match the original CSS hue-rotate palette exactly, in the shader.
          // HSL rotation changes the brightness and can make this look washed out.
          const angle = config.hue * Math.PI / 180;
          const c = Math.cos(angle), s = Math.sin(angle);
          uniforms.u_hue_rotation.value.set(
            0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928,
            0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.140, 0.072 - c * 0.072 - s * 0.283,
            0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072,
          );
          lastHue = config.hue;
        }
        renderer.render(scene, camera);
      },
    });
    return () => {
      stop(); geometry.dispose(); material.dispose(); renderer.dispose();
      queueMicrotask(() => { if (!canvas.isConnected) renderer.forceContextLoss(); });
    };
  }, []);
  return (
    <div
      className={`fixed inset-0 pointer-events-none overflow-hidden ${className}`}
      style={{ zIndex: 0, isolation: 'isolate', background: 'radial-gradient(ellipse at 65% 100%, #722329 0%, #251019 35%, #09090b 75%)', ...style }}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Subtle radial vignette gradient to keep product cards and chart text readable */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(9,9,11,0.45) 0%, rgba(9,9,11,0.85) 100%)",
        }}
      />
    </div>
  );
});
