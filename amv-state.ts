/// <reference path="build/jquery" />

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

function object_state(obj :AmvLevel1.Object) :AntigenicMapViewer.ObjectState
{
    return obj.state_for_drawing();
}

// ----------------------------------------------------------------------
