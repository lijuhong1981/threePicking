import Check from "@lijuhong1981/jscheck/src/Check.js";
import Destroyable from "@lijuhong1981/jsdestroy/src/Destroyable.js";
import getNDCInElement from '@lijuhong1981/jsmath/src/getNDCInElement.js';
import ndcToWindowPosition from "@lijuhong1981/jsmath/src/ndcToWindowPosition.js";
import { intersectObject, intersectObjects, traverse, traverseVisible } from "@lijuhong1981/threeutils";
import { Camera, FloatType, InstancedMesh, LinearFilter, LineBasicMaterial, LineDashedMaterial, Material, Mesh, MeshBasicMaterial, Object3D, OrthographicCamera, PlaneGeometry, Points, Ray, Raycaster, RenderTarget, RGBAFormat, Scene, ShaderMaterial, Sprite, SpriteMaterial, UnsignedByteType, Vector2, Vector3, Vector4, WebGLRenderer } from "three";
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { floor, fract, modelViewProjection, vec4 } from "three/tsl";
import { Line2NodeMaterial, MeshBasicNodeMaterial, NodeMaterial, QuadMesh, WebGPURenderer } from "three/webgpu";

const scratchVector2 = new Vector2(),
    scratchVector3 = new Vector3(),
    scratchWindowPosition = new Vector3();

/**
 * 拾取模式枚举
 * @enum {string} PickingMode
 * @property {string} FAST - 快速拾取，即GPU拾取，基于颜色和深度渲染结果
 * @property {string} PRECISION - 精确拾取，即CPU拾取，基于射线检测
 * @property {string} NORMAL - 常规拾取，结合快速拾取和精确拾取，先快速拾取模型再对模型进行精确拾取
*/
const PickingMode = Object.freeze({
    FAST: 'fast',
    PRECISION: 'precision',
    NORMAL: 'normal',
});
/**
 * 拾取目标类型枚举
 * @enum {string} PickTargetType
 * @property {string} ALL - 所有类型
 * @property {string} OBJECT - 只拾取对象
 * @property {string} POSITION - 只拾取位置
*/
const PickTargetType = Object.freeze({
    ALL: 'all',
    OBJECT: 'object',
    POSITION: 'position',
});
/**
 * @typedef {object} PickedResult
 * @property {Vector3} [point] - 射线检测返回的点在世界坐标系中的位置。
 * @property {Vector3} [position] - 拾取到的世界坐标位置。
 * @property {Object3D} [object] - 拾取到的对象实例。
 * @property {Object3D} [root] - 拾取对象所属的根对象实例。
 * @property {Mesh} [mesh] - 拾取到的网格对象实例。
 * @property {Sprite} [sprite] - 拾取到的精灵对象实例。
 * @property {Points} [points] - 拾取到的点对象实例。
 * @property {Line} [line] - 拾取到的线对象实例。
 * @memberof Picking
*/

// #region 深度拾取相关代码，参考了three.js的MeshDepthMaterial实现，并针对拾取场景进行了优化，确保在拾取时能正确编码和解码深度值。
// 定义常量
const PackUpscale = 256.0 / 255.0;
const UnpackDownscale = 255.0 / 256.0;
const ShiftRight8 = 1.0 / 256.0;
const Inv255 = 1.0 / 255.0;
const PackFactors = new Vector4(1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0);
// 计算向量
// const UnpackFactors2 = new Vector2(UnpackDownscale, 1.0 / PackFactors.y);
const UnpackFactors3 = new Vector3(
    UnpackDownscale / PackFactors.x,
    UnpackDownscale / PackFactors.y,
    1.0 / PackFactors.z
);
// const UnpackFactors4 = new Vector4(
//     UnpackDownscale / PackFactors.x,
//     UnpackDownscale / PackFactors.y,
//     UnpackDownscale / PackFactors.z,
//     1.0 / PackFactors.w
// );
/**
 * 解码RGB颜色到深度值。
 * @param {Float32Array} floatBuffer
 * @returns {number}
 * @ignore
*/
function unpackRGBToDepth(floatBuffer) {
    scratchVector3.set(floatBuffer[0], floatBuffer[1], floatBuffer[2]);
    return scratchVector3.dot(UnpackFactors3);
};
/**
 * 深度材质，参考three.js的MeshDepthMaterial实现，并针对拾取场景进行了优化，确保在拾取时能正确编码和解码深度值。
 * @ignore
*/
const depthMaterial = new ShaderMaterial({
    vertexShader: `
          varying vec4 mvPosition;
          varying vec2 vHighPrecisionZW;
          void main() {
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            vHighPrecisionZW = gl_Position.zw;
          }
        `,
    fragmentShader: `
          varying vec2 vHighPrecisionZW;

          const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
          const float ShiftRight8 = 1. / 256.;
          const float Inv255 = 1. / 255.;
          const float PackUpscale = 256. / 255.;

          vec4 packDepthToRGBA(const in float depth) {
            if (depth <= 0.0) return vec4(0., 0., 0., 0.);
            else if (depth >= 1.0) return vec4(1., 1., 1., 0.);

            float vuf;
            float bf = modf( depth * PackFactors.b, vuf );
            float gf = modf( vuf * ShiftRight8, vuf );
            return vec4( vuf * Inv255, gf * PackUpscale, bf, 1.0 );
            // return vec4(depth, 0, 0, 1.0);
          }

          void main() {
            float depth = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
            depth = depth * 0.5 + 0.5; // NDC to [0,1]
            gl_FragColor = packDepthToRGBA(depth);
          }
        `,
});
/**
 * 深度材质，继承自NodeMaterial，参考three.js的MeshDepthMaterial实现，并针对拾取场景进行了优化，确保在拾取时能正确编码和解码深度值
 * @ignore
*/
class MeshDepthNodeMaterial extends NodeMaterial {

    static get type() {
        return 'MeshDepthNodeMaterial';
    }

    constructor() {
        super();

        this.isMeshDepthNodeMaterial = true;
        this.name = 'MeshDepthNodeMaterial';
        this.fog = false;
        this.lights = false;
        this.toneMapped = false;

        const clipZW = modelViewProjection.zw;
        const depth01 = clipZW.x.div(clipZW.y).mul(0.5).add(0.5);

        const scaled = depth01.mul(PackFactors.z);
        const vuf0 = floor(scaled);
        const bf = fract(scaled);

        const vufDiv = vuf0.mul(ShiftRight8);
        const gf = fract(vufDiv);
        const vuf1 = floor(vufDiv);

        const packedDepth = vec4(
            vuf1.mul(Inv255),
            gf.mul(PackUpscale),
            bf,
            1.0
        );

        const depthLtZero = vec4(0.0, 0.0, 0.0, 0.0);
        const depthGtOne = vec4(1.0, 1.0, 1.0, 0.0);

        this.fragmentNode = depth01.greaterThanEqual(1.0).select(
            depthGtOne,
            depth01.lessThanEqual(0.0).select(depthLtZero, packedDepth)
        );
    }
};
const depthNodeMaterial = new MeshDepthNodeMaterial();
// #endregion

