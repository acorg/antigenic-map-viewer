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
// ----------------------------------------------------------------------
// ----------------------------------------------------------------------

// // mrdoob-three.js-f73593b/examples/js/controls/OrbitControls.js
// /**
//  * @author qiao / https://github.com/qiao
//  * @author mrdoob / http://mrdoob.com
//  * @author alteredq / http://alteredqualia.com/
//  * @author WestLangley / http://github.com/WestLangley
//  * @author erich666 / http://erichaines.com
//  */
// class WorldControl extends AmvManipulator.Control
// {
//     public static camera_up = new THREE.Vector3(0, 1, 0)

//     // How far you can orbit horizontally, upper and lower limits.
//     // If set, must be a sub-interval of the interval [ - Math.PI, Math.PI ].
//     private static minAzimuthAngle = - Infinity // radians
//     private static maxAzimuthAngle = Infinity // radians

//     // How far you can orbit vertically, upper and lower limits.
//     // Range is 0 to Math.PI radians.
//     private static minPolarAngle = 0 // radians
//     private static maxPolarAngle = Math.PI // radians
//     private static EPS = 0.000001

//     // Limits to how far you can zoom in and out (PerspectiveCamera only)
//     private static minDistance = 0
//     private static maxDistance = Infinity

//     public update(theta_delta: number, phi_delta: number, scale :number, pan :THREE.Vector3) :void {
//         var quat = new THREE.Quaternion().setFromUnitVectors(this.viewer.camera.up, WorldControl.camera_up);
//         var position = this.viewer.camera.position;
//         var offset = position.clone().sub(this.viewer.camera_looking_at);
//         offset.applyQuaternion(quat);
//         var theta = Math.atan2(offset.x, offset.z) + theta_delta // angle from z-axis around y-axis
//         var phi = Math.atan2(Math.sqrt(offset.x * offset.x + offset.z * offset.z), offset.y) + phi_delta // angle from y-axis
//         theta = Math.max(WorldControl.minAzimuthAngle, Math.min(WorldControl.maxAzimuthAngle, theta)) // restrict theta to be between desired limits
//         phi = Math.max(WorldControl.minPolarAngle, Math.min(WorldControl.maxPolarAngle, phi)) // restrict phi to be between desired limits
//         phi = Math.max(WorldControl.EPS, Math.min(Math.PI - WorldControl.EPS, phi)) // restrict phi to be betwee EPS and PI-EPS
//         var radius = offset.length() * scale;
//         offset.set(radius * Math.sin(phi) * Math.sin(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.cos(theta)).applyQuaternion(quat.inverse()) // rotate offset back to "camera-up-vector-is-up" space
//         if (pan) {
//             this.viewer.camera_looking_at.add(pan);
//         }
//         position.copy(this.viewer.camera_looking_at).add(offset);
//         this.viewer.camera_update();
//     }

//     public reset() :void {
//         this.viewer.reset();
//     }
// }

// // ----------------------------------------------------------------------

// ----------------------------------------------------------------------
