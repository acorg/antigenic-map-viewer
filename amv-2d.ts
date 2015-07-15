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
    private _pixels_per_unit :number;   // map resolution on screen

    private rotate_control :AmvManipulator2d.RotateControl;
    private fliph_control :AmvManipulator2d.FlipControl;
    private flipv_control :AmvManipulator2d.FlipControl;
    private zoom_control :AmvManipulator2d.ZoomControl;
    private scale_control :AmvManipulator2d.ScaleControl;
    private label_scale_control :AmvManipulator2d.LabelScaleControl;
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
        this.on("widget-resized:amv", (size :number) => this.update_resolution(size));
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

    public viewport(viewport? :Viewport, grid_full_reset :boolean = false) :Viewport {
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
            this.update_resolution();
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
        }
    }

    public viewport_move(offset :AmvManipulator.MouseMovement|THREE.Vector3, grid_full_reset :boolean = false) :void {
        var camera = <THREE.OrthographicCamera>this.camera;
        camera.left += offset.x;
        camera.right += offset.x;
        camera.bottom += offset.y;
        camera.top += offset.y;
        camera.updateProjectionMatrix();
        this.grid.reset(grid_full_reset);
    }

    private update_resolution(widget_size? :number) :void {
        if (!widget_size) {
            widget_size = this.widget.size();
        }
        var camera = <THREE.OrthographicCamera>this.camera;
        this._pixels_per_unit = widget_size / (camera.right - camera.left);
        this.trigger("map-resolution-changed:amv", this._pixels_per_unit);
    }

    public resolution() :number { // pixels per unit
        return this._pixels_per_unit;
    }

    public transform(transformation :Transformation) :void {
        if (transformation) {
            var m = new THREE.Matrix4();
            m.elements[0] = transformation[0][0];
            m.elements[1] = transformation[0][1];
            m.elements[4] = transformation[1][0];
            m.elements[5] = transformation[1][1];
            this._set_m4(this.get_m4().multiply(m));
            // transform viewport center (we do transformation relative to the viewport center)
            var v = this.viewport();
            this.viewport({cx: v.cx * transformation[0][0] + v.cy * transformation[1][0], cy: v.cx * transformation[0][1] + v.cy * transformation[1][1]}, true);
        }
    }

    public transformation() :Transformation {
        var m4 = this.get_m4();
        var transformation :Transformation = [[m4.elements[0], m4.elements[1]], [m4.elements[4], m4.elements[5]]];
        return transformation;
    }

    private _translation_for_m4() :THREE.Vector3 {
        var camera = <THREE.OrthographicCamera>this.camera;
        return new THREE.Vector3((camera.left + camera.right) / 2, (camera.bottom + camera.top) / 2, 0);
    }

    public get_m4() :THREE.Matrix4 {
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
        $.when(this.widget.initialization_completed).done(() => this.update_resolution());
    }

    // Returns node triggering events
    public bind_manipulators(widget :AmvLevel1.MapWidgetLevel1) :void {
        $.when(AmvUtils.require_deferred(['amv-manipulator', 'amv-manipulator-2d'])).done(() => {
            this.manipulator.make_event_generators(["wheel:ctrl:amv", "left:alt:amv", "left:shift-alt:amv",
                                                    "wheel:alt:amv", "wheel:shift:amv", "wheel:shift-alt:amv", "drag:shift:amv", "key::amv",
                                                    "move::amv", //"drag::amv", "wheel:shift-alt:amv"
                                                   ]);

            this.rotate_control = new AmvManipulator2d.RotateControl(this, "wheel:ctrl:amv");
            this.fliph_control = new AmvManipulator2d.FlipControl(this, true, "left:alt:amv");
            this.flipv_control = new AmvManipulator2d.FlipControl(this, false, "left:shift-alt:amv");
            this.zoom_control = new AmvManipulator2d.ZoomControl(this, "wheel:shift:amv");
            this.scale_control = new AmvManipulator2d.ScaleControl(this, "wheel:alt:amv");
            this.label_scale_control = new AmvManipulator2d.LabelScaleControl(this, "wheel:shift-alt:amv");
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
        case 45:               // -
            this.widget.objects.object_scale(1.0);
            break;
        default:
            console.log('keypress', key);
            break;
        }
    }

    public orthographic_camera() :THREE.OrthographicCamera {
        return <THREE.OrthographicCamera>this.camera;
    }

    private static s_help_text = '<p class="title">Help</p>\
                                <ul>\
                                  <li>Zoom - <span class="mouse-action">${zoom-trigger}</span></li>\
                                  <li>Point size - <span class="mouse-action">${scale-trigger}</span></li>\
                                  <li>Label size - <span class="mouse-action">${label-scale-trigger}</span></li>\
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
              .replace("${label-scale-trigger}", this.label_scale_control.trigger_description())
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

    public reset(reset_base_vertice :boolean) :void {
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

    private offset_base(reset_base_vertice :boolean) :{left :number, bottom :number} {
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

class LabelMesh extends THREE.Mesh implements AmvLevel1.ObjectLabel
{
    constructor(parent :Object) {
        super(this.make_text_geometry(), new THREE.MeshBasicMaterial(AmvLevel1.ObjectFactory.convert_color("black")));
        parent.add(this);
    }

    public destroy() {
    }

    public show(show :boolean) :void {
        this.visible = show;
    }

    public set_scale(scale :number) :void {
        this.scale.multiplyScalar(scale);
    }

    public set_text(text :string) :void {
        this.geometry = this.make_text_geometry(text);
    }

    public set_position(object_position :THREE.Vector3, object_scale :THREE.Vector3, body_size :THREE.Vector3) :void {
        var lg = this.geometry;
        lg.computeBoundingBox();
        var label_size = new THREE.Vector3().multiplyVectors(this.scale, lg.boundingBox.size());

        this.position.set(- label_size.x / 2, - body_size.y - label_size.y, 0);
    }

    public set_size(size? :number) :void {
        if (!size) {
            size = Objects.label_default_size;
        }
        this.scale.set(size, size, 1);
    }

    public set_color(color :number|string) :void {
        (<THREE.MeshBasicMaterial>this.material).color = new THREE.Color(<any>color);
    }

    private make_text_geometry(text? :string, size :number = 1) :THREE.TextGeometry {
        return new THREE.TextGeometry(text, {size: size, font: 'helvetiker'});  //, font: 'helvetiker', weight: 'normal', style: 'normal'}); // curveSegments: 300
    }
}

// ----------------------------------------------------------------------

class LabelSprite extends THREE.Sprite implements AmvLevel1.ObjectLabel
{
    private canvas :HTMLCanvasElement;

    constructor() {
        this.canvas = document.createElement('canvas');
        //canvas.width = canvas.height = 2;

        var texture = new THREE.Texture(this.canvas); //, undefined, undefined, undefined, undefined, THREE.NearestFilter);
        texture.needsUpdate = true;
        super(new THREE.SpriteMaterial({map: texture, transparent: true, useScreenCoordinates: false}));
        //parent.add(sprite);
        (<any>window).scene.add(this);
        this.scale.multiplyScalar(0.2);
    }

    public destroy() {
    }

    public show(show :boolean) :void {
        // this.visible = show;
    }

    public set_scale(scale :number) :void {
        // this.scale.multiplyScalar(scale);
    }

    public set_text(text :string) :void {
        var font_size = 16;
        var context = <CanvasRenderingContext2D>this.canvas.getContext('2d');

        context.font = '' + font_size + 'px Arial';

        this.canvas.width = this.canvas.height = Math.pow(2, Math.floor(Math.log(font_size * text.length * 0.7) / Math.log(2)) + 1);
        console.log('ca', this.canvas.width);
        context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // context.fillStyle = "#BBBBBB";
        // context.fillRect(0, 0, this.canvas.width, this.canvas.height);

        context.fillStyle = "black";
        context.fillText(text, 0, font_size);

        var scale = 0.05 * text.length;
        this.scale.set(scale, scale, 1);
    }

    public set_position(object_position :THREE.Vector3, object_scale :THREE.Vector3, body_size :THREE.Vector3) :void {
        // console.log('canv', this.canvas.height, this.scale.y, this.canvas.height * this.scale.y / 2);
        this.position.set(object_position.x, object_position.y - body_size.y * object_scale.y - this.scale.y / 2, object_position.z);
    }

    public set_size(size? :number) :void {
        if (!size) {
            size = Objects.label_default_size;
        }
        // this.scale.set(size, size, 1);
    }

    public set_color(color :number|string) :void {
    }
}

// ----------------------------------------------------------------------

class LabelDiv implements AmvLevel1.ObjectLabel
{
    private div :JQuery;

    constructor(widget :AmvLevel1.MapWidgetLevel1) {
        this.div = $('<div></div>').css({position: 'absolute', backgroundColor: "transparent", top: 100, left: 100});
        // $('body').append(this.div);
        $(widget.domElement()).parent().append(this.div);
        // //this.div.style.zIndex = 1;    // if you still don't see the label, try uncommenting this
        // // this.div.style.width = "" + 100;
        // // this.div.style.height = "" + 100;
        // this.div.style.backgroundColor = "transparent";
        // // this.div.innerHTML = "This.DivWMW";
        // this.div.style.top = 200 + 'px';
        // this.div.style.left = 200 + 'px';
        // widget.domElement().appendChild(this.div);
        // document.body.appendChild(this.div);
    }

    public destroy() {
    }

    public show(show :boolean) :void {
        // this.visible = show;
    }

    public set_scale(scale :number) :void {
        // this.scale.multiplyScalar(scale);
    }

    public set_text(text :string) :void {
        this.div.html(text);
    }

    public set_position(object_position :THREE.Vector3, object_scale :THREE.Vector3, body_size :THREE.Vector3) :void {
        // http://stackoverflow.com/questions/27409074/three-js-converting-3d-position-to-2d-screen-position-r69
    }

    public set_size(size? :number) :void {
        if (!size) {
            size = Objects.label_default_size;
        }
        // this.scale.set(size, size, 1);
    }

    public set_color(color :number|string) :void {
    }
}

// ----------------------------------------------------------------------

export class Object extends AmvLevel1.Object
{
    public destroy() {
        this.label && this.label.destroy();
        super.destroy();
    }

    public set_drawing_order(drawing_order :number) {
        this.position.setZ(DrawingOrderNS.base + drawing_order * DrawingOrderNS.step);
    }

    public label_show(show :boolean, widget :AmvLevel1.MapWidgetLevel1) :AmvLevel1.ObjectLabel {
        if (show && !this.label) {
            //this.label = new LabelMesh(this);
            //this.label = new LabelSprite();
            this.label = new LabelDiv(widget);
        }
        if (this.label) {
            this.label.show(show);
        }
        return this.label;
    }

    public label_adjust_position() :void {
        if (this.label) {
            var body = this.body;
            var body_size = body.scale.clone().applyEuler(body.rotation);
            var body_radius =  body_size.y / 2;
            if (this.shape() === "circle" && body.scale.x !== body.scale.y && body.rotation.z !== 0) {
                var aspect = body.scale.y / body.scale.x;
                body_radius *= (aspect > 1) ? 1 / aspect : aspect;
            }
            var outline_width = 0;
            if (this.outline) {
                outline_width = (<THREE.LineBasicMaterial>(<THREE.Mesh>this.outline).material).linewidth;
            }
            var label_offset = 5 / Objects.object_default_size;

            this.label.set_position(this.position, this.scale, new THREE.Vector3(0, body_radius + outline_width / Objects.object_default_size + label_offset, 0));
        }
    }
}

// ----------------------------------------------------------------------

export class Objects extends AmvLevel1.Objects
{
    private _flip :boolean;
    private _viewport :Viewport;
    public static object_default_size :number = 5; // in pixels, multiplied by this._object_scale
    public static label_default_size :number = 2; // in pixels, multiplied by this._object_scale
    private event_handlers :JQuery[] = [];

    constructor(widget :AmvLevel1.MapWidgetLevel1) {
        super(widget);
        this._flip = false;
        this.event_handlers.push(widget.on("map-resolution-changed:amv", (pixels_per_unit) => this.resize(pixels_per_unit)));
    }

    public destroy() {
        this.event_handlers.forEach((eh) => eh.off());
    }

    public number_of_dimensions() :number {
        return 2;
    }

    public flip() :void {
        const center_x = this.center().x;
        this.objects.map(o => o.position.setX(center_x - o.position.x));
        this._flip = !this._flip;
    }

    public flip_set(flip :boolean) :void {
        if (flip !== this._flip) {
            this.flip();
        }
    }

    public flip_state() :boolean {
        return this._flip;
    }

    public reset() :void {
        super.reset();
        this.flip_set(false);
    }

    public reorient() :void {
        var quaternion = new THREE.Quaternion().setFromUnitVectors(Viewer.camera_up, this.widget.viewer.camera.up);
        this.objects.map(o => o.rotation.setFromQuaternion(quaternion));
    }

    public viewport(viewport? :Viewport) :Viewport {
        if (viewport) {
            this._viewport = viewport;
        }
        return this._viewport;
    }

    protected scale_limits() :{min :number, max :number} {
        var units_per_pixel = 1 / (<Viewer>this.widget.viewer).resolution();
        return {min: units_per_pixel * 20, max: this.widget.size() * units_per_pixel};
    }

    private resize(pixels_per_unit :number) :void {
        // console.log('resize_with_labels', pixels_per_unit, Objects.object_default_size / pixels_per_unit);
        this.objects.map(o => o.set_scale(Objects.object_default_size / pixels_per_unit, this.widget.viewer));
    }

    // private resize_with_labels(pixels_per_unit :number) :void {
    //     // console.log('resize_with_labels', pixels_per_unit, Objects.object_default_size / pixels_per_unit);
    //     this.objects.map(o => o.set_scale(Objects.object_default_size / pixels_per_unit, Objects.label_default_size / pixels_per_unit, this.widget.viewer));
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
    public static geometry_size :number = 1.0;
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

    public make_outline(shape :string, outline_width :number, outline_color :any) :THREE.Object3D {
        var outline_material = this.outline_material(this.convert_color(outline_color), outline_width);
        return new THREE.Line(this.geometries[`${shape}-outline`], <THREE.ShaderMaterial>outline_material);
    }

    // adds to this.geometries
    protected make_circle() :void {
        this.geometries["circle"] = this.geometries["sphere"] = new THREE.CircleGeometry(ObjectFactory.geometry_size / 2, this.ball_segments);
        var circle_curve = new THREE.EllipseCurve(0, 0, ObjectFactory.geometry_size / 2, ObjectFactory.geometry_size / 2, 0, Math.PI * 2, false);
        var circle_path = new THREE.Path(circle_curve.getPoints(this.ball_segments));
        this.geometries["circle-outline"] = this.geometries["sphere-outline"] = circle_path.createPointsGeometry(this.ball_segments);
    }

    // adds to this.geometries
    protected make_box() :void {
        var offset = ObjectFactory.geometry_size / 2;
        var shape = new THREE.Shape();
        shape.moveTo(-offset, -offset);
        shape.lineTo(-offset,  offset);
        shape.lineTo( offset,  offset);
        shape.lineTo( offset, -offset);
        shape.lineTo(-offset, -offset);
        this.geometries["box"] = this.geometries["cube"] = new THREE.ShapeGeometry(shape);
        this.geometries["box-outline"] = this.geometries["cube-outline"] = shape.createPointsGeometry(null);
    }

    protected make_triangle() :void {
        var offset = ObjectFactory.geometry_size / 2;
        var shape = new THREE.Shape();
        shape.moveTo(-offset, -offset);
        shape.lineTo( offset, -offset);
        shape.lineTo(      0,  offset);
        shape.lineTo(-offset, -offset);
        this.geometries["triangle"] = new THREE.ShapeGeometry(shape);
        this.geometries["triangle-outline"] = shape.createPointsGeometry(null);
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
