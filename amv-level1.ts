/// <reference path="build/jquery" />
/// <reference path="build/three" />

/// <reference path="antigenic-map-viewer.d.ts" />

// ----------------------------------------------------------------------
// Level 1 (the most inner) map widget
// ----------------------------------------------------------------------

"use strict";

import AmvUtils = require("amv-utils");
import AntigenicMapViewer = require("acmacs-plot-data");
import Amv3d = require("amv-3d");
import AmvManipulator = require("amv-manipulator");

// ----------------------------------------------------------------------

export class MapWidgetLevel1
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

    public user_objects(user_objects :AntigenicMapViewer.PlotData) {
        $.when(AmvUtils.require_deferred(['amv-' + user_objects.number_of_dimensions() + 'd'])).done((Amv :typeof Amv3d) => {
            this.viewer = new Amv.Viewer(this, 10);
            this.viewer_created.resolve();
            this.objects = new Amv.Objects(this, user_objects);
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

    public on(event :string, callback: (data :any) => void) :void {
        $.when(this.viewer_created).done(() => {
            this.event_handlers.push(this.viewer.on(event, callback));
        });
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

    public scale(scale :number) {
        this._scale *= scale;
        this.objects.map(o => o.scale.multiplyScalar(scale))
    }

    protected calculate_bounding_sphere(layout :AntigenicMapViewer.PlotDataLayout) :void {
        var point_max = [-Infinity, -Infinity, -Infinity];
        var point_min = [Infinity, Infinity, Infinity];
        layout.map((elt) => elt.map((v, dim) => { point_max[dim] = Math.max(point_max[dim], v); point_min[dim] = Math.min(point_min[dim], v); }));
        this._center = new THREE.Vector3((point_max[0] + point_min[0]) / 2.0, (point_max[1] + point_min[1]) / 2.0, (point_max[2] + point_min[2]) / 2.0);
        this._diameter = Math.max(point_max[0] - point_min[0], point_max[1] - point_min[1], point_max[2] - point_min[2]) * Math.sqrt(3.0);
    }
}

// ----------------------------------------------------------------------

export class Viewer
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

    public camera_fov() :number {
        return 1.0;
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
    // public hover_stream(deferred :JQueryDeferred<AmvManipulator.HoverStream>) :JQueryDeferred<AmvManipulator.HoverStream> {
    //     return deferred;        // override
    // }
}

// ----------------------------------------------------------------------
