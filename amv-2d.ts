/// <reference path="build/jquery" />
/// <reference path="build/three" />

/// <reference path="antigenic-map-viewer.d.ts" />

import AmvUtils = require("amv-utils");
import AmvLevel1 = require("amv-level1");
import AmvManipulator = require("amv-manipulator");
import AmvManipulator2d = require("amv-manipulator-2d");

// ----------------------------------------------------------------------

export type Transformation = AntigenicMapViewer.PlotDataTransformation;

// ----------------------------------------------------------------------

class DrawingOrderNS
{
    public static maximum :number = 1000;
    public static base    :number = 1;
    public static step    :number = DrawingOrderNS.maximum / 100000;
}

// ----------------------------------------------------------------------

export interface Viewport
{
    cx :number;
    cy :number;
    size? :number;
}

// ----------------------------------------------------------------------

export class Viewer extends AmvLevel1.Viewer
{
    public static camera_up = new THREE.Vector3(0, 1, 0);

    private grid :Grid;
    private viewport_initial :Viewport; // for reset

    private rotate_control :AmvManipulator2d.RotateControl;
    private fliph_control :AmvManipulator2d.FlipControl;
    private flipv_control :AmvManipulator2d.FlipControl;
    private zoom_control :AmvManipulator2d.ZoomControl;
    private scale_control :AmvManipulator2d.ScaleControl;
    private pan_control :AmvManipulator2d.PanControl;
    private key_control :AmvManipulator2d.KeyControl;
    private hover_control :AmvManipulator2d.HoverControl;

    constructor(widget :AmvLevel1.MapWidgetLevel1) {
        super(widget);
        this.viewport_initial = null;
        this.camera = new THREE.OrthographicCamera(0, 1, 1, 0, 0, DrawingOrderNS.maximum + 2);
        widget.add(this.camera);
        this.grid = new Grid(this, 0);
        this.reset()
    }

    // collects current state of the viewer: transformation matrix and viewport
    public state() :void {
        var transformation = this.transformation();
        console.log('state: transformation', JSON.stringify(transformation));
        var viewport = this.viewport();
        console.log('state: viewport', JSON.stringify(viewport));
    }

    public reset() :void {
        this.widget.reset_objects();
        this.camera.up.copy(Viewer.camera_up);
        this.camera.position.set(0, 0, DrawingOrderNS.maximum + 1);
        this.camera_look_at(AmvLevel1.Viewer.const_vector3_zero);
        this.viewport(this.viewport_initial);
        this.camera_update();
    }

    public viewport(viewport? :Viewport, grid_full_reset :Boolean = false) :Viewport {
        var camera = <THREE.OrthographicCamera>this.camera;
        if (viewport) {
            var hsize = (viewport.size ? viewport.size : (camera.right - camera.left)) / 2;
            camera.left = viewport.cx - hsize;
            camera.right = viewport.cx + hsize;
            camera.top = viewport.cy + hsize;
            camera.bottom = viewport.cy - hsize;
            camera.updateProjectionMatrix();
            this.widget.reorient_objects();
            this.grid.reset(grid_full_reset);
        }
        return {cx: (camera.left + camera.right) / 2, cy: (camera.bottom + camera.top) / 2, size: camera.right - camera.left};
    }

