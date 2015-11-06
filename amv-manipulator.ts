/// <reference path="build/typings/jquery" />

import AmvLevel1 = require("amv-level1");

// ----------------------------------------------------------------------

export interface MousePosition
{
    x :number;
    y :number;
}

export interface MouseMovement
{
    x :number;                  // relative
    y :number;                  // relative
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
    constructor(public shift :boolean, public ctrl :boolean, public alt :boolean, public meta :boolean) {}

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
    public filter(e :JQueryInputEventObject) :boolean {
        return e.shiftKey == this.shift && e.ctrlKey == this.ctrl && e.altKey == this.alt && e.metaKey == this.meta;
    }

    public name() :string {
        var n :string[] = [];
        if (this.shift)
            n.push("Shift");
        if (this.ctrl)
            n.push("Ctrl");
        if (this.alt)
            n.push("Alt");
        if (this.meta)
            n.push("Cmd");
        return n.join("-");
    }
}

// ----------------------------------------------------------------------

export class Manipulator implements Object
{
    private static wheel_sensitivity = 1.0
    private static mouse_movement_sensitivity = 1.0

    private _move_abs_generator :boolean;

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
        this.element.on("move-abs:amv", (_ :Event, c :MousePosition, dragging :boolean, e :JQueryEventObject) => {
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
        this.element.on("move-abs:amv", (_ :Event, c :MousePosition, dragging :boolean, e :JQueryEventObject) => {
            if (dragging && modifier_keys.filter(e)) {
                if (previous !== null) {
                    this.element.trigger("drag:" + modifier_desc + ":amv", [{x: c.x - previous.x, y: c.y - previous.y}]);
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
            // console.log('mouse trigger', "wheel:" + modifier_desc + ":amv");
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

    public static event_to_description(event :string) :string {
        var [action, modifier_desc, _] = event.split(':');
        var mods = ModifierKeys.make_from_string(modifier_desc).name();
        var r :string[] = [];
        if (mods.length)
            r.push(mods);
        switch (action) {
        case "left":
            r.push("LeftClick");
            break;
        case "right":
            r.push("RightClick");
            break;
        case "middle":
            r.push("MiddleClick");
            break;
        case "wheel":
            r.push("Wheel");
            break;
        case "drag":
            r.push("Drag");
            break;
        case "key":
            r.push("*key*");
            break;
        }
        return r.join("-");
    }
}

// ----------------------------------------------------------------------

export class Control
{
    constructor(public viewer :AmvLevel1.Viewer, private event_description :string) {
        viewer.on(event_description, (data :ManipulatorEvent) => this.operate(data));
    }

    public operate(data :ManipulatorEvent) :void {
    }

    public trigger_description() :string {
        return Manipulator.event_to_description(this.event_description);
    }
}

// ----------------------------------------------------------------------


// ----------------------------------------------------------------------
