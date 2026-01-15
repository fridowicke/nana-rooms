import React, { useState, Suspense, useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stage, useGLTF, Environment, ContactShadows, Html, useProgress, KeyboardControls, useKeyboardControls } from '@react-three/drei'
import * as THREE from 'three'

const rooms = [
  "AIKO DETAILS WEB.glb",
  "AIKO WEB.glb",
  "ANDREA WEB.glb",
  "EIKO WEB.glb",
  "JASMINE WEB.glb",
  "KAORI WEB.glb",
  "KUMO&MUKI WEB.glb",
  "MEG WEB.glb",
  "MIMI WEB.glb",
  "MOENE WEB.glb",
  "MOMOCO WEB.glb",
  "PARDIS WEB.glb",
  "REI WEB.glb",
  "SAKURA WEB.glb",
  "SUZUNE DETAILS WEB.glb",
  "SUZUNE WEB.glb",
  "YUNA WEB.glb",
  "YURIA WEB.glb"
];

function CustomCursor({ isLandingPage }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });
      
      // Check if hovering over something clickable
      const target = e.target;
      const isClickable = target.closest('button, a, [onClick], [role="button"]') || 
                         target.style.cursor === 'pointer' ||
                         (target.tagName === 'DIV' && (target.onclick || target.style.cursor === 'none' && target.innerText.length < 20 && target.innerText.length > 0));
      setIsHovering(!!isClickable);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '60px',
      height: '60px',
      pointerEvents: 'none',
      zIndex: 10000,
      transform: `translate(${position.x}px, ${position.y}px) translate(-15%, -85%) scale(${isHovering ? 1.2 : 1})`,
      transition: 'transform 0.1s ease-out',
    }}>
      <img 
        src="assets/key.png" 
        style={{ 
          width: '100%', 
          height: '100%', 
          objectFit: 'contain',
          filter: isLandingPage ? 'grayscale(1) brightness(0)' : 'none',
        }} 
        alt="key cursor" 
      />
    </div>
  );
}

function Model({ url, isLandingPage }) {
  const { scene } = useGLTF(isLandingPage ? `assets/${url}` : `rooms/${url}`);
  return <primitive object={scene} />;
}

function Loader({ isLandingPage }) {
  const { progress } = useProgress()
  const primaryColor = isLandingPage ? '#000' : 'rgb(235, 83, 159)';
  return (
    <Html center>
      <div style={{
        color: isLandingPage ? '#000' : 'white',
        background: isLandingPage ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)',
        padding: '20px',
        borderRadius: '15px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        minWidth: '150px',
        border: isLandingPage ? '1px solid #000' : 'none'
      }}>
        <div style={{
          width: '100%',
          height: '4px',
          background: isLandingPage ? '#eee' : '#333',
          borderRadius: '2px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: primaryColor,
            transition: 'width 0.3s ease'
          }} />
        </div>
        <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
          Loading {Math.round(progress)}%
        </div>
      </div>
    </Html>
  )
}

function Controls() {
  const [, get] = useKeyboardControls()
  const { camera } = useThree()
  const controlsRef = useRef()
  const moveSpeed = 0.2 // Increased sensitivity for arrow buttons

  useFrame(() => {
    const { forward, backward, left, right } = get()
    
    if (forward || backward || left || right) {
      // Get the forward direction relative to the camera
      const forwardDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
      forwardDir.y = 0 // Keep movement on the horizontal plane
      forwardDir.normalize()

      // Get the right direction relative to the camera
      const rightDir = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
      rightDir.y = 0
      rightDir.normalize()

      const moveDir = new THREE.Vector3(0, 0, 0)
      if (forward) moveDir.add(forwardDir)
      if (backward) moveDir.sub(forwardDir)
      if (left) moveDir.sub(rightDir)
      if (right) moveDir.add(rightDir)

      if (moveDir.length() > 0) {
        moveDir.normalize().multiplyScalar(moveSpeed)
        camera.position.add(moveDir)
        if (controlsRef.current) {
          controlsRef.current.target.add(moveDir)
          controlsRef.current.update()
        }
      }
    }
  })

  return (
    <OrbitControls 
      ref={controlsRef} 
      makeDefault 
      rotateSpeed={0.4} 
      zoomSpeed={0.4} 
      panSpeed={0.4}
      enableDamping={true}
      dampingFactor={0.05}
    />
  )
}

const keyboardMap = [
  { name: 'forward', keys: ['ArrowUp', 'w', 'W'] },
  { name: 'backward', keys: ['ArrowDown', 's', 'S'] },
  { name: 'left', keys: ['ArrowLeft', 'a', 'A'] },
  { name: 'right', keys: ['ArrowRight', 'd', 'D'] },
]

