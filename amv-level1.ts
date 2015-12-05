"use strict";

// ----------------------------------------------------------------------
// Level 1 (the most inner) map widget
// ----------------------------------------------------------------------

import TypingsReferences = require("build/typings-references");
import Amv = require("amv");
import Amv3d = require("amv-3d");
import Amv2d = require("amv-2d");
import AmvManipulator = require("amv-manipulator");

// ----------------------------------------------------------------------

type Color = AntigenicMapViewer.Color;
type Position = AntigenicMapViewer.Position;
type Manipulators = AntigenicMapViewer.Manipulators;
type Manipulator = AntigenicMapViewer.Manipulator;
type MapElementId = AntigenicMapViewer.MapElementId;
type MapElementAttributes = AntigenicMapViewer.MapElementAttributes;
type MapElementLineAttributes = AntigenicMapViewer.MapElementLineAttributes;
type MapElementArrowAttributes = AntigenicMapViewer.MapElementArrowAttributes;

// ----------------------------------------------------------------------

export class MapWidgetLevel1 implements AntigenicMapViewer.TriggeringEvent
{
    public viewer :Viewer;
    public factory :Factory;
    private map_elements :MapElements;
    public scene :THREE.Scene;

    private renderer :THREE.WebGLRenderer;
    private _size :number; // canvas size
    private event_handlers :JQuery[] = [];

    private viewer_created :JQueryDeferred<{}> = $.Deferred();
    // public objects_created :JQueryDeferred<{}> = $.Deferred();
    public initialization_completed :JQueryDeferred<{}> = $.Deferred();

    constructor(container :JQuery, size :number, number_of_dimensions :number) {
        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer({antialias: true, preserveDrawingBuffer: true, alpha: true}) // , precision: "highp"
        this.size(size)
        this.renderer.setClearColor(0xFFFFFF)
        container.append(this.renderer.domElement)
        this.initialize_for_dimensions(number_of_dimensions);
        this.map_elements = new MapElements();
    }

    public destroy() :void {
        this.event_handlers.forEach((eh) => eh.off());
        // this.objects && this.objects.destroy();
    }

    private initialize_for_dimensions(number_of_dimensions :number) :void {
        var amv_loaded = Amv.require_deferred([number_of_dimensions === 2 ? 'amv-2d' : 'amv-3d']);
        $.when(amv_loaded).done((Amv :typeof Amv3d) => {
            this.viewer = new Amv.Viewer(this);
            this.factory = new Amv.Factory();
            this.viewer_created.resolve();
            // this.objects = new Amv.Objects(this);
        });
    }

    // ----------------------------------------------------------------------

    public add_circle(attrs: MapElementAttributes) :MapElementId {
        return this.add_map_element(this.factory.circle(attrs.fill_color || "transparent", attrs.outline_color || "black", attrs.outline_width || 1), attrs);
    }

    public add_box(attrs: MapElementAttributes) :MapElementId {
        return this.add_map_element(this.factory.box(attrs.fill_color || "transparent", attrs.outline_color || "black", attrs.outline_width || 1), attrs);
    }

    public add_triangle(attrs: MapElementAttributes) :MapElementId {
        return this.add_map_element(this.factory.triangle(attrs.fill_color || "transparent", attrs.outline_color || "black", attrs.outline_width || 1), attrs);
    }

    private add_map_element(map_element :MapElement, attrs :MapElementAttributes) :MapElementId {
        map_element.set_attributes(attrs.position, attrs.size || 1, attrs.aspect || 1, attrs.rotation || 0);
        // perhaps keep a list of map elements of this kind (or list of ids?)
        this.add_to_scene(map_element);
        this.map_elements.add(map_element);
        return map_element.id;
    }

    public add_line(attrs: MapElementLineAttributes) :MapElementId {
        var map_element = this.factory.line([attrs.position[1][0] - attrs.position[0][0], attrs.position[1][1] - attrs.position[0][1], attrs.position[1][2] - attrs.position[0][2]], attrs.color || "black", attrs.width || 1);
        map_element.set_position(attrs.position[0]);
        this.add_to_scene(map_element);
        this.map_elements.add(map_element);
        return map_element.id;
    }

