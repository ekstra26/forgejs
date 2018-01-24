/**
 * FORGE.BackgroundGridRenderer
 * BackgroundGridRenderer class.
 *
 * @constructor FORGE.BackgroundGridRenderer
 * @param {FORGE.Viewer} viewer - {@link FORGE.Viewer} reference
 * @param {FORGE.SceneViewport} viewport - {@link FORGE.SceneViewport} reference.
 * @extends {FORGE.BackgroundMeshRenderer}
 */
FORGE.BackgroundGridRenderer = function(viewer, viewport)
{
    /**
     * Grid color
     * @name FORGE.BackgroundGridRenderer#_gridColor
     * @type {string}
     * @private
     */
    this._gridColor = null;

    /**
     * Background color
     * @name FORGE.BackgroundGridRenderer#_backgroundColor
     * @type {string}
     * @private
     */
    this._backgroundColor = null;

    FORGE.BackgroundMeshRenderer.call(this, viewer, viewport, "BackgroundGridRenderer");
};

FORGE.BackgroundGridRenderer.prototype = Object.create(FORGE.BackgroundMeshRenderer.prototype);
FORGE.BackgroundGridRenderer.prototype.constructor = FORGE.BackgroundGridRenderer;

/**
 * Boot routine.
 * @method FORGE.BackgroundGridRenderer#_boot
 * @private
 */
FORGE.BackgroundGridRenderer.prototype._boot = function()
{
    FORGE.BackgroundMeshRenderer.prototype._boot.call(this);

    this._subdivision = 32;

    this._backgroundColor = new THREE.Color(this._viewport.background);

    this._gridColor = new THREE.Color("#7F7FFF");
    if(this._media.options !== null && typeof this._media.options.color !== "undefined")
    {
        this._gridColor = new THREE.Color(this._media.options.color);
    }

    this._bootComplete();
};

/**
 * Compute quadrilateral coordinates as geometry attribute
 * Used to draw the wireframe in fragment shader
 * @method FORGE.BackgroundGridRenderer#_computeQuadrilateralCoordsAttribute
 * @return {new THREE.BufferAttribute} buffer attribute with quadrilateral coordinates
 * @private
 */
FORGE.BackgroundGridRenderer.prototype._computeQuadrilateralCoordsAttribute = function()
{
    // Quadrilateral is a 2 components system, reduce vertices array size from 3:2
    var size = this._mesh.geometry.attributes.position.array.length * 2 / 3;
    var quadri = new Int8Array(size);
    var it = FORGE.Utils.arrayKeys(quadri);

    var qa = new THREE.Vector2(1, 1);
    var qb = new THREE.Vector2(1, -1);
    var qc = new THREE.Vector2(-1, 1);
    var qd = new THREE.Vector2(-1, -1);

    var ipd = this._subdivision + 1; // indices per dimension
    for (var f = 0; f < 6; f++)
    {
        for (var r=0; r < ipd; r++)
        {
            var q0, q1;

            if (r & 1)
            {
                q0 = qa;
                q1 = qb;
            }
            else
            {
                q0 = qc;
                q1 = qd;
            }

            for (var c=0; c < ipd; c++)
            {
                if (c & 1)
                {
                    quadri[it.next().value] = q1.x;
                    quadri[it.next().value] = q1.y;
                }
                else
                {
                    quadri[it.next().value] = q0.x;
                    quadri[it.next().value] = q0.y;
                }
            }
        }
    }

    return new THREE.BufferAttribute(quadri, 2);
};

/**
 * Mesh before render callback
 * @method FORGE.BackgroundGridRenderer#_onMeshBeforeRender
 * @private
 */
FORGE.BackgroundGridRenderer.prototype._onMeshBeforeRender = function(renderer, scene, camera, geometry, material, group)
{
    var g = group; // Just to avoid the jscs warning about group parameter not used.

    if (material.program)
    {
        var gl = this._viewer.renderer.webGLRenderer.getContext();
        gl.useProgram(material.program.program);
        var uMap = material.program.getUniforms().map;

        if ("tBackgroundColor" in uMap)
        {
            material.uniforms.tBackgroundColor.value = this._backgroundColor;
            uMap.tBackgroundColor.setValue(gl, this._backgroundColor, this._viewer.renderer.webGLRenderer);
        }

        if ("tColor" in uMap)
        {
            material.uniforms.tColor.value = this._gridColor;
            uMap.tColor.setValue(gl, this._gridColor, this._viewer.renderer.webGLRenderer);
        }
    }
};

/**
 * Add quadrilateral coordinates to vertices once the mesh is created
 * @method FORGE.BackgroundGridRenderer#_onMeshCreated
 * @private
 */
FORGE.BackgroundGridRenderer.prototype._onMeshCreated = function()
{
    var quadCoordsAttr = this._computeQuadrilateralCoordsAttribute();
    this._mesh.geometry.addAttribute("quadrilateralCoords", quadCoordsAttr);

    this._mesh.onBeforeRender = this._onMeshBeforeRender.bind(this);

    FORGE.BackgroundMeshRenderer.prototype._onMeshCreated.call(this);
};

/**
 * Create geometry
 * @method FORGE.BackgroundGridRenderer#_createGeometry
 * @private
 */
FORGE.BackgroundGridRenderer.prototype._createGeometry = function()
{
   return new THREE.BoxBufferGeometry(this._size, this._size, this._size, this._subdivision, this._subdivision, this._subdivision);
};

/**
 * Render sequence
 * @method FORGE.BackgroundGridRenderer#render
 */
FORGE.BackgroundGridRenderer.prototype.render = function(webGLRenderer, target)
{
    var material = this._viewer.renderer.getMaterialForView(this._viewport.view.current.type, "wireframe");
    material.transparent = true;

    material.blending = THREE.CustomBlending;
    material.blendEquationAlpha = THREE.AddEquation;
    material.blendSrcAlpha = THREE.SrcAlphaFactor;
    material.blendDstAlpha = THREE.OneMinusSrcAlphaFactor;

    material.uniforms.tBackgroundColor.value = this._backgroundColor;
    material.uniforms.tColor.value = this._gridColor;

    this._mesh.material = material;

    this._viewport.view.current.updateUniforms(material.uniforms);

    FORGE.BackgroundMeshRenderer.prototype.render.call(this, webGLRenderer, target);
};

/**
 * Destroy sequence
 * @method FORGE.BackgroundGridRenderer#destroy
 */
FORGE.BackgroundGridRenderer.prototype.destroy = function()
{
    this._backgroundColor = null;
    this._gridColor = null;

    FORGE.BackgroundMeshRenderer.prototype.destroy.call(this);
};
