'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ThreeDashboardAnimation() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 300;
    const height = 140; // Fixed small height matching the layout

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 15;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Objects
    // 1. Rotating wireframe sphere representing data network
    const geometry = new THREE.IcosahedronGeometry(3.5, 1);
    const material = new THREE.MeshBasicMaterial({
      color: 0x6366f1, // Indigo
      wireframe: true,
      transparent: true,
      opacity: 0.15,
    });
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    // 2. Outer glowing points representing active member check-ins
    const particlesCount = 45;
    const positions = new Float32Array(particlesCount * 3);
    const velocities: number[] = [];

    for (let i = 0; i < particlesCount; i++) {
      // Random position on a sphere surface of radius 4.5
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 4.0 + Math.random() * 1.5;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      // Random rotational speeds
      velocities.push((Math.random() - 0.5) * 0.01); // X speed
      velocities.push((Math.random() - 0.5) * 0.01); // Y speed
    }

    const particlesGeometry = new THREE.BufferGeometry();
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Custom Canvas-based texture for round glowing particles
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
      grad.addColorStop(0, 'rgba(6, 182, 212, 1)'); // Cyan
      grad.addColorStop(1, 'rgba(6, 182, 212, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 16, 16);
    }
    const particleTexture = new THREE.CanvasTexture(canvas);

    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.5,
      map: particleTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);

    // Animation Loop
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Rotate sphere
      sphere.rotation.y += 0.003;
      sphere.rotation.x += 0.001;

      // Rotate particles in a different direction
      particles.rotation.y -= 0.002;
      particles.rotation.x += 0.0015;

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      particlesGeometry.dispose();
      particlesMaterial.dispose();
      particleTexture.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="w-full flex flex-col items-center select-none">
      <div ref={containerRef} className="w-full h-[140px] relative overflow-hidden" />
      <div className="flex items-center gap-1.5 justify-center -mt-2">
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
        <span className="text-[9px] font-bold tracking-widest text-slate-400 uppercase">Live 3D Check-in Stream</span>
      </div>
    </div>
  );
}