    public viewport_rotate(angle :number) :void {
        var quaternion = new THREE.Quaternion();
        quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle);
        this.viewport_rotate_with_quaternion(quaternion);
    }

    public viewport_rotate_with_quaternion(quaternion :THREE.Quaternion) :void {
        this.camera.up.applyQuaternion(quaternion).normalize();
        this.camera_update();
        var tr = this._translation_for_m4().applyQuaternion(quaternion.inverse());
        this.viewport({cx: tr.x, cy: tr.y}, true);
    }

    public viewport_zoom(factor :number) :void {
        var viewport = this.viewport();
        if ((factor < 1 && viewport.size > 1) || (factor > 1 && viewport.size < 100)) {
            viewport.size *= factor;
            this.viewport(viewport);
            this.widget.objects.scale(factor);
        }
    }

    public viewport_move(offset :AmvManipulator.MouseMovement|THREE.Vector3, grid_full_reset :Boolean = false) :void {
        var camera = <THREE.OrthographicCamera>this.camera;
        camera.left += offset.x;
        camera.right += offset.x;
        camera.bottom += offset.y;
        camera.top += offset.y;
        camera.updateProjectionMatrix();
        this.grid.reset(grid_full_reset);
    }

    public transform(transformation :Transformation) :void {
        if (transformation) {
            var m = new THREE.Matrix4();
            m.elements[0] = transformation[0][0];
            m.elements[1] = transformation[0][1];
            m.elements[4] = transformation[1][0];
            m.elements[5] = transformation[1][1];
            this._set_m4(this._get_m4().multiply(m));
            // transform viewport center (we do transformation relative to the viewport center)
            var v = this.viewport();
            this.viewport({cx: v.cx * transformation[0][0] + v.cy * transformation[1][0], cy: v.cx * transformation[0][1] + v.cy * transformation[1][1]}, true);
        }
    }

    public transformation() :Transformation {
        var m4 = this._get_m4();
        var transformation :Transformation = [[m4.elements[0], m4.elements[1]], [m4.elements[4], m4.elements[5]]];
        return transformation;
    }

    private _translation_for_m4() :THREE.Vector3 {
        var camera = <THREE.OrthographicCamera>this.camera;
        return new THREE.Vector3((camera.left + camera.right) / 2, (camera.bottom + camera.top) / 2, 0);
    }

    private _get_m4() :THREE.Matrix4 {
        return new THREE.Matrix4().compose(this._translation_for_m4(),
                                           new THREE.Quaternion().setFromUnitVectors(this.camera.up, Viewer.camera_up),
                                           new THREE.Vector3((<Objects>this.widget.objects).flip_state() ? -1 : 1, 1, 1));
    }

    private _set_m4(m4 :THREE.Matrix4) {
        var t = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
        m4.decompose(t, q, s);
        this.camera.up.copy(Viewer.camera_up).applyQuaternion(q).normalize();
        (<Objects>this.widget.objects).flip_set(s.x < 0);
        this.camera_update();
    }

    public camera_update() :void {
        super.camera_update();
        this.grid.update();
    }

    public objects_updated() :void {
        super.objects_updated();
        if (!this.viewport_initial) {
            var objects_viewport = (<Objects>this.widget.objects).viewport();
            if (!objects_viewport) {
                var center = this.widget.objects.center();
                objects_viewport = {cx: center.x, cy: center.y, size: Math.ceil(this.widget.objects.diameter() + 0.5)};
            }
            this.viewport_initial = this.viewport(objects_viewport);
        }
        else {
            this.grid.reset(false);
        }
    }

    // Returns node triggering events
    public bind_manipulators(widget :AmvLevel1.MapWidgetLevel1) :void {
        $.when(AmvUtils.require_deferred(['amv-manipulator', 'amv-manipulator-2d'])).done(() => {
            this.manipulator.make_event_generators(["wheel:ctrl:amv", "left:alt:amv", "left:shift-alt:amv",
                                                    "wheel:alt:amv", "wheel:shift:amv", "drag:shift:amv", "key::amv",
                                                    "move::amv", //"drag::amv", "wheel:shift-alt:amv"
                                                   ]);

            this.rotate_control = new AmvManipulator2d.RotateControl(this, "wheel:ctrl:amv");
            this.fliph_control = new AmvManipulator2d.FlipControl(this, true, "left:alt:amv");
            this.flipv_control = new AmvManipulator2d.FlipControl(this, false, "left:shift-alt:amv");
            this.zoom_control = new AmvManipulator2d.ZoomControl(this, "wheel:shift:amv");
            this.scale_control = new AmvManipulator2d.ScaleControl(this, "wheel:alt:amv");
            this.pan_control = new AmvManipulator2d.PanControl(this, "drag:shift:amv");
            this.key_control = new AmvManipulator2d.KeyControl(this, "key::amv");
            this.hover_control = new AmvManipulator2d.HoverControl(this, "move::amv"); // triggers "hover:amv" on this.element
        });
    }

    public keypress(key :number) {
        switch (key) {
        case 114:               // r
            this.reset();
            break;
        case 115:               // s
            this.state();
            break;
        case 116:               // t
            this.transform([[-1, 0], [0, 1]]);
            break;
        case 113:               // p
            this.viewport_rotate(Math.PI / 2);
            break;
        default:
            console.log('keypress', key);
            break;
        }
    }

    public orthographic_camera() :THREE.OrthographicCamera {
        return <THREE.OrthographicCamera>this.camera;
    }

    public units_per_pixel() :number {
        var camera = <THREE.OrthographicCamera>this.camera;
        return (camera.right - camera.left) / this.widget.size();
    }

    private static s_help_text = '<p class="title">Help</p>\
                                <ul>\
                                  <li>Zoom - <span class="mouse-action">${zoom-trigger}</span></li>\
                                  <li>Point size - <span class="mouse-action">${scale-trigger}</span></li>\
                                  <li>Rotate - <span class="mouse-action">${rotate-trigger}</span></li>\
                                  <li>Flip horizontally - <span class="mouse-action">${fliph-trigger}</span></li>\
                                  <li>Flip vertically - <span class="mouse-action">${flipv-trigger}</span></li>\
                                  <li>Pan - <span class="mouse-action">${pan-trigger}</span></li>\
                                  <li>Reset map - choose reset in the menu<br />(next to the Help button at the top right corner)</li>\
                                </ul>\
                                <p class="footer">Click to hide this popup.</p>';

    public help_text() :string {
        return Viewer.s_help_text
              .replace("${rotate-trigger}", this.rotate_control.trigger_description())
              .replace("${fliph-trigger}", this.fliph_control.trigger_description())
              .replace("${flipv-trigger}", this.flipv_control.trigger_description())
              .replace("${scale-trigger}", this.scale_control.trigger_description())
              .replace("${zoom-trigger}", this.zoom_control.trigger_description())
              .replace("${pan-trigger}", this.pan_control.trigger_description())
        ;
    }
}

