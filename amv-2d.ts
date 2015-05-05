/// <reference path="build/jquery" />
/// <reference path="build/three" />

/// <reference path="antigenic-map-viewer.d.ts" />

import AmvUtils = require("amv-utils");
import AmvLevel1 = require("amv-level1");
import AcmacsPlotData = require("acmacs-plot-data");
import AmvManipulator = require("amv-manipulator");
import AmvManipulator2d = require("amv-manipulator-2d");

// ----------------------------------------------------------------------

export class Viewer extends AmvLevel1.Viewer
{
    private grid :Grid;

    // private rotate_control :AmvManipulator2d.RotateControl;
    // private flip_control :AmvManipulator2d.FlipControl;
    // private zoom_control :AmvManipulator2d.ZoomControl;
    // private scale_control :AmvManipulator2d.ScaleControl;
    // private pan_control :AmvManipulator2d.PanControl;
    // private reset_control :AmvManipulator2d.ResetControl;
    // private hover_control :AmvManipulator2d.HoverControl;

    constructor(widget :AmvLevel1.MapWidgetLevel1, public initial_size :number = 5, private maximum_drawing_order :number = 1000) {
        super(widget);
        this.camera = new THREE.OrthographicCamera(this.initial_size / - 2, this.initial_size / 2, this.initial_size / 2, this.initial_size / - 2, 0, this.maximum_drawing_order + 2);
        widget.add(this.camera);
        this.grid = new Grid(this, 0);
        this.reset()
    }

    public reset() :void {
        this.widget.reset_objects();
        this.camera.position.set(0, 0, this.maximum_drawing_order + 1);
        this.camera_look_at(AmvLevel1.Viewer.const_vector3_zero);
        this.camera_update();
    }

    public objects_updated() :void {
        super.objects_updated();
        this.grid.reset();
    }

    // Returns node triggering events
    public bind_manipulators(widget :AmvLevel1.MapWidgetLevel1) :void {
        $.when(AmvUtils.require_deferred(['amv-manipulator', 'amv-manipulator-2d'])).done(() => {
            this.manipulator.make_event_generators(["move::amv", "drag::amv", "drag:shift:amv", "wheel:shift:amv", "wheel:alt:amv", "wheel:shift-alt:amv", "key::amv"]);

            // this.rotate_control = new AmvManipulator2d.OrbitControl(this, "drag::amv");
            // this.flip_control = new AmvManipulator2d.OrbitControl(this, "drag::amv");
            // this.zoom_control = new AmvManipulator2d.ZoomControl(this, "wheel:shift:amv", this.widget);
            // this.scale_control = new AmvManipulator2d.ScaleControl(this, "wheel:alt:amv", this.widget);
            // this.pan_control = new AmvManipulator2d.PanControl(this, "drag:shift:amv");
            // this.reset_control = new AmvManipulator2d.ResetControl(this, "key::amv", 114); // 'r'
            // this.hover_control = new AmvManipulator2d.HoverControl(this, "move::amv", this.widget); // triggers "hover:amv" on this.element
        });
    }

    public orthographic_camera() :THREE.OrthographicCamera {
        return <THREE.OrthographicCamera>this.camera;
    }
}

// ----------------------------------------------------------------------

class Grid
{
    private size :number;
    private grid :THREE.Object3D;
    private lines :THREE.Line;

    private static components = [[0,1],[1,0]];

    constructor(public viewer :Viewer, private position_z :number) {
        this.grid = new THREE.Object3D();
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
        var offset :number;
        for (offset = camera.left; offset < camera.right; ++offset) {
            lines_geometry.vertices.push(new THREE.Vector3(offset, camera.bottom, 0));
            lines_geometry.vertices.push(new THREE.Vector3(offset, camera.top, 0));
        }
        for (offset = camera.bottom; offset < camera.top; ++offset) {
            lines_geometry.vertices.push(new THREE.Vector3(camera.left,  offset, 0));
            lines_geometry.vertices.push(new THREE.Vector3(camera.right, offset, 0));
        }
        this.lines = new THREE.Line(lines_geometry, new THREE.LineBasicMaterial({color: 0x000000, opacity: 0.2, transparent: true}), THREE.LinePieces)
        this.grid.add(this.lines)
    }

}

// ----------------------------------------------------------------------

export class Objects extends AmvLevel1.Objects
{
    constructor(widget :AmvLevel1.MapWidgetLevel1, user_objects :AcmacsPlotData.PlotData) {
        super(widget);
        var styles = user_objects.make_styles(new ObjectFactory(user_objects.number_of_objects()));
        var z_pos = 1;
        this.objects = user_objects.layout()
              .map((elt, index) => { if (elt.length === 2) elt.push(z_pos); else elt[2] = z_pos; return elt; }) // drawing order
              .map((elt, index) => styles[user_objects.style_no(index)].make(elt, {index: index}));
        this.widget.add_array(this.objects);
        this.calculate_bounding_sphere(user_objects.layout());
    }
}

// ----------------------------------------------------------------------

export class ObjectFactory extends AcmacsPlotData.ObjectFactory
{
    private geometry_size :number;
    private ball_segments :number; // depends on the number of objects

    constructor(number_of_objects :number) {
        super();
        this.material = THREE.MeshBasicMaterial;
        this.geometry_size = 1.0;
        this.ball_segments = 32;
    }

    // adds to this.geometries
    protected make_circle(geometry_name :string, aspect: number = 1.0, rotation :number = 0.0, outline_width :number = 1.0) :void {
        this.geometries[geometry_name] = new THREE.CircleGeometry(this.geometry_size / 2, this.ball_segments);
        outline_width = (outline_width === undefined || outline_width === null) ? 1.0 : outline_width;
    }

    // adds to this.geometries
    protected make_box(geometry_name :string, aspect: number = 1.0, rotation :number = 0.0, outline_width :number = 1.0) :void {
        this.geometries[geometry_name] = new THREE.BoxGeometry(this.geometry_size, this.geometry_size, this.geometry_size);
    }
}

// ----------------------------------------------------------------------
