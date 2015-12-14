// -*- Typescript -*-

"use strict";

import TypingsReferences = require("build/typings-references");

import Amv = require("amv");
import AmvLevel1 = require("amv-level1");
import AmvManipulator = require("amv-manipulator");
import AmvManipulator3d = require("amv-manipulator-3d");

// ----------------------------------------------------------------------

type Color = AntigenicMapViewer.Color;
type Position = AntigenicMapViewer.Position;
type Manipulators = AntigenicMapViewer.Manipulators;
type Manipulator = AntigenicMapViewer.Manipulator;

// ----------------------------------------------------------------------

export class Viewer extends AmvLevel1.Viewer
{
    private ambient_light :THREE.AmbientLight;
    private point_light :THREE.PointLight;
    private grid :Grid;
    private controls :any = {}; // {string: AmvManipulator3d.Control}

    constructor(widget :AmvLevel1.Widget, private initial_distance :number = 10, private initial_fov :number = 75) {
        super(widget);
        this.camera = new THREE.PerspectiveCamera(this.initial_fov, 1.0, 0.1, 1000);
        widget.add_to_scene(this.camera);
        this.ambient_light = new THREE.AmbientLight(0x404040);
        widget.add_to_scene(this.ambient_light);
        this.point_light = new THREE.PointLight(0xFFFFFF, 1.0);
        this.point_light.position.set(-this.initial_distance, this.initial_distance, 0);
        this.camera.add(this.point_light);
        this.grid = new Grid(this);
        this.reset()
    }

