/// <reference path="build/jquery" />
/// <reference path="build/three" />

/// <reference path="antigenic-map-viewer.d.ts" />

"use strict";

import AmvLevel1 = require("amv-level1");
import Amv3d = require("amv-3d");

// ----------------------------------------------------------------------

export function widget_state(widget :AmvLevel1.MapWidgetLevel1) :AntigenicMapViewer.MapStateForDrawing
{
    var number_of_dimensions = widget.objects.number_of_dimensions();
    var state :AntigenicMapViewer.MapStateForDrawing = {
        camera_position: widget.viewer.camera.position.toArray(),
        camera_looking_at: widget.viewer.camera_looking_at.toArray(),
        number_of_dimensions: number_of_dimensions,
        objects: widget.objects.objects.map(object_state),
        diameter: widget.objects.diameter(),
        center: widget.objects.center().toArray()
    };
    if (number_of_dimensions === 3) {
        state.camera_fov = (<Amv3d.Viewer>widget.viewer).camera_fov();
    }
    return state;
}

// ----------------------------------------------------------------------

export function widget_restore(widget :AmvLevel1.MapWidgetLevel1, state :AntigenicMapViewer.MapStateForDrawing) :void
{
    var number_of_dimensions = state.number_of_dimensions;
    widget.initialize_for_dimensions(number_of_dimensions);
    $.when(widget.initialization_completed).done(() => {
        restore_objects(widget, state.objects);
        widget.objects.diameter(state.diameter);
        widget.objects.center(state.center);
        widget.viewer.camera.position.fromArray(state.camera_position);
        if (state.camera_fov) {
            (<Amv3d.Viewer>widget.viewer).camera_fov(state.camera_fov);
        }
        widget.viewer.camera_look_at((new THREE.Vector3()).fromArray(state.camera_looking_at));

//?        if (number_of_dimensions === 2) {
//?            (<Amv2d.Objects>widget.objects).viewport(this.viewport());
//?            (<Amv2d.Viewer>widget.viewer).transform(this.transformation());
//?        }
        widget.viewer.objects_updated();
        widget.viewer.camera_update();
    });
}

// ======================================================================

function object_state(obj :AmvLevel1.Object) :AntigenicMapViewer.ObjectState
{
    var mesh = obj.mesh;
    var material = mesh.material && (<THREE.MeshPhongMaterial>mesh.material);
    var fill_color = "transparent", fill_opacity = 1;
    if (material && ! (material.transparent && material.opacity === 0)) {
        fill_color = '#' + material.color.getHexString();
        if (material.transparent) {
            fill_opacity = material.opacity;
        }
    }
    // console.log('mesh', mesh);
    var state :AntigenicMapViewer.ObjectState = {
        position: mesh.position.toArray(),
        scale: mesh.scale.y,
        shape: shape_of_mesh(mesh),
        fill_color: fill_color
    };
    if (fill_opacity !== 1) {
        state.fill_opacity = fill_opacity;
    }
    if (mesh.userData !== undefined && mesh.userData !== null) {
        state.user_data = mesh.userData;
    }
    if (mesh.scale.x !== mesh.scale.y) {
        state.aspect = mesh.scale.x / mesh.scale.y;
    }
    if ((<any>obj).style_rotation) {
        state.rotation = (<any>obj).style_rotation;
    }
    var outline = obj.outline();
    if (outline) {
        var outline_material = <THREE.LineBasicMaterial>outline.material;
        if (outline_material && ! (outline_material.transparent && outline_material.opacity === 0)) {
            state.outline_color = '#' + outline_material.color.getHexString();
            state.outline_width = outline_material.linewidth;
        }
    }
    return state;
}

// ----------------------------------------------------------------------

function shape_of_mesh(mesh :THREE.Mesh) :string
{
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
    return shape;
}

// ----------------------------------------------------------------------

function restore_objects(widget :AmvLevel1.MapWidgetLevel1, state :AntigenicMapViewer.ObjectState[]) :void
{
    var factory = widget.object_factory();
    for (var i = 0; i < state.length; ++i) {
        var obj_state = state[i];
        var obj = factory.make_object();
        var fill_color :any = obj_state.fill_opacity !== null && obj_state.fill_opacity !== undefined ? [obj_state.fill_color, obj_state.fill_opacity] : obj_state.fill_color;
        var outline = (obj_state.outline_width && obj_state.outline_color !== undefined && obj_state.outline_color !== null) ? factory.make_outline(obj_state.shape, obj_state.outline_width, obj_state.outline_color) : null;
        obj.set_mesh(factory.make_mesh(obj_state.aspect, obj_state.shape, fill_color), outline);
        if (obj_state.rotation) {
            (<any>obj).style_rotation = obj_state.rotation;
        }
        obj.position().fromArray(obj_state.position);
        obj.scale().multiplyScalar(obj_state.scale);
        obj.user_data(obj_state.user_data);
        widget.add(obj);
    }
}

// ----------------------------------------------------------------------