    public add_arrow(attrs: MapElementArrowAttributes) :MapElementId {
        var map_element = this.factory.arrow([attrs.position[1][0] - attrs.position[0][0], attrs.position[1][1] - attrs.position[0][1], attrs.position[1][2] - attrs.position[0][2]], attrs.color || "black", attrs.width || 1, attrs.arrow_length || 1);
        map_element.set_position(attrs.position[0]);
        this.add_to_scene(map_element);
        this.map_elements.add(map_element);
        return map_element.id;
    }

    public find_map_element(map_element_id :MapElementId) :MapElement {
        return <MapElement>this.scene.getObjectById(map_element_id);
    }

    public map_elements_flip(flip? :boolean) :boolean {
        if (flip !== undefined && flip !== null) {
            this.map_elements.flip(flip);
        }
        return this.map_elements.flip();
    }

    // ----------------------------------------------------------------------

    public render() :void {
        var rendering_count = 0;
        var really_render = () => {
            requestAnimationFrame(() => really_render());
            this.renderer.render(this.scene, this.viewer.camera);
            if (++rendering_count === 3) {
                console.log('map widget rendered'); // DO NOT REMOVE!!: message for slimerjs to generate PNG
                this.initialization_completed.resolve();
            }
        };
        $.when(this.viewer_created).done(really_render);
    }

    public bind_manipulators(manipulators :Manipulators) :void {
        $.when(this.viewer_created).done(() => this.viewer.bind_manipulators(manipulators));
    }

    public on(event :string, callback: (data :any) => void) :JQuery {
        $.when(this.viewer_created).done(() => {
            // this.event_handlers.push(this.viewer.on(event, callback));
        });
        return $();
    }

    public trigger(event :string, data :any) :void {
        $.when(this.viewer_created).done(() => {
            // this.viewer.trigger(event, data);
        });
    }

    // public reset_objects() :void {
    //     if (this.objects) {
    //         this.objects.reset();
    //     }
    // }

    // public reorient_objects() :void {
    //     if (this.objects) {
    //         this.objects.reorient();
    //     }
    // }

    // in pixels
    public size(size? :number) :number {
        // console.log('widget size', size, this._size);
        if (size !== undefined && size !== null) {
            this._size = size;
            this.renderer.setSize(size, size);
            this.trigger("widget-resized:amv", size);
        }
        return this._size;
    }

    public add_to_scene(obj :THREE.Object3D) :void {
        this.scene.add(obj);
    }

    public domElement() :HTMLCanvasElement {
        return this.renderer.domElement;
    }

    // public help_text() :string {
    //     return this.viewer.help_text();
    // }
}

// ----------------------------------------------------------------------

export abstract class Viewer implements AntigenicMapViewer.TriggeringEvent
{
    public static const_vector3_zero = new THREE.Vector3();

    public camera :THREE.Camera;
    public camera_looking_at :THREE.Vector3;
    public manipulator :AmvManipulator.Manipulator;

    protected element :JQuery;

    constructor(public widget :MapWidgetLevel1) {
        this.element = $(widget.domElement());
        this.on("reset:amv", () => this.reset());
    }

    public abstract reset() :void;

    public bind_manipulators(manipulators :Manipulators) :void {
        $.when(Amv.require_deferred(['amv-manipulator', this.manipulator_implementation_module()])).done(() => {
            if (typeof manipulators === "string") {
                if (manipulators === "all") {
                    manipulators = Amv.AllManipulators;
                }
                else {
                    throw `Unrecognized manipulators value: ${manipulators}`;
                }
            }
            if (typeof manipulators === "object") {
                if (!this.manipulator) {
                    this.manipulator = new AmvManipulator.Manipulator(this.element);
                }
                manipulators.forEach((m :Manipulator) => this.bind_manipulator(m));
            }
            else {
                throw `Unrecognized manipulators value: ${manipulators} (type: ${typeof manipulators})`;
            }
        });
    }

