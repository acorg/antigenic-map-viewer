/// <reference path="build/jquery" />
/// <reference path="build/three" />

import AmvLevel1 = require("amv-level1");
import AmvManipulator = require("amv-manipulator");
import Amv3d = require("amv-3d");

// ----------------------------------------------------------------------

// mrdoob-three.js-f73593b/examples/js/controls/OrbitControls.js
/**
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author erich666 / http://erichaines.com
 */
class WorldControl extends AmvManipulator.Control
{
    public static camera_up = new THREE.Vector3(0, 1, 0)

    // How far you can orbit horizontally, upper and lower limits.
    // If set, must be a sub-interval of the interval [ - Math.PI, Math.PI ].
    private static minAzimuthAngle = - Infinity // radians
    private static maxAzimuthAngle = Infinity // radians

    // How far you can orbit vertically, upper and lower limits.
    // Range is 0 to Math.PI radians.
    private static minPolarAngle = 0 // radians
    private static maxPolarAngle = Math.PI // radians
    private static EPS = 0.000001

    // Limits to how far you can zoom in and out (PerspectiveCamera only)
    private static minDistance = 0
    private static maxDistance = Infinity

    public update(theta_delta: number, phi_delta: number, scale :number, pan :THREE.Vector3) :void {
        var quat = new THREE.Quaternion().setFromUnitVectors(this.viewer.camera.up, WorldControl.camera_up);
        var position = this.viewer.camera.position;
        var offset = position.clone().sub(this.viewer.camera_looking_at);
        offset.applyQuaternion(quat);
        var theta = Math.atan2(offset.x, offset.z) + theta_delta // angle from z-axis around y-axis
        var phi = Math.atan2(Math.sqrt(offset.x * offset.x + offset.z * offset.z), offset.y) + phi_delta // angle from y-axis
        theta = Math.max(WorldControl.minAzimuthAngle, Math.min(WorldControl.maxAzimuthAngle, theta)) // restrict theta to be between desired limits
        phi = Math.max(WorldControl.minPolarAngle, Math.min(WorldControl.maxPolarAngle, phi)) // restrict phi to be between desired limits
        phi = Math.max(WorldControl.EPS, Math.min(Math.PI - WorldControl.EPS, phi)) // restrict phi to be betwee EPS and PI-EPS
        var radius = offset.length() * scale;
        offset.set(radius * Math.sin(phi) * Math.sin(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.cos(theta)).applyQuaternion(quat.inverse()) // rotate offset back to "camera-up-vector-is-up" space
        if (pan) {
            this.viewer.camera_looking_at.add(pan);
        }
        position.copy(this.viewer.camera_looking_at).add(offset);
        this.viewer.camera_update();
    }

    public reset() :void {
        this.viewer.reset();
    }
}

// ----------------------------------------------------------------------

export class OrbitControl extends WorldControl
{
    private rotate_speed :number = 1.0;

    public operate(data :AmvManipulator.MouseMovement) :void {
        this.update(- 2 * Math.PI * data.x / this.viewer.width() * this.rotate_speed, - 2 * Math.PI * data.y / this.viewer.height() * this.rotate_speed, 1.0, null)
    }
}

// ----------------------------------------------------------------------

export class ZoomControl extends WorldControl
{
    private static scale = 0.95;

    public operate(data :AmvManipulator.WheelMovement) :void {
        var scale :number = (data.deltaY > 0) ? ZoomControl.scale : (data.deltaY < 0 ? 1.0 / ZoomControl.scale : 1.0);
        this.update(0.0, 0.0, scale, null);
        this.viewer.widget.objects.scale(scale);
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

export class PanControl extends WorldControl
{
    public operate(data :AmvManipulator.MouseMovement) :void {
        var position = this.viewer.camera.position
        var offset = position.clone().sub(this.viewer.camera_looking_at)
        var target_distance = offset.length()
        // half of the fov is center to top of screen
        target_distance *= Math.tan(((<Amv3d.Viewer>this.viewer).camera_fov() / 2) * Math.PI / 180.0)
        var pan = new THREE.Vector3()
        // we actually don't use screenWidth, since perspective camera is fixed to screen height
        pan.add(this.pan_left(- 2 * data.x * target_distance / this.viewer.height()))
        pan.add(this.pan_up(2 * data.y * target_distance / this.viewer.height()))
        this.update(0.0, 0.0, 1.0, pan)
    }

    private pan_left(distance :number) {
        var te = this.viewer.camera.matrix.elements;
        var panOffset = new THREE.Vector3(te[ 0 ], te[ 1 ], te[ 2 ]) // get X column of matrix
        panOffset.multiplyScalar(distance)
        return panOffset
    }

    private pan_up(distance :number) {
        var te = this.viewer.camera.matrix.elements;
        var panOffset = new THREE.Vector3(te[ 4 ], te[ 5 ], te[ 6 ]) // get Y column of matrix
        panOffset.multiplyScalar(distance)
        return panOffset
    }
}

// ----------------------------------------------------------------------

export class ResetControl extends WorldControl
{
    constructor(viewer :AmvLevel1.Viewer, event :string, private reset_keycode :number) {
        super(viewer, event);
    }

    public operate(data :AmvManipulator.Keypress) :void {
        if (data.which = this.reset_keycode) {
            this.reset();
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

export class FovControl extends WorldControl
{
    private static scale = 0.98;

    constructor(viewer :AmvLevel1.Viewer, event :string) {
        super(viewer, event);
    }

    public operate(data :AmvManipulator.WheelMovement) :void {
        var scale :number = (data.deltaY > 0) ? FovControl.scale : (data.deltaY < 0 ? 1.0 / FovControl.scale : 1.0);
        var viewer3d = <Amv3d.Viewer>this.viewer;
        viewer3d.camera_fov(viewer3d.camera_fov() * scale);
        this.update(0.0, 0.0, 1.0 / scale, null);
    }
}

// ----------------------------------------------------------------------
