# threePicking

因threejs自带的拾取只有射线检测一种方式，当场景较大，几何体数量较多时，检测性能就低下，经常导致页面卡顿。
为解决这个问题开发了这个拾取管理器，引入了基于GPU的颜色拾取与深度拾取方式，同时保留并优化了原有的射线检测方式，以提供更好的体验。

支持WebGLRenderer与WebGPURenderer。

## 支持的对象类型

- `Mesh` / `Group`（含其子对象）
- `Sprite`
- `Line` / `LineSegments2`
- `Points`
- `InstancedSpriteCollection`（[@lijuhong1981/three.instancedsprite](https://www.npmjs.com/package/@lijuhong1981/three.instancedsprite)，可拾取到具体某个实例）

### InstancedSprite 拾取

```js
import { InstancedSpriteCollection } from "@lijuhong1981/three.instancedsprite";

const collection = new InstancedSpriteCollection();
scene.add(collection);
picking.registerObject(collection); // 注册集合，拾取到具体某个实例

// 拾取
const result = await picking.pick(windowPosition, camera, scene);
if (result && result.instancedSprite) {
    console.log('拾取到的实例：', result.instancedSprite);
    console.log('所属集合：', result.root); // InstancedSpriteCollection
}
```

## 安装

```bash
npm install @lijuhong1981/three.picking
```

## 使用

```js
import Picking from "@lijuhong1981/three.picking";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { WebGPURenderer, Scene, PerspectiveCamera } from "three/webgpu";

// 初始化
const renderer = new WebGPURenderer();
const scene = new Scene();
const camera = new PerspectiveCamera();
const loader = new GLTFLoader();
const picking = new Picking(renderer);
...
// 窗口尺寸变化
const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
    picking.setSize(window.innerWidth, window.innerHeight);
};
window.addEventListener('resize', onResize);
...
// 动画帧
const onAnimate = () => {
    window.requestAnimationFrame(onAnimate);
    ...
    renderer.render(scene, camera); //执行渲染
    picking.renderDebug(scene, camera); //渲染调试内容
};
...
// 注册模型
const gltf = await loader.loadAsync('xxx/xxx.gltf');
scene.add(gltf.scene);
picking.registerObject(gltf.scene);
...
// 拾取
const pickedResult = await picking.pick(windowPosition, camera, scene);
...
// 注销模型
scene.remove(gltf.scene);
picking.unregisterObject(gltf.scene);
...
// 调试
picking.debugColorPicking = true; //开启调试颜色拾取
picking.debugDepthPicking = true; //开启调试深度拾取
```

## [API文档](./API.md)
