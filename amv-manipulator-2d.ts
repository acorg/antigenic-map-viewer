"use strict";

import TypingsReferences = require("build/typings-references");

import AmvLevel1 = require("amv-level1");
import AmvManipulator = require("amv-manipulator");
import Amv2d = require("amv-2d");

// ----------------------------------------------------------------------

class Control extends AmvManipulator.Control
{
    public viewer2d() :Amv2d.Viewer {
        return <Amv2d.Viewer>this.viewer;
    }
}

// ----------------------------------------------------------------------

export class RotateControl extends Control
{
    private static speed :number = 0.001; // Math.PI / 360;

    public operate(data :AmvManipulator.WheelMovement) :void {
        this.viewer2d().viewport_rotate(data.deltaY * RotateControl.speed);
    }
}

// ----------------------------------------------------------------------

export class FlipControl extends Control
{
    constructor(viewer :AmvLevel1.Viewer, private horizontally :boolean, event :string) {
        super(viewer, event);
    }

    public operate(data :AmvManipulator.Mousepress) :void {
        if (this.horizontally) {
            this.viewer2d().transform([[-1, 0], [0, 1]]);
        }
        else {
            this.viewer2d().transform([[1, 0], [0, -1]]);
        }
    }
}

// ----------------------------------------------------------------------

export class ScaleControl extends Control
{
    private static scale = 0.95;

    public operate(data :AmvManipulator.WheelMovement) :void {
        var scale :number  = (data.deltaY < 0) ? ScaleControl.scale : (data.deltaY > 0 ? 1.0 / ScaleControl.scale : 1.0);
        this.viewer.widget.map_elements_scale(scale);
    }
}

// ----------------------------------------------------------------------

// export class LabelScaleControl extends Control
// {
//     private static scale = 0.95;

//     public operate(data :AmvManipulator.WheelMovement) :void {
//         var scale :number  = (data.deltaY < 0) ? LabelScaleControl.scale : (data.deltaY > 0 ? 1.0 / LabelScaleControl.scale : 1.0);
//         this.viewer.widget.objects.label_scale(scale);
//     }
// }

// ----------------------------------------------------------------------

export class ZoomControl extends Control
{
    private static scale = 0.95;

    public operate(data :AmvManipulator.WheelMovement) :void {
        var scale :number = (data.deltaY > 0) ? ZoomControl.scale : (data.deltaY < 0 ? 1.0 / ZoomControl.scale : 1.0);
        this.viewer2d().viewport_zoom(scale);
    }
}

// ----------------------------------------------------------------------

export class PanControl extends Control
{
    public operate(data :AmvManipulator.MouseMovement) :void {
        var pixels_per_unit = this.viewer2d().resolution();
        this.viewer2d().viewport_move_by({x: - data.x / pixels_per_unit, y: data.y / pixels_per_unit});
    }
}

// ----------------------------------------------------------------------

export class KeyControl extends Control
{
    public operate(data :AmvManipulator.Keypress) :void {
        this.viewer2d().keypress(data.which);
    }
}

// ----------------------------------------------------------------------

// Triggers "hover:amv" with the list of hovered object indice
// Event is triggered only when the list of hovered objects changed, [] is passed when mouse is moved outside of any object.
export class HoverControl extends Control
{
    private raycaster :THREE.Raycaster;
    private mouse :THREE.Vector2;
    private last :number[];

    constructor(viewer :AmvLevel1.Viewer, event :string) {
        super(viewer, event);
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
    }

    public operate(data :AmvManipulator.MousePosition) :void {
        this.mouse.set((data.x / this.viewer.width()) * 2 - 1, - (data.y / this.viewer.height()) * 2 + 1);
        this.raycaster.setFromCamera(this.mouse, this.viewer.camera);
        console.warn('2D HoverControl NOT implemented in amv-manipulator-2d.ts');
        // var intersects = this.raycaster.intersectObjects(this.viewer.widget.objects.bodies());
        // var objects :number[] = intersects.map((elt) => elt.object.userData.index || elt.object.parent.userData.index);
        // if ($(objects).not(<any>this.last).length !== 0 || $(this.last).not(<any>objects).length !== 0) {
        //     this.viewer.trigger_on_element("hover:amv", [objects]);
        //     this.last = objects;
        // }
    }
}

// ----------------------------------------------------------------------
