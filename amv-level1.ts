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
    public initialization_completed :JQueryPromise<any>;

    public viewer :Viewer;
    public objects :Objects;

    private scene :THREE.Scene;
    private renderer :THREE.WebGLRenderer;
    private _size :number; // canvas size
    private event_handlers :JQuery[];

    private viewer_created :JQueryDeferred<{}>;

    constructor(container :JQuery, size :number) {
        this.scene = new THREE.Scene()
        this.renderer = new THREE.WebGLRenderer({antialias: true, preserveDrawingBuffer: true, alpha: true}) // , precision: "highp"
        this.size(size)
        this.renderer.setClearColor(0xFFFFFF)
        container.append(this.renderer.domElement)
        this.viewer_created = $.Deferred();
        this.event_handlers = [];
    }

    public destroy() :void {
        for (var i = 0; i < this.event_handlers.length; ++i) {
            this.event_handlers[i].off();
        }
    }

    public initialize_for_dimensions(number_of_dimensions :number) :void {
        this.initialization_completed = AmvUtils.require_deferred(['amv-' + number_of_dimensions + 'd']);
        $.when(this.initialization_completed).done((Amv :typeof Amv3d) => {
            this.viewer = new Amv.Viewer(this);
            this.viewer_created.resolve();
            this.objects = new Amv.Objects(this);
        });
    }

    public object_factory(number_of_objects? :number) :ObjectFactory {
        return this.objects && this.objects.object_factory(number_of_objects);
    }

    public render() :void {
        var rendering_count = 0;
        var really_render = () => {
            requestAnimationFrame(() => really_render());
            this.renderer.render(this.scene, this.viewer.camera);
            if (++rendering_count === 2) {
                console.log('map widget rendered'); // DO NOT REMOVE!!: message for slimerjs to generate PNG
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
        }
        return this._size;
    }

    public add(o :Object|THREE.Object3D) :void {
        if ((<Object>o).mesh) {
            this.scene.add((<Object>o).mesh);
        }
        else {
            this.scene.add(<THREE.Object3D>o);
        }
    }

    public domElement() :Element {
        return this.renderer.domElement;
    }

    public help_text() :string {
        return this.viewer.help_text();
    }

//!    public state_for_drawing() :AntigenicMapViewer.MapStateForDrawing {
//!        return {
//!            camera_position: this.viewer.camera.position.toArray(),
//!            camera_looking_at: this.viewer.camera_looking_at.toArray(),
//!            camera_fov: this.viewer.camera_fov(),
//!            number_of_dimensions: this.objects.number_of_dimensions(),
//!            objects: this.objects.state_for_drawing(),
//!            diameter: this.objects.diameter(),
//!            center: this.objects.center().toArray()
//!        }
//!    }

    public restore_state(state :AntigenicMapViewer.MapStateForDrawing) :void {
        $.when(AmvUtils.require_deferred(['amv-' + state.number_of_dimensions + 'd'])).done((Amv :typeof Amv3d) => {
            this.viewer = new Amv.Viewer(this);
            this.viewer_created.resolve();
            this.objects = new Amv.Objects(this);
            this.objects.restore_state(state.objects, state.diameter, state.center);
            this.viewer.camera.position.fromArray(state.camera_position);
            if (state.camera_fov) {
                (<Amv3d.Viewer>this.viewer).camera_fov(state.camera_fov);
            }
            this.viewer.camera_look_at((new THREE.Vector3()).fromArray(state.camera_looking_at));
            this.viewer.objects_updated();
            this.viewer.camera_update();
        });
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

export class Object
{
    public mesh :THREE.Mesh;
    public outline_mesh :THREE.Mesh;

    constructor() {
    }

    public outline() :THREE.Mesh {
        var r :THREE.Mesh = null;
        if (this.mesh.children && this.mesh.children.length === 1) {
            r = <THREE.Mesh>this.mesh.children[0];
        }
        return r;
    }

    public rescale(factor :number) :void {
        this.mesh.scale.multiplyScalar(factor);
    }

    public position() :THREE.Vector3 {
        return this.mesh.position;
    }

    public scale() :THREE.Vector3 {
        return this.mesh.scale;
    }

    public rotation() :THREE.Euler {
        return this.mesh.rotation;
    }

    public user_data(user_data? :any) :any {
        if (user_data !== undefined) {
            this.mesh.userData = user_data;
        }
        return this.mesh.userData;
    }

    public state_for_drawing() :AntigenicMapViewer.ObjectState {
        var mesh = this.mesh;
        var shape = ((mesh.geometry && mesh.geometry.type) || "circle").toLowerCase().replace('geometry', '');
        if (shape === "shape") {
            // 2d box or triangle
            if (mesh.geometry.vertices) {
                if (mesh.geometry.vertices.length === 3)
                    shape = "triangle";
                else
                    shape = "box";
            }
        }
        var material = mesh.material && (<THREE.MeshPhongMaterial>mesh.material);
        var fill_color = "transparent", fill_opacity = 1;
        if (material && ! (material.transparent && material.opacity === 0)) {
            fill_color = '#' + material.color.getHexString();
            if (material.transparent) {
                fill_opacity = material.opacity;
            }
        }
        // console.log('mesh', mesh);
        var r :AntigenicMapViewer.ObjectState = {
            position: mesh.position.toArray(),
            scale: mesh.scale.y,
            shape: shape,
            fill_color: fill_color
        };
        if (fill_opacity !== 1) {
            r.fill_opacity = fill_opacity;
        }
        if (mesh.userData !== undefined && mesh.userData !== null) {
            r.user_data = mesh.userData;
        }
        if (mesh.scale.x !== mesh.scale.y) {
            r.aspect = mesh.scale.x / mesh.scale.y;
        }
        if (mesh.rotation.z !== 0) {
            r.rotation = mesh.rotation.z;
        }
        var outline = this.outline();
        if (outline) {
            var outline_material = <THREE.LineBasicMaterial>outline.material;
            if (outline_material && ! (outline_material.transparent && outline_material.opacity === 0)) {
                r.outline_color = '#' + outline_material.color.getHexString();
                r.outline_width = outline_material.linewidth;
            }
        }
        return r;
    }

    public from_state(state :AntigenicMapViewer.ObjectState, object_factory :ObjectFactory) :void { //?
        this.mesh = object_factory.make_mesh_restoring_state(state);
        this.position().fromArray(state.position);
        this.scale().multiplyScalar(state.scale);
        this.user_data(state.user_data);
    }
}

// ----------------------------------------------------------------------

export class Objects
{
    public objects :Object[];

    private _center :THREE.Vector3;
    private _diameter :number;
    private _scale :number;     // keep current scale to be able to reset

    protected _object_factory :ObjectFactory;

    constructor(protected widget :MapWidgetLevel1) {
        this.objects = [];
        this._scale = 1.0;
    }

    public meshes() :THREE.Object3D[] {
        return this.objects.map((obj) => obj.mesh);
    }

    public reset() :void {
        if (this._scale !== 1.0) {
            this.scale(1.0 / this._scale);
        }
    }

    // 2d
    public reorient() :void {
    }

    public diameter() :number {
        if (this._diameter === undefined || this._diameter === null) {
            this.calculate_bounding_sphere();
        }
        return this._diameter;
    }

    public center() :THREE.Vector3 {
        if (this._center === undefined || this._center === null) {
            this.calculate_bounding_sphere();
        }
        return this._center;
    }

    public scale(factor :number) :void {
        var new_scale = this._scale * factor;
        var scale_limits = this.scale_limits();
        if (new_scale >= scale_limits.min && new_scale <= scale_limits.max) {
            this._scale = new_scale;
            this.objects.map(o => o.rescale(factor));
        }
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
        this.objects.forEach((obj) => { var pos = obj.position(); point_max.max(pos); point_min.min(pos); });
        this._center = (new THREE.Vector3()).addVectors(point_min, point_max).divideScalar(2);
        this._diameter = (new THREE.Vector3()).subVectors(point_min, point_max).length();
        // console.log('calculate_bounding_sphere2', JSON.stringify(this._center), this._diameter);
    }

    public number_of_dimensions() :number {
        return 0;               // override in derived
    }

    public restore_state(state :AntigenicMapViewer.ObjectState[], diameter :number, center :number[]) :void {
        this.objects = state.map((elt) => { var obj = this.object_factory().make_object(); obj.from_state(elt, this.object_factory()); return obj; });
        //console.log('objects', this.objects);
        this.objects.forEach((obj) => this.widget.add(obj));
        this._diameter = diameter;
        this._center = (new THREE.Vector3()).fromArray(center);
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
    protected geometries :any;  // "shape-aspect-rotation[-outline_width]": THREE.Geometry, e.g  "circle-1.0-0.0", "box-1.0-0.0", "circle-outline-1.0-0.0-1.0", "box-outline-1.0-0.0-1.0"

    constructor() {
        this.geometries = {};
    }

    public make_object() :Object { // override in derived
        return null;
    }

    public make_geometry_material(plot_style :AntigenicMapViewer.PlotDataStyle) :[string, THREE.Geometry, THREE.Material] {
        var material = new this.material(this.convert_color(plot_style.fill_color));
        var shape :string = (plot_style.shape === undefined || plot_style.shape === null) ? "circle" : plot_style.shape;
        var geometry = this.make_geometry(shape, plot_style.outline_width);
        return [shape, geometry, material];
    }

    private make_geometry(shape :string, outline_width :number) :THREE.Geometry {
        var geometry = this.geometries[shape];
        if (!geometry) {
            switch (shape) {
            case "box":
            case "cube":
                this.make_box(outline_width);
                break;
            case "circle":
            case "sphere":
                this.make_circle(outline_width);
                break;
            case "triangle":
                this.make_triangle(outline_width);
                break;
            }
            geometry = this.geometries[shape];
        }
        return geometry;
    }

    public make_mesh(plot_style :AntigenicMapViewer.PlotDataStyle, shape :string, geometry :THREE.Geometry, material :THREE.Material) :THREE.Mesh {
        return this.make_mesh_2(plot_style.aspect, plot_style.rotation, geometry, material);
    }

    private make_mesh_2(aspect :number, rotation :number, geometry :THREE.Geometry, material :THREE.Material) :THREE.Mesh {
        var mesh = new THREE.Mesh(geometry, material);
        if (aspect !== 1 && aspect !== undefined && aspect !== null) {
            mesh.scale.set(aspect, 1, aspect);
        }
        if (rotation !== 0 && rotation !== undefined && rotation !== null) {
            mesh.rotation.set(0, 0, rotation);
        }
        return mesh;
    }

    // adds to this.geometries
    protected make_circle(outline_width :number = 1.0) :void {
        throw "Override in derived";
    }

    // adds to this.geometries
    protected make_box(outline_width :number = 1.0) :void {
        throw "Override in derived";
    }

    protected make_triangle(outline_width :number = 1.0) :void {
        throw "Override in derived";
    }

    protected convert_color(source :any) :THREE.MeshBasicMaterialParameters {
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
        // console.log('convert_color', JSON.stringify(material_color));
        return material_color;
    }

    public make_mesh_restoring_state(plot_style :AntigenicMapViewer.ObjectState) :THREE.Mesh {
        var color :any = plot_style.fill_opacity !== null && plot_style.fill_opacity !== undefined ? [plot_style.fill_color, plot_style.fill_opacity] : plot_style.fill_color;
        return this.make_mesh_2(plot_style.aspect, plot_style.rotation,
                                this.make_geometry(plot_style.shape, plot_style.outline_width),
                                new this.material(this.convert_color(color)));
    }
}

// ----------------------------------------------------------------------
