/// <reference path="build/jquery" />
/// <reference path="build/three" />

/// <reference path="antigenic-map-viewer.d.ts" />

// ----------------------------------------------------------------------
// Level 1 (the most inner) map widget
// ----------------------------------------------------------------------

"use strict";

import AmvUtils = require("amv-utils");
import Amv3d = require("amv-3d");
import AmvManipulator = require("amv-manipulator");

// ----------------------------------------------------------------------

export class MapWidgetLevel1 implements AntigenicMapViewer.TriggeringEvent
{
    // public initialization_completed :JQueryPromise<any>;

    public viewer :Viewer;
    public objects :Objects;
    public scene :THREE.Scene;

    private renderer :THREE.WebGLRenderer;
    private _size :number; // canvas size
    private event_handlers :JQuery[];

    private viewer_created :JQueryDeferred<{}> = $.Deferred();
    public objects_created :JQueryDeferred<{}> = $.Deferred();
    public initialization_completed :JQueryDeferred<{}> = $.Deferred();

    constructor(container :JQuery, size :number) {
        this.scene = new THREE.Scene();
        (<any>window).scene = this.scene;
        this.renderer = new THREE.WebGLRenderer({antialias: true, preserveDrawingBuffer: true, alpha: true}) // , precision: "highp"
        this.size(size)
        this.renderer.setClearColor(0xFFFFFF)
        container.append(this.renderer.domElement)
        this.event_handlers = [];
    }

    public destroy() :void {
        for (var i = 0; i < this.event_handlers.length; ++i) {
            this.event_handlers[i].off();
        }
    }

    public initialize_for_dimensions(number_of_dimensions :number) :JQueryPromise<any> {
        var amv_loaded = AmvUtils.require_deferred(['amv-' + number_of_dimensions + 'd']);
        $.when(amv_loaded).done((Amv :typeof Amv3d) => {
            this.viewer = new Amv.Viewer(this);
            this.viewer_created.resolve();
            this.objects = new Amv.Objects(this);
        });
        return amv_loaded;
    }

    public object_factory(number_of_objects? :number) :ObjectFactory {
        return this.objects && this.objects.object_factory(number_of_objects);
    }

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

    public bind_manipulators() :void {
        $.when(this.viewer_created).done(() => { this.viewer.bind_manipulators(this) });
    }

    public on(event :string, callback: (data :any) => void) :JQuery {
        $.when(this.viewer_created).done(() => {
            this.event_handlers.push(this.viewer.on(event, callback));
        });
        return $();
    }

    public trigger(event :string, data :any) :void {
        $.when(this.viewer_created).done(() => {
            this.viewer.trigger(event, data);
        });
    }

    public reset_objects() :void {
        if (this.objects) {
            this.objects.reset();
        }
    }

    public reorient_objects() :void {
        if (this.objects) {
            this.objects.reorient();
        }
    }

    // in pixels
    public size(size? :number) :number {
        if (size !== undefined && size !== null) {
            this._size = size;
            this.renderer.setSize(size, size);
            this.trigger("widget-resized:amv", size);
        }
        return this._size;
    }

    public add(obj :THREE.Object3D) :void {
        this.scene.add(obj);
    }

    public domElement() :Element {
        return this.renderer.domElement;
    }

    public help_text() :string {
        return this.viewer.help_text();
    }

    // --------------------------------------------------
    // showing/hiding object names

    public show_object_labels(show :boolean, list :string|number[], name_type :string = "full") :void {
        // list: "all", [indices]
        $.when(this.objects_created).done(() => {
            if (this.objects.number_of_dimensions() === 2) {
                var indices = this._elicit_indices(list);
                indices.forEach((index) => {
                    var obj = this.objects.objects[index];
                    if (obj) {
                        if (show) {
                            var label = obj.label_show(show);
                            label.set_size();
                            var text = (obj.userData.names && (obj.userData.names[name_type] || obj.userData.names.full)) || ('' + obj.userData.index);
                            // obj.label_color("blue");
                            label.set_text(text);
                            obj.label_adjust_position();
                        }
                    }
                    else {
                        console.warn('cannot show/hide name: invalid object index', index);
                    }
                });
            }
            else {
                console.warn('showing names in 3D is not supported');
            }
        });
    }

    private _elicit_indices(list :string|number[]) :number[] {
        var indices :number[] = [];
        if (typeof list === "string") {
            if (list === "all") {
                for (var i = 0; i < this.objects.objects.length; ++i) {
                    indices.push(i);
                }
            }
            else {
                console.warn("unrecognized show_object_labels list argument value", list);
            }
        }
        else {
            indices = <number[]>list;
        }
        return indices;
    }

}

// ----------------------------------------------------------------------

