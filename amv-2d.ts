// -*- Typescript -*-

"use strict";

import TypingsReferences = require("build/typings-references");

import Amv = require("amv");
import AmvLevel1 = require("amv-level1");
import AmvManipulator = require("amv-manipulator");
import AmvManipulator2d = require("amv-manipulator-2d");

// ----------------------------------------------------------------------

const PI_2 = Math.PI / 2;

type Color = AntigenicMapViewer.Color;
type Position = AntigenicMapViewer.Position;
type Manipulators = AntigenicMapViewer.Manipulators;
type Manipulator = AntigenicMapViewer.Manipulator;

export type Transformation = AntigenicMapViewer.Transformation;

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

class M4Decomposed
{
    public t :THREE.Vector3;
    public q :THREE.Quaternion;
    public s :THREE.Vector3;

    constructor(m4 :THREE.Matrix4) {
        this.t = new THREE.Vector3();
        this.q = new THREE.Quaternion();
        this.s = new THREE.Vector3();
        m4.decompose(this.t, this.q, this.s);
    }
}


export class Viewer extends AmvLevel1.Viewer
{
    // public static camera_up = new THREE.Vector3(0, 1, 0);

    private grid :Grid;
    private viewport_initial :Viewport; // for reset
    private _pixels_per_unit :number;   // map resolution on screen
    private _initial_transformation :Transformation;
    private controls :any = {}; // {string: AmvManipulator2d.Control}

    constructor(widget :AmvLevel1.MapWidgetLevel1) {
        super(widget);
        this.viewport_initial = null;
        this.camera = new THREE.OrthographicCamera(0, 1, 1, 0, 0, DrawingOrderNS.maximum + 2);
        widget.add_to_scene(this.camera);
        this.grid = new Grid(this, 0);
        this.on("widget-resized:amv", (size :number) => this.update_resolution(size));
        this.reset();
    }

    // // collects current state of the viewer: transformation matrix and viewport
    // public state() :void {
    //     var transformation = this.transformation();
    //     console.log('state: transformation', JSON.stringify(transformation));
    //     var viewport = this.viewport();
    //     console.log('state: viewport', JSON.stringify(viewport));
    // }

    public initial_transformation(transformation :Transformation) :void {
        if (transformation !== null && transformation !== undefined) {
            this._initial_transformation = transformation;
        }
        else {
            this._initial_transformation = null;
        }
    }

    public reset() :void {
        super.reset();
        this.camera.up.copy(Viewer.camera_up);
        this.camera.position.set(0, 0, DrawingOrderNS.maximum + 1);
        this.viewport(this.viewport_initial);
        if (!!this._initial_transformation) {
            this.transform(this._initial_transformation);
        }
        else {
            this.widget.map_elements_view_rotated();
        }
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
        this.widget.map_elements_view_rotated();
    }

    public viewport_zoom(factor :number) :void {
        var viewport = this.viewport();
        if ((factor < 1 && viewport.size > 1) || (factor > 1 && viewport.size < 100)) {
            viewport.size *= factor;
            this.viewport(viewport);
        }
    }

    public viewport_move_by(offset :AmvManipulator.MouseMovement|THREE.Vector3, grid_full_reset :boolean = false) :void {
        var camera = <THREE.OrthographicCamera>this.camera;
        camera.left += offset.x;
        camera.right += offset.x;
        camera.bottom += offset.y;
        camera.top += offset.y;
        camera.updateProjectionMatrix();
        this.grid.reset(grid_full_reset);
    }

    public viewport_move_to(new_center :THREE.Vector3, grid_full_reset :boolean = false) :void {
        var camera = <THREE.OrthographicCamera>this.camera;
        this.viewport({cx: new_center.x, cy: new_center.y, size: camera.right - camera.left}, grid_full_reset);
    }

    private update_resolution(widget_size? :number) :void {
        if (!widget_size) {
            widget_size = this.widget.size();
        }
        var camera = <THREE.OrthographicCamera>this.camera;
        this._pixels_per_unit = widget_size / (camera.right - camera.left);
        this.widget.map_elements_resolution_changed(this._pixels_per_unit);
        // this.trigger("map-resolution-changed:amv", this._pixels_per_unit);
    }

