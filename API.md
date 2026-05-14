## Classes

<dl>
<dt><a href="#Picking">Picking</a></dt>
<dd><p>拾取管理器，封装了射线检测、颜色拾取和深度拾取等功能，并对外提供统一的拾取接口。</p>
</dd>
</dl>

<a name="Picking"></a>

## Picking
拾取管理器，封装了射线检测、颜色拾取和深度拾取等功能，并对外提供统一的拾取接口。

**Kind**: global class  

* [Picking](#Picking)
    * [new Picking(renderer)](#new_Picking_new)
    * _instance_
        * [.renderer](#Picking+renderer) : <code>WebGLRenderer</code> \| <code>WebGPURenderer</code>
        * [.isWebGLRenderer](#Picking+isWebGLRenderer) : <code>boolean</code>
        * [.isWebGPURenderer](#Picking+isWebGPURenderer) : <code>boolean</code>
        * [.raycaster](#Picking+raycaster) : <code>Raycaster</code>
        * [.enableRandomColor](#Picking+enableRandomColor) : <code>boolean</code>
        * [.mode](#Picking+mode) : [<code>PickingMode</code>](#PickingMode)
        * [.ignoreInvisible](#Picking+ignoreInvisible) : <code>boolean</code>
        * [.checkIgnore](#Picking+checkIgnore) : <code>function</code>
        * [.debugColorPicking](#Picking+debugColorPicking) : <code>boolean</code>
        * [.debugDepthPicking](#Picking+debugDepthPicking) : <code>boolean</code>
        * [.registerObject(object)](#Picking+registerObject)
        * [.unregisterObject(object)](#Picking+unregisterObject)
        * [.unregisterAllObjects()](#Picking+unregisterAllObjects)
        * [.setSize(width, height)](#Picking+setSize)
        * [.getRayFromWindow(windowPosition, canvas, camera, [result])](#Picking+getRayFromWindow) ⇒ <code>Ray</code>
        * [.getRayFromPoints(from, to, [result])](#Picking+getRayFromPoints) ⇒ <code>Ray</code>
        * [.raycast(target, [options])](#Picking+raycast) ⇒ <code>Array.&lt;PickedResult&gt;</code>
        * [.raycastNearest(target, [options])](#Picking+raycastNearest) ⇒ <code>PickedResult</code> \| <code>undefined</code>
        * [.raycastFromRay(ray, target, [options])](#Picking+raycastFromRay) ⇒ <code>Array.&lt;PickedResult&gt;</code>
        * [.raycastNearestFromRay(ray, target, [options])](#Picking+raycastNearestFromRay) ⇒ <code>PickedResult</code> \| <code>undefined</code>
        * [.raycastFromDirection(origin, direction, target, [options])](#Picking+raycastFromDirection) ⇒ <code>PickedResult</code> \| <code>undefined</code>
        * [.raycastNearestFromDirection(origin, direction, target, [options])](#Picking+raycastNearestFromDirection) ⇒ <code>PickedResult</code> \| <code>undefined</code>
        * [.raycastFromCamera(ndc, camera, target, [options])](#Picking+raycastFromCamera) ⇒ <code>Array.&lt;PickedResult&gt;</code>
        * [.raycastNearestFromCamera(ndc, camera, target, [options])](#Picking+raycastNearestFromCamera) ⇒ <code>PickedResult</code> \| <code>undefined</code>
        * [.raycastFromWindow(windowPosition, canvas, camera, target, [options])](#Picking+raycastFromWindow) ⇒ <code>Array.&lt;PickedResult&gt;</code>
        * [.raycastNearestFromWindow(windowPosition, canvas, camera, target, [options])](#Picking+raycastNearestFromWindow) ⇒ <code>PickedResult</code> \| <code>undefined</code>
        * [.raycastFromPoints(from, to, target, [options])](#Picking+raycastFromPoints) ⇒ <code>Array.&lt;PickedResult&gt;</code>
        * [.raycastNearestFromPoints(from, to, target, [options])](#Picking+raycastNearestFromPoints) ⇒ <code>PickedResult</code> \| <code>undefined</code>
        * [.pick(windowPosition, camera, target, [options])](#Picking+pick) ⇒ <code>Promise.&lt;(PickedResult\|undefined)&gt;</code>
        * [.pickFromNDC(ndc, camera, target, [options])](#Picking+pickFromNDC) ⇒ <code>Promise.&lt;(PickedResult\|undefined)&gt;</code>
        * [.getWindowColorRenderTarget(camera, target, [options])](#Picking+getWindowColorRenderTarget) ⇒ <code>RenderTarget</code>
        * [.getWindowDepthRenderTarget(camera, target, [options])](#Picking+getWindowDepthRenderTarget) ⇒ <code>RenderTarget</code>
    * _static_
        * [.Mode](#Picking.Mode) : <code>enum</code>
        * [.PickTargetType](#Picking.PickTargetType) : <code>enum</code>
        * [.PickedResult](#Picking.PickedResult) : <code>object</code>

<a name="new_Picking_new"></a>

### new Picking(renderer)
构造实例


| Param | Type | Description |
| --- | --- | --- |
| renderer | <code>WebGLRenderer</code> \| <code>WebGPURenderer</code> | 渲染器实例，支持WebGLRenderer和WebGPURenderer。 |

<a name="Picking+renderer"></a>

### picking.renderer : <code>WebGLRenderer</code> \| <code>WebGPURenderer</code>
渲染器实例

**Kind**: instance property of [<code>Picking</code>](#Picking)  
**Read only**: true  
<a name="Picking+isWebGLRenderer"></a>

### picking.isWebGLRenderer : <code>boolean</code>
是否为WebGL渲染器

**Kind**: instance property of [<code>Picking</code>](#Picking)  
**Read only**: true  
<a name="Picking+isWebGPURenderer"></a>

### picking.isWebGPURenderer : <code>boolean</code>
是否为WebGPU渲染器

**Kind**: instance property of [<code>Picking</code>](#Picking)  
**Read only**: true  
<a name="Picking+raycaster"></a>

### picking.raycaster : <code>Raycaster</code>
射线发射器对象 - [https://threejs.org/docs/#Raycaster](https://threejs.org/docs/#Raycaster)

**Kind**: instance property of [<code>Picking</code>](#Picking)  
**Read only**: true  
<a name="Picking+enableRandomColor"></a>

### picking.enableRandomColor : <code>boolean</code>
是否启用随机颜色拾取

**Kind**: instance property of [<code>Picking</code>](#Picking)  
**Default**: <code>true</code>  
<a name="Picking+mode"></a>

### picking.mode : [<code>PickingMode</code>](#PickingMode)
拾取模式

**Kind**: instance property of [<code>Picking</code>](#Picking)  
**Default**: <code>PickingMode.NORMAL</code>  
<a name="Picking+ignoreInvisible"></a>

### picking.ignoreInvisible : <code>boolean</code>
忽略不可见对象

**Kind**: instance property of [<code>Picking</code>](#Picking)  
**Default**: <code>true</code>  
<a name="Picking+checkIgnore"></a>

### picking.checkIgnore : <code>function</code>
自定义不可拾取检查函数，接受一个Object3D对象作为参数，返回一个布尔值，指示该对象是否应该被视为不可拾取。

**Kind**: instance property of [<code>Picking</code>](#Picking)  
<a name="Picking+debugColorPicking"></a>

### picking.debugColorPicking : <code>boolean</code>
是否显示颜色拾取场景至屏幕

**Kind**: instance property of [<code>Picking</code>](#Picking)  
<a name="Picking+debugDepthPicking"></a>

### picking.debugDepthPicking : <code>boolean</code>
是否显示深度拾取场景至屏幕

**Kind**: instance property of [<code>Picking</code>](#Picking)  
<a name="Picking+registerObject"></a>

### picking.registerObject(object)
注册拾取对象

**Kind**: instance method of [<code>Picking</code>](#Picking)  

| Param | Type | Description |
| --- | --- | --- |
| object | <code>Object3D</code> | 可拾取对象 |

<a name="Picking+unregisterObject"></a>

### picking.unregisterObject(object)
注销拾取对象

**Kind**: instance method of [<code>Picking</code>](#Picking)  

| Param | Type | Description |
| --- | --- | --- |
| object | <code>Object3D</code> | 可拾取对象 |

<a name="Picking+unregisterAllObjects"></a>

### picking.unregisterAllObjects()
注销所有拾取对象

**Kind**: instance method of [<code>Picking</code>](#Picking)  
<a name="Picking+setSize"></a>

### picking.setSize(width, height)
设置当前窗口大小

**Kind**: instance method of [<code>Picking</code>](#Picking)  

| Param | Type | Description |
| --- | --- | --- |
| width | <code>number</code> | 宽度 |
| height | <code>number</code> | 高度 |

<a name="Picking+getRayFromWindow"></a>

### picking.getRayFromWindow(windowPosition, canvas, camera, [result]) ⇒ <code>Ray</code>
根据窗口位置获取射线对象

**Kind**: instance method of [<code>Picking</code>](#Picking)  
**Returns**: <code>Ray</code> - 返回射线对象  

| Param | Type | Description |
| --- | --- | --- |
| windowPosition | <code>Vector2</code> | 窗口坐标位置，格式：{x: number, y: number} |
| canvas | <code>HTMLCanvasElement</code> | 窗口画布元素 |
| camera | <code>Camera</code> | 相机对象 |
| [result] | <code>Ray</code> | 结果存储对象 |

<a name="Picking+getRayFromPoints"></a>

### picking.getRayFromPoints(from, to, [result]) ⇒ <code>Ray</code>
根据起点和终点获取射线对象

**Kind**: instance method of [<code>Picking</code>](#Picking)  
**Returns**: <code>Ray</code> - 返回射线对象  

| Param | Type | Description |
| --- | --- | --- |
| from | <code>Vector3</code> | 起点 |
| to | <code>Vector3</code> | 终点 |
| [result] | <code>Ray</code> | 结果存储对象 |

<a name="Picking+raycast"></a>

### picking.raycast(target, [options]) ⇒ <code>Array.&lt;PickedResult&gt;</code>
射线检测某个目标对象，即CPU拾取，返回所有相交结果数组

**Kind**: instance method of [<code>Picking</code>](#Picking)  
**Returns**: <code>Array.&lt;PickedResult&gt;</code> - 返回与射线相交的结果对象数组，按照距离从近到远排序，详见[PickedResult](#Picking.PickedResult)，如果没有相交对象，则返回空数组  

| Param | Type | Description |
| --- | --- | --- |
| target | <code>Scene</code> \| <code>Object3D</code> \| <code>Array.&lt;Object3D&gt;</code> | 要检测的目标对象 |
| [options] | <code>object</code> | 配置参数 |
| [options.near] | <code>number</code> | 射线检测的最近距离，默认0 |
| [options.far] | <code>number</code> | 射线检测的最远距离，默认Infinity |
| [options.recursive] | <code>boolean</code> | 是否递归检测子对象，默认true |
| [options.ignoreInvisible] | <code>boolean</code> | 是否忽略不可见对象，未指定则使用[ignoreInvisible](#Picking+ignoreInvisible)属性 |
| [options.checkIgnore] | <code>function</code> | 是否忽略对象的回调函数，参数为对象实例，返回true表示忽略该对象，false表示不忽略，未指定则使用[checkIgnore](#Picking+checkIgnore)参数 |

<a name="Picking+raycastNearest"></a>

### picking.raycastNearest(target, [options]) ⇒ <code>PickedResult</code> \| <code>undefined</code>
射线检测某个目标对象，即CPU拾取，只返回最近的相交结果对象

**Kind**: instance method of [<code>Picking</code>](#Picking)  
**Returns**: <code>PickedResult</code> \| <code>undefined</code> - 返回与射线相交最近的结果对象，如果没有相交则返回undefined，详见[PickedResult](#Picking.PickedResult)  

| Param | Type | Description |
| --- | --- | --- |
| target | <code>Scene</code> \| <code>Object3D</code> \| <code>Array.&lt;Object3D&gt;</code> | 要检测的目标对象 |
| [options] | <code>object</code> | 配置参数 |
| [options.near] | <code>number</code> | 射线检测的最近距离，默认0 |
| [options.far] | <code>number</code> | 射线检测的最远距离，默认Infinity |
| [options.recursive] | <code>boolean</code> | 是否递归检测子对象，默认true |
| [options.ignoreInvisible] | <code>boolean</code> | 是否忽略不可见对象，未指定则使用[ignoreInvisible](#Picking+ignoreInvisible)属性 |
| [options.checkIgnore] | <code>function</code> | 是否忽略对象的回调函数，参数为对象实例，返回true表示忽略该对象，false表示不忽略，未指定则使用[checkIgnore](#Picking+checkIgnore)参数 |

<a name="Picking+raycastFromRay"></a>

### picking.raycastFromRay(ray, target, [options]) ⇒ <code>Array.&lt;PickedResult&gt;</code>
根据射线对象进行射线检测，即CPU拾取，返回所有相交结果数组

**Kind**: instance method of [<code>Picking</code>](#Picking)  
**Returns**: <code>Array.&lt;PickedResult&gt;</code> - 返回与射线相交的结果对象数组，按照距离从近到远排序，详见[PickedResult](#Picking.PickedResult)，如果没有相交对象，则返回空数组  

| Param | Type | Description |
| --- | --- | --- |
| ray | <code>Ray</code> | 射线对象 |
| target | <code>Scene</code> \| <code>Object3D</code> \| <code>Array.&lt;Object3D&gt;</code> | 要检测的目标对象 |
| [options] | <code>object</code> | 配置参数 |
| [options.near] | <code>number</code> | 射线检测的最近距离，默认0 |
| [options.far] | <code>number</code> | 射线检测的最远距离，默认Infinity |
| [options.recursive] | <code>boolean</code> | 是否递归检测子对象，默认true |
| [options.ignoreInvisible] | <code>boolean</code> | 是否忽略不可见对象，未指定则使用[ignoreInvisible](#Picking+ignoreInvisible)属性 |
| [options.checkIgnore] | <code>function</code> | 是否忽略对象的回调函数，参数为对象实例，返回true表示忽略该对象，false表示不忽略，未指定则使用[checkIgnore](#Picking+checkIgnore)参数 |

<a name="Picking+raycastNearestFromRay"></a>

### picking.raycastNearestFromRay(ray, target, [options]) ⇒ <code>PickedResult</code> \| <code>undefined</code>
根据射线对象进行射线检测，即CPU拾取，只返回最近的相交结果对象

**Kind**: instance method of [<code>Picking</code>](#Picking)  
**Returns**: <code>PickedResult</code> \| <code>undefined</code> - 返回与射线相交最近的结果对象，如果没有相交则返回undefined，详见[PickedResult](#Picking.PickedResult)  

| Param | Type | Description |
| --- | --- | --- |
| ray | <code>Ray</code> | 射线对象 |
| target | <code>Scene</code> \| <code>Object3D</code> \| <code>Array.&lt;Object3D&gt;</code> | 要检测的目标对象 |
| [options] | <code>object</code> | 配置参数 |
| [options.near] | <code>number</code> | 射线检测的最近距离，默认0 |
| [options.far] | <code>number</code> | 射线检测的最远距离，默认Infinity |
| [options.recursive] | <code>boolean</code> | 是否递归检测子对象，默认true |
| [options.ignoreInvisible] | <code>boolean</code> | 是否忽略不可见对象，未指定则使用[ignoreInvisible](#Picking+ignoreInvisible)属性 |
| [options.checkIgnore] | <code>function</code> | 是否忽略对象的回调函数，参数为对象实例，返回true表示忽略该对象，false表示不忽略，未指定则使用[checkIgnore](#Picking+checkIgnore)参数 |

<a name="Picking+raycastFromDirection"></a>

### picking.raycastFromDirection(origin, direction, target, [options]) ⇒ <code>PickedResult</code> \| <code>undefined</code>
指定原点和方向的射线检测，即CPU拾取

**Kind**: instance method of [<code>Picking</code>](#Picking)  
**Returns**: <code>PickedResult</code> \| <code>undefined</code> - 返回与射线相交最近的结果对象，如果没有相交则返回undefined，详见[PickedResult](#Picking.PickedResult)  

| Param | Type | Description |
| --- | --- | --- |
| origin | <code>Vector3</code> | 射线原点 |
| direction | <code>Vector3</code> | 射线方向 |
| target | <code>Scene</code> \| <code>Object3D</code> \| <code>Array.&lt;Object3D&gt;</code> | 要检测的目标对象 |
| [options] | <code>object</code> | 配置参数 |
| [options.near] | <code>number</code> | 射线检测的最近距离，默认0 |
| [options.far] | <code>number</code> | 射线检测的最远距离，默认Infinity |
| [options.recursive] | <code>boolean</code> | 是否递归检测子对象，默认true |
| [options.ignoreInvisible] | <code>boolean</code> | 是否忽略不可见对象，未指定则使用[ignoreInvisible](#Picking+ignoreInvisible)属性 |
| [options.checkIgnore] | <code>function</code> | 是否忽略对象的回调函数，参数为对象实例，返回true表示忽略该对象，false表示不忽略，未指定则使用[checkIgnore](#Picking+checkIgnore)参数 |

<a name="Picking+raycastNearestFromDirection"></a>

### picking.raycastNearestFromDirection(origin, direction, target, [options]) ⇒ <code>PickedResult</code> \| <code>undefined</code>
指定原点和方向的射线检测，即CPU拾取，只返回最近的相交结果对象

**Kind**: instance method of [<code>Picking</code>](#Picking)  
**Returns**: <code>PickedResult</code> \| <code>undefined</code> - 返回与射线相交最近的结果对象，如果没有相交则返回undefined，详见[PickedResult](#Picking.PickedResult)  

| Param | Type | Description |
| --- | --- | --- |
| origin | <code>Vector3</code> | 射线原点 |
| direction | <code>Vector3</code> | 射线方向 |
| target | <code>Scene</code> \| <code>Object3D</code> \| <code>Array.&lt;Object3D&gt;</code> | 要检测的目标对象 |
| [options] | <code>object</code> | 配置参数 |
| [options.near] | <code>number</code> | 射线检测的最近距离，默认0 |
| [options.far] | <code>number</code> | 射线检测的最远距离，默认Infinity |
| [options.recursive] | <code>boolean</code> | 是否递归检测子对象，默认true |
| [options.ignoreInvisible] | <code>boolean</code> | 是否忽略不可见对象，未指定则使用[ignoreInvisible](#Picking+ignoreInvisible)属性 |
| [options.checkIgnore] | <code>function</code> | 是否忽略对象的回调函数，参数为对象实例，返回true表示忽略该对象，false表示不忽略，未指定则使用[checkIgnore](#Picking+checkIgnore)参数 |

<a name="Picking+raycastFromCamera"></a>

### picking.raycastFromCamera(ndc, camera, target, [options]) ⇒ <code>Array.&lt;PickedResult&gt;</code>
从相机发射射线进行检测，即CPU拾取，返回所有相交结果数组

**Kind**: instance method of [<code>Picking</code>](#Picking)  
**Returns**: <code>Array.&lt;PickedResult&gt;</code> - 返回与射线相交的结果对象数组，按照距离从近到远排序，详见[PickedResult](#Picking.PickedResult)，如果没有相交对象，则返回空数组  

| Param | Type | Description |
| --- | --- | --- |
| ndc | <code>Vector2</code> | 标准化设备坐标，格式：{x: number, y: number}，范围[-1, 1] |
| camera | <code>Camera</code> | 相机对象 |
| target | <code>Scene</code> \| <code>Object3D</code> \| <code>Array.&lt;Object3D&gt;</code> | 要检测的目标对象 |
| [options] | <code>object</code> | 配置参数 |
| [options.near] | <code>number</code> | 射线检测的最近距离，默认0 |
| [options.far] | <code>number</code> | 射线检测的最远距离，默认Infinity |
| [options.recursive] | <code>boolean</code> | 是否递归检测子对象，默认true |
| [options.ignoreInvisible] | <code>boolean</code> | 是否忽略不可见对象，未指定则使用[ignoreInvisible](#Picking+ignoreInvisible)属性 |
| [options.checkIgnore] | <code>function</code> | 是否忽略对象的回调函数，参数为对象实例，返回true表示忽略该对象，false表示不忽略，未指定则使用[checkIgnore](#Picking+checkIgnore)参数 |

<a name="Picking+raycastNearestFromCamera"></a>

### picking.raycastNearestFromCamera(ndc, camera, target, [options]) ⇒ <code>PickedResult</code> \| <code>undefined</code>
从相机发射射线进行检测，即CPU拾取，只返回最近的相交结果对象

**Kind**: instance method of [<code>Picking</code>](#Picking)  
**Returns**: <code>PickedResult</code> \| <code>undefined</code> - 返回与射线相交最近的结果对象，如果没有相交则返回undefined，详见[PickedResult](#Picking.PickedResult)  

| Param | Type | Description |
| --- | --- | --- |
| ndc | <code>Vector2</code> | 标准化设备坐标，格式：{x: number, y: number}，范围[-1, 1] |
| camera | <code>Camera</code> | 相机对象 |
| target | <code>Scene</code> \| <code>Object3D</code> \| <code>Array.&lt;Object3D&gt;</code> | 要检测的目标对象 |
| [options] | <code>object</code> | 配置参数 |
| [options.near] | <code>number</code> | 射线检测的最近距离，默认0 |
| [options.far] | <code>number</code> | 射线检测的最远距离，默认Infinity |
| [options.recursive] | <code>boolean</code> | 是否递归检测子对象，默认true |
| [options.ignoreInvisible] | <code>boolean</code> | 是否忽略不可见对象，未指定则使用[ignoreInvisible](#Picking+ignoreInvisible)属性 |
| [options.checkIgnore] | <code>function</code> | 是否忽略对象的回调函数，参数为对象实例，返回true表示忽略该对象，false表示不忽略，未指定则使用[checkIgnore](#Picking+checkIgnore)参数 |

<a name="Picking+raycastFromWindow"></a>

### picking.raycastFromWindow(windowPosition, canvas, camera, target, [options]) ⇒ <code>Array.&lt;PickedResult&gt;</code>
从窗口位置发射射线进行检测，即CPU拾取，返回所有相交结果数组

**Kind**: instance method of [<code>Picking</code>](#Picking)  
**Returns**: <code>Array.&lt;PickedResult&gt;</code> - 返回与射线相交的结果对象数组，按照距离从近到远排序，详见[PickedResult](#Picking.PickedResult)，如果没有相交对象，则返回空数组  

| Param | Type | Description |
| --- | --- | --- |
| windowPosition | <code>Vector2</code> | 窗口坐标位置，格式：{x: number, y: number} |
| canvas | <code>HTMLCanvasElement</code> | 窗口画布元素 |
| camera | <code>Camera</code> | 相机对象 |
| target | <code>Scene</code> \| <code>Object3D</code> \| <code>Array.&lt;Object3D&gt;</code> | 要检测的目标对象 |
| [options] | <code>object</code> | 配置参数 |
| [options.near] | <code>number</code> | 射线检测的最近距离，默认0 |
| [options.far] | <code>number</code> | 射线检测的最远距离，默认Infinity |
| [options.recursive] | <code>boolean</code> | 是否递归检测子对象，默认true |
| [options.ignoreInvisible] | <code>boolean</code> | 是否忽略不可见对象，未指定则使用[ignoreInvisible](#Picking+ignoreInvisible)属性 |
| [options.checkIgnore] | <code>function</code> | 是否忽略对象的回调函数，参数为对象实例，返回true表示忽略该对象，false表示不忽略，未指定则使用[checkIgnore](#Picking+checkIgnore)参数 |

<a name="Picking+raycastNearestFromWindow"></a>

### picking.raycastNearestFromWindow(windowPosition, canvas, camera, target, [options]) ⇒ <code>PickedResult</code> \| <code>undefined</code>
从窗口位置发射射线进行检测，即CPU拾取，只返回最近的相交结果对象

**Kind**: instance method of [<code>Picking</code>](#Picking)  
**Returns**: <code>PickedResult</code> \| <code>undefined</code> - 返回与射线相交最近的结果对象，如果没有相交则返回undefined，详见[PickedResult](#Picking.PickedResult)  

| Param | Type | Description |
| --- | --- | --- |
| windowPosition | <code>Vector2</code> | 窗口坐标位置，格式：{x: number, y: number} |
| canvas | <code>HTMLCanvasElement</code> | 窗口画布元素 |
| camera | <code>Camera</code> | 相机对象 |
| target | <code>Scene</code> \| <code>Object3D</code> \| <code>Array.&lt;Object3D&gt;</code> | 要检测的目标对象 |
| [options] | <code>object</code> | 配置参数 |
| [options.near] | <code>number</code> | 射线检测的最近距离，默认0 |
| [options.far] | <code>number</code> | 射线检测的最远距离，默认Infinity |
| [options.recursive] | <code>boolean</code> | 是否递归检测子对象，默认true |
| [options.ignoreInvisible] | <code>boolean</code> | 是否忽略不可见对象，未指定则使用[ignoreInvisible](#Picking+ignoreInvisible)属性 |
| [options.checkIgnore] | <code>function</code> | 是否忽略对象的回调函数，参数为对象实例，返回true表示忽略该对象，false表示不忽略，未指定则使用[checkIgnore](#Picking+checkIgnore)参数 |

<a name="Picking+raycastFromPoints"></a>

### picking.raycastFromPoints(from, to, target, [options]) ⇒ <code>Array.&lt;PickedResult&gt;</code>
从起点到终点发射射线进行检测，即CPU拾取，返回所有相交结果数组

**Kind**: instance method of [<code>Picking</code>](#Picking)  
**Returns**: <code>Array.&lt;PickedResult&gt;</code> - 返回与射线相交的结果对象数组，按照距离从近到远排序，详见[PickedResult](#Picking.PickedResult)，如果没有相交对象，则返回空数组  

| Param | Type | Description |
| --- | --- | --- |
| from | <code>Vector3</code> | 射线起点 |
| to | <code>Vector3</code> | 射线终点 |
| target | <code>Scene</code> \| <code>Object3D</code> \| <code>Array.&lt;Object3D&gt;</code> | 要检测的目标对象 |
| [options] | <code>object</code> | 配置参数 |
| [options.recursive] | <code>boolean</code> | 是否递归检测子对象，默认true |
| [options.ignoreInvisible] | <code>boolean</code> | 是否忽略不可见对象，未指定则使用[ignoreInvisible](#Picking+ignoreInvisible)属性 |
| [options.checkIgnore] | <code>function</code> | 是否忽略对象的回调函数，参数为对象实例，返回true表示忽略该对象，false表示不忽略，未指定则使用[checkIgnore](#Picking+checkIgnore)参数 |

<a name="Picking+raycastNearestFromPoints"></a>

### picking.raycastNearestFromPoints(from, to, target, [options]) ⇒ <code>PickedResult</code> \| <code>undefined</code>
从起点到终点发射射线进行检测，即CPU拾取，只返回最近的相交结果对象

**Kind**: instance method of [<code>Picking</code>](#Picking)  
**Returns**: <code>PickedResult</code> \| <code>undefined</code> - 返回与射线相交最近的结果对象，如果没有相交则返回undefined，详见[PickedResult](#Picking.PickedResult)  

| Param | Type | Description |
| --- | --- | --- |
| from | <code>Vector3</code> | 射线起点 |
| to | <code>Vector3</code> | 射线终点 |
| target | <code>Scene</code> \| <code>Object3D</code> \| <code>Array.&lt;Object3D&gt;</code> | 要检测的目标对象 |
| [options] | <code>object</code> | 配置参数 |
| [options.recursive] | <code>boolean</code> | 是否递归检测子对象，默认true |
| [options.ignoreInvisible] | <code>boolean</code> | 是否忽略不可见对象，未指定则使用[ignoreInvisible](#Picking+ignoreInvisible)属性 |
| [options.checkIgnore] | <code>function</code> | 是否忽略对象的回调函数，参数为对象实例，返回true表示忽略该对象，false表示不忽略，未指定则使用[checkIgnore](#Picking+checkIgnore)参数 |

<a name="Picking+pick"></a>

### picking.pick(windowPosition, camera, target, [options]) ⇒ <code>Promise.&lt;(PickedResult\|undefined)&gt;</code>
根据窗口位置拾取，因WebGPU的设计限制，无法同步读取像素，因此使用异步方法，异步返回拾取结果。

**Kind**: instance method of [<code>Picking</code>](#Picking)  
**Returns**: <code>Promise.&lt;(PickedResult\|undefined)&gt;</code> - 异步返回拾取结果对象，详见[PickedResult](#Picking.PickedResult)。  

| Param | Type | Description |
| --- | --- | --- |
| windowPosition | <code>Vector2</code> | Window coordinates to perform picking on，格式：{x: number, y: number} |
| camera | <code>Camera</code> | 相机对象 |
| target | <code>Scene</code> \| <code>Object3D</code> \| <code>Array.&lt;Object3D&gt;</code> | 拾取目标对象，可以是场景、对象或对象数组 |
| [options] | <code>object</code> | 配置参数 |
| [options.mode] | [<code>PickingMode</code>](#PickingMode) | 拾取模式，未指定则使用[mode](#Picking+mode)属性 |
| [options.pickTarget] | [<code>PickTargetType</code>](#PickTargetType) | 指定拾取的目标类型，默认PickTargetType.ALL |
| [options.near] | <code>number</code> | 射线检测的最近距离，默认0 |
| [options.far] | <code>number</code> | 射线检测的最远距离，默认Infinity |
| [options.recursive] | <code>boolean</code> | 射线检测是否递归检测子对象，默认true |
| [options.ignoreInvisible] | <code>boolean</code> | 是否忽略不可见对象，未指定则使用[ignoreInvisible](#Picking+ignoreInvisible)属性 |
| [options.checkIgnore] | <code>function</code> | 是否忽略对象的回调函数，参数为对象实例，返回true表示忽略该对象，false表示不忽略，未指定则使用[checkIgnore](#Picking+checkIgnore)参数 |

<a name="Picking+pickFromNDC"></a>

### picking.pickFromNDC(ndc, camera, target, [options]) ⇒ <code>Promise.&lt;(PickedResult\|undefined)&gt;</code>
根据标准化设备坐标拾取，因WebGPU的设计限制，无法同步读取像素，因此使用异步方法，异步返回拾取结果。

**Kind**: instance method of [<code>Picking</code>](#Picking)  
**Returns**: <code>Promise.&lt;(PickedResult\|undefined)&gt;</code> - 异步返回拾取结果对象，详见[PickedResult](#Picking.PickedResult)。  

| Param | Type | Description |
| --- | --- | --- |
| ndc | <code>Vector2</code> | 标准化设备坐标，格式：{x: number, y: number}，范围[-1, 1] |
| camera | <code>Camera</code> | 相机对象 |
| target | <code>Scene</code> \| <code>Object3D</code> \| <code>Array.&lt;Object3D&gt;</code> | 拾取目标对象，可以是场景、对象或对象数组 |
| [options] | <code>object</code> | 配置参数，同[pick](#Picking+pick)方法的options参数 |

<a name="Picking+getWindowColorRenderTarget"></a>

### picking.getWindowColorRenderTarget(camera, target, [options]) ⇒ <code>RenderTarget</code>
获取整个场景窗口的颜色拾取内容

**Kind**: instance method of [<code>Picking</code>](#Picking)  
**Returns**: <code>RenderTarget</code> - 颜色拾取渲染目标  

| Param | Type | Description |
| --- | --- | --- |
| camera | <code>Camera</code> | 相机 |
| target | <code>Scene</code> \| <code>Object3D</code> \| <code>Array.&lt;Object3D&gt;</code> | 拾取目标对象，可以是场景、对象或对象数组 |
| [options] | <code>object</code> | 配置参数，详见[Picking#renderScene](Picking#renderScene)options参数 |

<a name="Picking+getWindowDepthRenderTarget"></a>

### picking.getWindowDepthRenderTarget(camera, target, [options]) ⇒ <code>RenderTarget</code>
获取整个场景窗口的深度拾取内容

**Kind**: instance method of [<code>Picking</code>](#Picking)  
**Returns**: <code>RenderTarget</code> - 深度拾取渲染目标  

| Param | Type | Description |
| --- | --- | --- |
| camera | <code>Camera</code> | 相机 |
| target | <code>Scene</code> \| <code>Object3D</code> \| <code>Array.&lt;Object3D&gt;</code> | 拾取目标对象，可以是场景、对象或对象数组 |
| [options] | <code>object</code> | 配置参数，详见[Picking#renderScene](Picking#renderScene)options参数 |

<a name="Picking.Mode"></a>

### Picking.Mode : <code>enum</code>
拾取模式枚举，参见 [PickingMode](#PickingMode)。

**Kind**: static enum of [<code>Picking</code>](#Picking)  
<a name="Picking.PickTargetType"></a>

### Picking.PickTargetType : <code>enum</code>
拾取目标类型枚举，参见 [PickTargetType](#PickTargetType)。

**Kind**: static enum of [<code>Picking</code>](#Picking)  
<a name="Picking.PickedResult"></a>

### Picking.PickedResult : <code>object</code>
**Kind**: static typedef of [<code>Picking</code>](#Picking)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| [point] | <code>Vector3</code> | 射线检测返回的点在世界坐标系中的位置。 |
| [position] | <code>Vector3</code> | 拾取到的世界坐标位置。 |
| [object] | <code>Object3D</code> | 拾取到的对象实例。 |
| [root] | <code>Object3D</code> | 拾取对象所属的根对象实例。 |
| [mesh] | <code>Mesh</code> | 拾取到的网格对象实例。 |
| [sprite] | <code>Sprite</code> | 拾取到的精灵对象实例。 |
| [points] | <code>Points</code> | 拾取到的点对象实例。 |
| [line] | <code>Line</code> | 拾取到的线对象实例。 |

<a name="PickingMode"></a>

## PickingMode : <code>enum</code>
拾取模式枚举

**Kind**: global enum  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| FAST | <code>string</code> | 快速拾取，即GPU拾取，基于颜色和深度渲染结果 |
| PRECISION | <code>string</code> | 精确拾取，即CPU拾取，基于射线检测 |
| NORMAL | <code>string</code> | 常规拾取，结合快速拾取和精确拾取，先快速拾取模型再对模型进行精确拾取 |

<a name="PickTargetType"></a>

## PickTargetType : <code>enum</code>
拾取目标类型枚举

**Kind**: global enum  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| ALL | <code>string</code> | 所有类型 |
| OBJECT | <code>string</code> | 只拾取对象 |
| POSITION | <code>string</code> | 只拾取位置 |