export class Viewer implements AntigenicMapViewer.TriggeringEvent
{
    public static const_vector3_zero = new THREE.Vector3();

    public camera :THREE.Camera;
    public camera_looking_at :THREE.Vector3;
    public manipulator :AmvManipulator.Manipulator;

    protected element :JQuery;

    constructor(public widget :MapWidgetLevel1) {
        this.element = $(widget.domElement());
        $.when(AmvUtils.require_deferred(['amv-manipulator'])).done(() => {
            this.manipulator = new AmvManipulator.Manipulator(this.element);
        });
        this.on("reset:amv", () => this.reset());
    }

    public reset() :void {
    }

    public bind_manipulators(widget :MapWidgetLevel1) :void {
    }

    public on(event :string, callback: (data :any) => void) :JQuery {
        return this.element.on(event, (e :Event, data :any) => callback(data));
    }

    public trigger(event :string, data :any) :void {
        this.element.trigger(event, data);
    }

    public objects_updated() :void {
        this.widget.objects_created.resolve();
    }

    public camera_update() :void {
        this.camera.lookAt(this.camera_looking_at);
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

    public trigger_on_element(event :string, args :any[]) :void {
        this.element.trigger(event, args);
    }

    public help_text() :string {
        throw "override in derived";
    }
}

// ----------------------------------------------------------------------

export interface ObjectUserData
{
    index :number;
    names :{
        full :string;
        short :string;
        abbreviated :string;
        date? :string;
        passage? :string;
        serum_id? :string;
        country? :string;
        continent? :string;
    };
    state :{
        display_name? :string;
        name_shown :boolean;
    };
}

// ----------------------------------------------------------------------

export interface ObjectLabel
{
    show: (show :boolean) => void;
    set_scale: (scale :number) => void;
    set_text: (text :string) => void;
    set_size: (size? :number) => void;
    set_color: (color :number|string) => void;
    set_position: (object_position :THREE.Vector3, object_scale :THREE.Vector3, body_size :THREE.Vector3) => void;
}

// ----------------------------------------------------------------------

export class Object extends THREE.Object3D
{
    public body :THREE.Mesh;
    public outline :THREE.Object3D;
    public label :ObjectLabel;

    public set_body(body :THREE.Mesh, outline :THREE.Object3D) :void {
        // if (this.body) {
        //     this.remove(this.body);
        // }
        this.body = body;
        this.add(this.body);
        // if (this.outline) {
        //     this.body.remove(this.outline);
        // }
        this.outline = outline;
        if (this.outline) {
            this.body.add(this.outline);
        }
    }

    public label_show(show :boolean) :ObjectLabel { return null; }
    public label_adjust_position() :void {}

    public rescale(object_factor :number, label_factor :number, viewer :Viewer) :void {
        this.body.scale.multiplyScalar(object_factor);
        if (this.label) {
            this.label.set_scale(label_factor);
            this.label_adjust_position();
        }
    }

    public set_scale(object_scale :number, viewer :Viewer) :void {
        this.scale.set(object_scale, object_scale, object_scale);
        if (this.label) {
        //     var ls = label_scale / object_scale;
        //     // this.label.scale.set(ls, ls, 1);
            this.label_adjust_position();
        }
    }

    public shape() :string {
        var shape = ((this.body.geometry && this.body.geometry.type) || "circle").toLowerCase().replace('geometry', '');
        if (shape === "shape") {
            // 2d box or triangle
            if (this.body.geometry.vertices) {
                if (this.body.geometry.vertices.length === 3)
                    shape = "triangle";
                else
                    shape = "box";
            }
        }
        return shape;
    }

    public user_data(user_data? :any) :any {
        if (user_data !== undefined) {
            this.userData = user_data;
        }
        return this.userData;
    }
}

// ----------------------------------------------------------------------

export class Objects
{
    public objects :Object[];

    private _center :THREE.Vector3;
    private _diameter :number;
    protected _object_scale :number;     // keep current scale to be able to reset
    protected _label_scale :number;      // keep current scale to be able to reset

    protected _object_factory :ObjectFactory;

    constructor(protected widget :MapWidgetLevel1) {
        this.objects = [];
        this._object_scale = 1.0;
        this._label_scale = 1.0;
    }

    public bodies() :THREE.Object3D[] {
        return this.objects.map((obj) => obj.body);
    }

    public reset() :void {
        if (this._object_scale !== 1.0) {
            this.object_scale(1.0 / this._object_scale);
        }
    }

    // 2d
    public reorient() :void {
    }