// ----------------------------------------------------------------------

class Grid
{
    private grid :THREE.Object3D;
    private lines :THREE.Line;
    private base_vertice :{x :number, y :number};

    private static components = [[0,1],[1,0]];

    constructor(public viewer :Viewer, private position_z :number) {
        this.grid = new THREE.Object3D();
        this.base_vertice = null;
        this.viewer.widget.add(this.grid);
        this.grid.position.set(0, 0, this.position_z);
        this.grid.lookAt(this.viewer.camera.position);
    }

    public reset(reset_base_vertice :Boolean) :void {
        if (this.lines) {
            this.grid.remove(this.lines)
        }
        var camera = this.viewer.orthographic_camera()
        var lines_geometry = new THREE.Geometry();
        var offset_base = this.offset_base(reset_base_vertice);
        var offset :number;
        for (offset = camera.left + offset_base.left; offset < camera.right; ++offset) {
            lines_geometry.vertices.push(new THREE.Vector3(offset, camera.bottom, 0));
            lines_geometry.vertices.push(new THREE.Vector3(offset, camera.top, 0));
        }
        for (offset = camera.bottom + offset_base.bottom; offset < camera.top; ++offset) {
            lines_geometry.vertices.push(new THREE.Vector3(camera.left,  offset, 0));
            lines_geometry.vertices.push(new THREE.Vector3(camera.right, offset, 0));
        }
        this.lines = new THREE.Line(lines_geometry, new THREE.LineBasicMaterial({color: 0x000000, opacity: 0.2, transparent: true}), THREE.LinePieces)
        this.grid.add(this.lines)
    }