    protected abstract manipulator_implementation_module() :string;

    protected abstract bind_manipulator(manipulator :Manipulator) :void;

    public on(event :string, callback: (data :any) => void) :JQuery {
        return this.element.on(event, (e :Event, data :any) => callback(data));
    }

    public trigger(event :string, data :any) :void {
        this.element.trigger(event, data);
    }

    public objects_updated() :void {
        // this.widget.objects_created.resolve();
    }

    public camera_update() :void {
        if (this.camera_looking_at !== null && this.camera_looking_at !== undefined) {
            this.camera.lookAt(this.camera_looking_at);
        }
    }

    public camera_look_at(lookAt :THREE.Vector3) :void {
        this.camera_looking_at = lookAt.clone();
        this.camera.lookAt(this.camera_looking_at);
    }

    public width() :number {
        return this.element.width();
    }

    public height() :number {
        return this.element.height();
    }

//     public trigger_on_element(event :string, args :any[]) :void {
//         this.element.trigger(event, args);
//     }

    public abstract help_text() :string;

}

// ----------------------------------------------------------------------

export abstract class MapElement extends THREE.Object3D
{
    constructor(content :THREE.Object3D[]) {
        super();
        content.forEach((e) => this.add(e));
    }

    public set_attributes(position :Position, size :number, aspect :number, rotation :number) :void {
        this.set_position(position);
        this.set_scale(size);
        this.aspect(aspect);
        this.set_rotation(rotation);
    }

    public abstract set_position(position :Position) :void;
    public abstract set_rotation(rotation :number) :number;

    public set_scale(size :number) :number {
        // scale.x and scale.z are affected by aspect
        if (size !== undefined && size !== null) {
            this.rescale(size / this.scale.y);
        }
        return this.scale.y;
    }

    public rescale(scale :number) :void {
        this.scale.multiplyScalar(scale);
    }

    public aspect(aspect :number) :number {
        // scale.x and scale.z are affected by aspect
        if (aspect !== undefined && aspect !== null) {
            this.scale.x = this.scale.y * aspect;
            this.scale.z = this.scale.z * aspect;
        }
        return this.scale.x / this.scale.y;
    }

    public abstract min_max_position(point_min :THREE.Vector3, point_max: THREE.Vector3) :void;
    public abstract view_flip() :void;
}

// ----------------------------------------------------------------------

export class MapElements
{
    private elements :MapElement[] = [];

    private _flip :boolean = false;
    private _center :THREE.Vector3;
    private _diameter :number;

    public add(map_element :MapElement) :void {
        this.elements.push(map_element);
    }

    public flip(flip? :boolean) :boolean {
        if (flip !== undefined && flip !== null && flip !== this._flip) {
            this.do_flip();
        }
        return this._flip;
    }

    public do_flip() :void {
        this._flip = !this._flip;
        this.elements.map(o => o.view_flip());
    }

    public center(center? :THREE.Vector3|number[]) :THREE.Vector3 {
        if (center !== undefined && center !== null) {
            if (center instanceof THREE.Vector3) {
                this._center = center.clone();
            }
            else {
                this._center = (new THREE.Vector3()).fromArray(<number[]>center);
            }
        }
        else if (!this._center) {
            this.calculate_bounding_sphere();
        }
        return this._center;
    }

    private calculate_bounding_sphere() :void {
        var point_max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
        var point_min = new THREE.Vector3(Infinity, Infinity, Infinity);
        this.elements.forEach(function (obj :MapElement) { obj.min_max_position(point_min, point_max); });
        this._center = (new THREE.Vector3()).addVectors(point_min, point_max).divideScalar(2);
        this._diameter = (new THREE.Vector3()).subVectors(point_min, point_max).length();
    }

}

// ----------------------------------------------------------------------

