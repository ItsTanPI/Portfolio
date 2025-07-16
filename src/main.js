import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

window.sharedData = {
    isGameOpen: false,
    imageHover: null
};
window.sharedData.imageHover = null;
window.sharedData.isGameOpen = false;
const isMobile = /Mobi|Android/i.test(navigator.userAgent);


RectAreaLightUniformsLib.init();
const loader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();

// Setup DRACO Loader
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
dracoLoader.setDecoderConfig({ type: 'js' });
loader.setDRACOLoader(dracoLoader);

const progressBar = document.querySelector('.rangeLoad');
const renderer = new THREE.WebGLRenderer({ antialias: true,
    powerPreference: "high-performance", alpha: false, preserveDrawingBuffer: false
});
renderer.shadowMap.enabled = false;
const scene = new THREE.Scene();

var dosCanvas;
let canvasPromise = Promise.resolve();

if (true) // !isMobile) 
{
    Dos(document.getElementById("dos"), {url:"Game/SYSRA.zip", autoStart: true});

    canvasPromise = waitForCanvas(); 
}

if(!isMobile)
{

}



function waitForCanvas() 
{
    let checkInterval = setInterval(() => 
    {
        let canvas = document.getElementById("dos").querySelector("canvas"); 
        if (canvas) 
        {
            document.getElementById("dos").classList.add('hidediv');
            dosCanvas = canvas
            
        }
        clearInterval(checkInterval); 
    }, 100);
}


Promise.all([
    loadScene('models/Scene-400KB.glb'),
    loadModelWithShader('models/Screen-30KB.glb', [-1.23, 1.03, 0.54], [0, -68, 0], true) ]
    )
    .then(([finalModel, screenModel]) => {
        scene.add(finalModel);
        scene.add(screenModel);

        progressBar.style.setProperty('--p', 100);
        document.body.querySelector('.loading-screen').remove();
        waitForCanvas();
        animate();
        
        
    })
    .catch((error) => console.error('Error loading models:', error));

window.addEventListener('resize', handleResize);
window.addEventListener('load', handleResize); 

document.body.appendChild(renderer.domElement);

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
                model.castShadow = false;
                model.receiveShadow = false;
                resolve(gltf.scene);

                if (useShader) {
                    try {
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

                        // console.log("Shader applied with correct texture aspect ratio!");
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
if (!isMobile)
{
    scene.add(rectLight);
}

var baseX = 0;
var baseY = 1;
var baseZ = 7.66;

var cameraData = {
    position: null,
    rotation: null,
    fov: null
} 

function handleResize()
{
    const width = window.innerWidth
    const height = window.innerHeight;

    renderer.setSize(width, height);
    baseX = 0;

    if (camera.isPerspectiveCamera)
    {
        const minWidth = 768;   
        const maxWidth = 1500;  

        const clampedWidth = Math.max(minWidth, Math.min(width, maxWidth));
        var t = (clampedWidth - minWidth) / (maxWidth - minWidth);

        const targetFOV = THREE.MathUtils.lerp(45, 23, t);
        const targetRotationY = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(22, 0, t));
        baseX = THREE.MathUtils.lerp(1.62, 0, t);

        camera.fov = targetFOV;
        camera.rotation.set(0, targetRotationY, 0);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        camera.position.set(baseX, baseY, baseZ)
        cameraData.position = camera.position.clone();
        cameraData.rotation = camera.rotation.clone(); 
        cameraData.fov = camera.fov;
        // console.log(cameraData);

    }

    if(!isMobile)
    {
        document.getElementById("blurToggleHolder").style.display = "none";
    }
    else
    {
        document.getElementById("blurToggleHolder").style.display = "";
    }
}

function lerpCamera(camera, targetPos, targetRot, targetFov, deltaTime, speed = 5)
{
    const threshold = 0.000001; 

    if (!camera.position.equals(targetPos))
    {
        camera.position.lerp(targetPos, speed * deltaTime);

        if (camera.position.distanceToSquared(targetPos) < threshold * threshold)
        {
            camera.position.copy(targetPos);
        }
    }

    const targetQuat = new THREE.Quaternion().setFromEuler(targetRot);
    if (!camera.quaternion.equals(targetQuat))
    {
        camera.quaternion.slerp(targetQuat, speed * deltaTime);

        if (1 - camera.quaternion.dot(targetQuat) < threshold)
        {
            camera.quaternion.copy(targetQuat);
        }
    }

    if (Math.abs(camera.fov - targetFov) > threshold)
    {
        camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, speed * deltaTime);

        if (Math.abs(camera.fov - targetFov) < threshold)
        {
            camera.fov = targetFov;
        }
        camera.updateProjectionMatrix();
    }
}

const geometry = new THREE.PlaneGeometry(5, 5);
const material = new THREE.MeshBasicMaterial({ color: 0x000000 });
const plane = new THREE.Mesh(geometry, material);
plane.position.set(-10, 0, 0); // x, y, z
plane.scale.set(5, 10, 5);
plane.rotation.y = Math.PI/2 
scene.add(plane);


