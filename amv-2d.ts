/// <reference path="build/jquery" />
/// <reference path="build/three" />

/// <reference path="antigenic-map-viewer.d.ts" />

import AmvUtils = require("amv-utils");
import AmvLevel1 = require("amv-level1");
import AntigenicMapViewer = require("acmacs-plot-data");
import AmvManipulator = require("amv-manipulator");
import AmvManipulator2d = require("amv-manipulator-2d");

// ----------------------------------------------------------------------

export class Viewer extends AmvLevel1.Viewer
{
    private ambient_light :THREE.AmbientLight;
    private grid :Grid;

    // private rotate_control :AmvManipulator2d.RotateControl;
    // private flip_control :AmvManipulator2d.FlipControl;
    // private zoom_control :AmvManipulator2d.ZoomControl;
    // private scale_control :AmvManipulator2d.ScaleControl;
    // private pan_control :AmvManipulator2d.PanControl;
    // private reset_control :AmvManipulator2d.ResetControl;
    // private hover_control :AmvManipulator2d.HoverControl;

    constructor(widget :AmvLevel1.MapWidgetLevel1, private initial_size :number = 15) {
        super(widget);
        this.camera = new THREE.OrthographicCamera(this.initial_size / - 2, this.initial_size / 2, this.initial_size / 2, this.initial_size / - 2, 0.1, 1000);
        widget.add(this.camera);
        this.ambient_light = new THREE.AmbientLight(0x404040);
        widget.add(this.ambient_light);
        this.grid = new Grid(this);
        this.reset()
    }

    public reset() :void {
        this.widget.reset_objects();
        // this.camera.position.set(0, 0, this.initial_distance);
        this.camera_look_at(AmvLevel1.Viewer.const_vector3_zero);
        this.camera_frustum(this.initial_size);
        this.camera_update();
    }

    // view_size(target?: THREE.Vector3): number {
    //     return 2.0 * Math.tan(this.camera_fov() * Math.PI / 360.0) * this.camera.position.distanceTo(target || AmvLevel1.Viewer.const_vector3_zero);
    // }

    public objects_updated() :void {
        super.objects_updated();
        this.grid.reset();
    }

    public camera_update() :void {
        super.camera_update();
        this.grid.position();
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

    public camera_frustum(size? :number) :number {
        var camera = <THREE.OrthographicCamera>this.camera;
        return camera.right - camera.left;
    }
}

// ----------------------------------------------------------------------

class Grid
{
    private size :number;
    private grid :THREE.Object3D;
    private lines :THREE.Line;

    private static components = [[1,2,0],[1,0,2],[2,1,0],[2,0,1],[0,2,1],[0,1,2]];

    constructor(public viewer :Viewer) {
        this.grid = new THREE.Object3D();
        this.viewer.widget.add(this.grid);
    }

    public position() :void {
        // var camera = this.viewer.camera;
        // var offset = this.size / 2.0;
        // var eye = this.viewer.camera_looking_at.clone().sub(camera.position);
        // var up = eye.clone().cross(camera.up).cross(eye).setLength(offset);

        // this.grid.up.copy(up).normalize();

        // this.grid.position.copy(this.viewer.camera_looking_at)
        //       .add(eye.clone().setLength(offset))
        //       .sub(up);

        // var look_at = camera.position.clone()
        //       .sub(up)
        //       .add(up.clone().cross(eye).setLength(this.grid.position.distanceTo(camera.position)));
        // this.grid.lookAt(look_at);
    }

    public reset() :void {
        // if (this.lines) {
        //     this.grid.remove(this.lines)
        // }
        // this.size = Math.ceil(this.viewer.widget.objects.diameter() * 1.2);
        // var lines_geometry = new THREE.Geometry();
        // Grid.components.map((component_order) => this.add_vertice(component_order, lines_geometry));
        // this.lines = new THREE.Line(lines_geometry, new THREE.LineBasicMaterial({color: 0x000000, opacity: 0.2, transparent: true}), THREE.LinePieces)
        // this.grid.add(this.lines)
    }

    // private add_vertice(component_order :number[], lines_geometry :THREE.Geometry) :void {
    //     for (var offset = 0; offset < this.size; ++offset) {
    //         var vertex = new THREE.Vector3();
    //         vertex.setComponent(component_order[1], offset);
    //         lines_geometry.vertices.push(vertex);
    //         vertex = vertex.clone();
    //         vertex.setComponent(component_order[0], this.size);
    //         lines_geometry.vertices.push(vertex);
    //     }
    // }
}

// ----------------------------------------------------------------------

export class Objects extends AmvLevel1.Objects
{
    private static geometry_size = 0.2;

    constructor(widget :AmvLevel1.MapWidgetLevel1, user_objects :AntigenicMapViewer.PlotData) {
        super(widget);
        var ball_segments = 32; // depends on the number of objects
        var sphere_geometry = new THREE.SphereGeometry(Objects.geometry_size, ball_segments, ball_segments);
        var box_geometry = new THREE.BoxGeometry(Objects.geometry_size, Objects.geometry_size, Objects.geometry_size);
        var styles = user_objects.make_styles(sphere_geometry, box_geometry, THREE.MeshPhongMaterial);
        this.objects = user_objects.layout().map((elt, index) => styles[user_objects.style_no(index)].make(elt, {index: index}));
        this.widget.add_array(this.objects);
        this.calculate_bounding_sphere(user_objects.layout());
        console.log('objects in 2d', JSON.stringify(this.center()), this.diameter());
    }
}

// ----------------------------------------------------------------------
