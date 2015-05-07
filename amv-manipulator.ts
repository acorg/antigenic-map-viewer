/// <reference path="build/jquery" />

import AmvLevel1 = require("amv-level1");

// ----------------------------------------------------------------------

export interface MousePosition
{
    x :number;
    y :number;
}

export interface MouseMovement
{
    deltaX :number;
    deltaY :number;
}

export interface WheelMovement
{
    deltaX :number;
    deltaY :number;
}

export interface Keypress
{
    which: number;
}

export interface Mousepress
{
    button: number;
}

export interface ManipulatorEvent extends MousePosition, MouseMovement, WheelMovement, Keypress, Mousepress
{
}

// ----------------------------------------------------------------------

interface JQueryMouseWheelEventObject extends JQueryEventObject
{
    deltaMode :number
    deltaX :number
    deltaY :number
}

class ModifierKeys
{
    constructor(public shift :Boolean, public ctrl :Boolean, public alt :Boolean, public meta :Boolean) {}

    public static make_from_string(desc :string) :ModifierKeys {
        var shift = false, ctrl = false, alt = false, meta = false;
        var elements = desc.split('-');
        for (var index = 0; index < elements.length; ++index) {
            switch (elements[index]) {
            case "shift":
                shift = true;
                break;
            case "ctrl":
                ctrl = true;
                break;
            case "alt":
                alt = true;
                break;
            case "meta":
                meta = true;
                break;
            default:
                break;
            }
        }
        return new ModifierKeys(shift, ctrl, alt, meta);
    }

    // Returns true if event has necessary modifier set
    public filter(e :JQueryInputEventObject) :Boolean {
        return e.shiftKey == this.shift && e.ctrlKey == this.ctrl && e.altKey == this.alt && e.metaKey == this.meta;
    }
}

// ----------------------------------------------------------------------

export class Manipulator implements Object
{
    private static wheel_sensitivity = 1.0
    private static mouse_movement_sensitivity = 1.0

    private _move_abs_generator :Boolean;

    constructor(private element :JQuery) {
    }

    // Event is "<action>:<modifiers>:amv", e.g. "move::amv", "drag:alt:amv", "wheel:shift:amv", "key::amv"
    public make_event_generators(events :string[]) :void {
        for (var index = 0; index < events.length; ++index) {
            var action_modifier :string[] = events[index].split(':');
            (<any>this)['make_generator_' + action_modifier[0]](action_modifier[1]);
        }
    }

    private make_generator_move(modifier_desc :string) :void {
        this.make_generator_move_abs();
        var modifier_keys = ModifierKeys.make_from_string(modifier_desc);
        this.element.on("move-abs:amv", (_ :Event, c :MousePosition, dragging :Boolean, e :JQueryEventObject) => {
            if (!dragging && modifier_keys.filter(e)) {
                this.element.trigger("move:" + modifier_desc + ":amv", [c]);
            }
        });
    }

    private make_generator_drag(modifier_desc :string) :void {
        this.make_generator_move_abs();
        var modifier_keys = ModifierKeys.make_from_string(modifier_desc);
        var previous :MousePosition = null;
        this.element.on("mouseup", function () { previous = null; }); // reset on mouse release
        this.element.on("move-abs:amv", (_ :Event, c :MousePosition, dragging :Boolean, e :JQueryEventObject) => {
            if (dragging && modifier_keys.filter(e)) {
                if (previous !== null) {
                    this.element.trigger("drag:" + modifier_desc + ":amv", [{deltaX: c.x - previous.x, deltaY: c.y - previous.y}]);
                }
                previous = c;
            }
        });
    }

    private make_generator_move_abs() :void {
        if (!this._move_abs_generator) {
            var offset = () => {
                var style = document.defaultView.getComputedStyle(this.element.parent().get(0), null);
                var parent_offset = this.element.parent().offset();
                return {
                    left: (parseInt(style["paddingLeft"], 10) || 0) + (parseInt(style["borderLeftWidth"], 10) || 0) + parent_offset.left, // + document.body.parentNode.offsetLeft,
                    top: (parseInt(style["paddingTop"], 10) || 0) + (parseInt(style["borderTopWidth"], 10) || 0) + parent_offset.top // + document.body.parentNode.offsetTop
                }
            };
            var dragging = false;
            this.element.on("mousedown", function () { dragging = true; });
            this.element.on("mouseup", function () { dragging = false; });
            this.element.on("mousemove", (e :JQueryEventObject) => {
                var off = offset();
                this.element.trigger("move-abs:amv", [{x: e.pageX - off.left, y: e.pageY - off.top}, dragging, e]);
            });
            this._move_abs_generator = true;
        }
    }