    private offset_base(reset_base_vertice :Boolean) :{left :number, bottom :number} {
        var offset_base = {left: 0, bottom: 0};
        var camera = this.viewer.orthographic_camera();
        if (!this.base_vertice || reset_base_vertice) {
            this.base_vertice = {x: camera.left, y: camera.bottom};
        }
        else {
            offset_base = {left: (this.base_vertice.x - camera.left) % 1, bottom: (this.base_vertice.y - camera.bottom) % 1};
        }
        return offset_base;
    }

    public update() :void {
        var quaternion = new THREE.Quaternion().setFromUnitVectors(Viewer.camera_up, this.viewer.camera.up);
        this.grid.rotation.setFromQuaternion(quaternion);
    }
}

// ----------------------------------------------------------------------

export class Object extends AmvLevel1.Object
{
    public set_drawing_order(drawing_order :number) {
        this.mesh.position.setZ(DrawingOrderNS.base + drawing_order * DrawingOrderNS.step);
    }
}

// ----------------------------------------------------------------------

export class Objects extends AmvLevel1.Objects
{
    private _flip :Boolean;
    private _viewport :Viewport;

    constructor(widget :AmvLevel1.MapWidgetLevel1) {
        super(widget);
        this._flip = false;
    }

    public number_of_dimensions() :number {
        return 2;
    }

    public flip() :void {
        const center_x = this.center().x;
        this.objects.map(o => o.position().setX(center_x - o.position().x));
        this._flip = !this._flip;
    }

    public flip_set(flip :Boolean) :void {
        if (flip !== this._flip) {
            this.flip();
        }
    }

    public flip_state() :Boolean {
        return this._flip;
    }

    public reset() :void {
        super.reset();
        this.flip_set(false);
    }

    public reorient() :void {
        var quaternion = new THREE.Quaternion().setFromUnitVectors(Viewer.camera_up, this.widget.viewer.camera.up);
        this.objects.map(o => o.rotation().setFromQuaternion(quaternion));
    }

    public viewport(viewport? :Viewport) :Viewport {
        if (viewport) {
            this._viewport = viewport;
        }
        return this._viewport;
    }

    protected scale_limits() :{min :number, max :number} {
        var units_per_pixel = (<Viewer>this.widget.viewer).units_per_pixel();
        return {min: units_per_pixel * 5, max:  this.widget.size() * units_per_pixel / 3};
    }

    // private add_label(label :string, obj :THREE.Object3D, index :number) :THREE.Object3D {
    //     try {
    //         //console.log('obj scale', index, JSON.stringify(obj.scale));
    //         var obj_geometry = (<THREE.Mesh>obj).geometry;
    //         obj_geometry.computeBoundingSphere();
    //         var obj_radius = obj_geometry.boundingSphere.radius;

    //         var text = new THREE.TextGeometry(label, {size: 0.05});
    //         var textMesh = new THREE.Mesh(text, new THREE.MeshBasicMaterial({color: 0}));
    //         textMesh.scale.set(obj.scale.y / (obj.scale.x * obj.scale.x), 1 / obj.scale.y, 1 / obj.scale.z);

    //         text.computeBoundingBox();
    //         var text_height = text.boundingBox.max.y - text.boundingBox.min.y;
    //         var text_width = text.boundingBox.max.x - text.boundingBox.min.x;

    //         textMesh.position.set(- text_width / 2, - obj_radius - text_height, DrawingOrderNS.step / 2);
    //         obj.add(textMesh);
    //         // Example text options : {'font' : 'helvetiker','weight' : 'normal', 'style' : 'normal','size' : 100,'curveSegments' : 300};        return obj;
    //     }
    //     catch (err) {
    //         console.error(err);
    //     }
    //     return obj;
    // }