/**
 * NDC坐标转换为世界坐标。
 * @param {Vector3} ndc - 标准化设备坐标
 * @param {HTMLCanvasElement} canvas - 画布元素
 * @param {Camera} camera - 相机对象
 * @param {Vector3} [result] - 结果存储对象
 * @returns {Vector3}
 * @ignore
*/
function ndcToWorldCoords(ndc, camera, result = new Vector3()) {
    result.copy(ndc);
    return result.unproject(camera);
};

let _hexColor = 0;

function getHexColor() {
    _hexColor++;
    if (_hexColor >= 0xffffff)
        _hexColor = 1;
    return _hexColor;
}
function getRandomColor() {
    return Math.floor(Math.random() * 0xffffff);
}
/**
 * @param {Map<number, Object3D>} pickingObjects
 * @returns {number}
 * @ignore
*/
function getRandomHexColor(pickingObjects) {
    let hexColor = getRandomColor();
    while (hexColor === 0 || hexColor === 0xffffff || pickingObjects.has(hexColor)) {
        hexColor = getRandomColor();
    }
    return hexColor;
}
/**
 * @param {Object3D} object
 * @param {number} hexColor
 * @returns {Material}
 * @ignore
*/
function createPickMaterial(object, hexColor) {
    if (object.isSprite)
        return new SpriteMaterial({
            color: hexColor,
            transparent: false,
            vertexColors: false,
            fog: false,
            toneMapped: false,
        });
    else if (object.material.isLine2NodeMaterial)
        return new Line2NodeMaterial({
            color: hexColor,
            transparent: false,
            vertexColors: false,
            fog: false,
            toneMapped: false,
            dashed: false,
        });
    else if (object.material.isLineDashedMaterial)
        return new LineDashedMaterial({
            color: hexColor,
            transparent: false,
            vertexColors: false,
            fog: false,
            toneMapped: false,
        });
    else if (object.material.isLineBasicMaterial)
        return new LineBasicMaterial({
            color: hexColor,
            transparent: false,
            vertexColors: false,
            fog: false,
            toneMapped: false,
        });
    else if (object.material.isLineMaterial)
        return new LineMaterial({
            color: hexColor,
            transparent: false,
            vertexColors: false,
            fog: false,
            toneMapped: false,
        });
    else
        return new MeshBasicMaterial({
            color: hexColor,
            transparent: false,
            vertexColors: false,
            fog: false,
            toneMapped: false,
        });
};
/**
 * 替换对象材质为拾取材质
 * @param {Object3D} object - 要替换的对象
 * @param {Material} pickMaterial - 拾取材质
 * @param {Map<Object3D, Material>} originalMaterials - 原始材质映射表
 * @param {Map<Object3D, boolean>} originalFrustumCulleds - 原始视锥剔除映射表
 * @ignore
*/
function replaceToPickMaterial(object, pickMaterial, originalMaterials, originalFrustumCulleds) {
    originalMaterials.set(object, object.material);
    if (object.isSprite) {
        pickMaterial.rotation = object.material.rotation;
        pickMaterial.sizeAttenuation = object.material.sizeAttenuation;
        pickMaterial.depthTest = object.material.depthTest;
        // sizeAttenuation=false 时 Sprite 在屏幕上是固定像素大小，但世界空间包围体仍很小；
        // GPU 拾取使用 setViewOffset 只渲染 1 像素，视锥极窄，远距离时该包围体会被视锥剔除，导致拾取不到。
        // 临时关闭视锥剔除，确保 Sprite 仍会参与渲染。
        if (object.material.sizeAttenuation === false) {
            originalFrustumCulleds.set(object, object.frustumCulled);
            object.frustumCulled = false;
        }
    } else if (object.material.isLine2NodeMaterial) {
        pickMaterial.worldUnits = object.material.worldUnits;
        pickMaterial.linewidth = object.material.linewidth;
        pickMaterial.dashed = object.material.dashed;
        pickMaterial.dashSize = object.material.dashSize;
        pickMaterial.dashOffset = object.material.dashOffset;
        pickMaterial.gapSize = object.material.gapSize;
        pickMaterial.scale = object.material.scale;
        // renderPick 使用 setViewOffset 只渲染 1 像素，视锥极窄，
        // Line 的包围球易被剔除。必须始终临时关闭视锥剔除，确保 Line 参与渲染。
        originalFrustumCulleds.set(object, object.frustumCulled);
        object.frustumCulled = false;
    }
    else if (object.material.isLineDashedMaterial) {
        pickMaterial.linewidth = object.material.linewidth;
        pickMaterial.linecap = object.material.linecap;
        pickMaterial.linejoin = object.material.linejoin;
        pickMaterial.dashSize = object.material.dashSize;
        pickMaterial.gapSize = object.material.gapSize;
        pickMaterial.scale = object.material.scale;
        // renderPick 使用 setViewOffset 只渲染 1 像素，视锥极窄，
        // Line 的包围球易被剔除。必须始终临时关闭视锥剔除，确保 Line 参与渲染。
        originalFrustumCulleds.set(object, object.frustumCulled);
        object.frustumCulled = false;
    } else if (object.material.isLineBasicMaterial) {
        pickMaterial.linewidth = object.material.linewidth;
        pickMaterial.linecap = object.material.linecap;
        pickMaterial.linejoin = object.material.linejoin;
        // renderPick 使用 setViewOffset 只渲染 1 像素，视锥极窄，
        // Line 的包围球易被剔除。必须始终临时关闭视锥剔除，确保 Line 参与渲染。
        originalFrustumCulleds.set(object, object.frustumCulled);
        object.frustumCulled = false;
    } else if (object.material.isLineMaterial) {
        pickMaterial.worldUnits = object.material.worldUnits;
        pickMaterial.linewidth = object.material.linewidth;
        pickMaterial.dashed = object.material.dashed;
        pickMaterial.dashSize = object.material.dashSize;
        pickMaterial.gapSize = object.material.gapSize;
        pickMaterial.dashScale = object.material.dashScale;
        pickMaterial.dashOffset = object.material.dashOffset;
        // renderPick 使用 setViewOffset 只渲染 1 像素，视锥极窄，
        // Line 的包围球易被剔除。必须始终临时关闭视锥剔除，确保 Line 参与渲染。
        originalFrustumCulleds.set(object, object.frustumCulled);
        object.frustumCulled = false;
    }
    object.material = pickMaterial;
};
/**
 * 查找对象的根对象。
 * @param {Object3D} object - 要查找根对象的对象实例。
 * @returns {Object3D} 返回根对象实例。
 * @ignore
*/
function findRoot(object) {
    if (object.isRoot)
        return object;
    if (object.parent)
        return findRoot(object.parent);
    return object;
};
/**
 * 确保拾取结果对象的属性完整。
 * @param {PickedResult} pickedResult - 拾取结果对象。
 * @returns {PickedResult} 返回拾取结果对象。
 * @ignore
*/
function ensurePickedResult(pickedResult) {
    if (pickedResult) {
        if (!pickedResult.position && pickedResult.point)
            pickedResult.position = pickedResult.point;
        if (pickedResult.object) {
            if (!pickedResult.root)
                pickedResult.root = findRoot(pickedResult.object);
            if (!pickedResult.mesh && pickedResult.object.isMesh)
                pickedResult.mesh = pickedResult.object;
            if (!pickedResult.sprite && pickedResult.object.isSprite)
                pickedResult.sprite = pickedResult.object;
            if (!pickedResult.points && pickedResult.object.isPoints)
                pickedResult.points = pickedResult.object;
            if (!pickedResult.line && (pickedResult.object.isLine || pickedResult.object.isLineSegments2))
                pickedResult.line = pickedResult.object;
        }
    }
    return pickedResult;
};
/**
 * 确保拾取结果对象数组中的对象属性完整。
 * @param {Array<Intersection>} intersects - 拾取结果对象数组。
 * @param {Array} result - 拾取结果对象数组。
 * @returns {Array<PickedResult>} 返回拾取结果对象数组。
 * @ignore
*/
function ensureIntersects(intersects, result = []) {
    intersects.forEach(intersect => {
        const pickedResult = ensurePickedResult(intersect);
        pickedResult && result.push(pickedResult);
    });
    return result;
};

