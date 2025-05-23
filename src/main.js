import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';

import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// Create GLTFLoader


RectAreaLightUniformsLib.init();
const loader = new GLTFLoader();
// Setup DRACO Loader
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
dracoLoader.setDecoderConfig({ type: 'js' });
loader.setDRACOLoader(dracoLoader);

const loadingScreen = document.createElement('div');
loadingScreen.classList.add('loading-screen');
loadingScreen.innerHTML = `
<div class="range" style="--p:0">
    <div class="range__label"></div>
</div>
`;
document.body.appendChild(loadingScreen);
const progressBar = document.querySelector('.range');


Promise.all([
        loadScene('models/Scene-200KB.glb'),
        loadModelWithShader('models/Screen-30KB.glb', [-1.23, 1.03, 0.54], [0, -68, 0], true) ])
        .then(([finalModel, screenModel]) => {
            scene.add(finalModel);
            scene.add(screenModel);

            progressBar.style.setProperty('--p', 100);
            document.body.querySelector('.loading-screen').remove();
            animate();
        })
        .catch((error) => console.error('Error loading models:', error));

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(23, window.innerWidth / window.innerHeight, 0.1, 40);

async function loadModelWithShader(path, position, rotation, useShader) {
    return new Promise((resolve, reject) => {
        loader.load(
            path,
            async (gltf) => {
                const model = gltf.scene;
                model.position.set(...position);
                model.rotation.set(...rotation.map(deg => THREE.MathUtils.degToRad(deg)));
                model.scale.set(1, 0.95, 0.95);
                model.castShadow = true;
                model.receiveShadow = true;
                resolve(gltf.scene);

                if (useShader) {
                    try {
                        const textureLoader = new THREE.TextureLoader();
                        const [baseColorMap, roughnessMap, metallicMap] = await Promise.all([
                            textureLoader.loadAsync('textures/TANPI.png'),
                            textureLoader.loadAsync('textures/Roughness.png'),
                            textureLoader.loadAsync('textures/Metallic.png')
                        ]);

                        const textureAspect = new THREE.Vector2(
                            baseColorMap.image.width,
                            baseColorMap.image.height
                        );

                        const shaderMaterial = new THREE.ShaderMaterial({
                            uniforms: {
                                myTexture: { value: baseColorMap },
                                roughnessMap: { value: roughnessMap },
                                metallicMap: { value: metallicMap },
                                lightPos: { value: new THREE.Vector3(10, 10, 10) },
                                cameraPos: { value: new THREE.Vector3(0, 1, 7.66) },
                                time: { value: 0.0 },
                                Flicker: { value: 0.0 },
                                modelAspect: { value: new THREE.Vector2(6, 5) },
                                textureAspect: { value: textureAspect }
                            },
                            vertexShader: ` 
                                varying vec2 vUv;
                                varying vec3 vNormal;
                                varying vec3 vWorldPosition;
                                void main() {
                                    vUv = uv;
                                    vNormal = normalize(normalMatrix * normal);
                                    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
                                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                                }
                            `,
                            fragmentShader: `
                                uniform sampler2D myTexture;
                                uniform sampler2D roughnessMap;
                                uniform sampler2D metallicMap;
                                
                                uniform vec3 lightPos;
                                uniform vec3 cameraPos;
                                
                                uniform vec2 modelAspect;
                                uniform vec2 textureAspect; 
                                
                                varying vec2 vUv;
                                varying vec3 vNormal;
                                varying vec3 vWorldPosition;
                                
                                #define CA_AMT 0.0015 
                                
                                uniform float time;
                                uniform float Flicker;
                                
                                float random(vec2 uv) {
                                    uv = mod(uv, 100.0);
                                    return fract(sin(dot(uv, vec2(127.1, 311.7))) * 43758.5453123);
                                }
                                
                                float noise(vec2 uv) {
                                    return random(uv + time * 0.5);
                                }
                                
                                void main() {
                                    float modelRatio = modelAspect.x / modelAspect.y;
                                    float textureRatio = textureAspect.x / textureAspect.y;

                                    vec2 scale = vec2(1.0);
                                    if (textureRatio > modelRatio) {
                                        scale.y = textureRatio / modelRatio;
                                    } else {
                                        scale.x = modelRatio / textureRatio;
                                    }

                                    vec2 fixedUV = (vUv - 0.45) * scale + 0.45;
                                    float roughness = texture2D(roughnessMap, vUv).r;
                                    float metallic = texture2D(metallicMap, vUv).r;
                                    
                                    vec3 color;
                                    color.r = texture2D(myTexture, fixedUV + vec2(CA_AMT, 0.0)).r;
                                    color.g = texture2D(myTexture, fixedUV).g;
                                    color.b = texture2D(myTexture, fixedUV - vec2(CA_AMT, 0.0)).b;
                                
                                    if (mod(gl_FragCoord.y, 2.0) < 1.0) color *= 0.7;
                                    if (mod(gl_FragCoord.x, 3.0) < 1.0) color *= 0.9;
                                
                                    float staticNoise = noise(fixedUV) * 0.2;
                                    color += vec3(staticNoise);
                                    metallic = ((metallic > 0.2) ? 1.0 : metallic * 1.5);
                                    color *= (1.0 - (roughness * 1.2));
                                    color *= metallic;
                                    color *= (Flicker > 0.5) ? Flicker : 1.0;

                                    gl_FragColor = vec4(color, 1.0);
                                }
                            `,
                        });

                        model.traverse((child) => {
                            if (child.isMesh) {
                                child.material = shaderMaterial;
                            }
                        });

                        console.log("Shader applied with correct texture aspect ratio!");
                    } catch (error) {
                        console.error("Error loading textures:", error);
                        reject(error);
                        return;
                    }
                }
            },
            (xhr) => {
                if (xhr.total) updateProgress(path, xhr.loaded, xhr.total);
            },
            (error) => reject(error)   
        );
    });
}