    public object_factory(number_of_objects? :number) :AmvLevel1.ObjectFactory {
        if (!this._object_factory) {
            this._object_factory = new ObjectFactory(number_of_objects);
        }
        return super.object_factory(number_of_objects);
    }
}

// ----------------------------------------------------------------------

export class ObjectFactory extends AmvLevel1.ObjectFactory
{
    public static geometry_size :number = 0.18;
    private ball_segments :number; // depends on the number of objects
    private outline_width_scale :number;
    private outline_materials :any; // color: THREE.Material

    constructor(number_of_objects :number) {
        super();
        this.material = THREE.MeshBasicMaterial;
        this.ball_segments = 32;
        this.outline_width_scale = 0.005;
        this.outline_materials = {};
    }

    public make_object() :Object {
        return new Object();
    }

    public make_mesh(aspect :number, rotation :number, shape :string, outline_width :number, fill_color :any, outline_color :any) :THREE.Mesh {
        var mesh = super.make_mesh(aspect, rotation, shape, outline_width, fill_color, outline_color);
        var outline_material = this.outline_material(this.convert_color(outline_color), outline_width);
        if (shape === "circle" || shape === "sphere") {
            mesh.add(new THREE.Mesh(this.geometries[`${shape}-outline-${outline_width}`], outline_material));
        }
        else {
            mesh.add(new THREE.Line(this.geometries[`${shape}-outline`], <THREE.ShaderMaterial>outline_material));
        }
        return mesh;
    }

    // adds to this.geometries
    protected make_circle(outline_width :number) :void {
        this.geometries["circle"] = this.geometries["sphere"] = new THREE.CircleGeometry(ObjectFactory.geometry_size / 2, this.ball_segments);
        var n_outline_width = (outline_width === undefined || outline_width === null) ? 1.0 : outline_width;
        this.geometries[`circle-outline-${outline_width}`] = this.geometries[`sphere-outline-${outline_width}`] =
              new THREE.RingGeometry(ObjectFactory.geometry_size / 2 - n_outline_width * this.outline_width_scale,
                                     ObjectFactory.geometry_size / 2, this.ball_segments);
    }

    // adds to this.geometries
    protected make_box(outline_width :number) :void {
        var offset = ObjectFactory.geometry_size / 2;
        var shape = new THREE.Shape();
        shape.moveTo(-offset, -offset);
        shape.lineTo(-offset,  offset);
        shape.lineTo( offset,  offset);
        shape.lineTo( offset, -offset);
        shape.lineTo(-offset, -offset);
        this.geometries["box"] = this.geometries["cube"] = new THREE.ShapeGeometry(shape);
        this.geometries["box-outline"] = this.geometries["cube-outline"] = (<any>shape).createPointsGeometry();
    }

    protected make_triangle(outline_width :number = 1.0) :void {
        var offset = ObjectFactory.geometry_size / 2;
        var shape = new THREE.Shape();
        shape.moveTo(-offset, -offset);
        shape.lineTo( offset, -offset);
        shape.lineTo(      0,  offset);
        shape.lineTo(-offset, -offset);
        this.geometries["triangle"] = new THREE.ShapeGeometry(shape);
        this.geometries["triangle-outline"] = (<any>shape).createPointsGeometry();
    }

    private outline_material(outline_color :THREE.MeshBasicMaterialParameters, outline_width :number) :THREE.Material {
        var key = `${outline_color.color}-${outline_width}`;
        var outline_material :THREE.LineBasicMaterial = <THREE.LineBasicMaterial>this.outline_materials[key];
        if (!outline_material) {
            outline_material = new THREE.LineBasicMaterial(outline_color);
            outline_material.linewidth = (outline_width === undefined || outline_width === null) ? 1.0 : outline_width;
            // outline_material.transparent = true;
            this.outline_materials[key] = outline_material;
        }
        return outline_material;
    }
}

// ----------------------------------------------------------------------