/**
 * 拾取管理器，封装了射线检测、颜色拾取和深度拾取等功能，并对外提供统一的拾取接口。
*/
class Picking extends Destroyable {
    /**
     * 构造实例
     * @param {WebGLRenderer|WebGPURenderer} renderer - 渲染器实例，支持WebGLRenderer和WebGPURenderer。
     * @constructor
    */
    constructor(renderer) {
        Check.defined('renderer', renderer);
        super();
        /**
         * 渲染器实例
         * @type {WebGLRenderer|WebGPURenderer}
         * @readonly
        */
        this.renderer = renderer;
        /**
         * 是否为WebGL渲染器
         * @type {boolean}
         * @readonly
        */
        this.isWebGLRenderer = (renderer instanceof WebGLRenderer);
        /**
         * 是否为WebGPU渲染器
         * @type {boolean}
         * @readonly
        */
        this.isWebGPURenderer = (renderer instanceof WebGPURenderer);
        /**
         * 射线发射器对象 - {@link https://threejs.org/docs/#Raycaster}
         * @type {Raycaster}
         * @readonly
        */
        this.raycaster = new Raycaster();
        /**
         * 整个场景窗口的颜色渲染目标
         * @type {RenderTarget}
         * @readonly
         * @private
        */
        this.windowColorRenderTarget = new RenderTarget(window.innerWidth, window.innerHeight, {
            format: RGBAFormat,
            type: UnsignedByteType,
            minFilter: LinearFilter,
            magFilter: LinearFilter,
        });
        /**
         * 整个场景窗口的深度渲染目标
         * @type {RenderTarget}
         * @readonly
         * @private
        */
        this.windowDepthRenderTarget = new RenderTarget(window.innerWidth, window.innerHeight, {
            format: RGBAFormat,
            // type: UnsignedByteType,
            minFilter: LinearFilter,
            magFilter: LinearFilter,
        });
        /**
         * 深度材质
         * @type {Material}
         * @readonly
         * @private
        */
        this.depthMaterial = this.isWebGLRenderer ? depthMaterial : depthNodeMaterial;
        /**
         * 颜色拾取渲染目标
         * @type {RenderTarget}
         * @readonly
         * @private
         * @description 只有1个像素大小，只渲染拾取点位置。
        */
        this.pickingColorRenderTarget = new RenderTarget(1, 1, {
            format: RGBAFormat,
            type: UnsignedByteType,
            minFilter: LinearFilter,
            magFilter: LinearFilter,
        });
        /**
         * 深度拾取渲染目标
         * @type {RenderTarget}
         * @readonly
         * @private
         * @description 只有1个像素大小，只渲染拾取点位置。
        */
        this.pickingDepthRenderTarget = new RenderTarget(1, 1, {
            format: RGBAFormat,
            type: FloatType,
            minFilter: LinearFilter,
            magFilter: LinearFilter,
        });
        /**
         * 拾取场景
         * @type {Scene}
         * @readonly
         * @private
        */
        this.pickingScene = new Scene();
        /**
         * 拾取对象映射表
         * @type {Map<number, Object3D>}
         * @readonly
         * @private
        */
        this.pickingObjects = new Map();
        /**
         * 拾取材质映射表
         * @type {Map<Object3D, Material>}
         * @readonly
         * @private
        */
        this.pickingMaterials = new Map();
        /**
         * 原始父对象映射表
         * @type {Map<Object3D, Object3D>}
         * @readonly
         * @private
        */
        this.originalParents = new Map();
        /**
         * 原始材质映射表
         * @type {Map<Object3D, Material>}
         * @readonly
         * @private
        */
        this.originalMaterials = new Map();
        /**
         * 原始可见性映射表
         * @type {Map<Object3D, boolean>}
         * @readonly
         * @private
        */
        this.originalVisibles = new Map();
        /**
         * 原始视锥剔除映射表（用于拾取时临时禁用 Sprite 的视锥剔除）
         * @type {Map<Object3D, boolean>}
         * @readonly
         * @private
        */
        this.originalFrustumCulleds = new Map();
        /**
         * 是否启用随机颜色拾取
         * @type {boolean}
         * @default true
        */
        this.enableRandomColor = true;
        /**
         * 拾取模式
         * @type {PickingMode}
         * @default PickingMode.NORMAL
        */
        this.mode = PickingMode.NORMAL;
        /**
         * 忽略不可见对象
         * @type {boolean}
         * @default true 
        */
        this.ignoreInvisible = true;
        /**
         * 自定义不可拾取检查函数，接受一个Object3D对象作为参数，返回一个布尔值，指示该对象是否应该被视为不可拾取。
         * @type {Function}
        */
        this.checkIgnore = undefined;

        if (this.isWebGLRenderer) {
            // 兼容WebGLRenderer的isWebGLRenderTarget属性检查
            this.windowColorRenderTarget.isWebGLRenderTarget = true;
            this.windowDepthRenderTarget.isWebGLRenderTarget = true;
            this.pickingColorRenderTarget.isWebGLRenderTarget = true;
            this.pickingDepthRenderTarget.isWebGLRenderTarget = true;
            // 用于调试显示拾取渲染结果的正交相机
            this.postCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
            const postPlane = new PlaneGeometry(2, 2);
            const postMaterial = new ShaderMaterial({
                vertexShader: `
                    varying vec2 vUv;

                    void main() {
        	            vUv = uv;
        	            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }`,
                fragmentShader: `
                    varying vec2 vUv;
                    uniform sampler2D tDiffuse;
                    // uniform sampler2D tDepth;
                    // uniform float cameraNear;
                    // uniform float cameraFar;

                    // float readDepth( sampler2D depthSampler, vec2 coord ) {
                    // 	float fragCoordZ = texture2D( depthSampler, coord ).x;
                    // 	float viewZ = ( cameraNear * cameraFar ) / ( ( cameraFar - cameraNear ) * fragCoordZ - cameraFar );
                    // 	return ( viewZ + cameraNear ) / ( cameraNear - cameraFar );
                    // }

                    void main() {
        	            gl_FragColor = texture2D( tDiffuse, vUv );
        	            // float depth = readDepth(tDepth, vUv);
        	            // gl_FragColor.rgb = 1.0 - vec3(depth);
        	            // gl_FragColor.a = 1.0;
                    }`,
                uniforms: {
                    // cameraNear: { value: 0 },
                    // cameraFar: { value: 0 },
                    tDiffuse: { value: null },
                    // tDepth: { value: null }
                }
            });
            Object.defineProperties(postMaterial, {
                map: {
                    get() {
                        return postMaterial.uniforms.tDiffuse.value;
                    },
                    set(value) {
                        postMaterial.uniforms.tDiffuse.value = value;
                    }
                },
            });
            // 用于调试显示拾取渲染结果的四边形网格
            this.postQuad = new Mesh(postPlane, postMaterial);
            // 用于调试显示拾取渲染结果的场景
            this.postScene = new Scene();
            this.postScene.add(this.postQuad);
        } else if (this.isWebGPURenderer) {
            // 用于调试显示拾取渲染结果的四边形网格
            this.postQuad = new QuadMesh(new MeshBasicNodeMaterial({
                lights: false,
                toneMapped: false,
            }));
        }

        this._sessions = {
            ubyteBuffer: new Uint8Array(4),
            floatBuffer: new Float32Array(4),
            debugColorPicking: false,
            debugDepthPicking: false,
            cacheKey: '',
            cachedObject: null,
        };
    }
    /**
     * 是否显示颜色拾取场景至屏幕
     * @type {boolean}
    */
    set debugColorPicking(value) {
        this._sessions.debugColorPicking = (value === true);
        if (this._sessions.debugColorPicking)
            this._sessions.debugDepthPicking = false;
    }
    get debugColorPicking() {
        return this._sessions.debugColorPicking;
    }
    /**
     * 是否显示深度拾取场景至屏幕
     * @type {boolean}
    */
    set debugDepthPicking(value) {
        this._sessions.debugDepthPicking = (value === true);
        if (this._sessions.debugDepthPicking)
            this._sessions.debugColorPicking = false;
    }
    get debugDepthPicking() {
        return this._sessions.debugDepthPicking;
    }
    /**
     * 注册拾取对象
     * @param {Object3D} object - 可拾取对象
    */
    registerObject(object) {
        object.traverse((child) => {
            if (this.pickingMaterials.has(child)) {
                console.warn('该对象已注册。', child);
                return;
            }
            if (child.material) {
                // 生成唯一颜色ID
                const hexColor = this.enableRandomColor ? getRandomHexColor(this.pickingObjects) : getHexColor();
                this.pickingObjects.set(hexColor, child);
                // 创建拾取材质
                const pickMaterial = createPickMaterial(child, hexColor);
                this.pickingMaterials.set(child, pickMaterial);
                child.userData.pickId = pickMaterial.userData.pickId = hexColor;
                // child.userData.pickMaterial = pickMaterial;
            }
        });
        object.isRoot = true;
        this._sessions.cacheKey = '';
    }
    /**
     * 注销拾取对象
     * @param {Object3D} object - 可拾取对象
    */
    unregisterObject(object) {
        object.traverse((child) => {
            const pickMaterial = this.pickingMaterials.get(child);
            if (pickMaterial) {
                this.pickingMaterials.delete(child);
                const pickId = child.userData.pickId ?? pickMaterial.userData.pickId;
                this.pickingObjects.delete(pickId);
            }
        });
        this._sessions.cacheKey = '';
    }
    /**
     * 注销所有拾取对象
    */
    unregisterAllObjects() {
        this.pickingObjects.clear();
        this.pickingMaterials.clear();
    }
    /**
     * 设置当前窗口大小
     * @param {number} width - 宽度
     * @param {number} height - 高度
     */
    setSize(width, height) {
        this.windowColorRenderTarget.setSize(width, height);
        this.windowDepthRenderTarget.setSize(width, height);
    }
    /**
     * 根据窗口位置获取射线对象
     * @param {Vector2} windowPosition - 窗口坐标位置，格式：{x: number, y: number}
     * @param {HTMLCanvasElement} canvas - 窗口画布元素
     * @param {Camera} camera - 相机对象
     * @param {Ray} [result] - 结果存储对象
     * @returns {Ray} 返回射线对象
    */
    getRayFromWindow(windowPosition, canvas, camera, result = new Ray()) {
        const ndc = getNDCInElement(canvas, windowPosition, scratchVector2);
        this.raycaster.setFromCamera(ndc, camera);
        result.origin.copy(this.raycaster.ray.origin);
        result.direction.copy(this.raycaster.ray.direction);
        return result;
    }
    /**
     * 根据起点和终点获取射线对象
     * @param {Vector3} from - 起点
     * @param {Vector3} to - 终点
     * @param {Ray} [result] - 结果存储对象
     * @returns {Ray} 返回射线对象
    */
    getRayFromPoints(from, to, result = new Ray()) {
        const direction = new Vector3().subVectors(to, from).normalize();
        result.set(from, direction);
        return result;
    }
    /**
     * 射线检测某个目标对象，即CPU拾取，返回所有相交结果数组
     * @param {Scene|Object3D|Array<Object3D>} target - 要检测的目标对象
     * @param {object} [options] - 配置参数
     * @param {number} [options.near] - 射线检测的最近距离，默认0
     * @param {number} [options.far] - 射线检测的最远距离，默认Infinity
     * @param {boolean} [options.recursive] - 是否递归检测子对象，默认true
     * @param {boolean} [options.ignoreInvisible] - 是否忽略不可见对象，未指定则使用{@link Picking#ignoreInvisible}属性
     * @param {Function} [options.checkIgnore] - 是否忽略对象的回调函数，参数为对象实例，返回true表示忽略该对象，false表示不忽略，未指定则使用{@link Picking#checkIgnore}参数
     * @returns {Array<PickedResult>} 返回与射线相交的结果对象数组，按照距离从近到远排序，详见{@link Picking.PickedResult}，如果没有相交对象，则返回空数组
    */
    raycast(target, options = {}) {
        this.raycaster.near = options.near ?? 0;
        this.raycaster.far = options.far ?? Infinity;
        const ignoreInvisible = options.ignoreInvisible ?? this.ignoreInvisible;
        const checkIgnore = options.checkIgnore ?? this.checkIgnore;
        const intersects = [];
        if (Array.isArray(target))
            intersectObjects(target, this.raycaster, intersects, options.recursive, ignoreInvisible, checkIgnore);
        else
            intersectObject(target, this.raycaster, intersects, options.recursive, ignoreInvisible, checkIgnore);
        return ensureIntersects(intersects);
    }
    /**
     * 射线检测某个目标对象，即CPU拾取，只返回最近的相交结果对象
     * @param {Scene|Object3D|Array<Object3D>} target - 要检测的目标对象
     * @param {object} [options] - 配置参数
     * @param {number} [options.near] - 射线检测的最近距离，默认0
     * @param {number} [options.far] - 射线检测的最远距离，默认Infinity
     * @param {boolean} [options.recursive] - 是否递归检测子对象，默认true
     * @param {boolean} [options.ignoreInvisible] - 是否忽略不可见对象，未指定则使用{@link Picking#ignoreInvisible}属性
     * @param {Function} [options.checkIgnore] - 是否忽略对象的回调函数，参数为对象实例，返回true表示忽略该对象，false表示不忽略，未指定则使用{@link Picking#checkIgnore}参数
     * @returns {PickedResult|undefined} 返回与射线相交最近的结果对象，如果没有相交则返回undefined，详见{@link Picking.PickedResult}
    */
    raycastNearest(target, options = {}) {
        const result = this.raycast(target, options);
        if (result && result.length > 0)
            return result[0];
    }
    /**
     * 根据射线对象进行射线检测，即CPU拾取，返回所有相交结果数组
     * 
     * @param {Ray} ray - 射线对象
     * @param {Scene|Object3D|Array<Object3D>} target - 要检测的目标对象
     * @param {object} [options] - 配置参数
     * @param {number} [options.near] - 射线检测的最近距离，默认0
     * @param {number} [options.far] - 射线检测的最远距离，默认Infinity
     * @param {boolean} [options.recursive] - 是否递归检测子对象，默认true
     * @param {boolean} [options.ignoreInvisible] - 是否忽略不可见对象，未指定则使用{@link Picking#ignoreInvisible}属性
     * @param {Function} [options.checkIgnore] - 是否忽略对象的回调函数，参数为对象实例，返回true表示忽略该对象，false表示不忽略，未指定则使用{@link Picking#checkIgnore}参数
     * @returns {Array<PickedResult>} 返回与射线相交的结果对象数组，按照距离从近到远排序，详见{@link Picking.PickedResult}，如果没有相交对象，则返回空数组
    */
    raycastFromRay(ray, target, options = {}) {
        this.raycaster.set(ray.origin, ray.direction);
        return this.raycast(target, options);
    }
    /**
     * 根据射线对象进行射线检测，即CPU拾取，只返回最近的相交结果对象
     * 
     * @param {Ray} ray - 射线对象
     * @param {Scene|Object3D|Array<Object3D>} target - 要检测的目标对象
     * @param {object} [options] - 配置参数
     * @param {number} [options.near] - 射线检测的最近距离，默认0
     * @param {number} [options.far] - 射线检测的最远距离，默认Infinity
     * @param {boolean} [options.recursive] - 是否递归检测子对象，默认true
     * @param {boolean} [options.ignoreInvisible] - 是否忽略不可见对象，未指定则使用{@link Picking#ignoreInvisible}属性
     * @param {Function} [options.checkIgnore] - 是否忽略对象的回调函数，参数为对象实例，返回true表示忽略该对象，false表示不忽略，未指定则使用{@link Picking#checkIgnore}参数
     * @returns {PickedResult|undefined} 返回与射线相交最近的结果对象，如果没有相交则返回undefined，详见{@link Picking.PickedResult}
    */
    raycastNearestFromRay(ray, target, options) {
        const result = this.raycastFromRay(ray, target, options);
        if (result && result.length > 0)
            return result[0];
    }
    /**
     * 指定原点和方向的射线检测，即CPU拾取
     * 
     * @param {Vector3} origin - 射线原点
     * @param {Vector3} direction - 射线方向 
     * @param {Scene|Object3D|Array<Object3D>} target - 要检测的目标对象
     * @param {object} [options] - 配置参数
     * @param {number} [options.near] - 射线检测的最近距离，默认0
     * @param {number} [options.far] - 射线检测的最远距离，默认Infinity
     * @param {boolean} [options.recursive] - 是否递归检测子对象，默认true
     * @param {boolean} [options.ignoreInvisible] - 是否忽略不可见对象，未指定则使用{@link Picking#ignoreInvisible}属性
     * @param {Function} [options.checkIgnore] - 是否忽略对象的回调函数，参数为对象实例，返回true表示忽略该对象，false表示不忽略，未指定则使用{@link Picking#checkIgnore}参数
     * @returns {PickedResult|undefined} 返回与射线相交最近的结果对象，如果没有相交则返回undefined，详见{@link Picking.PickedResult}
    */
    raycastFromDirection(origin, direction, target, options) {
        this.raycaster.set(origin, direction);
        return this.raycast(target, options);
    }
    /**
     * 指定原点和方向的射线检测，即CPU拾取，只返回最近的相交结果对象
     * 
     * @param {Vector3} origin - 射线原点
     * @param {Vector3} direction - 射线方向 
     * @param {Scene|Object3D|Array<Object3D>} target - 要检测的目标对象
     * @param {object} [options] - 配置参数
     * @param {number} [options.near] - 射线检测的最近距离，默认0
     * @param {number} [options.far] - 射线检测的最远距离，默认Infinity
     * @param {boolean} [options.recursive] - 是否递归检测子对象，默认true
     * @param {boolean} [options.ignoreInvisible] - 是否忽略不可见对象，未指定则使用{@link Picking#ignoreInvisible}属性
     * @param {Function} [options.checkIgnore] - 是否忽略对象的回调函数，参数为对象实例，返回true表示忽略该对象，false表示不忽略，未指定则使用{@link Picking#checkIgnore}参数
     * @returns {PickedResult|undefined} 返回与射线相交最近的结果对象，如果没有相交则返回undefined，详见{@link Picking.PickedResult}
    */
    raycastNearestFromDirection(origin, direction, target, options) {
        const result = this.raycastFromDirection(origin, direction, target, options);
        if (result && result.length > 0)
            return result[0];
    }
    /**
     * 从相机发射射线进行检测，即CPU拾取，返回所有相交结果数组
     * 
     * @param {Vector2} ndc - 标准化设备坐标，格式：{x: number, y: number}，范围[-1, 1]
     * @param {Camera} camera - 相机对象
     * @param {Scene|Object3D|Array<Object3D>} target - 要检测的目标对象
     * @param {object} [options] - 配置参数
     * @param {number} [options.near] - 射线检测的最近距离，默认0
     * @param {number} [options.far] - 射线检测的最远距离，默认Infinity
     * @param {boolean} [options.recursive] - 是否递归检测子对象，默认true
     * @param {boolean} [options.ignoreInvisible] - 是否忽略不可见对象，未指定则使用{@link Picking#ignoreInvisible}属性
     * @param {Function} [options.checkIgnore] - 是否忽略对象的回调函数，参数为对象实例，返回true表示忽略该对象，false表示不忽略，未指定则使用{@link Picking#checkIgnore}参数
     * @returns {Array<PickedResult>} 返回与射线相交的结果对象数组，按照距离从近到远排序，详见{@link Picking.PickedResult}，如果没有相交对象，则返回空数组
     */
    raycastFromCamera(ndc, camera, target, options = {}) {
        this.raycaster.setFromCamera(ndc, camera);
        return this.raycast(target, options);
    }
    /**
     * 从相机发射射线进行检测，即CPU拾取，只返回最近的相交结果对象
     * 
     * @param {Vector2} ndc - 标准化设备坐标，格式：{x: number, y: number}，范围[-1, 1]
     * @param {Camera} camera - 相机对象
     * @param {Scene|Object3D|Array<Object3D>} target - 要检测的目标对象
     * @param {object} [options] - 配置参数
     * @param {number} [options.near] - 射线检测的最近距离，默认0
     * @param {number} [options.far] - 射线检测的最远距离，默认Infinity
     * @param {boolean} [options.recursive] - 是否递归检测子对象，默认true
     * @param {boolean} [options.ignoreInvisible] - 是否忽略不可见对象，未指定则使用{@link Picking#ignoreInvisible}属性
     * @param {Function} [options.checkIgnore] - 是否忽略对象的回调函数，参数为对象实例，返回true表示忽略该对象，false表示不忽略，未指定则使用{@link Picking#checkIgnore}参数
     * @returns {PickedResult|undefined} 返回与射线相交最近的结果对象，如果没有相交则返回undefined，详见{@link Picking.PickedResult}
     */
    raycastNearestFromCamera(ndc, camera, target, options) {
        const result = this.raycastFromCamera(ndc, camera, target, options);
        if (result && result.length > 0)
            return result[0];
    }
    /**
     * 从窗口位置发射射线进行检测，即CPU拾取，返回所有相交结果数组
     * @param {Vector2} windowPosition - 窗口坐标位置，格式：{x: number, y: number}
     * @param {HTMLCanvasElement} canvas - 窗口画布元素
     * @param {Camera} camera - 相机对象
     * @param {Scene|Object3D|Array<Object3D>} target - 要检测的目标对象
     * @param {object} [options] - 配置参数
     * @param {number} [options.near] - 射线检测的最近距离，默认0
     * @param {number} [options.far] - 射线检测的最远距离，默认Infinity
     * @param {boolean} [options.recursive] - 是否递归检测子对象，默认true
     * @param {boolean} [options.ignoreInvisible] - 是否忽略不可见对象，未指定则使用{@link Picking#ignoreInvisible}属性
     * @param {Function} [options.checkIgnore] - 是否忽略对象的回调函数，参数为对象实例，返回true表示忽略该对象，false表示不忽略，未指定则使用{@link Picking#checkIgnore}参数
     * @returns {Array<PickedResult>} 返回与射线相交的结果对象数组，按照距离从近到远排序，详见{@link Picking.PickedResult}，如果没有相交对象，则返回空数组
    */
    raycastFromWindow(windowPosition, canvas, camera, target, options) {
        const ndc = getNDCInElement(canvas, windowPosition, scratchVector2);
        return this.raycastFromCamera(ndc, camera, target, options);
    }
    /**
     * 从窗口位置发射射线进行检测，即CPU拾取，只返回最近的相交结果对象
     * @param {Vector2} windowPosition - 窗口坐标位置，格式：{x: number, y: number}
     * @param {HTMLCanvasElement} canvas - 窗口画布元素
     * @param {Camera} camera - 相机对象
     * @param {Scene|Object3D|Array<Object3D>} target - 要检测的目标对象
     * @param {object} [options] - 配置参数
     * @param {number} [options.near] - 射线检测的最近距离，默认0
     * @param {number} [options.far] - 射线检测的最远距离，默认Infinity
     * @param {boolean} [options.recursive] - 是否递归检测子对象，默认true
     * @param {boolean} [options.ignoreInvisible] - 是否忽略不可见对象，未指定则使用{@link Picking#ignoreInvisible}属性
     * @param {Function} [options.checkIgnore] - 是否忽略对象的回调函数，参数为对象实例，返回true表示忽略该对象，false表示不忽略，未指定则使用{@link Picking#checkIgnore}参数
     * @returns {PickedResult|undefined} 返回与射线相交最近的结果对象，如果没有相交则返回undefined，详见{@link Picking.PickedResult}
    */
    raycastNearestFromWindow(windowPosition, canvas, camera, target, options) {
        const result = this.raycastFromWindow(windowPosition, canvas, camera, target, options);
        if (result && result.length > 0)
            return result[0];
    }
    /**
     * 从起点到终点发射射线进行检测，即CPU拾取，返回所有相交结果数组
     * @param {Vector3} from - 射线起点
     * @param {Vector3} to - 射线终点
     * @param {Scene|Object3D|Array<Object3D>} target - 要检测的目标对象
     * @param {object} [options] - 配置参数
     * @param {boolean} [options.recursive] - 是否递归检测子对象，默认true
     * @param {boolean} [options.ignoreInvisible] - 是否忽略不可见对象，未指定则使用{@link Picking#ignoreInvisible}属性
     * @param {Function} [options.checkIgnore] - 是否忽略对象的回调函数，参数为对象实例，返回true表示忽略该对象，false表示不忽略，未指定则使用{@link Picking#checkIgnore}参数
     * @returns {Array<PickedResult>} 返回与射线相交的结果对象数组，按照距离从近到远排序，详见{@link Picking.PickedResult}，如果没有相交对象，则返回空数组
    */
    raycastFromPoints(from, to, target, options = {}) {
        const direction = new Vector3().subVectors(to, from).normalize();
        const distance = from.distanceTo(to);
        this.raycaster.set(from, direction);
        return this.raycast(target, Object.assign(options, { near: 0, far: distance }));
    }
    /**
     * 从起点到终点发射射线进行检测，即CPU拾取，只返回最近的相交结果对象
     * @param {Vector3} from - 射线起点
     * @param {Vector3} to - 射线终点
     * @param {Scene|Object3D|Array<Object3D>} target - 要检测的目标对象
     * @param {object} [options] - 配置参数
     * @param {boolean} [options.recursive] - 是否递归检测子对象，默认true
     * @param {boolean} [options.ignoreInvisible] - 是否忽略不可见对象，未指定则使用{@link Picking#ignoreInvisible}属性
     * @param {Function} [options.checkIgnore] - 是否忽略对象的回调函数，参数为对象实例，返回true表示忽略该对象，false表示不忽略，未指定则使用{@link Picking#checkIgnore}参数
     * @returns {PickedResult|undefined} 返回与射线相交最近的结果对象，如果没有相交则返回undefined，详见{@link Picking.PickedResult}
    */
    raycastNearestFromPoints(from, to, target, options) {
        const result = this.raycastFromPoints(from, to, target, options);
        if (result && result.length > 0)
            return result[0];
    }
    /**
     * 渲染拾取场景，包含颜色与深度
     * @param {WebGLRenderer|WebGPURenderer} renderer - 渲染器实例
     * @param {Camera} camera - 相机
     * @param {Scene|Object3D|Array<Object3D>} target - 拾取目标，可以是场景、对象或对象数组
     * @param {RenderTarget} [colorRenderTarget] - 颜色拾取渲染目标
     * @param {RenderTarget} [depthRenderTarget] - 深度拾取渲染目标
     * @param {object} [options] - 配置参数
     * @param {boolean} [options.ignoreInvisible] - 是否忽略不可见对象，未指定则使用{@link Picking#ignoreInvisible}属性
     * @param {Function} [options.checkIgnore] - 是否忽略对象的回调函数，参数为对象实例，返回true表示忽略该对象，false表示不忽略，未指定则使用{@link Picking#checkIgnore}参数
     * @private
    */
    renderScene(renderer, camera, target, colorRenderTarget, depthRenderTarget, options = {}) {
        const { pickingMaterials, originalParents, originalMaterials, originalVisibles, originalFrustumCulleds, depthMaterial } = this;
        const ignoreInvisible = options.ignoreInvisible ?? this.ignoreInvisible;
        const checkIgnore = options.checkIgnore ?? this.checkIgnore;
        const hasCheckIgnore = (typeof checkIgnore === 'function');

        let scene = null;
        if (target.isScene) {
            scene = target;
        } else if (target.isObject3D) {
            scene = this.pickingScene;
            originalParents.set(target, target.parent);
            scene.add(target);
        } else if (Array.isArray(target)) {
            scene = this.pickingScene;
            target.forEach(child => {
                originalParents.set(child, child.parent);
                scene.add(child);
            });
        } else {
            throw new Error("target参数必须是Scene、Object3D或Object3D数组类型。");
        }

        const callback = (child) => {
            // checkIgnore返回为true的对象设置为不可见
            if (hasCheckIgnore && checkIgnore(child)) {
                originalVisibles.set(child, child.visible);
                child.visible = false;
                return true; //返回true，停止遍历子对象
            }
            // 处理不可见对象
            if (child.visible === false) {
                // 强制显示不可见对象
                originalVisibles.set(child, child.visible);
                child.visible = true;
            }
            // 替换拾取材质
            if (colorRenderTarget && pickingMaterials.has(child)) {
                const pickMaterial = pickingMaterials.get(child);
                replaceToPickMaterial(child, pickMaterial, originalMaterials, originalFrustumCulleds);
            }
        };

        // traverse the scene and replace materials
        ignoreInvisible ? traverseVisible(scene, callback) : traverse(scene, callback);
        // store the original background and environment and overrideMaterial
        const background = scene.background;
        const environment = scene.environment;
        const overrideMaterial = scene.overrideMaterial;
        scene.background = scene.environment = scene.overrideMaterial = null;
        // store the original renderTarget
        const renderTarget = renderer.getRenderTarget();
        if (colorRenderTarget) {
            renderer.setRenderTarget(colorRenderTarget);
            // render the scene
            renderer.render(scene, camera);
        }
        if (depthRenderTarget) {
            // use depth material
            scene.overrideMaterial = depthMaterial;
            renderer.setRenderTarget(depthRenderTarget);
            // render the scene
            renderer.render(scene, camera);
        }
        // restore the original renderTarget
        renderer.setRenderTarget(renderTarget);
        // restore the original background and environment and overrideMaterial
        scene.background = background;
        scene.environment = environment;
        scene.overrideMaterial = overrideMaterial;
        // restore the original materials
        originalMaterials.forEach((material, child) => {
            child.material = material;
        });
        originalMaterials.clear();
        // restore the original visibles
        originalVisibles.forEach((visible, child) => {
            child.visible = visible;
        });
        originalVisibles.clear();
        // restore the original frustumCulled (Sprite with sizeAttenuation=false)
        originalFrustumCulleds.forEach((frustumCulled, child) => {
            child.frustumCulled = frustumCulled;
        });
        originalFrustumCulleds.clear();
        // restore the object to its original parent
        if (originalParents.size > 0) {
            originalParents.forEach((parent, child) => {
                parent.add(child);
            });
            originalParents.clear();
        }
    }
    /**
     * 渲染拾取，即GPU拾取，先将场景渲染至RenderTarget后读取像素进行拾取，因WebGPU的设计限制，无法同步读取像素，因此使用异步方法，异步返回拾取结果。
     * @param {Vector2} windowPosition - Window coordinates to perform picking on，格式：{x: number, y: number}
     * @param {WebGLRenderer|WebGPURenderer} renderer - 渲染器实例
     * @param {Camera} camera - 相机
     * @param {Scene|Object3D|Array<Object3D>} target - 拾取目标，可以是场景、对象或对象数组
     * @param {object} [options] - 配置参数
     * @param {PickTargetType} [options.pickTarget] - 指定拾取的目标类型，默认PickTargetType.ALL
     * @param {boolean} [options.ignoreInvisible] - 是否忽略不可见对象，未指定则使用{@link Picking#ignoreInvisible}属性
     * @param {Function} [options.checkIgnore] - 是否忽略对象的回调函数，参数为对象实例，返回true表示忽略该对象，false表示不忽略，未指定则使用{@link Picking#checkIgnore}参数
     * @returns {Promise<{object:Object3D,point:Vector3}|undefined>} 异步返回拾取结果，包含拾取到的对象与位置点，未拾取到则返回undefined。
     * @private
    */
    async renderPick(windowPosition, renderer, camera, target, options = {}) {
        const { pickingColorRenderTarget, pickingDepthRenderTarget } = this;
        const pickTarget = options.pickTarget ?? PickTargetType.ALL;
        const pickObject = pickTarget === PickTargetType.POSITION ? false : true;
        const pickPosition = pickTarget === PickTargetType.OBJECT ? false : true;

        // 如果是WebGPU渲染器且未初始化，则初始化
        if (renderer.isWebGPURenderer && !renderer.hasInitialized())
            await renderer.init();

        // set the view offset to represent just a single pixel under the canvasPosition
        // const pixelRatio = renderer.getPixelRatio();
        // const x = windowPosition.x * pixelRatio;
        // const y = windowPosition.y * pixelRatio;
        const x = windowPosition.x;
        const y = windowPosition.y;
        camera.setViewOffset(
            renderer.domElement.clientWidth,  // full width
            renderer.domElement.clientHeight, // full height
            x,                          // rect x
            y,                          // rect y
            1,                          // rect width
            1,                          // rect height
        );
        // render to picking render target
        this.renderScene(renderer, camera, target, (pickObject ? pickingColorRenderTarget : undefined), (pickPosition ? pickingDepthRenderTarget : undefined), options);
        // clear the view offset so rendering returns to normal
        camera.clearViewOffset();

        let object = undefined, position = undefined;
        if (pickObject) {
            const cacheKey = x + '&' + y;
            if (this._sessions.cacheKey === cacheKey && this._sessions.cachedObject) {
                object = this._sessions.cachedObject;
            } else {
                // read the color render target pixel
                let ubyteBuffer = this._sessions.ubyteBuffer;
                if (renderer.isWebGLRenderer)
                    renderer.readRenderTargetPixels(
                        pickingColorRenderTarget,
                        0, // x
                        0, // y
                        1, // width
                        1, // height
                        ubyteBuffer);
                else if (renderer.isWebGPURenderer)
                    ubyteBuffer = await renderer.readRenderTargetPixelsAsync(
                        pickingColorRenderTarget,
                        0, // x
                        0, // y
                        1, // width
                        1, // height);
                    );
                // decode the id
                const id =
                    (ubyteBuffer[0] << 16) |
                    (ubyteBuffer[1] << 8) |
                    (ubyteBuffer[2] << 0);
                // console.log('picked id:', id);
                object = this.pickingObjects.get(id);
                this._sessions.cacheKey = cacheKey;
                this._sessions.cachedObject = object;
            }
            // console.log('render pick object:', object);
        }
        if (pickPosition) {
            // read the depth render target pixel
            let floatBuffer = this._sessions.floatBuffer;
            if (renderer.isWebGLRenderer)
                renderer.readRenderTargetPixels(
                    pickingDepthRenderTarget,
                    0, // x
                    0, // y
                    1, // width
                    1, // height
                    floatBuffer);
            else if (renderer.isWebGPURenderer)
                floatBuffer = await renderer.readRenderTargetPixelsAsync(
                    pickingDepthRenderTarget,
                    0, // x
                    0, // y
                    1, // width
                    1, // height
                );
            if (floatBuffer[3] > 0) {
                const depth = unpackRGBToDepth(floatBuffer);
                // console.log('floatBuffer:', floatBuffer, 'depth:', depth);
                if (depth !== 0) {
                    const ndc = getNDCInElement(renderer.domElement, windowPosition, scratchVector3);
                    ndc.z = depth * 2 - 1;
                    position = ndcToWorldCoords(ndc, camera);
                }
                // console.log('render pick point:', point);
            }
        }
        if (object || position) {
            const result = {};
            if (object)
                result.object = object;
            if (position)
                result.position = result.point = position;
            return result;
        }
    }
    /**
     * 根据窗口位置拾取，因WebGPU的设计限制，无法同步读取像素，因此使用异步方法，异步返回拾取结果。
     * @param {Vector2} windowPosition - Window coordinates to perform picking on，格式：{x: number, y: number}
     * @param {Camera} camera - 相机对象
     * @param {Scene|Object3D|Array<Object3D>} target - 拾取目标对象，可以是场景、对象或对象数组
     * @param {object} [options] - 配置参数
     * @param {PickingMode} [options.mode] - 拾取模式，未指定则使用{@link Picking#mode}属性
     * @param {PickTargetType} [options.pickTarget] - 指定拾取的目标类型，默认PickTargetType.ALL
     * @param {number} [options.near] - 射线检测的最近距离，默认0
     * @param {number} [options.far] - 射线检测的最远距离，默认Infinity
     * @param {boolean} [options.recursive] - 射线检测是否递归检测子对象，默认true
     * @param {boolean} [options.ignoreInvisible] - 是否忽略不可见对象，未指定则使用{@link Picking#ignoreInvisible}属性
     * @param {Function} [options.checkIgnore] - 是否忽略对象的回调函数，参数为对象实例，返回true表示忽略该对象，false表示不忽略，未指定则使用{@link Picking#checkIgnore}参数
     * @returns {Promise<PickedResult|undefined>} 异步返回拾取结果对象，详见{@link Picking.PickedResult}。
    */
    async pick(windowPosition, camera, target, options) {
        // console.time('pickTime');
        const renderer = this.renderer;
        const pickingMode = options.mode ?? this.mode;
        let result = undefined;
        switch (pickingMode) {
            case PickingMode.FAST:
                result = await this.renderPick(windowPosition, renderer, camera, target, options);
                break;
            case PickingMode.PRECISION:
                result = this.raycastNearestFromWindow(windowPosition, renderer.domElement, camera, target, options);
                break;
            case PickingMode.NORMAL:
                const pickTarget = options.pickTarget ?? PickTargetType.ALL;
                options.pickTarget = PickTargetType.OBJECT;
                result = await this.renderPick(windowPosition, renderer, camera, target, options);
                if (result && pickTarget !== PickTargetType.OBJECT) {
                    result = this.raycastNearestFromWindow(windowPosition, renderer.domElement, camera, result.object, options);
                }
                break;
        }
        return ensurePickedResult(result);
        // console.timeEnd('pickTime');
    }
    /**
     * 根据标准化设备坐标拾取，因WebGPU的设计限制，无法同步读取像素，因此使用异步方法，异步返回拾取结果。
     * @param {Vector2} ndc - 标准化设备坐标，格式：{x: number, y: number}，范围[-1, 1]
     * @param {Camera} camera - 相机对象
     * @param {Scene|Object3D|Array<Object3D>} target - 拾取目标对象，可以是场景、对象或对象数组
     * @param {object} [options] - 配置参数，同{@link Picking#pick}方法的options参数
     * @returns {Promise<PickedResult|undefined>} 异步返回拾取结果对象，详见{@link Picking.PickedResult}。
    */
    pickFromNDC(ndc, camera, target, options = {}) {
        const renderer = this.renderer;
        const windowPosition = ndcToWindowPosition(ndc, renderer.domElement.clientWidth, renderer.domElement.clientHeight, true, scratchWindowPosition);
        if (windowPosition)
            return this.pick(windowPosition, camera, target, options);
    }
    /**
     * 获取整个场景窗口的颜色拾取内容
     * @param {Camera} camera - 相机
     * @param {Scene|Object3D|Array<Object3D>} target - 拾取目标对象，可以是场景、对象或对象数组
     * @param {object} [options] - 配置参数，详见{@link Picking#renderScene}options参数
     * @returns {RenderTarget} 颜色拾取渲染目标
    */
    getWindowColorRenderTarget(camera, target, options = {}) {
        this.renderScene(this.renderer, camera, target, this.windowColorRenderTarget, undefined, options);
        return this.windowColorRenderTarget;
    }
    /**
     * 获取整个场景窗口的深度拾取内容
     * @param {Camera} camera - 相机
     * @param {Scene|Object3D|Array<Object3D>} target - 拾取目标对象，可以是场景、对象或对象数组
     * @param {object} [options] - 配置参数，详见{@link Picking#renderScene}options参数
     * @returns {RenderTarget} 深度拾取渲染目标
    */
    getWindowDepthRenderTarget(camera, target, options = {}) {
        this.renderScene(this.renderer, camera, target, undefined, this.windowDepthRenderTarget, options);
        return this.windowDepthRenderTarget;
    }
    /**
     * 将颜色拾取或深度拾取内容渲染至屏幕以方便调试
     * @param {Scene} scene
     * @param {Camera} camera
     * @private
    */
    renderDebug(scene, camera) {
        if (this.debugColorPicking === true || this.debugDepthPicking === true) {
            if (this.debugColorPicking === true) {
                const target = this.getWindowColorRenderTarget(camera, scene);
                if (this.postQuad.material.map !== target.texture) {
                    this.postQuad.material.map = target.texture;
                    this.postQuad.material.needsUpdate = true;
                }
            } else if (this.debugDepthPicking === true) {
                const target = this.getWindowDepthRenderTarget(camera, scene);
                if (this.postQuad.material.map !== target.texture) {
                    this.postQuad.material.map = target.texture;
                    this.postQuad.material.needsUpdate = true;
                }
            }
            const renderer = this.renderer;
            // render to screen
            renderer.setRenderTarget(null);
            if (this.postQuad.isQuadMesh)
                this.postQuad.render(renderer);
            else
                renderer.render(this.postScene, this.postCamera);
        }
    }
    dispose() {
        this.pickingObjects.clear();
        this.pickingMaterials.clear();
        this.originalMaterials.clear();
        this.originalFrustumCulleds.clear();
        this.pickingColorRenderTarget.dispose();
        this.pickingDepthRenderTarget.dispose();
        this.windowColorRenderTarget.dispose();
        this.windowDepthRenderTarget.dispose();
        if (this.postQuad.isQuadMesh)
            this.postQuad.dispose();
        else
            this.postQuad.material.dispose();
    }
    onDestroy() {
        this.dispose();
    }
};
/**
 * 拾取模式枚举，参见 {@link PickingMode}。
 * @enum {string}
 * @static
 * @memberof Picking
*/
Picking.Mode = PickingMode;
/**
 * 拾取目标类型枚举，参见 {@link PickTargetType}。
 * @enum {string}
 * @static
 * @memberof Picking
*/
Picking.PickTargetType = PickTargetType;

export default Picking;
export { Picking, PickingMode, PickTargetType };