export default function App() {
  const [isLandingPage, setIsLandingPage] = useState(true);
  const [roomIndex, setRoomIndex] = useState(() => Math.floor(Math.random() * rooms.length));
  const [activeModal, setActiveModal] = useState(null);

  const nextRoom = () => {
    if (isLandingPage) {
      setIsLandingPage(false);
    } else {
      setRoomIndex((prev) => (prev + 1) % rooms.length);
    }
  };

  const primaryColor = isLandingPage ? '#000' : 'rgb(235, 83, 159)';
  const bgColor = isLandingPage ? '#fff' : '#000';

  const cornerStyle = {
    position: 'absolute',
    color: primaryColor,
    fontWeight: '600',
    fontSize: '18px',
    cursor: 'none',
    zIndex: 10,
    padding: '30px',
    userSelect: 'none',
    transition: 'opacity 0.2s',
  };

  const modalOverlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: isLandingPage ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.85)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: primaryColor,
    backdropFilter: 'blur(5px)',
  };

  const modalContentStyle = {
    maxWidth: '600px',
    padding: '40px',
    border: `1px solid ${primaryColor}`,
    borderRadius: '20px',
    position: 'relative',
    backgroundColor: bgColor,
  };

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      position: 'relative',
      cursor: 'none',
      backgroundColor: bgColor
    }}>
      <CustomCursor isLandingPage={isLandingPage} />
      
      {/* Corner Links */}
      <div 
        style={{ ...cornerStyle, top: 0, left: 0 }}
        onClick={() => setActiveModal('cv')}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
      >
        CV
      </div>

      <div 
        style={{ ...cornerStyle, top: 0, right: 0 }}
        onClick={() => setActiveModal('publications')}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
      >
        Works
      </div>

      <div 
        style={{ ...cornerStyle, bottom: 0, right: 0 }}
        onClick={() => setActiveModal('knock')}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
      >
        knock knock
      </div>

      {/* Modals */}
      {activeModal && (
        <div style={modalOverlayStyle} onClick={() => setActiveModal(null)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <div 
              style={{ position: 'absolute', top: '20px', right: '20px', cursor: 'none', fontSize: '24px' }}
              onClick={() => setActiveModal(null)}
            >
              ×
            </div>

            {activeModal === 'cv' && (
              <div>
                <h2 style={{ marginTop: 0 }}>[NAME/TITLE]</h2>
                <p><strong>[PROFESSIONAL TITLE]</strong></p>
                <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
                <h3 style={{ borderBottom: '1px solid' }}>Experience</h3>
                <ul style={{ listStyleType: 'none', padding: 0 }}>
                  <li>• [Position Name] (20XX–Present)</li>
                  <li>• [Position Name] (20XX–20XX)</li>
                  <li>• [Position Name] (20XX–20XX)</li>
                </ul>
              </div>
            )}

            {activeModal === 'publications' && (
              <div>
                <h2 style={{ marginTop: 0 }}>Works</h2>
                <ul style={{ listStyleType: 'none', padding: 0, lineHeight: '2' }}>
                  <li><em>"[Project/Work Title]"</em> — [Venue/Publisher], [Year]</li>
                  <li><em>"[Project/Work Title]"</em> — [Venue/Publisher], [Year]</li>
                  <li><em>"[Project/Work Title]"</em> — [Venue/Publisher], [Year]</li>
                  <li><em>"[Project/Work Title]"</em> — [Venue/Publisher], [Year]</li>
                </ul>
              </div>
            )}

            {activeModal === 'knock' && (
              <div>
                <h2 style={{ marginTop: 0 }}>knock knock...</h2>
                <p>Who's there?</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
                  <input type="text" placeholder="Your Name" style={{ background: 'transparent', border: `1px solid ${primaryColor}`, padding: '10px', color: primaryColor, borderRadius: '5px', cursor: 'none' }} />
                  <textarea placeholder="Tell me about your room..." rows="4" style={{ background: 'transparent', border: `1px solid ${primaryColor}`, padding: '10px', color: primaryColor, borderRadius: '5px', cursor: 'none' }} />
                  <button style={{ background: primaryColor, color: bgColor, border: 'none', padding: '10px', borderRadius: '5px', fontWeight: 'bold', cursor: 'none' }}>Send message</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <KeyboardControls map={keyboardMap}>
        <Canvas shadows camera={{ position: [0, 0, 10], fov: 50 }} style={{ cursor: 'none' }}>
          {isLandingPage && <color attach="background" args={['#fff']} />}
          <Suspense fallback={<Loader isLandingPage={isLandingPage} />}>
            <Stage environment="city" intensity={0.5} contactShadows={{ opacity: 0.7, blur: 2 }}>
              <Model url={isLandingPage ? 'dollhouse.glb' : rooms[roomIndex]} isLandingPage={isLandingPage} />
            </Stage>
            <Controls />
          </Suspense>
        </Canvas>
      </KeyboardControls>

      {/* UI Overlay */}
      <div style={{
        position: 'absolute',
        bottom: '30px',
        left: '30px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        cursor: 'none',
        backgroundColor: 'transparent',
        padding: '12px',
        color: primaryColor,
        fontWeight: '600',
        userSelect: 'none',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 10,
        gap: '8px'
      }}
      onClick={nextRoom}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
        e.currentTarget.style.opacity = '0.8';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.opacity = '1';
      }}
      >
        <img 
          src="assets/home.png" 
          style={{ 
            width: '64px', 
            height: '64px', 
            objectFit: 'contain',
            filter: isLandingPage ? 'grayscale(1) brightness(0)' : 'none'
          }} 
          alt="home" 
        />
        <span style={{ fontSize: '16px', letterSpacing: '0.5px' }}>
          {isLandingPage ? 'first room' : 'next room'}
        </span>
      </div>
    </div>
  );
}

// Preload next model for smoother transitions
// This is optional but improves UX
// rooms.forEach(room => useGLTF.preload(`/rooms/${room}`));

