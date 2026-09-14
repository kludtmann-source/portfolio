// WebGL-Rendering der Figur (SPEC §6.2): three.js lädt das GLB, rendert es als
// Wireframe (MeshBasicMaterial wireframe, Farbe aus Token) in der per Seed
// gewählten Pose. Statisches Einzelbild (kein Loop) — die Pose ist der Zustand,
// nicht eine laufende Animation. Wird nur dynamisch importiert (Budget §6.4).
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Pose } from '../lib/pose';

export interface FigureWebgl {
  repose(pose: Pose): void;
  resize(): void;
  dispose(): void;
}

interface Options {
  host: HTMLElement;
  glb: string;
  pose: Pose;
  color: string;
}

export async function createFigureWebgl({ host, glb, pose, color }: Options): Promise<FigureWebgl> {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(glb);
  const figure = gltf.scene;
  const lineColor = new THREE.Color(color || '#889');
  figure.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.material = new THREE.MeshBasicMaterial({ color: lineColor, wireframe: true });
    }
  });

  const scene = new THREE.Scene();
  scene.add(figure);
  const mixer = new THREE.AnimationMixer(figure);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const canvas = renderer.domElement;
  canvas.className = 'figure-canvas';
  canvas.setAttribute('aria-hidden', 'true');

  function applyPose(p: Pose): void {
    mixer.stopAllAction();
    const clip = gltf.animations.find((a) => a.name === p.clip) ?? gltf.animations[0];
    if (clip) {
      const action = mixer.clipAction(clip);
      action.reset();
      action.play();
      mixer.setTime(p.time * clip.duration);
    }
    figure.updateMatrixWorld(true);
  }

  function frame(): void {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    const aspect = w / h;

    const box = new THREE.Box3().setFromObject(figure);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    // Ganze Figur einpassen: Höhe und Breite mit Rand, beide garantiert sichtbar.
    const margin = 1.12;
    const contentHalfW = (size.x / 2) * margin;
    const contentHalfH = (size.y / 2) * margin;
    const halfH = Math.max(contentHalfH, contentHalfW / aspect);
    const halfW = halfH * aspect;
    camera.left = -halfW;
    camera.right = halfW;
    camera.top = halfH;
    camera.bottom = -halfH;
    camera.position.set(center.x, center.y, center.z + size.z + 10);
    camera.lookAt(center.x, center.y, center.z);
    camera.updateProjectionMatrix();

    renderer.setSize(w, h, false);
    renderer.render(scene, camera);
  }

  host.innerHTML = '';
  host.appendChild(canvas);
  applyPose(pose);
  frame();

  return {
    repose(p: Pose): void {
      applyPose(p);
      frame();
    },
    resize(): void {
      frame();
    },
    dispose(): void {
      renderer.dispose();
      canvas.remove();
    },
  };
}
