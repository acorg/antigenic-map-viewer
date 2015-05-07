/// <reference path="build/jquery" />
/// <reference path="build/three" />

/// <reference path="antigenic-map-viewer.d.ts" />

import AmvUtils = require("amv-utils");
import AmvLevel1 = require("amv-level1");
import AcmacsPlotData = require("acmacs-plot-data");
import AmvManipulator = require("amv-manipulator");
import AmvManipulator3d = require("amv-manipulator-3d");

// ----------------------------------------------------------------------

export class Viewer extends AmvLevel1.Viewer
{
    private ambient_light :THREE.AmbientLight;
    private point_light :THREE.PointLight;
    private grid :Grid;

    private orbit_control :AmvManipulator3d.OrbitControl;
    private zoom_control :AmvManipulator3d.ZoomControl;
    private scale_control :AmvManipulator3d.ScaleControl;
    private pan_control :AmvManipulator3d.PanControl;
    private reset_control :AmvManipulator3d.ResetControl;
    private hover_control :AmvManipulator3d.HoverControl;
    private fov_control :AmvManipulator3d.FovControl;

    constructor(widget :AmvLevel1.MapWidgetLevel1, private initial_distance :number = 10, private initial_fov :number = 75) {
        super(widget);
        this.camera = new THREE.PerspectiveCamera(this.initial_fov, 1.0, 0.1, 1000);
        widget.add(this.camera);
        this.ambient_light = new THREE.AmbientLight(0x404040);
        widget.add(this.ambient_light);
        this.point_light = new THREE.PointLight(0xFFFFFF, 1.0);
        this.point_light.position.set(-this.initial_distance, this.initial_distance, 0);
        this.camera.add(this.point_light);
        this.grid = new Grid(this);
        this.reset()
    }

    public reset() :void {
        this.widget.reset_objects();
        this.camera.position.set(0, 0, this.initial_distance);
        this.camera_look_at(AmvLevel1.Viewer.const_vector3_zero);
        this.camera_fov(this.initial_fov);
        this.camera_update();
    }