    public reset() :void {
        super.reset();
        this.camera.position.set(0, 0, this.initial_distance);
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

    protected manipulator_implementation_module() :string {
        return "amv-manipulator-3d";
    }

    protected bind_manipulator(manipulator :Manipulator) :void {
    }

    // public bind_manipulators(manipulators :Manipulators) :void {
    //     $.when(Amv.require_deferred(['amv-manipulator', 'amv-manipulator-3d'])).done(() => {
    //         this.manipulator.make_event_generators(["move::amv", "drag::amv", "drag:shift:amv", "wheel:shift:amv", "wheel:alt:amv", "wheel:shift-alt:amv", "key::amv"]);

    //         // this.element.on("move::amv", (e :Event, a :any) => console.log('move::amv', JSON.stringify(a)));
    //         // this.element.on("drag::amv", (e :Event, a :any) => console.log('drag::amv', JSON.stringify(a)));
    //         // this.element.on("wheel:shift:amv", (e :Event, a :any) => console.log('wheel:shift:amv', JSON.stringify(a)));
    //         // this.element.on("wheel:alt:amv", (e :Event, a :any) => console.log('wheel:alt:amv', JSON.stringify(a)));
    //         // this.element.on("key::amv", (e :Event, a :AmvManipulator.Keypress) => console.log('key::amv', JSON.stringify(a)));

    //         this.orbit_control = new AmvManipulator3d.OrbitControl(this, "drag::amv");
    //         this.zoom_control = new AmvManipulator3d.ZoomControl(this, "wheel:shift:amv");
    //         this.scale_control = new AmvManipulator3d.ScaleControl(this, "wheel:alt:amv");
    //         this.pan_control = new AmvManipulator3d.PanControl(this, "drag:shift:amv");
    //         this.reset_control = new AmvManipulator3d.ResetControl(this, "key::amv", 114); // 'r'
    //         this.hover_control = new AmvManipulator3d.HoverControl(this, "move::amv"); // triggers "hover:amv" on this.element
    //         this.fov_control = new AmvManipulator3d.FovControl(this, "wheel:shift-alt:amv");

    //         // this.element.on("hover:amv", (e :Event, objects :THREE.Object3D[]) => console.log('hover', JSON.stringify(objects)));
    //     });
    // }

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
                                  <li>Zoom - <span class="mouse-action">${zoom-trigger}</span></li>\
                                  <li>Point size - <span class="mouse-action">${scale-trigger}</span></li>\
                                  <li>Rotate - <span class="mouse-action">${rotate-trigger}</span></li>\
                                  <li>Pan - <span class="mouse-action">${pan-trigger}</span></li>\
                                  <li>Field of view - <span class="mouse-action">${fov-trigger}</span></li>\
                                  <li>Reset map - choose reset in the menu<br />(next to the Help button at the top right corner)</li>\
                                </ul>\
                                <p class="footer">Click to hide this popup.</p>';

    public help_text() :string {
        var r = Viewer.s_help_text;
        ["rotate scale zoom pan fov"].forEach(function(n) {
            r = r.replace("${" + n + "-trigger}", this.controls[n].trigger_description());
        });
        return r;
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
        this.viewer.widget.add_to_scene(this.grid);
        this.size = 0;          // slimerjs gives warning on undefined this.size in position()
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
        this.size = 10; // Math.ceil(this.viewer.widget.objects.diameter() * 3.0);
        var lines_geometry = new THREE.Geometry();
        Grid.components.map((component_order) => this.add_vertice(component_order, lines_geometry));
        this.lines = new THREE.LineSegments(lines_geometry, new THREE.LineBasicMaterial({color: 0x000000, opacity: 0.2, transparent: true}))
        this.grid.add(this.lines)
    }

    private add_vertice(component_order :number[], lines_geometry :THREE.Geometry) :void {
        for (var offset = 0; offset <= this.size; ++offset) {
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

export class MapElement extends AmvLevel1.MapElement
{
    private _for_intersect : THREE.Object3D;

    public set_position(position :Position) :void {
        if (position !== undefined && position !== null) {
            this.position.set(position[0], position[1], position[2]);
        }
    }

    public set_rotation(rotation :number) :number {
        if (rotation !== undefined && rotation !== null) {
            this.rotation.z = rotation;
        }
        return this.rotation.z;
    }

    public min_max_position(point_min :THREE.Vector3, point_max: THREE.Vector3) :void {
        point_max.max(this.position);
        point_min.min(this.position);
    }

    public view_flip() :void {
        console.warn('MapElement.view_flip: cannot flip in 3d');
    }

    public view_rotated(quaternion :THREE.Quaternion) :void {
    }

    public resolution_changed_scale(scale :number) :void {
    }

    public for_intersect() :THREE.Object3D {
        return this._for_intersect;
    }
}

// ----------------------------------------------------------------------

export class MapElements extends AmvLevel1.MapElements
{
    public resolution_changed(pixels_per_unit :number, widget :AmvLevel1.Widget) :void {
        console.warn('MapElements.resolution_changed: NA in 3d');
    }
}

// ----------------------------------------------------------------------

export class Factory extends AmvLevel1.Factory
{
    public circle(fill_color :Color, outline_color :Color, outline_width :number) :MapElement
    {
        throw "not implemented";
    }

    public box(fill_color :Color, outline_color :Color, outline_width :number) :MapElement
    {
        throw "not implemented";
    }

    public triangle(fill_color :Color, outline_color :Color, outline_width :number) :MapElement
    {
        throw "not implemented";
    }

    public line(p :Position, color :Color, width :number) :MapElement
    {
        throw "not implemented";
    }

    public arrow(other_end :Position, color :Color, width :number, arrow_length :number) :MapElement
    {
        throw "not implemented";
    }
}

// ----------------------------------------------------------------------

// export class Object extends AmvLevel1.Object
// {
// }

// // ----------------------------------------------------------------------

// export class Objects extends AmvLevel1.Objects
// {
//     constructor(widget :AmvLevel1.Widget) {
//         super(widget);
//     }

//     public number_of_dimensions() :number {
//         return 3;
//     }

//     public object_factory(number_of_objects? :number) :AmvLevel1.ObjectFactory {
//         if (!this._object_factory) {
//             this._object_factory = new ObjectFactory(number_of_objects);
//         }
//         return super.object_factory(number_of_objects);
//     }
// }

// // ----------------------------------------------------------------------

// export class ObjectFactory extends AmvLevel1.ObjectFactory
// {
//     private geometry_size :number;
//     private ball_segments :number; // depends on the number of objects

//     constructor(number_of_objects :number) {
//         super();
//         this.material = THREE.MeshPhongMaterial;
//         this.geometry_size = 1.0;
//         this.ball_segments = 32;
//     }

//     public make_object() :Object {
//         return new Object();
//     }

//     // adds to this.geometries
//     protected make_circle() :void {
//         this.geometries["circle"] = this.geometries["sphere"] = new THREE.SphereGeometry(this.geometry_size / 2, this.ball_segments, this.ball_segments);
//     }

//     // adds to this.geometries
//     protected make_box() :void {
//         this.geometries["box"] = this.geometries["cube"] = new THREE.BoxGeometry(this.geometry_size, this.geometry_size, this.geometry_size);
//     }

//     protected make_triangle() :void {
//         this.geometries["triangle"] = new THREE.BoxGeometry(this.geometry_size, this.geometry_size, this.geometry_size);
//     }

//     protected convert_color(source :any) :THREE.MeshBasicMaterialParameters {
//         var material_color = super.convert_color(source);
//         // console.log('material_color', JSON.stringify(material_color));
//         if (material_color.transparent && material_color.opacity === 0) {
//             // show fully transparent objects (reference antigens and sera) in 3d as semi-transparent
//             material_color.opacity = 0.7;
//         }
//         return material_color;
//     }
// }

// ----------------------------------------------------------------------