    private make_generator_wheel(modifier_desc :string) :void {
        var modifier_keys = ModifierKeys.make_from_string(modifier_desc);
        var trigger : (x :number, y :number) => void = (x :number, y :number) => {
            this.element.trigger("wheel:" + modifier_desc + ":amv", [{deltaX: x, deltaY: y * Manipulator.wheel_sensitivity}]);
        };
        var callback : (e :JQueryMouseWheelEventObject) => void;
        if (modifier_keys.shift) {
            callback = (e :JQueryMouseWheelEventObject) => {
                if (modifier_keys.filter(e)) {
                    e.preventDefault();
                    if (e.deltaY === 0 && e.deltaX !== 0) {
                        // Logitech mouse reports just deltaX when shift is pressed
                        trigger(e.deltaY, e.deltaX);
                    }
                    else {
                        trigger(e.deltaX, e.deltaY);
                    }
                }
            };
        }
        else {
            callback = (e :JQueryMouseWheelEventObject) => {
                if (modifier_keys.filter(e)) {
                    e.preventDefault();
                    trigger(e.deltaX, e.deltaY);
                }
            };
        }
        this.element.on("mousewheel", callback);
    }

    private make_generator_key(modifier_desc :string) :void {
        var modifier_keys = ModifierKeys.make_from_string(modifier_desc);
        this.element.prop("tabindex", 0);
        this.element.on("keypress", (e :JQueryKeyEventObject) => {
            if (modifier_keys.filter(e)) {
                e.preventDefault();
                this.element.trigger("key:" + modifier_desc + ":amv", [{which: e.which}]);
            }
        });
    }

    // left click + modifier
    private make_generator_left(modifier_desc :string) :void {
        var modifier_keys = ModifierKeys.make_from_string(modifier_desc);
        this.element.on("click", (e :JQueryMouseEventObject) => {
            // console.log('click', e.button);
            if (e.button === 0 && modifier_keys.filter(e)) {
                e.preventDefault();
                this.element.trigger("left:" + modifier_desc + ":amv", [{button: e.button}]);
            }
        });
    }

}

// ----------------------------------------------------------------------

// export class ManipulatorBacon
// {
//     private static wheel_sensitivity = 1.0
//     private static mouse_movement_sensitivity = 1.0
//     private static mouse_move_page :Bacon.EventStream<JQueryEventObject> = $("html").asEventStream("mousemove");

//     private move :Bacon.EventStream<MousePosition>;
//     private drag :Bacon.EventStream<MousePosition>;
//     private shift_drag :Bacon.EventStream<MousePosition>;
//     private shift_wheel :Bacon.EventStream<MousePosition>;
//     private alt_wheel :Bacon.EventStream<MousePosition>;

//     constructor(private element :JQuery) {
//     }

//     public bind_move_without_drag(control :MouseMoveControl) :MouseMoveControl {
//         if (!this.move) {
//             this.move = this.make_mod_move(new ModifierKeys(false, false, false, false));
//         }
//         this.move.map(this.mousePositionToVector2).onValue((v) => control.operate(v, new THREE.Vector2(this.element.width(), this.element.height())))
//         return control;
//     }

//     public bind_drag(control :MouseDragControl) :MouseDragControl {
//         if (!this.drag) {
//             this.drag = this.make_mod_drag(new ModifierKeys(false, false, false, false));
//         }
//         this.drag.map(this.mouseMovementToVector3).onValue((v) => control.operate(v, new THREE.Vector2(this.element.width(), this.element.height())))
//         return control;
//     }

//     public bind_shift_drag(control :MouseDragControl) :MouseDragControl {
//         if (!this.shift_drag) {
//             this.shift_drag = this.make_mod_drag(new ModifierKeys(true, false, false, false));
//         }
//         this.shift_drag.map(this.mouseMovementToVector3).onValue((v) => control.operate(v, new THREE.Vector2(this.element.width(), this.element.height())))
//         return control;
//     }

