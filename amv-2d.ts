/// <reference path="build/jquery" />
/// <reference path="build/three" />

/// <reference path="antigenic-map-viewer.d.ts" />

import AmvUtils = require("amv-utils");
import AmvLevel1 = require("amv-level1");
import AcmacsPlotData = require("acmacs-plot-data");
import AmvManipulator = require("amv-manipulator");
import AmvManipulator2d = require("amv-manipulator-2d");

// ----------------------------------------------------------------------

interface Viewport
{
    cx :number;
    cy :number;
    size :number;
}

// ----------------------------------------------------------------------

export class Viewer extends AmvLevel1.Viewer
{
    public static camera_up = new THREE.Vector3(0, 1, 0);
    private static s_initial_viewport :Viewport = {cx: 0, cy: 0, size: 5};
    private static s_maximum_drawing_order :number = 1000;

    private grid :Grid;
    private maximum_drawing_order :number;

    private rotate_control :AmvManipulator2d.RotateControl;
    private fliph_control :AmvManipulator2d.FlipControl;
    private flipv_control :AmvManipulator2d.FlipControl;
    private zoom_control :AmvManipulator2d.ZoomControl;
    private scale_control :AmvManipulator2d.ScaleControl;
    private pan_control :AmvManipulator2d.PanControl;
    // private reset_control :AmvManipulator2d.ResetControl;
    // private hover_control :AmvManipulator2d.HoverControl;

    constructor(widget :AmvLevel1.MapWidgetLevel1) {
        super(widget);
        this.maximum_drawing_order = Viewer.s_maximum_drawing_order;
        var hsize = Viewer.s_initial_viewport.size / 2;
        this.camera = new THREE.OrthographicCamera(Viewer.s_initial_viewport.cx - hsize, Viewer.s_initial_viewport.cx + hsize, Viewer.s_initial_viewport.cy + hsize, Viewer.s_initial_viewport.cy - hsize, 0, this.maximum_drawing_order + 2);
        widget.add(this.camera);
        this.grid = new Grid(this, 0);
        this.reset()
    }

    // collects current state of the viewer: transformation matrix and viewport
    public state() :void {
        // get transformation matrix
        var quaternion = new THREE.Quaternion().setFromUnitVectors(this.camera.up, Viewer.camera_up);
        var flip = this.widget.objects.flip_state(); // [bool, bool]
        var viewport = this.viewport();
    }

    public reset() :void {
        this.widget.reset_objects();
        this.camera.up.copy(Viewer.camera_up);
        this.camera.position.set(0, 0, this.maximum_drawing_order + 1);
        this.camera_look_at(AmvLevel1.Viewer.const_vector3_zero);
        this.camera_update();
    }

    public viewport() :Viewport {
        var camera = <THREE.OrthographicCamera>this.camera;
        return {cx: (camera.left + camera.right) / 2, cy: (camera.bottom + camera.top) / 2, size: camera.right - camera.left};
    }

    public viewport_zoom(factor :number) :void {
        var viewport = this.viewport();
        if ((factor < 1 && viewport.size > 1) || (factor > 1 && viewport.size < 100)) {
            viewport.size *= factor;
            var hsize = viewport.size / 2;
            var camera = <THREE.OrthographicCamera>this.camera;
            camera.left = viewport.cx - hsize;
            camera.right = viewport.cx + hsize;
            camera.top = viewport.cy + hsize;
            camera.bottom = viewport.cy - hsize;
            camera.updateProjectionMatrix();
            this.grid.reset();
            this.widget.objects.scale(factor);
            // this.camera_update();
        }
    }

    public viewport_move(offset :AmvManipulator.MouseMovement) :void {
        var camera = <THREE.OrthographicCamera>this.camera;
        camera.left += offset.deltaX;
        camera.right += offset.deltaX;
        camera.bottom += offset.deltaY;
        camera.top += offset.deltaY;
        camera.updateProjectionMatrix();
        this.grid.reset();
    }

    public camera_update() :void {
        super.camera_update();
        this.grid.update();
    }

    public objects_updated() :void {
        super.objects_updated();
        this.grid.reset();
    }

    // Returns node triggering events
    public bind_manipulators(widget :AmvLevel1.MapWidgetLevel1) :void {
        $.when(AmvUtils.require_deferred(['amv-manipulator', 'amv-manipulator-2d'])).done(() => {
            this.manipulator.make_event_generators(["wheel:ctrl:amv", "left:alt:amv", "left:shift-alt:amv", "wheel:alt:amv", "wheel:shift:amv", "drag:shift:amv",
                                                    // "move::amv", "drag::amv", "wheel:shift-alt:amv", "key::amv"
                                                   ]);

            this.rotate_control = new AmvManipulator2d.RotateControl(this, "wheel:ctrl:amv");
            this.fliph_control = new AmvManipulator2d.FlipControl(this, true, "left:alt:amv");
            this.flipv_control = new AmvManipulator2d.FlipControl(this, false, "left:shift-alt:amv");
            this.zoom_control = new AmvManipulator2d.ZoomControl(this, "wheel:shift:amv");
            this.scale_control = new AmvManipulator2d.ScaleControl(this, "wheel:alt:amv", this.widget);
            this.pan_control = new AmvManipulator2d.PanControl(this, "drag:shift:amv");
            // this.reset_control = new AmvManipulator2d.ResetControl(this, "key::amv", 114); // 'r'
            // this.hover_control = new AmvManipulator2d.HoverControl(this, "move::amv", this.widget); // triggers "hover:amv" on this.element
        });
    }

