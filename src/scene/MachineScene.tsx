import { Component, Suspense, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Environment, Lightformer, OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { MachineModel } from './MachineModel';
import type { ModelProps } from './MachineModel';

export type CameraView = 'perspective' | 'front' | 'top' | 'rear';
function CameraRig({ view, reset }: { view: CameraView; reset: number }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera, size } = useThree();
  useEffect(() => {
    const views = {
      perspective: [8.1, 8.6, 12.2],
      front: [0, 8.1, 13.5],
      top: [0, 14, 4.6],
      rear: [-8, 8, -12],
    };
    const p = views[view];
    camera.position.set(p[0], p[1], p[2]);
    if ('fov' in camera) camera.fov = size.width / size.height < 0.85 ? 47 : 39;
    camera.updateProjectionMatrix();
    controls.current?.target.set(0, 2.0, -0.25);
    controls.current?.update();
  }, [view, reset, camera, size.width, size.height]);
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      target={[0, 2.0, -0.25]}
      minDistance={6}
      maxDistance={27}
      minPolarAngle={0.1}
      maxPolarAngle={Math.PI * 0.64}
      enableDamping
      dampingFactor={0.08}
    />
  );
}
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <div className="scene-fallback">
          <span className="eyebrow">3D VIEW UNAVAILABLE</span>
          <h2>This browser could not start WebGL.</h2>
          <p>
            Enable hardware acceleration and reload. The configuration, keyboard controls,
            laboratory, and electrical trace remain available.
          </p>
          <button onClick={() => window.location.reload()}>Reload 3D view</button>
        </div>
      );
    return this.props.children;
  }
}
export default function MachineScene(
  props: ModelProps & { view: CameraView; resetCamera: number },
) {
  return (
    <SceneBoundary>
      <Suspense
        fallback={
          <div className="scene-loading">
            <span className="loading-ring" />
            Preparing the machine…
          </div>
        }
      >
        <Canvas
          shadows
          dpr={[1, 1.7]}
          camera={{ position: [8.1, 8.6, 12.2], fov: 39, near: 0.1, far: 90 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          fallback={
            <div className="scene-fallback">
              WebGL is required for the 3D machine. You can still use the laboratory.
            </div>
          }
        >
          <fog attach="fog" args={['#1a211c', 23, 48]} />
          <ambientLight intensity={0.7} color="#d2dac4" />
          <hemisphereLight args={['#e5dfc9', '#2d3f2e', 1.2]} />
          <directionalLight
            position={[-4, 10, 6]}
            intensity={3.4}
            color="#ffe3b4"
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-left={-9}
            shadow-camera-right={9}
            shadow-camera-top={10}
            shadow-camera-bottom={-7}
            shadow-normalBias={0.025}
            shadow-bias={-0.0001}
          />
          <spotLight
            position={[5, 8, -6]}
            angle={0.65}
            penumbra={0.8}
            intensity={80}
            color="#c8dec8"
          />
          <Environment resolution={128} frames={1}>
            <Lightformer
              form="rect"
              intensity={2}
              position={[-5, 6, 3]}
              scale={[5, 8, 1]}
              rotation-y={Math.PI / 2}
              color="#fff0d3"
            />
            <Lightformer
              form="rect"
              intensity={1.4}
              position={[4, 5, -3]}
              scale={[4, 7, 1]}
              rotation-y={-Math.PI / 2}
              color="#ced8ce"
            />
          </Environment>
          <MachineModel {...props} />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
            <circleGeometry args={[35, 64]} />
            <meshStandardMaterial color="#242e25" roughness={0.97} metalness={0.05} />
          </mesh>
          <CameraRig view={props.view} reset={props.resetCamera} />
        </Canvas>
      </Suspense>
    </SceneBoundary>
  );
}