//     public bind_shift_wheel(control :MouseWheelControl) :MouseWheelControl {
//         if (!this.shift_wheel) {
//             this.shift_wheel= this.make_mod_wheel(new ModifierKeys(true, false, false, false));
//         }
//         this.shift_wheel.map((m) => m.y).onValue((delta) => { console.log('shift_wheel', JSON.stringify(delta)); control.operate(delta * Manipulator.wheel_sensitivity) })
//         return control;
//     }

//     public bind_alt_wheel(control :MouseWheelControl) :MouseWheelControl {
//         if (!this.alt_wheel) {
//             this.alt_wheel= this.make_mod_wheel(new ModifierKeys(false, false, true, false));
//         }
//         this.alt_wheel.map((m) => m.y).onValue((delta) => control.operate(delta * Manipulator.wheel_sensitivity))
//         return control;
//     }

//     private mouseMovementToVector3(delta :MousePosition) :THREE.Vector3 {
//         return new THREE.Vector3(- delta.x * Manipulator.mouse_movement_sensitivity, delta.y * Manipulator.mouse_movement_sensitivity, 0);
//     }

//     private mousePositionToVector2(position :MousePosition) :THREE.Vector2 {
//         return new THREE.Vector2(position.x, position.y);
//     }

//     private make_mod_drag(modifiers: ModifierKeys) :Bacon.EventStream<MousePosition> {
//         var start = this.element.asEventStream("mousedown")
//         var dragging = start
//               .map(true)
//               .merge(this.element.asEventStream("mouseup").map(false))
//               .toProperty(true); // initial value must be true!
//         var move = Manipulator.mouse_move_page
//               .filter(this.mod_filter(modifiers))
//               .map((v) => [v.clientX, v.clientY])
//               .slidingWindow(2, 2)
//               .filter(dragging)       // filter after slidingWindow! otherwise releasing, moving, pressing mouse generates event with big distance
//               .map((v) => ({x: v[1][0] - v[0][0], y: v[1][1] - v[0][1]}))
//         return start.flatMap(() => move)
//     }

//     private make_mod_wheel(modifiers: ModifierKeys) :Bacon.EventStream<MousePosition> {
//         return this.element
//               .asEventStream("mousewheel")
//               .filter(this.mod_filter(modifiers))
//               .doAction('.preventDefault')
//               .map((e :JQueryMouseWheelEventObject) => ({x: e.deltaX, y: e.deltaY}))
//                // Logitech mouse reports just deltaX when shift is pressed
//               .map((e :any) => { if (modifiers.shift && e.y === 0) { e.y = - e.x; } return e; })
//     }

//     private make_mod_move(modifiers: ModifierKeys) :Bacon.EventStream<MousePosition> {
//         var self = this;
//         var offset = function() {
//             var style = document.defaultView.getComputedStyle(self.element.parent().get(0), null);
//             var parent_offset = self.element.parent().offset();
//             return {
//                 left: (parseInt(style["paddingLeft"], 10) || 0) + (parseInt(style["borderLeftWidth"], 10) || 0) + parent_offset.left, // + document.body.parentNode.offsetLeft,
//                 top: (parseInt(style["paddingTop"], 10) || 0) + (parseInt(style["borderTopWidth"], 10) || 0) + parent_offset.top // + document.body.parentNode.offsetTop
//             }
//         };
//         // console.log('offset', JSON.stringify(offset()));
//         var not_dragging = this.element.asEventStream("mousedown")
//               .map(false)
//               .merge(this.element.asEventStream("mouseup").map(true))
//               .toProperty(true);
//         var move = this.element.asEventStream("mousemove")
//               .filter(not_dragging)
//               .filter(this.mod_filter(modifiers))
//               .map((v) => {var off = offset(); /* console.log('page', v.pageX, v.pageY); */ return {x: v.pageX - off.left, y: v.pageY - off.top}});
//         return move;
//     }

//     private mod_filter(modifiers: ModifierKeys) {
//         return function (e :JQueryEventObject) :Boolean {
//             return e.shiftKey == modifiers.shift && e.ctrlKey == modifiers.ctrl && e.altKey == modifiers.alt && e.metaKey == modifiers.meta
//         }
//     }
// }

// ----------------------------------------------------------------------