    public orthographic_camera() :THREE.OrthographicCamera {
        return <THREE.OrthographicCamera>this.camera;
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
    private vertice :{x :number, y :number};

    private static components = [[0,1],[1,0]];

    constructor(public viewer :Viewer, private position_z :number) {
        this.grid = new THREE.Object3D();
        this.vertice = null;
        this.viewer.widget.add(this.grid);
        this.grid.position.set(0, 0, this.position_z);
        this.grid.lookAt(this.viewer.camera.position);
    }

    public reset() :void {
        if (this.lines) {
            this.grid.remove(this.lines)
        }
        var camera = this.viewer.orthographic_camera()
        var lines_geometry = new THREE.Geometry();
        var offset_base = this.offset_base();
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

    private offset_base() :{left :number, bottom :number} {
        var offset_base = {left: 0, bottom: 0};
        var camera = this.viewer.orthographic_camera();
        if (!this.vertice) {
            this.vertice = {x: camera.left, y: camera.bottom};
        }
        else {
            offset_base = {left: (this.vertice.x - camera.left) % 1, bottom: (this.vertice.y - camera.bottom) % 1};
        }
        return offset_base;
    }

    public update() :void {
        var quaternion = new THREE.Quaternion().setFromUnitVectors(this.viewer.camera.up, Viewer.camera_up);
        this.grid.rotation.setFromQuaternion(quaternion.inverse());
    }
}

// ----------------------------------------------------------------------

export class Objects extends AmvLevel1.Objects
{
    private _flip :[Boolean, Boolean]; // [flipX, flipY

    constructor(widget :AmvLevel1.MapWidgetLevel1, user_objects :AcmacsPlotData.PlotData) {
        super(widget);
        var styles = user_objects.make_styles(new ObjectFactory(user_objects.number_of_objects()));
        var z_pos = 1;
        this.objects = user_objects.layout()
              .map((elt, index) => { if (elt.length === 2) elt.push(z_pos); else elt[2] = z_pos; z_pos += 0.0001; return elt; }) // drawing order
              .map((elt, index) => styles[user_objects.style_no(index)].make(elt, {index: index}));
        this.widget.add_array(this.objects);
        this.calculate_bounding_sphere(user_objects.layout());
        this._flip = [false, false];
    }

    public flip(horizontally :Boolean) :void {
        if (horizontally) {
            const center_x = this.center().x;
            this.objects.map(o => o.position.setX(center_x - o.position.x));
            this._flip[0] = !this._flip[0];
        }
        else {
            const center_y = this.center().y;
            this.objects.map(o => o.position.setY(center_y - o.position.y));
            this._flip[1] = !this._flip[1];
        }
    }

    public flip_state() :[Boolean, Boolean] {
        return this._flip;
    }

    public reset() :void {
        super.reset();
        if (this._flip[0])
            this.flip(true);
        if (this._flip[1])
            this.flip(false);
    }
}

// ----------------------------------------------------------------------

export class ObjectFactory extends AcmacsPlotData.ObjectFactory
{
    private geometry_size :number;
    private ball_segments :number; // depends on the number of objects
    private outline_width_scale :number;
    private outline_materials :any; // color: THREE.Material

    constructor(number_of_objects :number) {
        super();
        this.material = THREE.MeshBasicMaterial;
        this.geometry_size = 0.2;
        this.ball_segments = 32;
        this.outline_width_scale = 0.005;
        this.outline_materials = {};
    }

    public make_mesh(plot_style :AntigenicMapViewer.PlotDataStyle, shape :string, geometry :THREE.Geometry, material :THREE.Material) :THREE.Mesh {
        var mesh = super.make_mesh(plot_style, shape, geometry, material);
        var outline_material = this.outline_material(this.convert_color(plot_style.outline_color), plot_style.outline_width);
        if (shape === "circle") {
            mesh.add(new THREE.Mesh(this.geometries[`${shape}-outline-${plot_style.outline_width}`], outline_material));
        }
        else {
            mesh.add(new THREE.Line(this.geometries[`${shape}-outline`], <THREE.ShaderMaterial>outline_material));
        }
        return mesh;
    }

    // adds to this.geometries
    protected make_circle(outline_width :number) :void {
        this.geometries["circle"] = new THREE.CircleGeometry(this.geometry_size / 2, this.ball_segments);
        var n_outline_width = (outline_width === undefined || outline_width === null) ? 1.0 : outline_width;
        this.geometries[`circle-outline-${outline_width}`] = new THREE.RingGeometry(this.geometry_size / 2 - n_outline_width * this.outline_width_scale,
                                                                                    this.geometry_size / 2, this.ball_segments);
    }

    // adds to this.geometries
    protected make_box(outline_width :number) :void {
        var offset = this.geometry_size / 2;
        var shape = new THREE.Shape();
        shape.moveTo(-offset, -offset);
        shape.lineTo(-offset,  offset);
        shape.lineTo( offset,  offset);
        shape.lineTo( offset, -offset);
        shape.lineTo(-offset, -offset);
        this.geometries["box"] = new THREE.ShapeGeometry(shape);
        this.geometries["box-outline"] = (<any>shape).createPointsGeometry();
    }

    protected make_triangle(outline_width :number = 1.0) :void {
        var offset = this.geometry_size / 2;
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