    public resolution() :number { // pixels per unit
        return this._pixels_per_unit;
    }

    public transform(transformation :Transformation) :void {
        if (transformation !== null && transformation !== undefined) {
            $.when(/* this.widget.objects_created && */ this.widget.initialization_completed).done(() => {
                var m = new THREE.Matrix4();
                m.elements[0] = transformation[0][0];
                m.elements[1] = transformation[0][1];
                m.elements[4] = transformation[1][0];
                m.elements[5] = transformation[1][1];
                this._set_m4(this.get_m4().multiply(m));
                this.widget.map_elements_view_rotated();

                var viewport = this.viewport();
                var viewport_center = new THREE.Vector3(viewport.cx, viewport.cy, 0).applyMatrix4(m);
                if (viewport_center.x !== viewport.cx || viewport_center.y !== viewport.cy) {
                    this.viewport_move_to(viewport_center, true);
                }
            });
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

    private _quaternion_for_m4() :THREE.Quaternion {
        return new THREE.Quaternion().setFromUnitVectors(this.camera.up, Viewer.camera_up);
    }

    public get_m4() :THREE.Matrix4 {
        return new THREE.Matrix4().compose(this._translation_for_m4(),
                                           this._quaternion_for_m4(),
                                           new THREE.Vector3(this.widget.map_elements_flip() ? -1 : 1, 1, 1));
    }

    private _set_m4(m4 :THREE.Matrix4) :M4Decomposed {
        var m4d = new M4Decomposed(m4);
        this.camera.up.copy(Viewer.camera_up).applyQuaternion(m4d.q).normalize();
        this.widget.map_elements_flip(m4d.s.x < 0);
        this.camera_update();
        return m4d;
    }

    public camera_update() :void {
        super.camera_update();
        this.grid.update();
    }

    public objects_updated() :void {
        super.objects_updated();
        // if (!this.viewport_initial) {
        //     var objects_viewport = (<Objects>this.widget.objects).viewport();
        //     if (!objects_viewport) {
        //         var center = this.widget.objects.center();
        //         objects_viewport = {cx: center.x, cy: center.y, size: Math.ceil(this.widget.objects.diameter() + 0.5)};
        //     }
        //     this.viewport_initial = this.viewport(objects_viewport);
        // }
        // else {
        //     this.grid.reset(false);
        // }
        // $.when(this.widget.initialization_completed).done(() => this.update_resolution());
    }

    protected manipulator_implementation_module() :string {
        return "amv-manipulator-2d";
    }

    protected bind_manipulator(manipulator :Manipulator) :void {
        switch (manipulator[0]) {
        case "zoom":
            this.controls[manipulator[0]] = new AmvManipulator2d.ZoomControl(this, manipulator[1]);
            break;
        case "rotate":
            this.controls[manipulator[0]] = new AmvManipulator2d.RotateControl(this, manipulator[1]);
            break;
        case "fliph":
            this.controls[manipulator[0]] = new AmvManipulator2d.FlipControl(this, true, manipulator[1]);
            break;
        case "flipv":
            this.controls[manipulator[0]] = new AmvManipulator2d.FlipControl(this, false, manipulator[1]);
            break;
        case "element-scale":
            this.controls[manipulator[0]] = new AmvManipulator2d.ScaleControl(this, manipulator[1]);
            break;
        case "element-hover":
            this.controls[manipulator[0]] = new AmvManipulator2d.HoverControl(this, manipulator[1]);
            break;
        case "pan":
            this.controls[manipulator[0]] = new AmvManipulator2d.PanControl(this, manipulator[1]);
            break;
        case "key":
            this.controls[manipulator[0]] = new AmvManipulator2d.KeyControl(this, manipulator[1]);
            break;
        }
        if (!!this.controls[manipulator[0]]) {
            this.manipulator.make_event_generator(manipulator[1]);
        }
    }

    public keypress(key :number) {
        switch (key) {
        case 114:               // r
            this.reset();
            break;
        // case 115:               // s
        //     this.state();
        //     break;
        case 116:               // t
            this.transform([[-1, 0], [0, 1]]);
            break;
        case 112:               // p
            this.viewport_rotate(Math.PI / 2);
            break;
        case 45:               // -
            // this.widget.objects.object_scale(1.0);
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
                                  <li>Point size - <span class="mouse-action">${element-scale-trigger}</span></li>\
                                  <!-- <li>Label size - <span class="mouse-action">${label-scale-trigger}</span></li> -->\
                                  <li>Rotate - <span class="mouse-action">${rotate-trigger}</span></li>\
                                  <li>Flip horizontally - <span class="mouse-action">${fliph-trigger}</span></li>\
                                  <li>Flip vertically - <span class="mouse-action">${flipv-trigger}</span></li>\
                                  <li>Pan - <span class="mouse-action">${pan-trigger}</span></li>\
                                  <li>Reset map - choose reset in the menu<br />(next to the Help button at the top right corner)</li>\
                                </ul>\
                                <p class="footer">Click to hide this popup.</p>';

    public help_text() :string {
        var r = Viewer.s_help_text;
        ["rotate fliph flipv elemet-scale zoom pan"].forEach(function(n) {
            r = r.replace("${" + n + "-trigger}", this.controls[n].trigger_description());
        });
        return r;
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
        this.viewer.widget.add_to_scene(this.grid);
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
        this.lines = new THREE.LineSegments(lines_geometry, new THREE.LineBasicMaterial({color: 0x000000, opacity: 0.2, transparent: true}))
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

export abstract class MapElement extends AmvLevel1.MapElement
{
    public set_position(position :Position) :void {
        if (position !== undefined && position !== null) {
            this.position.set(position[0], -position[1], 0);
        }
    }

    public set_rotation(rotation :number) :number {
        if (rotation !== undefined && rotation !== null) {
            this.rotation.z = rotation;
        }
        return this.rotation.z;
    }

    public set_drawing_order(drawing_order :number) {
        this.position.setZ(DrawingOrderNS.base + drawing_order * DrawingOrderNS.step);
    }
}

export class MapElementPoint extends MapElement
{
    public min_max_position(point_min :THREE.Vector3, point_max: THREE.Vector3) :void {
        point_max.max(this.position);
        point_min.min(this.position);
    }

    public view_flip() :void {
        this.position.setX(- this.position.x);
    }

    public view_rotated(quaternion :THREE.Quaternion) :void {
        this.rotation.setFromQuaternion(quaternion)
    }

    public resolution_changed_scale(scale :number, all_elements_scale :number) :void {
        this.scale.multiplyScalar(scale * all_elements_scale / this.scale.y);
    }
}

export class MapElementLine extends MapElement
{
    private static _flip_matrix :THREE.Matrix4 = (new THREE.Matrix4()).scale(new THREE.Vector3(-1, 1, 1));
    public static arrow_head_default_size :number = 1; // in pixels

    private _arrow_head :THREE.Object3D;

    constructor(content :{arrow_head? :THREE.Object3D, line :THREE.Object3D}) {
        super([content.arrow_head, content.line].filter(function (e :THREE.Object3D) { return e !== null && e !== undefined; }));
        this._arrow_head = content.arrow_head;
    }

    public min_max_position(point_min :THREE.Vector3, point_max: THREE.Vector3) :void {
        point_max.max(this.position);
        point_min.min(this.position);
    }

    public view_flip() :void {
        // this.position.setX( - this.position.x);
        this.applyMatrix(MapElementLine._flip_matrix);
    }

    public view_rotated(quaternion :THREE.Quaternion) :void {
    }

    public rescale(scale :number) :void {
        // lines and arrows are not scalable
    }

    public resolution_changed_scale(scale :number, all_elements_scale :number) :void {
        if (this._arrow_head !== null && this._arrow_head !== undefined) {
            this._arrow_head.scale.multiplyScalar(scale * MapElementLine.arrow_head_default_size / this._arrow_head.scale.y);
            // console.log('resolution_changed_scale', scale, this._arrow_head.scale.x, this._arrow_head.scale.y);
        }
    }
}

// ----------------------------------------------------------------------

export class MapElements extends AmvLevel1.MapElements
{
    private pixels_per_unit :number; // store old value to speed up resize()
    public static default_size :number = 20; // in pixels, multiplied by this._object_scale

    protected scale_limits(widget :AmvLevel1.MapWidgetLevel1) :{min :number, max :number} {
        var units_per_pixel = 1 / (<Viewer>widget.viewer).resolution();
        return {min: units_per_pixel * 20, max: widget.size() * units_per_pixel};
    }

    public resolution_changed(pixels_per_unit :number) :void {
        if (pixels_per_unit !== this.pixels_per_unit) {
            var scale = MapElements.default_size / pixels_per_unit;
            this.elements.map(o => o.resolution_changed_scale(scale, this._scale));
            this.pixels_per_unit = pixels_per_unit;
        }
    }
}

// ----------------------------------------------------------------------

export class Factory extends AmvLevel1.Factory
{
    private static geometry_size :number = 1.0;
    private ball_segments :number = 32; // depends on the number of objects
    private outline_width_scale :number = 0.005;
    private fill_materials :any = {}; // {fill_color: THREE.MeshBasicMaterial}
    private outline_materials :any = {}; // {outline_color-outline_width: THREE.LineBasicMaterial}
    private geometries :any;

    constructor(number_of_objects :number) {
        super();
        this.make_geometries();
    }

    public circle(fill_color :Color, outline_color :Color, outline_width :number) :MapElement
    {
        var body = new THREE.Mesh(this.geometries.circle, this.fill_material(fill_color));
        var outline = new THREE.Line(this.geometries.circle_outline, this.outline_material(outline_color, outline_width));
        return new MapElementPoint([body, outline]);
    }

    public box(fill_color :Color, outline_color :Color, outline_width :number) :MapElement
    {
        var body = new THREE.Mesh(this.geometries.box, this.fill_material(fill_color));
        var outline = new THREE.Line(this.geometries.box_outline, this.outline_material(outline_color, outline_width));
        return new MapElementPoint([body, outline]);
    }

    public triangle(fill_color :Color, outline_color :Color, outline_width :number) :MapElement
    {
        var body = new THREE.Mesh(this.geometries.triangle, this.fill_material(fill_color));
        var outline = new THREE.Line(this.geometries.triangle_outline, this.outline_material(outline_color, outline_width));
        return new MapElementPoint([body, outline]);
    }

    public line(other_end :Position, color :Color, width :number) :MapElement
    {
        var line_shape = new THREE.Shape();
        line_shape.moveTo(0, 0)
        line_shape.lineTo(other_end[0], - other_end[1])
        return new MapElementLine({line: new THREE.Line(line_shape.createPointsGeometry(null), this.outline_material(color, width))});
    }

    public arrow(other_end :Position, color :Color, width :number, arrow_length :number) :MapElement
    {
        const awid = arrow_length / 2;
        var sign = other_end[0] < 0 ? 1.0 : -1.0;
        var angle = Math.abs(other_end[0]) < 1e-10 ? -PI_2 : Math.atan(- other_end[1] / other_end[0]);
        // middle of the bottom of the arrow head
        var x2 = other_end[0]; // + sign * arrow_length * Math.cos(angle) * 0.1;
        var y2 = - other_end[1]; // + sign * arrow_length * Math.sin(angle) * 0.1;

        var line_shape = new THREE.Shape();
        line_shape.moveTo(0, 0);
        line_shape.lineTo(x2, y2);
        var arrow_line = new THREE.Line(line_shape.createPointsGeometry(null), this.outline_material(color, width));

        var arrow_bottom_middle = [sign * arrow_length * Math.cos(angle), sign * arrow_length * Math.sin(angle)];
        var arrow_bottom = [arrow_bottom_middle[0] + sign * awid * Math.cos(angle + PI_2) * 0.5, arrow_bottom_middle[1] + sign * awid * Math.sin(angle + PI_2) * 0.5,
                            arrow_bottom_middle[0] + sign * awid * Math.cos(angle - PI_2) * 0.5, arrow_bottom_middle[1] + sign * awid * Math.sin(angle - PI_2) * 0.5];
        var arrow_shape = new THREE.Shape();
        arrow_shape.moveTo(0, 0);
        arrow_shape.lineTo(arrow_bottom[0], arrow_bottom[1]);
        arrow_shape.lineTo(arrow_bottom[2], arrow_bottom[3]);
        var arrow_head = new THREE.Mesh(new THREE.ShapeGeometry(arrow_shape), this.fill_material(color, THREE.DoubleSide));
        arrow_head.position.set(other_end[0], - other_end[1], 0);

        return new MapElementLine({arrow_head: arrow_head, line: arrow_line});
    }

    private make_geometries() :void
    {
        const offset = Factory.geometry_size / 2;

        var circle_curve = new THREE.EllipseCurve(0, 0, offset, offset, 0, Math.PI * 2, false, 0);
        var circle_path = new THREE.Path(circle_curve.getPoints(this.ball_segments));

        var box_shape = new THREE.Shape();
        box_shape.moveTo(-offset, -offset);
        box_shape.lineTo(-offset,  offset);
        box_shape.lineTo( offset,  offset);
        box_shape.lineTo( offset, -offset);
        box_shape.lineTo(-offset, -offset);

        var triangle_shape = new THREE.Shape();
        triangle_shape.moveTo(-offset, -offset);
        triangle_shape.lineTo( offset, -offset);
        triangle_shape.lineTo(      0,  offset);
        triangle_shape.lineTo(-offset, -offset);

        this.geometries = {
            circle: new THREE.CircleGeometry(Factory.geometry_size / 2, this.ball_segments),
            circle_outline: circle_path.createPointsGeometry(this.ball_segments),
            box: new THREE.ShapeGeometry(box_shape),
            box_outline: box_shape.createPointsGeometry(null),
            triangle: new THREE.ShapeGeometry(triangle_shape),
            triangle_outline: triangle_shape.createPointsGeometry(null),
        };
    }

    private fill_material(fill_color :Color, side :THREE.Side = THREE.FrontSide) :THREE.MeshBasicMaterial
    {
        var key = `${fill_color}-${side}`;
        var fill_material :THREE.MeshBasicMaterial = <THREE.MeshBasicMaterial>this.fill_materials[key];
        if (!fill_material) {
            fill_material = new THREE.MeshBasicMaterial(Factory.convert_color(fill_color));
            fill_material.side = side;
            // fill_material.transparent = true;
            this.fill_materials[key] = fill_material;
        }
        return fill_material;
    }

    private outline_material(outline_color :Color, outline_width :number) :THREE.LineBasicMaterial
    {
        var key = `${outline_color}-${outline_width}`;
        var outline_material :THREE.LineBasicMaterial = <THREE.LineBasicMaterial>this.outline_materials[key];
        if (!outline_material) {
            outline_material = new THREE.LineBasicMaterial(Factory.convert_color(outline_color));
            outline_material.linewidth = (outline_width === undefined || outline_width === null) ? 1.0 : outline_width;
            // outline_material.transparent = true;
            this.outline_materials[key] = outline_material;
        }
        return outline_material;
    }
}

// ----------------------------------------------------------------------

// export class Objects extends AmvLevel1.Objects
// {
//     private _flip :boolean;
//     private _viewport :Viewport;
//     public static object_default_size :number = 5; // in pixels, multiplied by this._object_scale
//     private event_handlers :JQuery[] = [];
//     private pixels_per_unit :number; // store old value to speed up resize()

//     constructor(widget :AmvLevel1.MapWidgetLevel1) {
//         super(widget);
//         this._flip = false;
//         this.event_handlers.push(widget.on("map-resolution-changed:amv", (pixels_per_unit) => this.map_resolution_changed(pixels_per_unit)));
//     }

//     public destroy() {
//         this.event_handlers.forEach((eh) => eh.off());
//     }

//     public number_of_dimensions() :number {
//         return 2;
//     }

//     public flip_state() :boolean {
//         return this._flip;
//     }

//     public viewport(viewport? :Viewport) :Viewport {
//         if (viewport) {
//             this._viewport = viewport;
//         }
//         return this._viewport;
//     }

//     public object_scale(factor :number) :void {
//         super.object_scale(factor);
//     }

//     private map_resolution_changed(pixels_per_unit :number) :void {
//         this.resize(pixels_per_unit);
//     }

//     private resize(pixels_per_unit :number) :void {
//         if (pixels_per_unit !== this.pixels_per_unit) {
//             var scale = Objects.object_default_size / pixels_per_unit;
//             this.objects.map(o => o.set_scale(scale));
//             this.pixels_per_unit = pixels_per_unit;
//         }
//     }

// }

// // ----------------------------------------------------------------------