async function loadScene(path) {
    return new Promise((resolve, reject) => {
        loader.load(
            path,
            (gltf) => {
                resolve(gltf.scene);
            },
            (xhr) => {
                if (xhr.total) updateProgress(path, xhr.loaded, xhr.total);
            },
            (error) => reject(error)
        );
    });
}

let totalBytes = 0; 
let loadedBytes = 0; 
const trackedFiles = new Set(); 
const modelProgress = new Map(); 

function updateProgress(modelPath, loaded, total) {
    if (total === undefined || isNaN(total) || total <= 0) return; 

    if (!trackedFiles.has(modelPath)) {
        totalBytes += total; 
        trackedFiles.add(modelPath);
        modelProgress.set(modelPath, 0); 
    }

    let lastLoaded = modelProgress.get(modelPath) || 0; 
    let newLoaded = loaded - lastLoaded; 
    loadedBytes += Math.max(newLoaded, 0); 
    modelProgress.set(modelPath, loaded); 

    let progress = (loadedBytes / totalBytes) * 100;
    if(progress>100) progress = 100;
    progressBar.style.setProperty('--p', Math.round(progress));
}


const rectLight = new THREE.RectAreaLight(0xcccccc, 50, 0.6, 0.5); 
rectLight.position.set(-0.99, 1.23, 1.23); 
rectLight.rotation.set(0, THREE.MathUtils.degToRad(140+68), 0); 
scene.add(rectLight);

const baseX = 0;
const baseY = 1;
const baseZ = 7.66;

camera.position.set(0, 1, 7.66);


var Flicker;
scene.fog = new THREE.FogExp2(0x1e1e45, 0.05);
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    Flicker = Math.random();

    const time = performance.now() * 0.001;

    
    const wobbleX = Math.sin(time * 0.5) * 0.02;
    const wobbleY = Math.cos(time * 0.3) * 0.015;
    const wobbleZ = Math.sin(time * 0.4) * 0.01;

    camera.position.set(
        baseX + wobbleX,
        baseY + wobbleY,
        baseZ + wobbleZ
    );

    rectLight.intensity = 30+(Flicker*30);
    scene.traverse((child) => {
        if (
            child.isMesh &&
            child.material instanceof THREE.ShaderMaterial &&
            child.material.uniforms.time
        ) {
            child.material.uniforms.time.value += 0.02;
            child.material.uniforms.Flicker.value = Flicker;
        }
    });

    
}