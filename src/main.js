import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(23, window.innerWidth / window.innerHeight, 0.1, 40);

const loader = new GLTFLoader();
const loadModelWithShader = (path, position, rotation, useShader) => {
    loader.load(path, function (gltf) {
        const model = gltf.scene;
        model.position.set(...position);
        model.rotation.set(...rotation.map(deg => THREE.MathUtils.degToRad(deg)));
        model.castShadow = true;
        model.receiveShadow = true;

        if (useShader) {
            const textureLoader = new THREE.TextureLoader();
            textureLoader.load('textures/TANPI.png', function (texture) {
                texture.flipY = false;

                const shaderMaterial = new THREE.ShaderMaterial({
                    uniforms: {
                        myTexture: { value: texture },
                        time: { value: 0.0 }
                    },
                    vertexShader: `
                        varying vec2 vUv;
                        void main() {
                            vUv = uv;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                        }
                    `,
                    fragmentShader: `
                    uniform sampler2D myTexture;
                    varying vec2 vUv;
                    
                    uniform float time;
                    
                    #define CA_AMT 0.0015 // Chromatic aberration amount
                    
                    // Noise function for subtle screen static
                    float random(vec2 uv) {
                        uv = mod(uv, 100.0); // Keeps values small to avoid precision loss
                        return fract(sin(dot(uv, vec2(127.1, 311.7))) * 43758.5453123);
                    }
                    
                    float noise(vec2 uv) {
                        return random(uv + time * 0.5); // Animated noise
                    }
                    
                    void main() {
                        // Fix flipped texture
                        vec2 fixedUV = vec2(vUv.x, 1.0 - vUv.y);
                        
                        // Chromatic Aberration: Slightly offset R, G, B channels
                        vec3 color;
                        color.r = texture2D(myTexture, fixedUV + vec2(CA_AMT, 0.0)).r;
                        color.g = texture2D(myTexture, fixedUV).g;
                        color.b = texture2D(myTexture, fixedUV - vec2(CA_AMT, 0.0)).b;
                    
                        // Scanline effect
                        if (mod(gl_FragCoord.y, 2.0) < 1.0) color *= 0.7; // Darken every other horizontal line
                        if (mod(gl_FragCoord.x, 3.0) < 1.0) color *= 0.9; // Slight pixel column effect
                    
                        // Noise overlay (optional)
                        float staticNoise = noise(fixedUV) * 0.25;
                        color += vec3(staticNoise);
                    
                        gl_FragColor = vec4(color, 1.0);
                    }
                    `,
                });

                model.traverse((child) => {
                    if (child.isMesh) {
                        child.material = shaderMaterial;
                        child.material.emissive = new THREE.Color(1, 1, 1);
                        child.material.emissiveIntensity = 10;
                    }
                });
            });
        }

        scene.add(model);
    }, undefined, error => console.error(`Error loading ${path}:`, error));
};

loadModelWithShader('models/Screen.glb', [-1.23, 1.03, 0.54], [0, -68, 0], true);

camera.position.set(0, 1, 7.66);

const loader1 = new GLTFLoader();
loader1.load('models/scene.glb', (gltf) => {
    scene.add(gltf.scene);
});

scene.fog = new THREE.FogExp2(0x1e1e45, 0.05);
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);

    scene.traverse((child) => {
        if (
            child.isMesh &&
            child.material instanceof THREE.ShaderMaterial &&
            child.material.uniforms.time
        ) {
            child.material.uniforms.time.value += 0.02;
        }
    });
}

animate();