var Flicker;
scene.fog = new THREE.FogExp2(0x1e1e45, 0.05);


var dosTexture = new THREE.CanvasTexture(dosCanvas); 

const video = document.getElementById( 'video' );
var videoTexture = new THREE.VideoTexture( video );
videoTexture.colorSpace = THREE.SRGBColorSpace;

const PageContent = document.getElementById("PageContainer");
let lastLoadedImageUrl = null;
const whiteImageUrl = 'textures/TANPI.png';
let isTransitioning = false;
let transitionTimer = 0;
let pendingImageUrl = null;
var TRANSITION_DURATION = 0.25; // 0.25 seconds

function setTexture(mat, texture)
{
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.encoding = THREE.sRGBEncoding;

    mat.uniforms.myTexture.value = texture;
    mat.uniforms.textureAspect.value = new THREE.Vector2(
        texture.image.width,
        texture.image.height
    );
}

function getRelativePath(fullUrl) 
{
    const origin = window.location.origin + "/Portfolio";
    return fullUrl.startsWith(origin) ? fullUrl.replace(origin + '/', '') : fullUrl;
}

const fpsBuffer = [];
const deltaBuffer = [];
const maxSamples = 60;

function FPSstats(deltaTime)
{
    const fps = Math.floor(1 / deltaTime);

    // Push new data
    fpsBuffer.push(fps);
    deltaBuffer.push(deltaTime);

    // Keep only the latest 60 entries
    if (fpsBuffer.length > maxSamples)
    {
        fpsBuffer.shift();
        deltaBuffer.shift();
    }

    // Calculate averages
    const avgFPS = fpsBuffer.reduce((a, b) => a + b, 0) / fpsBuffer.length;
    const avgDelta = deltaBuffer.reduce((a, b) => a + b, 0) / deltaBuffer.length;

    // Update UI
    document.getElementById("FPS").innerText = 
        "FPS: " + String(Math.floor(avgFPS)).padStart(3, '0') + 
        " | Δt " + (avgDelta*1000).toFixed(1) + "ms";// + (window.devicePixelRatio*0.7).toFixed(1);    
}

function captureCanvas(mat, deltaTime)
{
    const imageDataRoot = window.sharedData.imageHover 
        ? document.getElementById(window.sharedData.imageHover) 
        : PageContent;

        const imageData = imageDataRoot?.querySelector('image-data');
        const videoData = imageDataRoot?.querySelector('video-data');
        
        // FPS display (disabled)
        FPSstats(deltaTime)
        // console.log(renderer.info.memory.textures);
        
    // console.log("isTransitioning: " + isTransitioning + "   " + "Hover: " + window.sharedData.imageHover + "  Image :" + imageData.querySelector('image-url')?.textContent|| null);
    if (isTransitioning)
    {
        handleTransition(mat, deltaTime);
        return;
    }
    if (window.sharedData.imageHover != null)
    {
        if (imageData)
        {
            handleImageData(mat, imageData);
        }
        else if (videoData)
        {
            handleVideoData(mat, videoData);
        }
        else if (dosCanvas)
        {
            if (mat.uniforms.myTexture.value) 
            {
                mat.uniforms.myTexture.value.dispose();
            }
            handleDosCanvas(mat);
        }
    }
    else
    {
        if (videoData)
        {
            handleVideoData(mat, videoData);
        }
        else if (imageData)
        {
            handleImageData(mat, imageData);
        }
        else if (dosCanvas)
        {
            if (mat.uniforms.myTexture.value) 
            {
                mat.uniforms.myTexture.value.dispose();
            }
            handleDosCanvas(mat);
        }
        else
        {
            textureLoader.load(whiteImageUrl, (whiteTex) =>
            {
                mat.uniforms.myTexture.value.dispose();
                setTexture(mat, whiteTex);
                transitionTimer = 0;
                isTransitioning = true;
                pendingImageUrl = 'game';
            });

        }
    }    
}

function handleTransition(mat, deltaTime)
{
    mat.uniforms.Flicker.value = 5.0;
    rectLight.color.set(0xffffff);
    transitionTimer += deltaTime;

    if (transitionTimer < TRANSITION_DURATION) return;

    if (!pendingImageUrl)
    {
        resetTransitionState();
        return;
    }

    if (pendingImageUrl === 'game')
    {
        completeTransition('game');
        return;
    }

    if (pendingImageUrl.startsWith('video'))
    {
        const videoURL = pendingImageUrl.slice(5);
        completeTransition('video' + getRelativePath(video.src));
        return;
    }

    textureLoader.load(
        pendingImageUrl,
        (newTex) =>
        {
            mat.uniforms.myTexture.value.dispose();
            setTexture(mat, newTex);
            lastLoadedImageUrl = pendingImageUrl;
            pendingImageUrl = null;
            resetTransitionState();
        },
        undefined,
        () =>
        {
            resetTransitionState();
            lastLoadedImageUrl = null;
        }
    );
}

