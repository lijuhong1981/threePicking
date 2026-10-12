import * as THREE from 'three';
import { WebGPURenderer } from 'three/webgpu';
import Picking, { PickingMode, PickTargetType } from '../index.js';
import { InstancedSpriteCollection } from '@lijuhong1981/three.instancedsprite';

// ---------- 全局错误显示（方便定位运行时错误） ----------
function showError(msg) {
    const el = document.getElementById('result');
    if (el) el.textContent = '⚠️ 运行时错误：\n' + msg;
    console.error('[test]', msg);
}
window.addEventListener('error', e => showError(e.message || String(e.error)));
window.addEventListener('unhandledrejection', e => showError(String(e.reason?.message || e.reason)));

// ---------- 渲染器（WebGPU）/ 场景 / 相机 ----------
const canvas = document.getElementById('canvas');
const renderer = new WebGPURenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
await renderer.init();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1b1b1f);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 12);
camera.lookAt(0, 0, 0);

// ---------- 拾取管理器 ----------
const picking = new Picking(renderer);
picking.mode = PickingMode.NORMAL;

// ---------- 辅助：生成 canvas 纹理（避免依赖外部图片文件） ----------
function createCanvasTexture(color, text) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = 'rgba(255,255,255,.8)';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, 120, 120);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 64, 68);
    return c;
}

// ---------- 1. 网格 Mesh（红/绿/蓝三个 Box） ----------
const boxGroup = new THREE.Group();
boxGroup.name = 'Boxes';
const boxGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
const box1 = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({ color: 0xff5555 })); box1.position.set(-4.5, 2.2, 0); box1.name = 'Box-红';
const box2 = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({ color: 0x55ff55 })); box2.position.set(-4.5, -0.2, 0); box2.name = 'Box-绿';
const box3 = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({ color: 0x5555ff })); box3.position.set(-4.5, -2.4, 0); box3.name = 'Box-蓝';
boxGroup.add(box1, box2, box3);
scene.add(boxGroup);

// 光照（MeshStandardMaterial 需要）
const dirLight = new THREE.DirectionalLight(0xffffff, 2.2);
dirLight.position.set(5, 5, 5);
scene.add(dirLight);
scene.add(new THREE.AmbientLight(0xffffff, 0.5));

// ---------- 2. 精灵 Sprite（three.js 自带） ----------
const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(createCanvasTexture('#ffaa00', 'Sprite')),
    transparent: true,
}));
sprite.position.set(-1.5, 2.4, 0);
sprite.scale.set(2.2, 2.2, 1);
sprite.name = 'Sprite';
scene.add(sprite);

// ---------- 3. 线 Line ----------
const lineGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-3, -3.6, 0),
    new THREE.Vector3(-1, -3.0, 0),
    new THREE.Vector3(0.5, -3.8, 0),
]);
const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0x00ffff, linewidth: 3 }));
line.name = 'Line';
scene.add(line);

// ---------- 4. 点 Points（WebGPU 点图元仅 1px，改用 Sprite 表示可见的点） ----------
function createCircleTexture(color) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(32, 32, 28, 0, Math.PI * 2);
    ctx.fill();
    return new THREE.CanvasTexture(c);
}
const pointGroup = new THREE.Group();
pointGroup.name = 'Points';
const pointPositions = [
    [0, 3.4, 0],
    [0.4, 2.6, 0],
    [-0.4, 1.8, 0],
    [0, 1.0, 0],
];
pointPositions.forEach((p, i) => {
    const pointSprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: createCircleTexture('#ff00ff'),
        transparent: true,
    }));
    pointSprite.position.set(p[0], p[1], p[2]);
    pointSprite.scale.set(0.4, 0.4, 1);
    pointSprite.name = 'Point-' + (i + 1);
    pointGroup.add(pointSprite);
});
scene.add(pointGroup);

// ---------- 5. 实例化精灵 InstancedSprite（WebGPU 使用 TSL NodeMaterial） ----------
const collection = new InstancedSpriteCollection({ useNodeMaterial: true });
collection.name = 'InstancedSpriteCollection';
const spriteDefs = [
    { x: 2.0, y: 2.6, color: '#ff3366', text: 'A' },
    { x: 3.6, y: 2.6, color: '#33ff66', text: 'B' },
    { x: 2.8, y: 1.0, color: '#3366ff', text: 'C' },
    { x: 2.0, y: -0.6, color: '#ffcc00', text: 'D' },
    { x: 3.6, y: -0.6, color: '#00ffff', text: 'E' },
    { x: 2.8, y: -2.2, color: '#ff66cc', text: 'F' },
];
for (const d of spriteDefs) {
    collection.add({
        position: [d.x, d.y, 0],
        scale: 2.2,
        image: createCanvasTexture(d.color, d.text),
        userData: { name: 'InstancedSprite-' + d.text },
    });
}
scene.add(collection);

// ---------- 注册拾取对象（注册整个场景，遍历注册所有可拾取对象） ----------
picking.registerObject(scene);
console.log('[test] 注册完成：pickingObjects=' + picking.pickingObjects.size +
    ', pickingMaterials=' + picking.pickingMaterials.size +
    ', instancedSpriteCollections=' + picking.instancedSpriteCollections.size);

// ---------- UI 状态读取 ----------
const resultEl = document.getElementById('result');
const hintEl = document.getElementById('hint');