export abstract class Factory
{
    public abstract circle(fill_color :Color, outline_color :Color, outline_width :number) :MapElement;
    public abstract box(fill_color :Color, outline_color :Color, outline_width :number) :MapElement;
    public abstract triangle(fill_color :Color, outline_color :Color, outline_width :number) :MapElement;
    public abstract line(other_end :Position, color :Color, width :number) :MapElement;
    public abstract arrow(other_end :Position, color :Color, width :number, arrow_length :number) :MapElement;

    protected static convert_color(source :Color) :THREE.MeshBasicMaterialParameters {
        var material_color :THREE.MeshBasicMaterialParameters;
        if (typeof source === "string") {
            if (source === "transparent") {
                material_color = {transparent: true, opacity: 0};
            }
            else {
                material_color = {transparent: false, color: (new THREE.Color(source)).getHex(), opacity: 1};
            }
        }
        else if (typeof source === "array") {
            material_color = {transparent: true, opacity: source[1], color: (new THREE.Color(source[0])).getHex()};
        }
        else if (typeof source === "number") {
            material_color = {transparent: false, color: (new THREE.Color(source)).getHex(), opacity: 1};
        }
        // console.log('convert_color', JSON.stringify(material_color));
        return material_color;
    }
}

// ----------------------------------------------------------------------

// export interface ObjectUserData
// {
//     index :number;
//     names :{
//         full :string;
//         short :string;
//         abbreviated :string;
//         date? :string;
//         passage? :string;
//         serum_id? :string;
//         country? :string;
//         continent? :string;
//     };
//     state :{
//         display_name? :string;
//         name_shown :boolean;
//     };
// }

// // ----------------------------------------------------------------------

// export class Object extends THREE.Object3D
// {
//     public body :THREE.Mesh;
//     public outline :THREE.Object3D;

//     public destroy() {
//     }

//     public set_body(body :THREE.Mesh, outline :THREE.Object3D) :void {
//         // if (this.body) {
//         //     this.remove(this.body);
//         // }
//         this.body = body;
//         this.add(this.body);
//         // if (this.outline) {
//         //     this.body.remove(this.outline);
//         // }
//         this.outline = outline;
//         if (this.outline) {
//             this.body.add(this.outline);
//         }
//     }

//     public rescale(object_factor :number, viewer :Viewer) :void {
//         this.body.scale.multiplyScalar(object_factor);
//     }

//     public set_scale(object_scale :number) :void {
//         this.scale.set(object_scale, object_scale, object_scale);
//     }

//     public shape() :string {
//         var geometry = <THREE.Geometry>this.body.geometry;
//         var shape = ((geometry && geometry.type) || "circle").toLowerCase().replace('geometry', '');
//         if (shape === "shape") {
//             // 2d box or triangle
//             if (geometry.vertices) {
//                 if (geometry.vertices.length === 3)
//                     shape = "triangle";
//                 else
//                     shape = "box";
//             }
//         }
//         return shape;
//     }

//     public user_data(user_data? :any) :any {
//         if (user_data !== undefined) {
//             this.userData = user_data;
//         }
//         return this.userData;
//     }
// }

// // ----------------------------------------------------------------------

// export class Objects
// {
//     public objects :Object[];

//     private _center :THREE.Vector3;
//     private _diameter :number;
//     protected _object_scale :number;     // keep current scale to be able to reset

//     protected _object_factory :ObjectFactory;

//     constructor(protected widget :MapWidgetLevel1) {
//         this.objects = [];
//         this._object_scale = 1.0;
//     }

//     public destroy() {
//         this.objects.forEach((o) => o.destroy());
//     }

//     public bodies() :THREE.Object3D[] {
//         return this.objects.map((obj) => obj.body);
//     }

//     public reset() :void {
//         if (this._object_scale !== 1.0) {
//             this.object_scale(1.0 / this._object_scale);
//         }
//     }

//     // 2d
//     public reorient() :void {
//     }

//     public diameter(diameter? :number) :number {
//         if (diameter !== undefined && diameter !== null) {
//             this._diameter = diameter;
//         }
//         else if (this._diameter === undefined || this._diameter === null) {
//             this.calculate_bounding_sphere();
//         }
//         return this._diameter;
//     }