function handleImageData(mat, imageData)
{
    const imageUrl = imageData.querySelector('image-url')?.textContent || null;
    const commonColor = imageData.querySelector('common-color')?.textContent || null;

    if (commonColor && commonColor !== 'null')
    {
        rectLight.color.set(commonColor);
    }


    if (imageUrl && imageUrl !== 'null' && imageUrl !== lastLoadedImageUrl)
    {
        textureLoader.load(whiteImageUrl, (whiteTex) =>
        {
            mat.uniforms.myTexture.value.dispose();
            setTexture(mat, whiteTex);
            transitionTimer = 0;
            isTransitioning = true;
            pendingImageUrl = imageUrl;
        });
    }
}

function handleVideoData(mat, videoData)
{
    const videoURL = videoData.querySelector('video-url')?.textContent || null;

    const isDifferentVideo = 
        lastLoadedImageUrl && lastLoadedImageUrl.startsWith('video') && lastLoadedImageUrl.slice(5) !== videoURL;

    if ( lastLoadedImageUrl && (isDifferentVideo || !lastLoadedImageUrl.startsWith('video')))
    {

        video.src = videoURL;
        textureLoader.load(whiteImageUrl, (whiteTex) =>
        {
            mat.uniforms.myTexture.value.dispose();
            setTexture(mat, whiteTex);
            transitionTimer = 0;
            isTransitioning = true;
            pendingImageUrl = 'video' + videoURL;
        });
    }
    else
    {
        lastLoadedImageUrl = 'video' + videoURL;
        video.play();

        const commonColor = videoData.querySelector('common-color')?.textContent || null;
        if (commonColor && commonColor !== 'null')
        {
            rectLight.color.set(commonColor);
        }

        mat.uniforms.myTexture.value = videoTexture;
        mat.uniforms.textureAspect.value = new THREE.Vector2(video.videoWidth, video.videoHeight);
    }
}

function handleDosCanvas(mat)
{
    if (lastLoadedImageUrl && lastLoadedImageUrl !== 'game')
    {
        textureLoader.load(whiteImageUrl, (whiteTex) =>
        {
            mat.uniforms.myTexture.value.dispose();
            setTexture(mat, whiteTex);
            transitionTimer = 0;
            isTransitioning = true;
            pendingImageUrl = 'game';
        });
    }
    else
    {
        rectLight.color.set(0xcccccc);

        if (dosTexture) dosTexture.dispose();

        dosTexture = new THREE.CanvasTexture(dosCanvas);
        dosTexture.needsUpdate = true;
        lastLoadedImageUrl = 'game';

        video.pause();
        video.currentTime = 0;

        mat.uniforms.myTexture.value = dosTexture;
        mat.uniforms.textureAspect.value = new THREE.Vector2(dosTexture.image.width, dosTexture.image.height);
    }
}

function resetTransitionState()
{
    isTransitioning = false;
    pendingImageUrl = null;
}

function completeTransition(url)
{
    lastLoadedImageUrl = url;
    resetTransitionState();
}

const clock = new THREE.Clock();    
function animate() 
{
    requestAnimationFrame(animate);
    if (isMobile) 
    {
        const blurToggle = document.getElementById("blurToggle");
        if(blurToggle.checked)
        {
            renderer.setPixelRatio(0.3);
        }   
        else
        {
            renderer.setPixelRatio(1);
        } 
    }

    videoTexture.needsUpdate = true;
    Flicker = Math.random();
    
    const time = performance.now() * 0.001;
    
    const deltaTime = clock.getDelta();

    if(cameraData.position == null)
    {
        handleResize();
    }
    
    rectLight.intensity = 30+(Flicker*30);
    scene.traverse((child) => {
        if (
            child.isMesh &&
            child.material instanceof THREE.ShaderMaterial &&
            child.material.uniforms.time
            ) 
            {
                child.material.uniforms.time.value += 0.02;
                child.material.uniforms.Flicker.value = Flicker;
                captureCanvas(child.material, deltaTime);
        }
    }); 

    if (window.sharedData.isGameOpen)
    {
        var tempfov, tempx;
        if(window.innerWidth > 768)
        {
            tempfov = 23;
            tempx = 1.65;
        }
        else
        {
            
            tempx = cameraData.position.x;
            tempfov = 45;
        }

        lerpCamera(camera, new THREE.Vector3(tempx, baseY, baseZ), new THREE.Euler(0, THREE.MathUtils.degToRad(22), 0), tempfov, deltaTime);
    }
    else
    {        

        lerpCamera(camera, cameraData.position, cameraData.rotation, cameraData.fov, deltaTime);
    }
    renderer.render(scene, camera);
}

window.addEventListener("DOMContentLoaded", () =>
{
    handleResize();

    const controls = document.getElementById("controls");

    if (isMobile) 
    {
        controls.style.display = "block";
    } 
    else 
    {
        controls.style.display = "none";
    }
});