function getMode() {
    const v = document.querySelector('input[name="mode"]:checked').value;
    return { fast: PickingMode.FAST, normal: PickingMode.NORMAL, precision: PickingMode.PRECISION }[v];
}
function getTarget() {
    const v = document.querySelector('input[name="target"]:checked').value;
    return { all: PickTargetType.ALL, object: PickTargetType.OBJECT, position: PickTargetType.POSITION }[v];
}

document.querySelectorAll('input[name="mode"]').forEach(el => el.addEventListener('change', () => {}));
document.querySelectorAll('input[name="target"]').forEach(el => el.addEventListener('change', () => {}));
document.getElementById('debugColor').addEventListener('change', e => { picking.debugColorPicking = e.target.checked; });
document.getElementById('debugDepth').addEventListener('change', e => { picking.debugDepthPicking = e.target.checked; });
document.getElementById('ignoreInvisible').addEventListener('change', e => { picking.ignoreInvisible = e.target.checked; });

// ---------- 结果描述 ----------
function describeResult(r) {
    if (!r) return '（未拾取到对象）';
    const lines = [];
    if (r.object) {
        const name = r.object.name || r.object.userData?.name || r.object.type || r.object.constructor.name;
        lines.push(`对象：${name}`);
        lines.push(`类型：${r.object.type || r.object.constructor.name}`);
        lines.push(`  isMesh=${!!r.object.isMesh} isSprite=${!!r.object.isSprite} isLine=${!!(r.object.isLine || r.object.isLineSegments2)} isPoints=${!!r.object.isPoints} isInstancedSprite=${!!r.object.isInstancedSprite}`);
    }
    if (r.root) lines.push(`根对象：${r.root.name || r.root.type || r.root.constructor.name}`);
    if (r.mesh) lines.push(`mesh：${r.mesh.name || r.mesh.type}`);
    if (r.sprite) lines.push(`sprite：${r.sprite.name || r.sprite.type}`);
    if (r.instancedSprite) lines.push(`instancedSprite：${r.instancedSprite.userData?.name || r.instancedSprite.type}`);
    if (r.points) lines.push(`points：${r.points.name || r.points.type}`);
    if (r.line) lines.push(`line：${r.line.name || r.line.type}`);
    if (r.position) lines.push(`position：(${r.position.x.toFixed(2)}, ${r.position.y.toFixed(2)}, ${r.position.z.toFixed(2)})`);
    if (r.point) lines.push(`point：(${r.point.x.toFixed(2)}, ${r.point.y.toFixed(2)}, ${r.point.z.toFixed(2)})`);
    return lines.join('\n');
}

function getWindowPosition(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

// ---------- 点击拾取 ----------
canvas.addEventListener('click', async (event) => {
    const wp = getWindowPosition(event);
    const mode = getMode();
    const target = getTarget();
    console.log('[test] click wp=', wp, 'mode=', mode, 'target=', target);
    try {
        const result = await picking.pick(wp, camera, scene, { mode, pickTarget: target });

        // 诊断：单独跑颜色拾取（WebGPU 异步）
        const colorResult = await picking.gpuRenderPick(renderer, wp, camera, scene, { pickTarget: PickTargetType.OBJECT });
        const colorHit = colorResult && colorResult.object;

        // 诊断：深度拾取位置
        const depthResult = await picking.gpuRenderPick(renderer, wp, camera, scene, { pickTarget: PickTargetType.POSITION });

        // 诊断：射线拾取位置
        const rayResult = picking.raycastNearestFromWindow(wp, canvas, camera, scene, {});

        const fmtPos = (v) => v ? `(${v.x.toFixed(3)}, ${v.y.toFixed(3)}, ${v.z.toFixed(3)})` : '(无)';

        resultEl.textContent =
            `[点击] mode=${mode} pickTarget=${target}\n` + describeResult(result) +
            `\n\n[诊断] 颜色拾取：${colorHit ? '命中 ' + (colorResult.object.name || colorResult.object.type) : '未命中'}` +
            `\n[诊断] 深度拾取位置：${fmtPos(depthResult && (depthResult.position || depthResult.point))}` +
            `\n[诊断] 射线拾取位置：${fmtPos(rayResult && (rayResult.position || rayResult.point))}${rayResult && rayResult.object ? '（命中 ' + (rayResult.object.name || rayResult.object.type) + '）' : '（未命中）'}`;
    } catch (err) {
        resultEl.textContent = '[点击] 拾取异常：\n' + (err && err.message ? err.message : err);
        console.error(err);
    }
});

// ---------- 悬停拾取（仅拾取对象，验证 hover 场景） ----------
canvas.addEventListener('mousemove', async (event) => {
    const wp = getWindowPosition(event);
    try {
        const result = await picking.pick(wp, camera, scene, { mode: PickingMode.NORMAL, pickTarget: PickTargetType.OBJECT });
        hintEl.textContent = result && result.object
            ? 'Hover: ' + (result.object.name || result.object.userData?.name || result.object.type)
            : 'Hover: （空）';
    } catch (err) {
        hintEl.textContent = 'Hover: 异常';
    }
});

// ---------- 窗口尺寸变化 ----------
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    picking.setSize(window.innerWidth, window.innerHeight);
});

// ---------- 渲染循环 ----------
function animate() {
    requestAnimationFrame(animate);
    collection.update();          // 同步实例化精灵属性变化到 GPU
    renderer.render(scene, camera);
    picking.renderDebug(scene, camera); // 渲染调试视图（若开启）
}
animate();
