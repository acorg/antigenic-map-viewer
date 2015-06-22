/// <reference path="build/jquery" />
/// <reference path="build/three" />

/// <reference path="antigenic-map-viewer.d.ts" />

// ----------------------------------------------------------------------
// Level 1 (the most inner) map widget
// ----------------------------------------------------------------------

"use strict";

import AmvUtils = require("amv-utils");
import AcmacsPlotData = require("acmacs-plot-data");
import Amv3d = require("amv-3d");
import AmvManipulator = require("amv-manipulator");

// ----------------------------------------------------------------------

export class MapWidgetLevel1 implements AntigenicMapViewer.TriggeringEvent
{
    private scene :THREE.Scene;
    private renderer :THREE.WebGLRenderer;
    private _size :number; // canvas size
    public viewer :Viewer;
    public objects :Objects;
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

    public user_objects(user_objects :AcmacsPlotData.PlotData) {
        $.when(AmvUtils.require_deferred(['amv-' + user_objects.number_of_dimensions() + 'd'])).done((Amv :typeof Amv3d) => {
            this.viewer = new Amv.Viewer(this);
            this.viewer_created.resolve();
            this.objects = new Amv.Objects(this, user_objects);
            this.viewer.transform(user_objects.transformation());
            this.viewer.objects_updated();
            this.viewer.camera_update();
        });
    }

    public render() :void {
        var really_render = () => {
            requestAnimationFrame(() => really_render());
            this.renderer.render(this.scene, this.viewer.camera);
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
        if (!!this.objects) {
            this.objects.reset();
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

    public add(o :THREE.Object3D) :void {
        this.scene.add(o)
    }

    public add_array(objects :THREE.Object3D[]) :void {
        objects.map((o) => this.scene.add(o));
    }

    public domElement() :Element {
        return this.renderer.domElement;
    }

    public help_text() :string {
        return this.viewer.help_text();
    }

    public state_for_drawing() :AntigenicMapViewer.MapStateForDrawing {
        return {
            camera_position: this.viewer.camera.position.toArray(),
            camera_looking_at: this.viewer.camera_looking_at.toArray(),
            camera_fov: this.viewer.camera_fov(),
            objects: this.objects.state_for_drawing()
        }
    }
}

// ----------------------------------------------------------------------

export class Objects
{
    public objects :THREE.Object3D[];

    private _center :THREE.Vector3;
    private _diameter :number;
    private _scale :number;     // keep current scale to be able to reset

    constructor(protected widget :MapWidgetLevel1) {
        this._scale = 1.0;
    }

    public reset() :void {
        if (this._scale !== 1.0) {
            this.scale(1.0 / this._scale);
        }
    }

    public diameter() :number {
        return this._diameter;
    }

    public center() :THREE.Vector3 {
        return this._center;
    }

    public scale(factor :number) :void {
        var new_scale = this._scale * factor;
        var scale_limits = this.scale_limits();
        if (new_scale >= scale_limits.min && new_scale <= scale_limits.max) {
            this._scale = new_scale;
            this.objects.map(o => o.scale.multiplyScalar(factor));
        }
    }

    protected scale_limits() :{min :number, max :number} {
        return {min: 0.01, max: 100};
    }

    protected calculate_bounding_sphere(layout :AcmacsPlotData.PlotDataLayout) :void {
        var point_max = [-Infinity, -Infinity, -Infinity];
        var point_min = [Infinity, Infinity, Infinity];
        layout.map((elt) => elt.map((v, dim) => { point_max[dim] = Math.max(point_max[dim], v); point_min[dim] = Math.min(point_min[dim], v); }));
        this._center = new THREE.Vector3((point_max[0] + point_min[0]) / 2.0, (point_max[1] + point_min[1]) / 2.0, (point_max[2] + point_min[2]) / 2.0);
        this._diameter = Math.max(point_max[0] - point_min[0], point_max[1] - point_min[1], point_max[2] - point_min[2]) * Math.sqrt(3.0);
    }

    public state_for_drawing() :AntigenicMapViewer.Object3d[] {
        var object_state_for_drawing = function(obj :THREE.Object3D) :AntigenicMapViewer.Object3d {
            var mesh = <THREE.Mesh>obj;
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
            var fill_color = "transparent";
            if (material && ! (material.transparent && material.opacity === 0)) {
                fill_color = '#' + material.color.getHexString();
            }
            // console.log('mesh', mesh);
            var r :AntigenicMapViewer.Object3d = {
                position: obj.position.toArray(),
                scale: obj.scale.y,
                shape: shape,
                fill_color: fill_color
            };
            if (obj.userData !== undefined && obj.userData !== null) {
                r.user_data = obj.userData;
            }
            if (obj.scale.x !== obj.scale.y) {
                r.aspect = obj.scale.x / obj.scale.y;
            }
            if (obj.rotation.z !== 0) {
                r.rotation = obj.rotation.z;
            }
            if (mesh.children && mesh.children.length === 1) {
                var outline_mesh = <THREE.Mesh>mesh.children[0];
                var outline_material = <THREE.LineBasicMaterial>outline_mesh.material;
                if (outline_material && ! (outline_material.transparent && outline_material.opacity === 0)) {
                    r.outline_color = '#' + outline_material.color.getHexString();
                    r.outline_width = outline_material.linewidth;
                }
            }
            return r;
        }
        return this.objects.map(object_state_for_drawing, this);
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

    // overridden in 3d
    public camera_fov(fov?: number) :number {
        return 0;
    }

    // 2d
    public transform(transformation :AcmacsPlotData.Transformation) :void {
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