//     public center(center? :THREE.Vector3|number[]) :THREE.Vector3 {
//         if (center !== undefined && center !== null) {
//             if (center instanceof THREE.Vector3) {
//                 this._center = center.clone();
//             }
//             else {
//                 this._center = (new THREE.Vector3()).fromArray(<number[]>center);
//             }
//         }
//         else if (this._center === undefined || this._center === null) {
//             this.calculate_bounding_sphere();
//         }
//         return this._center;
//     }

//     public object_scale(factor :number) :void {
//         var new_scale = this._object_scale * factor;
//         var scale_limits = this.scale_limits();
//         if (new_scale >= scale_limits.min && new_scale <= scale_limits.max) {
//             this._object_scale = new_scale;
//             this.objects.map(o => o.rescale(factor, this.widget.viewer));
//         }
//     }

//     public user_data(index :number) :any {
//         return this.objects[index].user_data();
//     }

//     protected scale_limits() :{min :number, max :number} {
//         return {min: 0.01, max: 100};
//     }

//     public number_of_dimensions() :number {
//         return 0;               // override in derived
//     }

// }

// // ----------------------------------------------------------------------

// export interface MaterialClass
// {
//     new (parameters: THREE.MeshBasicMaterialParameters): THREE.Material;
// }

// // ----------------------------------------------------------------------

// export class ObjectFactory
// {
//     protected material :any; // MaterialClass;
//     protected geometries :any;  // "shape-[-outline-<outline_width>]": THREE.Geometry

//     constructor() {
//         this.geometries = {};
//     }

//     public make_object() :Object { // override in derived
//         return null;
//     }

//     public make_mesh(aspect :number, shape :string, fill_color :any) :THREE.Mesh {
//         var mesh = new THREE.Mesh(this.make_geometry(shape), this.make_material(fill_color));
//         if (aspect !== 1 && aspect !== undefined && aspect !== null) {
//             mesh.scale.set(aspect, 1, aspect);
//         }
//         return mesh;
//     }

//     public make_outline(shape :string, outline_width :number, outline_color :any) :THREE.Object3D {
//         return null;
//     }

//     private make_geometry(shape :string) :THREE.Geometry {
//         var geometry = this.geometries[shape];
//         if (!geometry) {
//             switch (shape) {
//             case "box":
//             case "cube":
//                 this.make_box();
//                 break;
//             case "circle":
//             case "sphere":
//                 this.make_circle();
//                 break;
//             case "triangle":
//                 this.make_triangle();
//                 break;
//             }
//             geometry = this.geometries[shape];
//         }
//         return geometry;
//     }

//     private make_material(fill_color :any) :THREE.Material {
//         return new this.material(this.convert_color(fill_color));
//     }

//     // adds to this.geometries
//     protected make_circle() :void {
//         // throw "Override in derived";
//     }

//     // adds to this.geometries
//     protected make_box() :void {
//         // throw "Override in derived";
//     }

//     protected make_triangle() :void {
//         // throw "Override in derived";
//     }

//     public static convert_color(source :any) :THREE.MeshBasicMaterialParameters {
//         var material_color :THREE.MeshBasicMaterialParameters;
//         if ($.type(source) === "string") {
//             if (source === "transparent") {
//                 material_color = {transparent: true, opacity: 0};
//             }
//             else {
//                 material_color = {transparent: false, color: (new THREE.Color(source)).getHex(), opacity: 1};
//             }
//         }
//         else if ($.type(source) === "array") {
//             material_color = {transparent: true, opacity: source[1], color: (new THREE.Color(source[0])).getHex()};
//         }
//         else if ($.type(source) === "number") {
//             material_color = {transparent: false, color: (new THREE.Color(source)).getHex(), opacity: 1};
//         }
//         // console.log('convert_color', JSON.stringify(material_color));
//         return material_color;
//     }

//     protected convert_color(source :any) :THREE.MeshBasicMaterialParameters {
//         return ObjectFactory.convert_color(source);
//     }
// }

// ----------------------------------------------------------------------