    public diameter(diameter? :number) :number {
        if (diameter !== undefined && diameter !== null) {
            this._diameter = diameter;
        }
        else if (this._diameter === undefined || this._diameter === null) {
            this.calculate_bounding_sphere();
        }
        return this._diameter;
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
        else if (this._center === undefined || this._center === null) {
            this.calculate_bounding_sphere();
        }
        return this._center;
    }

    public object_scale(factor :number) :void {
        var new_scale = this._object_scale * factor;
        var scale_limits = this.scale_limits();
        if (new_scale >= scale_limits.min && new_scale <= scale_limits.max) {
            this._object_scale = new_scale;
            this.objects.map(o => o.rescale(factor, 1, this.widget.viewer));
        }
    }

    public label_scale(factor :number) :void {
        this.objects.map(o => { if (o.label) { o.label.set_scale(factor); o.label_adjust_position(); } });
    }

    public user_data(index :number) :any {
        return this.objects[index].user_data();
    }

    protected scale_limits() :{min :number, max :number} {
        return {min: 0.01, max: 100};
    }

    private calculate_bounding_sphere() :void {
        // var geometry = new THREE.Geometry();
        // geometry.vertices = this.objects.map((obj) => obj.position());
        // geometry.computeBoundingSphere();
        // this._diameter = geometry.boundingSphere.radius * 2;
        // this._center = (<any>geometry.boundingSphere).center;
        // console.log('calculate_bounding_sphere1', JSON.stringify(this._center), this._diameter);

        var point_max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
        var point_min = new THREE.Vector3(Infinity, Infinity, Infinity);
        this.objects.forEach((obj) => { var pos = obj.position; point_max.max(pos); point_min.min(pos); });
        this._center = (new THREE.Vector3()).addVectors(point_min, point_max).divideScalar(2);
        this._diameter = (new THREE.Vector3()).subVectors(point_min, point_max).length();
        // console.log('calculate_bounding_sphere2', JSON.stringify(this._center), this._diameter);
    }

    public number_of_dimensions() :number {
        return 0;               // override in derived
    }

    public object_factory(number_of_objects? :number) :ObjectFactory { // override in derived
        return this._object_factory;
    }
}

// ----------------------------------------------------------------------

export interface MaterialClass
{
    new (parameters: THREE.MeshBasicMaterialParameters): THREE.Material;
}

// ----------------------------------------------------------------------

export class ObjectFactory
{
    protected material :MaterialClass;
    protected geometries :any;  // "shape-[-outline-<outline_width>]": THREE.Geometry

    constructor() {
        this.geometries = {};
    }

    public make_object() :Object { // override in derived
        return null;
    }

    public make_mesh(aspect :number, shape :string, fill_color :any) :THREE.Mesh {
        var mesh = new THREE.Mesh(this.make_geometry(shape), this.make_material(fill_color));
        if (aspect !== 1 && aspect !== undefined && aspect !== null) {
            mesh.scale.set(aspect, 1, aspect);
        }
        return mesh;
    }

    public make_outline(shape :string, outline_width :number, outline_color :any) :THREE.Object3D {
        return null;
    }

    private make_geometry(shape :string) :THREE.Geometry {
        var geometry = this.geometries[shape];
        if (!geometry) {
            switch (shape) {
            case "box":
            case "cube":
                this.make_box();
                break;
            case "circle":
            case "sphere":
                this.make_circle();
                break;
            case "triangle":
                this.make_triangle();
                break;
            }
            geometry = this.geometries[shape];
        }
        return geometry;
    }

    private make_material(fill_color :any) :THREE.Material {
        return new this.material(this.convert_color(fill_color));
    }

    // adds to this.geometries
    protected make_circle() :void {
        // throw "Override in derived";
    }

    // adds to this.geometries
    protected make_box() :void {
        // throw "Override in derived";
    }

    protected make_triangle() :void {
        // throw "Override in derived";
    }

    public static convert_color(source :any) :THREE.MeshBasicMaterialParameters {
        var material_color :THREE.MeshBasicMaterialParameters;
        if ($.type(source) === "string") {
            if (source === "transparent") {
                material_color = {transparent: true, opacity: 0};
            }
            else {
                material_color = {transparent: false, color: (new THREE.Color(source)).getHex(), opacity: 1};
            }
        }
        else if ($.type(source) === "array") {
            material_color = {transparent: true, opacity: source[1], color: (new THREE.Color(source[0])).getHex()};
        }
        else if ($.type(source) === "number") {
            material_color = {transparent: false, color: (new THREE.Color(source)).getHex(), opacity: 1};
        }
        // console.log('convert_color', JSON.stringify(material_color));
        return material_color;
    }

    protected convert_color(source :any) :THREE.MeshBasicMaterialParameters {
        return ObjectFactory.convert_color(source);
    }
}

// ----------------------------------------------------------------------
