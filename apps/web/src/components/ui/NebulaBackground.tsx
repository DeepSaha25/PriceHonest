import React, { memo, useEffect, useRef } from "react";
import * as THREE from "three";
import { effectBudget, resizeEffect, startEffectRuntime } from "../../lib/effectRuntime";

export interface NebulaBackgroundProps {
  className?: string;
  style?: React.CSSProperties;
}

const FRAGMENT_SHADER = `
  precision highp float;
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform vec2 u_mouse;

  vec3 mod289(vec3 x){return x - floor(x*(1.0/289.0))*289.0;}
  vec2 mod289(vec2 x){return x - floor(x*(1.0/289.0))*289.0;}
  vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}
  float snoise(vec2 v){
    const vec4 C = vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m; m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }
  float fbm(vec2 p){
    float v = 0.0; float a = 0.55;
    for(int i=0;i<4;i++){ v += a*snoise(p); p *= 2.05; a *= 0.5; }
    return v;
  }

  void main(){
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    vec2 p = uv;
    p.x *= u_resolution.x / u_resolution.y;

    float t = u_time * 0.05;
    vec2 drift = (u_mouse - 0.5) * 0.12;

    // warp coordinates for fluid motion
    vec2 st = p * 0.85 + drift;
    st += vec2(fbm(st + t), fbm(st - t)) * 0.35;

    vec3 col = vec3(0.005, 0.005, 0.012); // deep zinc base

    // main indigo mass, weighted to the right / upper-right
    vec2 c1 = vec2(u_resolution.x / u_resolution.y * 0.62, 0.85) + drift;
    float d1 = length(p - c1);
    float n1 = fbm(st * 1.4 + t * 2.0);
    // GLSL leaves smoothstep undefined when its edges are reversed. Some GPUs
    // wash out the colours, so use increasing edges and invert the result.
    float mass = 1.0 - smoothstep(0.05, 1.15, d1 + n1 * 0.32);

    // vertical sweeping tongue of light
    float tongue = (1.0 - smoothstep(0.02, 0.55, abs(p.x - (u_resolution.x/u_resolution.y*0.58) - n1*0.22))) * (1.0 - smoothstep(0.1, 1.2, abs(uv.y - 0.55)));

    // secondary far-right glow
    vec2 c2 = vec2(u_resolution.x / u_resolution.y * 1.05, 0.5);
    float d2 = length(p - c2);
    float mass2 = 1.0 - smoothstep(0.0, 0.9, d2 + fbm(st*1.1 - t)*0.25);

    vec3 deepIndigo = vec3(0.05, 0.02, 0.15);
    vec3 purple = vec3(0.2, 0.1, 0.6);
    vec3 hotViolet = vec3(0.5, 0.3, 1.0);

    col = mix(col, deepIndigo, clamp(mass*0.9 + mass2*0.7, 0.0, 1.0));
    col = mix(col, purple, clamp(mass*mass*1.1 + mass2*0.55, 0.0, 1.0));
    col += hotViolet * tongue * mass * 0.85;

    // breathing pulse
    float pulse = 0.92 + 0.08 * sin(u_time * 0.4);
    col *= pulse;

    // vignette
    float vig = 1.0 - smoothstep(0.35, 1.6, length(uv - vec2(0.45, 0.5)));
    col *= mix(0.55, 1.0, vig);

    // subtle side balance
    col *= mix(0.45, 1.0, smoothstep(0.0, 0.55, uv.x));

    gl_FragColor = vec4(col, 1.0);
  }
`;

export const NebulaBackground = memo(function NebulaBackground({ className = "", style = {} }: NebulaBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: "low-power",
    }); } catch { return; }
    renderer.setClearColor('#09090b', 1);
    renderer.toneMapping = THREE.NoToneMapping;
    const budget = effectBudget();

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const uniforms = {
      u_time: { value: 0 },
      u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: "void main(){ gl_Position = vec4(position, 1.0); }",
      fragmentShader: FRAGMENT_SHADER,
      depthWrite: false,
      depthTest: false,
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const mouseTarget = { x: 0.5, y: 0.5 };
    const handlePointerMove = (e: PointerEvent) => {
      mouseTarget.x = e.clientX / window.innerWidth;
      mouseTarget.y = 1.0 - e.clientY / window.innerHeight;
    };

    const pointer = matchMedia('(pointer: fine)').matches && !budget.reducedMotion;
    if (pointer) window.addEventListener("pointermove", handlePointerMove, { passive: true });
    const stop = startEffectRuntime(canvas, {
      canvas,
      resize: (scale) => {
        const size = resizeEffect(renderer, canvas, budget, scale);
        uniforms.u_resolution.value.set(size.width, size.height);
      },
      frame: (elapsed, delta) => {
        uniforms.u_time.value = elapsed;
        const smooth = 1 - Math.exp(-1.8 * delta);
        uniforms.u_mouse.value.x += (mouseTarget.x - uniforms.u_mouse.value.x) * smooth;
        uniforms.u_mouse.value.y += (mouseTarget.y - uniforms.u_mouse.value.y) * smooth;
        renderer.render(scene, camera);
      },
    });

    return () => {
      stop();
      window.removeEventListener("pointermove", handlePointerMove);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      // StrictMode reuses this React-owned canvas during its effect replay.
      // Release the context only after a real DOM unmount.
      queueMicrotask(() => { if (!canvas.isConnected) renderer.forceContextLoss(); });
    };
  }, []);

  return (
    <div
      className={`fixed inset-0 pointer-events-none overflow-hidden ${className}`}
      style={{ zIndex: 0, isolation: 'isolate', background: 'radial-gradient(ellipse at 65% 35%, #6330bc 0%, #321774 30%, #171033 55%, #09090b 85%)', ...style }}
      aria-hidden="true"
    >
      {/* WebGL Nebula Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {/* Grain overlay from before check deal bg.txt */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
           opacity: 0.035,
          mixBlendMode: "overlay",
          backgroundImage:
            "url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%224%22/%3E%3C/filter%3E%3Crect width=%22200%22 height=%22200%22 filter=%22url(%23n)%22/%3E%3C/svg%3E')",
        }}
      />

      {/* Soft readability vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(9,9,11,0.68) 100%)",
        }}
      />
    </div>
  );
});
