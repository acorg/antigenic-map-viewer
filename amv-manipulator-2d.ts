/// <reference path="build/jquery" />
/// <reference path="build/three" />

import AmvLevel1 = require("amv-level1");
import AmvManipulator = require("amv-manipulator");

// ----------------------------------------------------------------------

export class RotateControl extends AmvManipulator.Control
{
    private static speed :number = 0.001; // Math.PI / 360;

    public operate(data :AmvManipulator.WheelMovement) :void {
        var angle :number = data.deltaY * RotateControl.speed;
        var quaternion = new THREE.Quaternion();
        quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle);
        this.viewer.camera.up.applyQuaternion(quaternion);
        this.viewer.camera_update();
    }
}

// ----------------------------------------------------------------------

export class FlipControl extends AmvManipulator.Control
{
    constructor(viewer :AmvLevel1.Viewer, private horizontally :Boolean, event :string) {
        super(viewer, event);
    }

    public operate(data :AmvManipulator.Mousepress) :void {
        this.viewer.widget.objects.flip(this.horizontally);
        this.viewer.camera_update();
    }
}

// ----------------------------------------------------------------------

export class ScaleControl extends AmvManipulator.Control
{
    private static scale = 0.95;

    public operate(data :AmvManipulator.WheelMovement) :void {
        var scale :number  = (data.deltaY < 0) ? ScaleControl.scale : (data.deltaY > 0 ? 1.0 / ScaleControl.scale : 1.0);
        this.viewer.widget.objects.scale(scale);
    }
}

// ----------------------------------------------------------------------

export class ZoomControl extends AmvManipulator.Control
{
    private static scale = 0.95;

    public operate(data :AmvManipulator.WheelMovement) :void {
        var scale :number = (data.deltaY > 0) ? ZoomControl.scale : (data.deltaY < 0 ? 1.0 / ZoomControl.scale : 1.0);
        this.viewer.viewport_zoom(scale);
    }
}

// ----------------------------------------------------------------------

export class PanControl extends AmvManipulator.Control
{
    public operate(data :AmvManipulator.MouseMovement) :void {
        var units_per_pixel = this.viewer.units_per_pixel();
        this.viewer.viewport_move({deltaX: - data.deltaX * units_per_pixel, deltaY: data.deltaY * units_per_pixel});
    }
}

// ----------------------------------------------------------------------

export class ResetControl extends AmvManipulator.Control
{
    constructor(viewer :AmvLevel1.Viewer, event :string, private reset_keycode :number) {
        super(viewer, event);
    }

    public operate(data :AmvManipulator.Keypress) :void {
        if (data.which = this.reset_keycode) {
            this.viewer.reset();
        }
    }
}

// ----------------------------------------------------------------------

// Triggers "hover:amv" with the list of hovered object indice
// Event is triggered only when the list of hovered objects changed, [] is passed when mouse is moved outside of any object.
export class HoverControl extends AmvManipulator.Control
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
        var intersects = this.raycaster.intersectObjects(this.viewer.widget.objects.objects);
        var objects :number[] = intersects.map((elt) => elt.object.userData.index);
        if ($(objects).not(<any>this.last).length !== 0 || $(this.last).not(<any>objects).length !== 0) {
            this.viewer.trigger_on_element("hover:amv", [objects]);
            this.last = objects;
        }
    }
}

// ----------------------------------------------------------------------