    view_size(target?: THREE.Vector3): number {
        return 2.0 * Math.tan(this.camera_fov() * Math.PI / 360.0) * this.camera.position.distanceTo(target || AmvLevel1.Viewer.const_vector3_zero);
    }

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
        $.when(AmvUtils.require_deferred(['amv-manipulator', 'amv-manipulator-3d'])).done(() => {
            this.manipulator.make_event_generators(["move::amv", "drag::amv", "drag:shift:amv", "wheel:shift:amv", "wheel:alt:amv", "wheel:shift-alt:amv", "key::amv"]);

            // this.element.on("move::amv", (e :Event, a :any) => console.log('move::amv', JSON.stringify(a)));
            // this.element.on("drag::amv", (e :Event, a :any) => console.log('drag::amv', JSON.stringify(a)));
            // this.element.on("wheel:shift:amv", (e :Event, a :any) => console.log('wheel:shift:amv', JSON.stringify(a)));
            // this.element.on("wheel:alt:amv", (e :Event, a :any) => console.log('wheel:alt:amv', JSON.stringify(a)));
            // this.element.on("key::amv", (e :Event, a :AmvManipulator.Keypress) => console.log('key::amv', JSON.stringify(a)));

            this.orbit_control = new AmvManipulator3d.OrbitControl(this, "drag::amv");
            this.zoom_control = new AmvManipulator3d.ZoomControl(this, "wheel:shift:amv", this.widget);
            this.scale_control = new AmvManipulator3d.ScaleControl(this, "wheel:alt:amv", this.widget);
            this.pan_control = new AmvManipulator3d.PanControl(this, "drag:shift:amv");
            this.reset_control = new AmvManipulator3d.ResetControl(this, "key::amv", 114); // 'r'
            this.hover_control = new AmvManipulator3d.HoverControl(this, "move::amv", this.widget); // triggers "hover:amv" on this.element
            this.fov_control = new AmvManipulator3d.FovControl(this, "wheel:shift-alt:amv");

            // this.element.on("hover:amv", (e :Event, object_indice :number[]) => console.log('hover', JSON.stringify(object_indice)));
        });
    }

    public camera_fov(fov?: number) :number {
        var camera = <THREE.PerspectiveCamera>this.camera;
        if (fov && fov < 175 && fov > 5) {
            camera.fov = fov;
            camera.updateProjectionMatrix();
        }
        return camera.fov;
    }

    private static s_help_text = '<p class="title">Help</p>\
                                <ul>\
                                  <li>Zoom - <span class="mouse-action">Shift-Wheel</span></li>\
                                  <li>Point size - <span class="mouse-action">Alt-Wheel</span></li>\
                                  <li>Rotate - <span class="mouse-action">MouseDrag</span></li>\
                                  <li>Pan - <span class="mouse-action">Shift-MouseDrag</span></li>\
                                  <li>Field of view - <span class="mouse-action">Shift-Alt-Wheel</span></li>\
                                  <li>Reset map - choose reset in the menu<br />(next to the Help button at the top right corner)</li>\
                                </ul>\
                                <p class="footer">Click to hide this popup.</p>';

    public help_text() :string {
        return Viewer.s_help_text;
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
        var camera = this.viewer.camera;
        var offset = this.size / 2.0;
        var eye = this.viewer.camera_looking_at.clone().sub(camera.position);
        var up = eye.clone().cross(camera.up).cross(eye).setLength(offset);

        this.grid.up.copy(up).normalize();

        this.grid.position.copy(this.viewer.camera_looking_at)
              .add(eye.clone().setLength(offset))
              .sub(up);

        var look_at = camera.position.clone()
              .sub(up)
              .add(up.clone().cross(eye).setLength(this.grid.position.distanceTo(camera.position)));
        this.grid.lookAt(look_at);
    }

    public reset() :void {
        if (this.lines) {
            this.grid.remove(this.lines)
        }
        this.size = Math.ceil(this.viewer.widget.objects.diameter() * 1.2);
        var lines_geometry = new THREE.Geometry();
        Grid.components.map((component_order) => this.add_vertice(component_order, lines_geometry));
        this.lines = new THREE.Line(lines_geometry, new THREE.LineBasicMaterial({color: 0x000000, opacity: 0.2, transparent: true}), THREE.LinePieces)
        this.grid.add(this.lines)
    }

    private add_vertice(component_order :number[], lines_geometry :THREE.Geometry) :void {
        for (var offset = 0; offset < this.size; ++offset) {
            var vertex = new THREE.Vector3();
            vertex.setComponent(component_order[1], offset);
            lines_geometry.vertices.push(vertex);
            vertex = vertex.clone();
            vertex.setComponent(component_order[0], this.size);
            lines_geometry.vertices.push(vertex);
        }
    }
}

// ----------------------------------------------------------------------

export class Objects extends AmvLevel1.Objects
{
     constructor(widget :AmvLevel1.MapWidgetLevel1, user_objects :AcmacsPlotData.PlotData) {
        super(widget);
        var styles = user_objects.make_styles(new ObjectFactory(user_objects.number_of_objects()));
        this.objects = user_objects.layout().map((elt, index) => styles[user_objects.style_no(index)].make(elt, {index: index}));
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
        this.material = THREE.MeshPhongMaterial;
        this.geometry_size = 0.2;
        this.ball_segments = 32;
    }

    // adds to this.geometries
    protected make_circle(outline_width :number = 1.0) :void {
        this.geometries["circle"] = new THREE.SphereGeometry(this.geometry_size / 2, this.ball_segments, this.ball_segments);
    }

    // adds to this.geometries
    protected make_box(outline_width :number = 1.0) :void {
        this.geometries["box"] = new THREE.BoxGeometry(this.geometry_size, this.geometry_size, this.geometry_size);
    }

    protected make_triangle(outline_width :number = 1.0) :void {
        this.geometries["triangle"] = new THREE.BoxGeometry(this.geometry_size, this.geometry_size, this.geometry_size);
    }
}

// ----------------------------------------------------------------------
